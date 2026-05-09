# Rebel Logistics — project orientation

Yamin Kassouah's logistics dashboard. Owner-side dashboard + driver-side
truck shell + customer-facing public quote form.

## Stack
- React + Vite (`vite.config.ts`)
- Supabase (Postgres + Auth + Storage + Realtime)
- Vercel serverless `/api/*` for Twilio + Google Calendar OAuth
- Custom Vite plugin (`vite-api-handlers-plugin.ts`) runs `/api/*` under plain `npm run dev`

## Where the truth lives
- **Single living state doc:** [`STATUS.md`](STATUS.md) — open action items pinned at top, phase index with "what's left" column, in-flight phase detail inline. Scan this first.
- **Per-phase detail (shipped):** [`docs/archive/phases/v4-phase-{1..6}.md`](docs/archive/phases/) — only read if the user asks about a specific shipped phase.
- **In-flight phase detail:** stays inline at the bottom of `STATUS.md` until shipped, then moves to `docs/archive/phases/`.
- **DB schema:** `supabase/migrations/*.sql` (live state mirrored in `src/lib/database.types.ts`).
- **Domain types:** `src/lib/types.ts`.
- **SQL guide for new envs:** [`SUPABASE-RUN-THIS.md`](SUPABASE-RUN-THIS.md) (Blocks 1–9).
- **V3 history:** `docs/archive/v3/` — only read if the user references V3 specifically.
- **V4 cycle artefacts (superseded):** `docs/archive/v4/V4_STATUS.md`, `V4_PHASED_PLAN.md` — superseded by `STATUS.md`. Read only if you need original V4 context.
- **Call transcripts:** `docs/archive/transcripts/TRANSCRIPT_*.md` — only read if quoting verbatim; key decisions land in `STATUS.md`.

## Auto-applied memories
`~/.claude/projects/-Users-sumanyusood-Downloads-Rebel-Logistics/memory/MEMORY.md` — user role, feedback rules, meeting state. Loads automatically.

## Default behaviours
- DB writes go through Supabase MCP (`mcp__supabase__apply_migration`, `mcp__supabase__execute_sql`) for migrations + verification.
- Production deploys auto-trigger on `git push origin main` via Vercel.
- Build verify: `npx tsc --noEmit && npx vite build`.

## Don't
- Read `docs/archive/**` unless user references a specific phase / transcript moment.
- Add new top-level doc files. The pattern is: `STATUS.md` for live state; `docs/archive/phases/<phase>.md` for shipped detail; `docs/archive/transcripts/` for call transcripts.
- Touch `node_modules`, `dist/`, `.env*`.

## Protocol: when given a new transcript or call notes
A new session is given a new transcript and asked to plan. **Don't draft a fresh plan in isolation — carry forward what's already pending.**

1. **Before reading the transcript**, read `STATUS.md` "Open action items" section in full. Memorize the 🔴/🟡/🟢/🟣 lists. Also scan the **Phase index** table — note any rows with non-empty "What's left" cells.
2. Read the new transcript.
3. For each ask in the transcript, mark it as either:
   - **resolves an open item** → mark for completion in the new plan, update its row in the Phase index
   - **modifies an open item** → fold into existing item with note
   - **brand-new ask** → add as new phase row in the Phase index
4. **Every open item the transcript doesn't address stays open.** Carry forward verbatim — both the cross-phase "Open action items" section and any per-phase "What's left" entries.
5. Plan output:
   - New phase = new row in `STATUS.md` Phase index + new file `docs/archive/phases/v<n>-phase-<m>.md` with full detail (or kept inline in STATUS.md until shipped, then move).
   - Shipped phase = collapse to one-liner in Phase index, full detail moves to `docs/archive/phases/`.
   - Action items (cross-phase blockers) stay in STATUS.md top section, never archived until resolved.
6. Save the new transcript to `docs/archive/transcripts/TRANSCRIPT_YYYYMMDD.md`. Reference it from STATUS.md if it drove a major decision.
7. Update `~/.claude/projects/.../memory/` for any new persistent rules (feedback / project type entries — see `MEMORY.md` for the format).
8. Verify by re-reading the STATUS.md punch list + the "What's left" column one more time before declaring the plan ready.

Success criterion: an item flagged 🔴 in the previous STATUS is either ✅ closed in the new plan or still 🔴. A phase with non-empty "What's left" either has those items addressed in the new plan or carried forward verbatim. **Never silently dropped.**
