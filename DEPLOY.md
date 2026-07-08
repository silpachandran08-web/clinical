# Deploying for a friends trial (Vercel + Neon + Meta test number)

This path is optimized for "get it in front of 5 friends this week," not for
the eventual KSA commercial launch. Two deliberate departures from the main
README for that reason:

- **WhatsApp provider: Meta Cloud API's free test number**, not Unifonic.
  Unifonic requires business verification that can take days; Meta gives you
  a working test number in minutes with up to 5 verified recipient numbers,
  no approval wait. Switch back to Unifonic (`WHATSAPP_PROVIDER=unifonic`)
  when you're ready to launch on a real business number — no code changes
  needed, it's one env var.
- **Neon Postgres** instead of a self-hosted one — serverless-friendly
  (connection pooling built in), free tier, and Vercel can provision it for
  you directly from the project dashboard.

Do the steps in this order — later steps depend on values from earlier ones.

## 1. Get an Anthropic API key

console.anthropic.com → API Keys → Create Key. Save it, you'll need it in step 4.

## 2. Create a Neon Postgres database

Either neon.tech directly, or from inside Vercel once you've created the
project (Storage tab → Create Database → Neon). Either way, open the
connection details panel and copy **two** connection strings:

- The **pooled** one (hostname usually contains `-pooler`) → this becomes `DATABASE_URL`
- The **direct/unpooled** one → this becomes `DIRECT_URL`

## 3. Set up the repo and run the first migration

```bash
cd clinic-whatsapp-assistant
git init
cp .env.example .env
```

Edit `.env`: paste your Neon pooled URL into `DATABASE_URL`, the unpooled one
into `DIRECT_URL`, your Anthropic key into `ANTHROPIC_API_KEY`, and a random
`SESSION_SECRET` (signs the login session cookie). Leave `EMAIL_PROVIDER` as
`console` for now — sign-in codes just print to the terminal, no email
account needed yet. Leave the Meta/Unifonic fields blank too, you can defer
WhatsApp setup.

```bash
npm install
npx prisma migrate dev --name init
```

This both creates `prisma/migrations/` (commit this — it's your schema
history) and applies the schema directly to your Neon database, since Neon is
reachable from your laptop over the internet — no local Postgres needed.

Commit everything and push to a **new GitHub repo** (keep this separate from
any unrelated repos you have — a clean repo makes the Vercel import trivial):

```bash
git add -A
git commit -m "Initial clinic WhatsApp assistant"
gh repo create clinic-whatsapp-assistant --private --source=. --push
# or create the repo on github.com and `git remote add origin ...` + push manually
```

## 4. Import into Vercel

1. vercel.com → Add New → Project → import the GitHub repo you just pushed.
2. Framework Preset: Vercel should auto-detect **Next.js** — leave it as-is.
3. Before the first deploy, add these Environment Variables (Project Settings
   → Environment Variables), same names as your local `.env`:
   - `DATABASE_URL`, `DIRECT_URL`
   - `ANTHROPIC_API_KEY`, `CLAUDE_MODEL` (e.g. `claude-sonnet-5`)
   - `SESSION_SECRET`
   - `EMAIL_PROVIDER` = `console` (see the security note in step 6 before leaving
     this as-is on a public URL)
   - `WHATSAPP_PROVIDER` = `meta`
   - `META_PHONE_NUMBER_ID`, `META_ACCESS_TOKEN`, `META_VERIFY_TOKEN`, `META_APP_SECRET`
     (you'll get real values for these in step 5 — put in placeholders now,
     redeploy after step 5)
4. Deploy. Once it's live, confirm the basics work:
   `curl https://<your-project>.vercel.app/api/health` → `{"status":"ok"}`

## 5. Set up the Meta test WhatsApp number

1. developers.facebook.com → My Apps → Create App → type **Business**.
2. Add the **WhatsApp** product to the app.
3. WhatsApp → API Setup page gives you a free test number and a **Phone
   Number ID** → `META_PHONE_NUMBER_ID`.
