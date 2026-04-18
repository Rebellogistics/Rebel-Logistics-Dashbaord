# Deferred — blocked on external input

Everything from `ACTIONABLES_POST_CALL_APR13.md` that can't land until Yamen delivers an API key, OAuth client, credential, or explicit decision. When input arrives, lift the section into a working branch.

Structure: one section per external blocker. Each section names the phase(s) it unblocks, the minimum input required, and what we'll build the moment it's in hand.

---

## 1. Google Maps platform key — `VITE_GOOGLE_MAPS_API_KEY`

**Unblocks:** Phase 7.9 (Places autofill), Phase 7.8 +1 (route/ETA summary on driver Today tab).

### What Yamen needs to do
1. https://console.cloud.google.com/ → create or reuse a project.
2. Enable **Places API** and **Routes API**.
3. **APIs & Services → Credentials → Create credentials → API key.**
4. Restrict the key:
   - Application restrictions → HTTP referrers → add `https://*.rebellogistics.com.au/*` and `https://*.vercel.app/*`.
   - API restrictions → limit to Places + Routes.
5. Paste into Vercel: project → Settings → Environment Variables → `VITE_GOOGLE_MAPS_API_KEY` (Production, Preview, Development).
6. Redeploy. Ping me.

### What I'll build once the key is live
- Install `@react-google-maps/api` (or a lightweight Places Autocomplete wrapper — the SDK loader alone is enough).
- Wire pickup + delivery autofill on `/quote` and `NewQuoteDialog`.
- Call Routes API once both addresses resolve; show "Pickup → Delivery · 22 km · 34 min" inline and prefill `distanceKm` so the fuel-levy kicks in automatically.
- For Phase 7.8 +1: add `pickupTime` (HH:mm) to the job schema, sum per-stop durations, render the driver Today summary "Truck 1 · 4 stops · first pickup 9:30 AM · ~5h route".

### Files this will touch
- `src/components/jobs/NewQuoteDialog.tsx` — replace plain inputs with autocomplete.
- `src/pages/QuotePage.tsx` (or wherever `/quote` renders).
- `src/lib/places.ts` (new) — SDK loader.
- `src/lib/routes.ts` (new) — Routes API call + cache.
- `src/components/driver/MyRunToday.tsx` — route summary strip.

---

## 2. Twilio credentials + AU number

**Unblocks:** Phase 11.1 / 11.2 / 11.3 — SMS goes from stub to real.

### What Yamen needs to do
1. https://www.twilio.com/ → finish setting up the AU account (already created per the call).
2. Decide: **buy an AU long-code number** *or* **register an Alphanumeric Sender ID** of "Rebel Logistics". AU supports both; Alphanumeric is free but can't receive replies. Long-code ~AUD 6/month and can receive.
3. Copy these into Vercel env vars (all environments):
   - `TWILIO_ACCOUNT_SID`
   - `TWILIO_AUTH_TOKEN`
   - `TWILIO_FROM` (the purchased number in E.164, or the sender-ID string)
