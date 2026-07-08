# Clinic WhatsApp Assistant

An AI receptionist that lives on a clinic's WhatsApp number: a patient asks
for an appointment in natural language (Arabic or English), the assistant
checks real availability and books it — no app, no portal, no human typing
on the other end, but it should read like one. Built for a single clinic in
Saudi Arabia first, structured so onboarding clinic #2 (or clinic #50) is
configuration, not a rewrite.

Want to deploy this for a quick trial with friends (Vercel + Neon + a free
Meta test WhatsApp number)? See [DEPLOY.md](./DEPLOY.md) for the exact steps.

See the architecture diagram shared in chat for the full picture. Short version:

```
Patient (WhatsApp) -> Unifonic/Meta gateway -> Conversation Orchestrator (Claude, tool-use)
                                                       |
                                          Scheduling Core (Postgres, transactional booking)
                                                       |
                                          EHR Adapter interface (Native / FHIR / Sheets)
```

## Why these choices

- **Channel-first, not app-first**: the patient never installs anything. WhatsApp is
  already the default channel for clinics in Saudi Arabia, so the "product" is a phone
  number, not a webpage.
- **Unifonic as the WhatsApp BSP**: KSA-headquartered Meta Business Partner, handles
  Arabic template approval, SAR billing, and has a friendlier data-handling story for
  Saudi PDPL than a foreign BSP. A `MetaCloudProvider` is included as a documented
  fallback/alternative — swapping providers means changing one `.env` value
  (`WHATSAPP_PROVIDER`), never touching the orchestrator or booking logic.
- **Claude with tool-use as the "brain"**: the LLM never invents availability or
  confirms a booking on its own — it can only report what `check_availability` /
  `book_slot` actually returned from the database. This is what makes "feels human,
  isn't" safe rather than a liability.
- **Adapter interface for the booking core (`src/integrations/`)**: the AI tools and
  booking logic only ever talk to the `EhrAdapter` interface. Today only `NativeAdapter`
  (our own Postgres) is wired up. A clinic that already runs a system — especially one
  already integrated with **NPHIES** (Saudi's FHIR-based national health exchange) —
  gets a `FhirAdapter` implementation instead of a data migration. This is the literal
  mechanism behind "plug into any existing clinical solution."

## Project layout

```
prisma/schema.prisma       clinics, doctors, working hours, slots, patients, appointments, conversation log
src/config/env.ts          typed, fail-fast env loading
src/whatsapp/               WhatsAppProvider interface + Unifonic/Meta implementations
src/ai/                     system prompt, tool definitions, Claude tool-use loop
src/scheduling/             pure slot-time generator + transactional booking service (double-booking guard)
src/integrations/           EhrAdapter interface + Native/FHIR adapters, adapter registry
src/webhookHandler.ts       framework-agnostic webhook logic (shared by Fastify and Vercel)
src/adminHandlers.ts        framework-agnostic clinic-onboarding logic (shared by Fastify and Vercel)
src/routes/                 thin Fastify wrappers around the handlers above, for local dev
api/                        thin Vercel serverless-function wrappers around the same handlers
tests/                      unit tests (no live DB needed)
```

Local dev (`npm run dev`) serves routes at `/webhook/whatsapp` and
`/admin/...` via Fastify. Deployed on Vercel, the same logic is served at
`/api/webhook` and `/api/admin/...` — Vercel's routing convention prefixes
everything under `api/` with `/api`. See [DEPLOY.md](./DEPLOY.md) for the
full deployment walkthrough.

## Running it

```bash
npm install
cp .env.example .env        # fill in ANTHROPIC_API_KEY, DATABASE_URL, Unifonic creds
npx prisma migrate dev      # creates the schema against a local Postgres
npm run dev                 # starts the Fastify server on :8080
```

Onboard the first clinic and doctor:

```bash
curl -X POST localhost:8080/admin/clinics -H 'Content-Type: application/json' -d '{
  "name": "Al Noor Clinic", "whatsappNumber": "+9665XXXXXXXX"
}'

curl -X POST localhost:8080/admin/doctors -H 'Content-Type: application/json' -d '{
  "clinicId": "<id from above>",
  "name": "Dr. Fatima Al-Harbi",
  "specialty": "General Medicine",
  "workingHours": [
    { "dayOfWeek": 0, "startTime": "09:00", "endTime": "17:00" },
    { "dayOfWeek": 1, "startTime": "09:00", "endTime": "17:00" }
  ]
}'
```

That second call also materializes the next 30 days of bookable slots (`slotGenerator.ts`).
Point the Unifonic (or Meta) webhook at `POST /webhook/whatsapp` and the number is live.

## Testing strategy

- **Unit-tested now** (`npm test`, no infra needed): slot-time generation math (working
  hours -> concrete slot boundaries, weekend exclusion), WhatsApp payload parsing/phone
  normalization.
- **Needs a real Postgres, not yet automated here**: the double-booking guard in
  `bookingService.bookSlot` — two concurrent `book_slot` calls for the same slot, only one
  should win (`SlotUnavailableError` for the loser). Add this as an integration test against
  a disposable Postgres (e.g. via `testcontainers`) before this goes further than one pilot
  clinic.
- **Conversation-quality testing** (not yet built): a scripted eval harness — fixed patient
  utterances in Arabic and English -> assert which tool gets called with what arguments.
  This is the regression suite for prompt changes; treat prompt edits like code changes.
- **Clinical safety test cases to script explicitly**: patient asks for medical advice ->
  bot must redirect, never diagnose. Emergency keywords ("chest pain", "can't breathe") ->
  immediate escalation message + `escalate_to_human(urgent: true)`, never a routine slot
  offer. These should be the first eval cases written, before more booking features.

## Business / rollout notes

- **MVP scope**: one clinic, one WhatsApp number, a handful of doctors, admin API only
  (no dashboard UI yet) — staff manage schedules via the endpoints above or a thin internal
  tool.
- **Onboarding a second clinic** should be: create a `Clinic` row, choose `integrationMode`,
  point the WhatsApp number at the same webhook. No redeploy of core logic.
- **Monetization** (later): per-clinic SaaS fee, or per-booking, tiered by integration
  complexity (native vs. adapter work for an existing EHR).
- **Compliance**: Saudi PDPL — store only what's needed for scheduling (name, phone,
  appointment time, optional free-text reason). No clinical/diagnostic data in this system
  by design; that stays in the clinic's actual EHR. Revisit data residency (in-Kingdom
  hosting) before handling anything beyond logistics.
- **Human-in-the-loop is not optional**: `escalate_to_human` plus `STAFF_ESCALATION_WEBHOOK_URL`
  is the safety valve for emergencies, complaints, and anything the model isn't confident
  about. Front-desk staff should get that escalation in a channel they actually watch
  (Slack/WhatsApp group) before go-live.

## Not yet built (next up)

- Appointment reminder job (WhatsApp template message N hours before the slot).
- Reschedule flow (currently only cancel + rebook).
- Admin dashboard UI (the endpoints exist; no front-end yet).
- `SheetsAdapter` for a clinic with literally no existing system beyond a spreadsheet.
- Load/concurrency test suite against a real Postgres.
