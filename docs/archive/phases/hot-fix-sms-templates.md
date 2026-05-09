# Hot-fix — SMS templates not updating (during V4 Phase 2 work)
**Status:** ✅ shipped 2026-05-04 · **Commit:** `e5d9267` · **Trigger:** Yamin's bug report: "can't get the SMS template to update on Twilio reply SMS when received."

## What was wrong (3 things — all "Settings edits didn't reach customers")

1. **Auto-fired SMS** (en-route on *Start run*, delivered on *Mark delivered*) was reading from hardcoded `DEFAULT_TEMPLATES` constant, **never** the `sms_templates` DB rows.
2. **Twilio inbound auto-reply** was hardcoded inline in `api/sms/inbound.ts`. No template row, no Settings UI.
3. **Settings → SMS Templates editor** had a `setState`-during-render anti-pattern. Synced draft once on first selection, refused to re-sync after Save refetch. Made it look like edit hadn't landed.

## What's done
- **Auto-fire reads `sms_templates`.** `maybeAutoFireStatusSms` queries DB row by key (`en_route` / `completed`); only falls back to defaults if missing/inactive/error.
- **Twilio inbound reads `sms_templates`.** `api/sms/inbound.ts` queries `sms_templates` (key=`auto_reply`) via service-role admin client. Renders `{{owner.businessName}}` and `{{owner.phone}}` from `REBEL_BUSINESS_NAME` / `REBEL_SUPPORT_PHONE` env vars.
- **Built-in `auto_reply` template** added to `DEFAULT_TEMPLATES` so it appears in Settings list.
- **Editor anti-pattern fixed.** Replaced during-render `setState` with `useEffect` keyed on selected template's key/id.
- **Variable palette** exposes `{{owner.phone}}`.

## What's left
✅ Nothing — fully shipped.

## Yamin must do (already in STATUS.md punch list)
- Set `REBEL_SUPPORT_PHONE` + `REBEL_BUSINESS_NAME` on Vercel.

## Files touched
- `src/hooks/useSms.ts`
- `src/lib/sms.ts`
- `src/components/settings/SmsTemplatesSection.tsx`
- `api/sms/inbound.ts`
