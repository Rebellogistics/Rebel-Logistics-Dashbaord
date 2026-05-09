# Rebel Logistics — project orientation

Yamin Kassouah's logistics dashboard. Owner-side dashboard + driver-side
truck shell + customer-facing public quote form.

## Stack
- React + Vite (`vite.config.ts`)
- Supabase (Postgres + Auth + Storage + Realtime)
- Vercel serverless `/api/*` for Twilio + Google Calendar OAuth
- Custom Vite plugin (`vite-api-handlers-plugin.ts`) runs `/api/*` under plain `npm run dev`

## Where the truth lives
- **Open action items:** [`V4_STATUS.md`](V4_STATUS.md) — top section pinned, scan that first
- **Roadmap (V4):** [`V4_PHASED_PLAN.md`](V4_PHASED_PLAN.md)
- **DB schema:** `supabase/migrations/*.sql` (live state mirrored in `src/lib/database.types.ts`)
- **Domain types:** `src/lib/types.ts`
- **SQL guide for new envs:** [`SUPABASE-RUN-THIS.md`](SUPABASE-RUN-THIS.md) (Blocks 1–9)
- **Shipped V3 history:** `docs/archive/v3/` — only read if the user references V3 specifically
- **May 4 call transcript:** `docs/archive/transcripts/TRANSCRIPT_MAY04.md` — only read if quoting verbatim; key decisions already captured in `V4_STATUS.md`

## Auto-applied memories
`~/.claude/projects/-Users-sumanyusood-Downloads-Rebel-Logistics/memory/MEMORY.md` — user role, feedback rules, meeting state. Loads automatically.

## Default behaviours
- DB writes go through Supabase MCP (`mcp__supabase__apply_migration`, `mcp__supabase__execute_sql`) for migrations + verification.
- Production deploys auto-trigger on `git push origin main` via Vercel.
- Build verify: `npx tsc --noEmit && npx vite build`.

## Don't
- Read `docs/archive/**` unless user references V3 / a specific transcript moment.
- Add new doc files when an existing one fits — append to `V4_STATUS.md` chronologically.
- Touch `node_modules`, `dist/`, `.env*`.

## Protocol: when given a new transcript or call notes
A new session is given a new transcript and asked to plan. **Don't draft a fresh plan in isolation — carry forward what's already pending.**

1. **Before reading the transcript**, read `V4_STATUS.md` "Open action items" section in full. Memorize the 🔴/🟡/🟢/🟣 lists.
2. Read the new transcript.
3. For each ask in the transcript, mark it as either:
   - **resolves an open item** → mark for completion in the new plan
   - **modifies an open item** → fold into existing item with note
   - **brand-new ask** → add as new phase
4. **Every open item the transcript doesn't address stays open.** Carry forward verbatim into the new plan.
5. Write the new plan as additional sections appended to `V4_STATUS.md` (or `V5_STATUS.md` if it's a discrete new cycle — but the punch list at the top is always the union of carried-forward + new). Don't replace; append.
6. Save the new transcript to `docs/archive/transcripts/TRANSCRIPT_YYYYMMDD.md`. Reference it from the status doc.
7. Update `~/.claude/projects/.../memory/` for any new persistent rules (feedback / project type entries — see `MEMORY.md` for the format).
8. Verify by re-reading the status punch list one more time before declaring the plan ready.

Success criterion: an item flagged 🔴 in the previous status doc is either ✅ closed in the new plan or still 🔴 in the new plan. Never silently dropped.
