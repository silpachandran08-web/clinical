import { NextRequest, NextResponse } from "next/server";
import { sendAppointmentReminders } from "@/src/reminderHandlers";

export const maxDuration = 60;

export async function POST(request: NextRequest) {
  // Verify request is from a trusted cron service (Vercel, etc.)
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const results = await sendAppointmentReminders();
    return NextResponse.json({
      success: true,
      ...results,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: "Failed to process reminders",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
