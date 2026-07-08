// Unit tests exercise pure logic only, but modules still import config/env.ts
// at load time, which fails fast on missing required vars (by design, for
// real runs). Give it harmless defaults here so `npm test` never needs a
// real .env or live database.
process.env.DATABASE_URL ??= "postgresql://test:test@localhost:5432/test";
process.env.ANTHROPIC_API_KEY ??= "test-key";
process.env.SESSION_SECRET ??= "test-session-secret";
