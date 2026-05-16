# V5 Phase 4 — Google review SMS template + brand-owned URL shortener
**Status:** ✅ shipped 2026-05-16 · **Commit:** `99b1d24`

## Source
2026-05-15 call. Yamin wants a "leave a Google review" SMS after job completion. Sumanyu offered to bundle a URL shortener so the GMB link doesn't look ugly. Customer firstname variable was proactive but already implemented (`{{customer.firstName}}` existed in `src/lib/sms.ts` since V4).

## What's done
- **Schema:** new `short_links` table (slug PK / target_url / owner_label / hit_count / created_at / updated_at) with owner-only RLS. Seeded `rebel` slug pointing to a Google search URL (placeholder until Yamin sends the real GMB review link). `sms_templates.type` + `sms_log.type` CHECK constraints widened to allow `'review_request'`.
- **API:** `GET /api/r?slug=X` → 301 redirect to `target_url`, async hit_count bump. Public (no auth). Service-role lookup bypasses RLS.
  - **Design call:** `?slug=X` query param instead of `/r/[slug]` clean URL because Vite api-handlers plugin doesn't support dynamic segments and adding it was scope creep. Shortened URL is ~37 chars + domain — fine for SMS.
- **Template:** new `review_request` SmsType + DEFAULT_TEMPLATES entry. Seeded into `sms_templates` so it shows in the Settings editor immediately.
- **`{{review.url}}` variable** resolves to `window.location.origin + /api/r?slug=rebel` automatically (override via `VITE_REBEL_REVIEW_URL` env).
- **UI:** "Send Google review request" item in JobActionMenu when `job.status === 'Completed'` and customer has a phone. Wired through JobDetailDialog + BoardView + TruckRunsView (same handler pattern as `send_day_prior`).

## What's left
- **Yamin: send the real GMB review URL** → run `UPDATE public.short_links SET target_url='...' WHERE slug='rebel';` via Supabase MCP.
- **Optional:** Settings UI for short_links CRUD (~30 min). Today Sumanyu / Yamin update via SQL.
- **Optional:** auto-send at 6pm + 90-day dedup. Today manual button only.

## Files touched
- `api/r.ts` (new)
- `supabase/migrations/20260516000003_v5_phase4_short_links_and_review_template.sql` (new)
- `src/lib/types.ts`, `src/lib/sms.ts`, `src/hooks/useSms.ts`
- `src/components/jobs/JobActionMenu.tsx`, `JobDetailDialog.tsx`
- `src/components/board/BoardView.tsx`
- `src/components/truck-runs/TruckRunsView.tsx`
- `src/components/sms/SmsLogView.tsx`
