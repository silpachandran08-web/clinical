import { NextRequest, NextResponse } from "next/server";
import { APPOINTMENTS, SLOTS } from "../store";

export async function GET(request: NextRequest) {
  const patientPhone = request.nextUrl.searchParams.get("patientPhone");
  const items = APPOINTMENTS.filter((a) => !a.cancelled && (!patientPhone || a.patientPhone === patientPhone));
  return NextResponse.json({ items });
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const slot = SLOTS.find((s) => s.id === body.slotId && !s.booked);
  if (!slot) {
    return NextResponse.json({ error: "Slot not found or already booked" }, { status: 400 });
  }
  slot.booked = true;

  const appointment = {
    apptId: `appt_${Math.random().toString(36).slice(2, 10)}`,
    doctor: { name: slot.doctor.name },
    when: slot.start,
    patientPhone: String(body.patientPhone ?? ""),
    patientName: String(body.patientName ?? ""),
    cancelled: false,
  };
  APPOINTMENTS.push(appointment);

  return NextResponse.json({ result: appointment });
}