4. Generate a long-lived token instead of the default 24-hour one: Business
   Settings → System Users → create one → generate a token with
   `whatsapp_business_messaging` permission, assigned to this app → `META_ACCESS_TOKEN`.
5. App dashboard → Settings → Basic → **App Secret** → `META_APP_SECRET`
   (this is what verifies the webhook is really from Meta — different from
   the access token above).
6. Make up any random string for `META_VERIFY_TOKEN` (you choose it, Meta just
   echoes it back during setup to prove you control the endpoint).
7. Put the real values for steps 3–6 into Vercel's env vars and **redeploy**
   (env var changes don't apply to already-built deployments).
8. Back in WhatsApp → Configuration: set **Webhook URL** to
   `https://<your-project>.vercel.app/api/webhook`, **Verify Token** to the
   same string as `META_VERIFY_TOKEN`, click Verify and Save, then subscribe
   to the `messages` field.
9. Still on the API Setup page, under "To", add up to 5 friends' phone
   numbers as test recipients — each gets a WhatsApp message from Meta they
   must accept before the bot can message them.

## 6. Register the clinic and set it up

**Security note first:** with `EMAIL_PROVIDER=console`, sign-in codes only show up
in `vercel logs` — but a fixed dev bypass code (**09876**) also works for *any*
email address, so anyone who finds the URL could register or log in as anyone.
That's fine while only you and a few trusted friends know the URL. Before sharing
it more widely, set `EMAIL_PROVIDER=resend` and add a real `RESEND_API_KEY` — the
bypass code is automatically disabled the moment a real provider is configured.

1. Go to `https://<your-project>.vercel.app/register`, enter a clinic name and
   your email, then verify with the code from `vercel logs --follow` (or `09876`
   in console mode). This creates the clinic and logs you in as `CLINIC_ADMIN`.
2. **Clinic** tab: take the test number shown on the Meta API Setup page
   (e.g. "+1 555 693 2195"), strip it to clean E.164 — no spaces, no dashes:
   `+15556932195` — and save it as the clinic's WhatsApp number.
3. **Departments** tab: add at least one (e.g. "General Medicine").
4. **Doctors** tab: add a doctor, assign them to that department, tick their
   working days and hours. Saving this also generates the next 30 days of
   bookable slots automatically.
5. **Staff** tab: invite a receptionist and/or a doctor login by email — they
   sign in at `/login` with the same one-time-code flow, landing on
   `/receptionist` or `/doctor` respectively.

## 7. Try it

Have a friend (one of the numbers you added in step 5.9) message the test
number on WhatsApp: "Hi, I'd like to book an appointment tomorrow morning."
Watch `vercel logs <your-project> --follow` while they do — that's your
fastest way to see what actually happened if a reply doesn't come back.

## If something doesn't work

- **"Can't reach database server" on the very first request in a while**: Neon's
  free tier suspends its compute after a period of inactivity and wakes it on the
  next query — the first request after it's been idle can time out or fail once.
  Just retry; it should work immediately after.
- **No reply at all**: check Vercel function logs first. Most likely causes:
  webhook signature check failing (double-check `META_APP_SECRET`, not the
  access token), or `whatsappNumber` not matching exactly (see step 6).
- **"Prisma Client could not locate the Query Engine"**: means `binaryTargets`
  in `prisma/schema.prisma` didn't take effect — confirm `postinstall` ran
  `prisma generate` in the Vercel build logs.
- **Timeout / no response after ~10s**: `app/api/webhook/route.ts` sets
  `export const maxDuration = 60`; if that's missing, the default is 10s on
  the Hobby plan and a multi-round tool-use conversation can exceed it.
- **Webhook verification fails when saving in Meta's Configuration page**:
  `META_VERIFY_TOKEN` in Vercel must exactly match what you typed into Meta's
  form, and the env var change must have been deployed already.
