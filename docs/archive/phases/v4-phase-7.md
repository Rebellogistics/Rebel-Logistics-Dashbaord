# V4 Phase 7 — Twilio AU alphanumeric sender
**Status:** ⏳ in flight (infra ready, blocked on AU carrier registration) · **Commit:** `3afeaef`

## Status update — what we actually learned (2026-05-05)
- **Infra is ready.** `TWILIO_SENDER_ID` env var override wired through every send path; `GET /api/sms/config` + the *SMS sender* card on Settings → Integrations show the live state.
- **First live test failed** with Twilio error: *"Message cannot be sent with the current combination of 'To' (+61414…) and/or 'From' (Rebel LGTCS) parameters."*
- **Root cause:** Australian mobile carriers (Telstra/Optus/Vodafone) started filtering unregistered alphanumeric senders in late 2024. Twilio's account-level "Status: Enabled" feature flag isn't enough — the sender ID itself must be registered via Twilio's regulatory compliance flow before AU carriers accept it. (Earlier "trial account" hypothesis was wrong — Yamin is on Pay-as-you-go with funds on file.)
- **Until registration approves:** Yamin clears `TWILIO_SENDER_ID` on Vercel so customer SMS keeps flowing through the AU phone number. Hot-flips back the moment the approved string is re-set.

## What's done
- **`TWILIO_SENDER_ID` env override** wired in `api/sms/send.ts`. When set, every outbound uses that as the `From`. Falls back to `TWILIO_FROM` (the AU number) when unset. Vercel hot-loads env on next request — no redeploy.
- **`GET /api/sms/config`** returns public bits (current sender, inbound number, alphanumeric flag) — no secrets. Auth-gated.
- **Settings → Integrations → "SMS sender" card** (`SmsSenderCard`) reads the endpoint and shows two-tile readout: *Outbound from* (live sender) + *Inbound to* (AU number for replies). Amber info banner when alphanumeric is active explaining the reply gotcha.
- **`.env.example`** updated with the new var.

## What's left (🔴 — open items live in STATUS.md punch list)

1. **Right now:** clear `TWILIO_SENDER_ID` on Vercel so customer SMS keeps flowing through the AU number.
2. **Submit AU sender registration** via Twilio Console → **Regulatory Compliance → Messaging Compliance → Sender ID Registration**. ABN cert + sample message + use case. 1–2 week approval. Try `RebelLGTCS` (no space) first; falls back to `Rebel LGTCS` if no-space rejected.
3. **When approval email arrives** → re-add `TWILIO_SENDER_ID` to Vercel with the approved string. No redeploy. Settings → Integrations → *Outbound from* tile flips to alphanumeric chip.
4. **Test send** to your phone — message arrives showing the approved sender.
5. **Tweak templates** to mention `Reply to {{owner.phone}}` so customers know how to reach back (alphanumeric is outbound-only in AU).

## How to verify wiring is live (without approval)
- Settings → Integrations → *SMS sender* card. *Outbound from* tile shows AU number. Muted info banner explains the flip.
- `curl -H "Authorization: Bearer <JWT>" https://<domain>/api/sms/config` → `{ "sender": "+61...", "isAlphanumeric": false, "overrideActive": false, ... }`.

## Deferred
- Per-truck phone numbers (7.2 +1).
- Two-sender split (REBEL for promo, AU for transactional).

## Files touched
- `api/sms/send.ts`
- `api/sms/config.ts` (new)
- `src/hooks/useSmsConfig.ts` (new)
- `src/components/settings/SmsSenderCard.tsx` (new)
- `src/components/settings/IntegrationsSection.tsx`
- `.env.example`
