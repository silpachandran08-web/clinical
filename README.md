# Clinic WhatsApp Assistant

A multi-tenant SaaS product: clinics register themselves, get a 7-day free
trial, and run their booking operation through three role-scoped
dashboards — while their patients book appointments over WhatsApp by
chatting naturally (Arabic or English) with an AI receptionist that never
invents availability or gives medical advice.

Want to deploy this for a quick trial with friends (Vercel + Neon + a free
Meta test WhatsApp number)? See [DEPLOY.md](./DEPLOY.md) for the exact steps.

See the architecture diagrams shared in chat for the full picture. Short version:

```
Clinic registers (email + clinic name) -> email one-time code -> 7-day trial starts
                                                       |
Patient (WhatsApp) -> Unifonic/Meta gateway -> Conversation Orchestrator (Claude, tool-use)
                                                       |
                                          Scheduling Core (Postgres, transactional booking)
                                                       |
                       /admin (clinic owner)  /receptionist (front desk)  /doctor (queue + notes)
```

## Why these choices

- **Self-serve, not us-onboards-them**: a clinic signs up with just an email and
  clinic name — no sales call, no us creating their account. `src/authService.ts`'s
  `registerClinicAndAdmin` is the entire onboarding transaction.
- **Passwordless (email one-time codes)**: no password to forget, reset, or leak.
  `EmailProvider` (`src/email/`) is swappable the same way `WhatsAppProvider` is —
  `ConsoleEmailProvider` logs codes to the terminal for free local testing (with a
  fixed dev bypass code, see `.env.example`), `ResendEmailProvider` is the real one
  for production.
- **Three roles, one data model**: `CLINIC_ADMIN` configures the clinic,
  `RECEPTIONIST` runs the front desk (calendar, walk-ins, check-in), `DOCTOR` runs
  their own patient queue and writes consultation notes. Every `User` belongs to
  exactly one clinic and one role (`prisma/schema.prisma`) — tenant isolation is
  enforced by always deriving `clinicId` from the verified session
  (`lib/session.ts`), never from client-submitted form data.
- **Trial tracked, not enforced yet**: `Clinic.trialEndsAt` / `subscriptionStatus`
  exist from day one so payment integration has something to plug into, but nothing
  blocks access when a trial lapses — there's no way to pay to unblock yet.
- **Claude with tool-use as the "brain"**: the LLM never invents availability or
  confirms a booking on its own — it can only report what `check_availability` /
  `book_slot` actually returned from the database. This is what makes "feels human,
  isn't" safe rather than a liability.