4. In Twilio Console → Phone Numbers → Messaging → set Status callback URL to `https://<production-domain>/api/twilio/status` (I'll create this endpoint with the code drop).

### What I'll build once the creds are live
- Wire the **Twilio provider** — `src/lib/sms.ts` already has a `twilioProvider` ready; it hits `/api/sms/send` so the auth token stays server-side. Left to do: add the Vercel Edge Function `api/sms/send.ts` that forwards the payload to Twilio's REST API with the server-side auth token, and flip `VITE_SMS_PROVIDER=twilio` to cut over.
- Add `api/twilio/status.ts` webhook for delivery receipts — update `sms_log.status` from `pending` → `delivered` / `failed` / `undelivered` as Twilio posts back. Verify the X-Twilio-Signature header.
- **Phase 11.3 follow-ons** not shipped today:
  - **Preferred template per customer** — add `preferred_sms_template_key` column on `customers`, expose a picker in `CustomerDialog`, auto-select that template in `SendSmsDialog` when the recipient has one set.
  - **Auto-send en-route SMS to VIPs** — opt-in rule in Settings → Integrations → Twilio ("Auto-send en-route SMS to VIPs when Start Run fires"). The moment `MyRunToday.handleStartRun` flips status to `In Delivery`, fire the en-route template without a dialog.
- **Shipped today (ready when creds drop)**: provider abstraction in `src/lib/sms.ts`, E.164 normaliser in `src/lib/phone.ts`, VIP chip + banner in `SendSmsDialog`, Integrations card in Settings.

---

## 3. Google Calendar OAuth client

**Unblocks:** Phase 10.1 / 10.2 / 10.3 / 10.4.

### What Yamen needs to do
1. Google Cloud Console → same project as the Maps key above.
2. Enable **Google Calendar API**.
3. **APIs & Services → OAuth consent screen** → External, publish the app (internal is fine if the workspace is GSuite; external is fine for personal Gmail).
4. **Credentials → OAuth 2.0 Client ID → Web application**:
   - Authorized JavaScript origins: production + preview domains.
   - Authorized redirect URI: `https://<production-domain>/integrations/google/callback`.
5. Give me: **Client ID**, **Client Secret**. These go into Vercel env as `GOOGLE_OAUTH_CLIENT_ID` + `GOOGLE_OAUTH_CLIENT_SECRET`.
6. Decide 10.4 fallback: use his primary account or create `calendar@rebellogistics.com.au` as a dedicated sync account? (Dedicated is cleaner, avoids cross-company calendar clutter.)

### What I'll build once the client is live
- Settings → Integrations → "Connect Google Calendar" button; OAuth authorization code flow; refresh token stored in a new `integrations` table (per-user).
- One-way sync: on job Accepted/Scheduled, create event (title: "🚚 {customer} · {type} · {truck}", colour by truck, location = delivery address). Update on change, delete on Decline.
- Two-way sync (stretch): Calendar push notifications → webhook → update `job.date` in DB.

---

## 4. Xero OAuth app + scoped credentials

**Unblocks:** Phase 12.1 / 12.2 / 12.3 — auto invoice from completed jobs.

### What Yamen needs to do
1. https://developer.xero.com/app/manage → **New app** → Web app.
2. OAuth 2 redirect URI: `https://<production-domain>/integrations/xero/callback`.
3. Scopes we need: `offline_access accounting.contacts accounting.transactions`.
4. Give me: **Client ID**, **Client Secret**, Tenant ID (once he connects his org).
5. Decide: which GL account code is "200 Sales" in his chart (the actionables doc assumed `200`; needs confirming). Which tax type for GST-on-income (`OUTPUT` is the Xero code for 10% GST).
6. Decide scoping: one shared Xero connection, or per-user tokens? (The doc mentions "restricted access with per-person credentials" — needs unpacking.)

### What I'll build once the app is live
- **OAuth handshake** — callback route at `/integrations/xero/callback` that exchanges the auth code for access + refresh tokens, stores them in the Phase 10 `integrations` table (already deployed), and persists the tenant ID.
- **Per-job send** — wire the JobDetailDialog "Send to Xero" button to a new `useSendJobToXero` hook that calls `buildInvoiceFromJob()` (already built), POSTs to Xero via a thin `/api/xero/invoices` Edge Function, and writes the returned invoice id into `jobs.xero_invoice_id`.
- **Batch invoice on Customers tab** — multi-select uninvoiced jobs for a customer → preview the combined draft rendered from `buildBatchInvoice()` (already built) → send. Refresh invalidates both `['jobs']` and `['customers']`.
- **Status sync-back** — poll or webhook invoice status (Draft / Authorised / Paid / Overdue), surface next to the `StatusPill`, add "Overdue invoices" bell alert.
- **Shipped today (ready when creds drop)**: `xero_invoice_id` column (Phase 10 migration), `xeroInvoiceId` on the `Job` type, `src/lib/xero.ts` payload builders (per-job + batch + config knobs for account code / tax type), disabled "Send to Xero" / "Sent to Xero ✓" button in JobDetailDialog footer, Xero card in Settings → Integrations with copyable env-var pills.

---

## 5. Wordpress access on rebellogistics.com.au

**Unblocks:** Phase 15.1 — embed the public quote form on the marketing site.

### What Yamen needs to do
- Give me either:
  - Wordpress admin login (preferred — I'll drop the iframe snippet on the right page), **or**
  - Access to whoever maintains the site, plus the page URL to embed on.

### What I'll build
- `/quote` is already standalone-responsive. Swap it into an iframe on the Wordpress page with `allow="camera; geolocation"` and a matching viewport meta.
- Phase 15.2 (tracked status page, optional): tokenised URL per job (`/status/{token}`), read-only live view. No external dependency here — can start anytime.

---

## 6. NAS / Dropbox / Google Drive target (Phase 13.3 +1)

**Unblocks:** the auto-cleanup and direct-to-cloud backup sync — the +1 enhancement on top of the manual zip export (which we can build without any of this).

### What Yamen needs to do
- Decide which target he actually wants: NAS via WebDAV (needs server URL, username, password), Dropbox (OAuth), or Google Drive (OAuth — can reuse the Calendar OAuth client above).
- If WebDAV: share the NAS URL + credentials. If Dropbox: I'll register a Dropbox app, he authorises.

### What I'll build
- Phase 13.1/13.2/13.3 **manual** zip export can ship without this (file naming + download + optional storage cleanup). See Phase 13 in the main actionables doc — ready when you are.
- The +1 automated sync layer lands as a Settings → Backups target picker once we know which.

---

## Open decisions still to confirm with Yamen

Not blocked on credentials — just need a yes/no so scope is clear before we build.

- **Week view** on the driver shell: kept stripped per 7.8, or restore behind an owner-only preview? (Today the shell shows Today + Profile tabs only.)
- **Per-truck login migration (Phase 9.1):** clean break (new `truck1@rebellogistics.au` accounts, retire driver accounts) or dual-run (keep existing driver accounts, add truck accounts alongside, let him convert one by one)?
- **Twilio sender choice:** AU long-code number (receives replies, ~AUD 6/mo) or Alphanumeric Sender ID "Rebel Logistics" (free, one-way only)?
- **Xero credentials scope:** one shared org-wide token or per-user tokens?

---

## Pointer back

Main roadmap lives in `ACTIONABLES_POST_CALL_APR13.md`. This file only captures what's externally blocked — internal Phase 8 / 13 / 14 / 15.2 items are actionable today and should be picked up from the main doc.
