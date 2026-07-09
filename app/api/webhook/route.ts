import { NextRequest, NextResponse } from "next/server";
import { handleWebhookMessage, handleWebhookVerification } from "@/src/webhookHandler";

// A multi-round Claude tool-use conversation can take longer than the
// platform default (10s) — see DEPLOY.md for why this must stay synchronous
// rather than "ack then process in the background".
export const maxDuration = 60;

export async function GET(request: NextRequest) {
  const result = await handleWebhookVerification(Object.fromEntries(request.nextUrl.searchParams));
  return new NextResponse(result.body, { status: result.status });
}

export async function POST(request: NextRequest) {
  const rawBody = await request.text();
  const parsedBody = rawBody ? JSON.parse(rawBody) : {};
  const result = await handleWebhookMessage({
    rawBody,
    headers: Object.fromEntries(request.headers),
    parsedBody,
  });
  return NextResponse.json(result.body, { status: result.status });
}
