import { NextRequest, NextResponse } from "next/server";
import { DOCTORS } from "../store";

export async function GET(request: NextRequest) {
  const departmentName = request.nextUrl.searchParams.get("departmentName");
  const items = departmentName ? DOCTORS.filter((d) => d.dept.label === departmentName) : DOCTORS;
  return NextResponse.json({ data: { items } });
}
