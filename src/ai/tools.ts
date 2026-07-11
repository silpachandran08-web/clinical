import type Anthropic from "@anthropic-ai/sdk";
import type { Clinic } from "@prisma/client";
import { env } from "../config/env";
import { getEhrAdapter } from "../integrations/index";
import { zonedTimeToUtc } from "../scheduling/timezone";

export const toolDefinitions: Anthropic.Tool[] = [
  {
    name: "list_doctors",
    description: "List active doctors at the clinic, optionally filtered by department.",
    input_schema: {
      type: "object",
      properties: {
        departmentName: { type: "string", description: "e.g. 'Dermatology', 'Pediatrics' — match the patient's request to the closest department name" },
      },
    },
  },
  {
    name: "check_availability",
    description: "Get open appointment slots for a doctor within a date range.",
    input_schema: {
      type: "object",
      properties: {
        doctorId: { type: "string" },
        departmentName: { type: "string" },
        fromISO: { type: "string", description: "Calendar date to start searching from, YYYY-MM-DD, in the clinic's own local date (use the 'today' date given at the top of these instructions, not UTC)" },
        toISO: { type: "string", description: "Calendar date to search up to, YYYY-MM-DD, inclusive — for a single day (e.g. \"today\"), pass the same date as fromISO" },
      },
      required: ["fromISO", "toISO"],
    },
  },
  {
    name: "book_slot",
    description: "Book a specific open slot for the patient. Only call after the patient explicitly confirms the slot.",
    input_schema: {
      type: "object",
      properties: {
        slotId: { type: "string" },
        patientName: { type: "string" },
        reason: { type: "string", description: "Optional short logistics note, e.g. 'follow-up'. Never a diagnosis." },
      },
      required: ["slotId", "patientName"],
    },
  },
  {
    name: "get_patient_appointments",
    description: "Look up this patient's upcoming confirmed appointments.",
    input_schema: { type: "object", properties: {} },
  },
  {
    name: "get_visit_history",
    description:
      "Look up this patient's past visits (completed, cancelled, or no-show) — which doctor, when, and the outcome, plus any recommended follow-up date. Does NOT include clinical notes, diagnosis, or prescription details — those are never shared over WhatsApp. If the patient specifically asks for notes or a prescription, use escalate_to_human instead.",
    input_schema: { type: "object", properties: {} },
  },
  {
    name: "cancel_appointment",
    description: "Cancel one of the patient's existing appointments.",
    input_schema: {
      type: "object",
      properties: { appointmentId: { type: "string" } },
      required: ["appointmentId"],
    },
  },
  {
    name: "escalate_to_human",
    description:
      "Create a follow-up request on the clinic front desk's dashboard. Use for emergencies, complaints, billing questions, or anything you're unsure how to handle safely. Staff will see it and reply to the patient in this same WhatsApp chat (or call them) — so tell the patient staff will get back to them here soon; do NOT imply they are being transferred or connected live right now.",
    input_schema: {
      type: "object",
      properties: {
        reason: { type: "string", description: "Short summary for staff of what the patient needs, e.g. 'Wants an earlier GP slot than tomorrow'" },
        urgent: { type: "boolean", description: "true for medical emergencies" },
      },
      required: ["reason"],
    },
  },
];

export interface ToolContext {
  clinic: Clinic;
  patientPhone: string;
}