- **Adapter interface for the booking core (`src/integrations/`)**: the AI tools and
  booking logic only ever talk to the `EhrAdapter` interface. Today only `NativeAdapter`
  (our own Postgres) is wired up. A clinic that already runs a system — especially one
  already integrated with **NPHIES** (Saudi's FHIR-based national health exchange) —
  gets a `FhirAdapter` implementation instead of a data migration.

## Project layout

```
prisma/schema.prisma       clinics, users, departments, doctors, slots, patients, appointments, consultations
src/config/env.ts          typed, fail-fast env loading
src/whatsapp/               WhatsAppProvider interface + Unifonic/Meta implementations
src/email/                  EmailProvider interface + Console (dev)/Resend (prod) implementations
src/authService.ts          OTP generation/verification, clinic+admin registration
src/ai/                     system prompt, tool definitions, Claude tool-use loop
src/scheduling/              pure slot-time generator + transactional booking service (double-booking guard)
src/integrations/           EhrAdapter interface + Native/FHIR adapters, adapter registry
src/webhookHandler.ts       framework-agnostic webhook logic (used by app/api/webhook)
src/adminHandlers.ts        clinic/department/doctor/staff logic — always takes clinicId as a parameter
src/receptionistHandlers.ts today's calendar, walk-in booking, check-in
src/doctorHandlers.ts       a doctor's own queue, starting/completing a consultation
app/api/                    Next.js Route Handlers: WhatsApp webhook, health check
app/login/, app/register/   passwordless auth pages (email -> one-time code)
app/admin/                  clinic owner dashboard
app/receptionist/           front-desk dashboard
app/doctor/                 doctor's queue + consultation notes
lib/auth.ts, proxy.ts       session-cookie signing and the role-based route guard
lib/session.ts              reads the verified session in Server Components
lib/actions/                Server Actions the dashboard forms submit to
tests/                      unit tests (no live DB needed)
```

One Next.js app serves everything — the WhatsApp webhook (`/api/webhook`),
the health check (`/api/health`), and all three dashboards. `proxy.ts` gates
`/admin/**`, `/receptionist/**`, `/doctor/**` to a valid session with the
matching role, redirecting anyone else to their own home or to `/login`.
See [DEPLOY.md](./DEPLOY.md) for the full deployment walkthrough.

## Running it

```bash
npm install
cp .env.example .env        # fill in ANTHROPIC_API_KEY, DATABASE_URL, SESSION_SECRET
npx prisma migrate dev      # creates the schema against a local (or Neon) Postgres
npm run dev                 # starts Next.js on :3000
```

Go to `http://localhost:3000/register`, enter a clinic name and any email.
With the default `EMAIL_PROVIDER=console`, the one-time code is printed to
the terminal — or just enter **09876**, a fixed dev-only bypass code that
only works when no real email provider is configured (see `.env.example`).
That creates the clinic and logs you in as `CLINIC_ADMIN` on `/admin`.

From there: set the clinic's WhatsApp number, add a department, add a
doctor (with weekly working hours — this also materializes 30 days of
bookable slots), then use the **Staff** page to invite a receptionist and/or
a doctor login by email — same passwordless flow, no password to hand them.
Point the Unifonic (or Meta) webhook at `POST /api/webhook` and the number is live.

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
- **Tenant isolation**: every admin/receptionist/doctor Server Action must derive
  `clinicId` (and `doctorId` for doctor actions) from `getSession()`, never from a
  client-submitted field. Worth an explicit regression test — this is the boundary
  that keeps one clinic's data from being reachable by another.

## Business / rollout notes

- **Self-serve trial**: register with email + clinic name -> 7-day trial
  (`Clinic.trialEndsAt`) -> monthly subscription. Payment is not integrated yet, so a
  lapsed trial is tracked (`subscriptionStatus`) but not enforced — nothing blocks
  the dashboard today.
- **Monetization** (later): per-clinic monthly fee once billing is wired up; consider
  tiering by integration complexity (native vs. adapter work for an existing EHR).
- **Compliance**: Saudi PDPL, and now genuinely relevant — `Consultation` (doctor notes
  + prescription) is real clinical/health data, not just scheduling logistics. It's
  scoped so only that clinic's own staff can read it (`listPatientHistory` filters by
  `clinicId`), but encryption-at-rest specifics, audit logging, and data residency
  (in-Kingdom hosting) are a hardening pass this hasn't had yet.
- **Human-in-the-loop is not optional**: `escalate_to_human` plus `STAFF_ESCALATION_WEBHOOK_URL`
  is the safety valve for emergencies, complaints, and anything the model isn't confident
  about. Front-desk staff should get that escalation in a channel they actually watch
  (Slack/WhatsApp group) before go-live.

## Not yet built (next up)

- Payment integration — `subscriptionStatus` exists but nothing charges a card or
  blocks access when a trial lapses.
- Appointment reminder job (WhatsApp template message N hours before the slot).
- Reschedule flow (currently cancel via `/admin`, rebook via WhatsApp or a new walk-in).
- Multiple doctors seeing patients concurrently isn't a UI constraint (each doctor's
  `/doctor` queue is independent), but the front-desk "who's with a patient" board on
  `/receptionist` has only been tested with one doctor at a time.
- `SheetsAdapter` for a clinic with literally no existing system beyond a spreadsheet.
- Load/concurrency test suite against a real Postgres.
- A way for a clinic admin to remove/deactivate a staff account (currently only
  invite, no revoke).
