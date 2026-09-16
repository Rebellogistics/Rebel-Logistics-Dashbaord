# V6 Phase 3 — Google review link live + completion SMS + Job complete default
**Status:** ✅ shipped 2026-09-16 · **Commits:** `ab6eae6`, `269bce8` + DB changes

## Source
2026-09-16. Yamin supplied the real Google review URL and asked for the completion SMS to carry the review ask, with the Job complete toggle ticked automatically for delivery work but not house moves.

## What's done
- **Review URL wired.** `short_links` row `slug='rebel'` now points at `https://g.page/r/CST_WS2b9N8sEBM/review`. It had been a placeholder Google **search** URL — for "Rebel Logistics **Sydney**", the wrong city. `{{review.url}}` → `/api/r?slug=rebel` → 301 → the review form. Chain verified against production.
- **`completed` template rewritten** in `sms_templates`:
  > Hi {{customer.firstName}}, your job is now complete. Please leave us a review: {{review.url}}
  > Thanks for using us.

  The live row had drifted from the code seed and read "**Hi** Your delivery is complete" — the `{{customer.firstName}}` token had been lost, so every message went out with a bare "Hi". Restored.
- **New Quote dialog toggles** (`ab6eae6`) surface Day-prior / En-route / Job complete as checkboxes at creation.
- **Job complete defaults by job type** (`269bce8`): ticked for `Standard` and `White Glove`, unticked for `Hourly rate`. Changing the type re-derives it — including the hourly-customer prefill, which flips the type on its own. Ticking by hand sets `completeTouched` and stops re-derivation, so an explicit choice is never overwritten. Rebooking carries the original job's setting across.

## Closes
Open action items **#3** (`{{review.url}}` resolves), **#7** (inline the review ask in `job_complete`) and **#9** (send the real GMB review URL).

## Design note
Day-prior and En-route still default **off** — unchanged. Only Job complete changed, because it is now the message that does the review ask. A house move ends with the crew standing in the customer's new lounge room, where "your job is complete" reads oddly; a delivery ends with the customer elsewhere.

## What's left
- The click path was never exercised in a browser: the dialog is behind dashboard auth and the local `.env` carries placeholder Supabase credentials. `tsc` and the build pass; the box state on type change is unverified by eye.