export async function runTool(name: string, input: any, ctx: ToolContext): Promise<unknown> {
  const adapter = getEhrAdapter(ctx.clinic);

  switch (name) {
    case "list_doctors": {
      const doctors = await adapter.listDoctors({
        clinicId: ctx.clinic.id,
        departmentName: input.departmentName,
      });
      return doctors.map((d) => ({
        id: d.doctorId,
        name: d.doctorName,
        department: d.departmentName ? { name: d.departmentName } : null,
      }));
    }

    case "check_availability": {
      // fromISO/toISO are plain YYYY-MM-DD calendar dates in the clinic's
      // own timezone (per the tool description) — new Date("2026-07-09")
      // would parse that as UTC midnight, not clinic-local midnight, and a
      // same-day query (fromISO === toISO, e.g. "today") would collapse to
      // a zero-width range since the underlying query's upper bound is
      // exclusive. Parse as clinic-local dates and make `to` inclusive of
      // the whole toISO calendar day.
      const from = parseClinicCalendarDate(input.fromISO, ctx.clinic.timezone);
      const to = new Date(parseClinicCalendarDate(input.toISO, ctx.clinic.timezone).getTime() + 24 * 60 * 60 * 1000);

      const slots = await adapter.getAvailability({
        clinicId: ctx.clinic.id,
        doctorId: input.doctorId,
        departmentName: input.departmentName,
        from,
        to,
      });
      return slots.map((s) => ({
        slotId: s.slotId,
        doctorName: s.doctorName,
        startsAt: s.startsAt.toISOString(),
      }));
    }

    case "book_slot": {
      const result = await adapter.bookSlot({
        clinicId: ctx.clinic.id,
        slotId: input.slotId,
        patientPhone: ctx.patientPhone,
        patientName: input.patientName,
      });
      return {
        appointmentId: result.appointmentId,
        doctorName: result.doctorName,
        startsAt: result.startsAt.toISOString(),
      };
    }

    case "get_patient_appointments": {
      const appointments = await adapter.getPatientAppointments({
        clinicId: ctx.clinic.id,
        patientPhone: ctx.patientPhone,
      });
      return appointments.map((a) => ({
        appointmentId: a.appointmentId,
        doctorName: a.doctorName,
        startsAt: a.startsAt.toISOString(),
      }));
    }

    case "get_visit_history": {
      // Native-only, not routed through EhrAdapter — same precedent as
      // escalate_to_human: this is our own Postgres's enrichment data, not
      // part of the "plug into any clinical solution" scheduling contract.
      // For a CUSTOM_API clinic this just returns an empty list.
      const { getPatientVisitHistory } = await import("../scheduling/bookingService");
      const visits = await getPatientVisitHistory(ctx.clinic.id, ctx.patientPhone);
      return visits.map((v) => ({
        doctorName: v.doctor.name,
        date: v.slot.startsAt.toISOString(),
        status: v.status,
        followUpDate: v.consultation?.followUpDate?.toISOString() ?? null,
      }));
    }

    case "cancel_appointment": {
      await adapter.cancelAppointment({ clinicId: ctx.clinic.id, appointmentId: input.appointmentId });
      return { cancelled: true };
    }

    case "escalate_to_human": {
      // The persisted row is what makes "staff will follow up" true: it shows
      // up as an open item on the receptionist dashboard (which polls every
      // few seconds) until someone marks it handled.
      const { prisma } = await import("../db/client");
      await prisma.staffEscalation.create({
        data: {
          clinicId: ctx.clinic.id,
          patientPhone: ctx.patientPhone,
          reason: String(input.reason ?? "Patient needs staff help"),
          urgent: Boolean(input.urgent),
        },
      });

      if (env.staffEscalationWebhookUrl) {
        await fetch(env.staffEscalationWebhookUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            clinicId: ctx.clinic.id,
            patientPhone: ctx.patientPhone,
            reason: input.reason,
            urgent: Boolean(input.urgent),
          }),
        }).catch((err) => console.error("Failed to notify staff escalation webhook", err));
      }
      return { escalated: true };
    }

    default:
      throw new Error(`Unknown tool: ${name}`);
  }
}

/** Parses a "YYYY-MM-DD" (optionally with a trailing time component, which is ignored) as midnight of that calendar date in `timeZone`. */
function parseClinicCalendarDate(dateStr: string, timeZone: string): Date {
  const datePart = dateStr.split("T")[0];
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(datePart);
  if (!match) {
    throw new Error(`check_availability received an unparseable date: "${dateStr}"`);
  }
  return zonedTimeToUtc(Number(match[1]), Number(match[2]), Number(match[3]), 0, 0, timeZone);
}
