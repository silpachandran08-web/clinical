import { PrismaClient } from "@prisma/client";

// Next.js dev's hot-reload re-evaluates modules on every edit — without
// caching the client on globalThis, each reload would create a new
// PrismaClient (and a new connection pool), eventually exhausting Neon's
// connection limit. Production doesn't need this (one instance per
// serverless invocation), but it's harmless there too.
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
