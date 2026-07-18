import { NextRequest, NextResponse } from "next/server";
import { sendFollowUpReminders } from "@/src/reminderHandlers";

export const maxDuration = 60;

export async function POST(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const results = await sendFollowUpReminders();
    return NextResponse.json({
      success: true,
      ...results,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: "Failed to process follow-up reminders",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
