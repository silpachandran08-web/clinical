import { NextRequest, NextResponse } from "next/server";
import { SLOTS } from "../store";

export async function GET(request: NextRequest) {
  const doctorId = request.nextUrl.searchParams.get("doctorId");
  const from = request.nextUrl.searchParams.get("from");
  const to = request.nextUrl.searchParams.get("to");

  const slots = SLOTS.filter((s) => {
    if (s.booked) return false;
    if (doctorId && s.doctor.id !== doctorId) return false;
    if (from && s.start < from) return false;
    if (to && s.start >= to) return false;
    return true;
  });

  return NextResponse.json({ slots: slots.map((s) => ({ id: s.id, doctor: s.doctor, start: s.start, end: s.end })) });
}
