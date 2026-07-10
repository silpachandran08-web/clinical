import { prisma } from "../db/client";

/**
 * Deterministic, zero-cost guardrails checked BEFORE any Claude call — every
 * message that reaches the API costs money, so abuse has to be caught here,
 * not by the model deciding to be brief. All three checks reuse the Message
 * table already written on every inbound message; no new infrastructure.
 */

const MAX_MESSAGE_LENGTH = 1500;
const BURST_WINDOW_MS = 2 * 60 * 1000;
const BURST_LIMIT = 10; // messages within BURST_WINDOW_MS — faster than a human can type/read
const DAILY_LIMIT = 40; // generous for even a few genuine booking sessions in one day

export type RateLimitResult =
  | { allowed: true }
  | { allowed: false; reason: "too_long" | "burst" | "daily" };

export async function checkInboundRateLimit(
  clinicId: string,
  patientPhone: string,
  body: string,
): Promise<RateLimitResult> {
  if (body.length > MAX_MESSAGE_LENGTH) {
    return { allowed: false, reason: "too_long" };
  }

  const now = Date.now();
  const [burstCount, dailyCount] = await Promise.all([
    prisma.message.count({
      where: {
        direction: "INBOUND",
        createdAt: { gte: new Date(now - BURST_WINDOW_MS) },
        conversation: { clinicId, patientPhone },
      },
    }),
    prisma.message.count({
      where: {
        direction: "INBOUND",
        createdAt: { gte: new Date(now - 24 * 60 * 60 * 1000) },
        conversation: { clinicId, patientPhone },
      },
    }),
  ]);

  // +1 for the message currently being evaluated, which isn't persisted yet
  // at the point this runs (see orchestrator.ts) — count what's already
  // stored, then check whether admitting this one would cross the line.
  if (burstCount + 1 > BURST_LIMIT) return { allowed: false, reason: "burst" };
  if (dailyCount + 1 > DAILY_LIMIT) return { allowed: false, reason: "daily" };

  return { allowed: true };
}

export function rateLimitReplyText(reason: "too_long" | "burst" | "daily", locale: "AR" | "EN"): string {
  if (locale === "AR") {
    if (reason === "too_long") return "الرسالة طويلة مره، اختصرها شوي أو اتصل بالعيادة على طول.";
    return "وصلتنا منك رسايل كثيرة بوقت قصير. بيتواصل معك أحد موظفين العيادة قريب.";
  }
  if (reason === "too_long") return "That message is too long — please send a shorter question, or call the clinic directly.";
  return "We've received a lot of messages from you in a short time. A staff member will follow up with you shortly.";
}
