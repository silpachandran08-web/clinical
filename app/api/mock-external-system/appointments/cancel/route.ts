import { NextRequest, NextResponse } from "next/server";
import { APPOINTMENTS } from "../../store";

export async function POST(request: NextRequest) {
  const body = await request.json();
  const appointment = APPOINTMENTS.find((a) => a.apptId === body.appointmentId);
  if (!appointment) {
    return NextResponse.json({ error: "Appointment not found" }, { status: 400 });
  }
  appointment.cancelled = true;
  return NextResponse.json({ ok: true });
}
