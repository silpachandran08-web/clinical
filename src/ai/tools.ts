import type Anthropic from "@anthropic-ai/sdk";
import type { Clinic } from "@prisma/client";
import { env } from "../config/env";
import { getEhrAdapter } from "../integrations/index";
import * as bookingService from "../scheduling/bookingService";

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
        fromISO: { type: "string", description: "ISO date to start searching from" },
        toISO: { type: "string", description: "ISO date to search up to" },
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
      "Hand off to clinic staff instead of continuing automatically. Use for emergencies, complaints, billing questions, or anything you're unsure how to handle safely.",
    input_schema: {
      type: "object",
      properties: {
        reason: { type: "string" },
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
      const { prisma } = await import("../db/client");
      return prisma.doctor.findMany({
        where: {
          clinicId: ctx.clinic.id,
          active: true,
          ...(input.departmentName ? { department: { name: input.departmentName } } : {}),
        },
        select: { id: true, name: true, department: { select: { name: true } } },
      });
    }

    case "check_availability": {
      const slots = await adapter.getAvailability({
        clinicId: ctx.clinic.id,
        doctorId: input.doctorId,
        departmentName: input.departmentName,
        from: new Date(input.fromISO),
        to: new Date(input.toISO),
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
      const appointments = await bookingService.getPatientAppointments(ctx.clinic.id, ctx.patientPhone);
      return appointments.map((a) => ({
        appointmentId: a.id,
        doctorName: a.doctor.name,
        startsAt: a.slot.startsAt.toISOString(),
      }));
    }

    case "cancel_appointment": {
      await adapter.cancelAppointment({ clinicId: ctx.clinic.id, appointmentId: input.appointmentId });
      return { cancelled: true };
    }

    case "escalate_to_human": {
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
