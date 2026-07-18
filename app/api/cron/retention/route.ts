import { NextRequest, NextResponse } from "next/server";
import { sendNoShowFollowUps, sendReEngagementMessages } from "@/src/retentionHandlers";

export const maxDuration = 60;

export async function POST(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const noShow = await sendNoShowFollowUps();
    const reEngagement = await sendReEngagementMessages();
    return NextResponse.json({ success: true, noShow, reEngagement });
  } catch (error) {
    return NextResponse.json(
      {
        error: "Failed to process retention messages",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
