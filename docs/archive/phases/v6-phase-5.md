# V6 Phase 5 — Public form services map onto internal job types
**Status:** ✅ shipped 2026-09-16

## Source
2026-09-16, Yamin: when a customer picks a service on the website, the job should arrive already classified — delivery as Standard or White Glove, warehousing as storage, labour as hourly.

## The problem
A website enquiry inserts a `jobs` row with `status: 'Quote'` and a type from `SERVICE_OPTIONS` in `LeadForm.tsx`. Two of the five rows were wrong and one asked for something that did not exist:

| Public option | Job type |
|---|---|
| Standard delivery | `Standard` |
| White glove delivery & installation | `White Glove` |
| Warehousing & storage | `Storage` |
| Labour service | `Hourly rate` |
| Something else | `Standard` |

Previously: "Delivery & installation" → White Glove (now split in two), "Warehousing & storage" → Standard, "Labour & assembly" → Standard. "House / office relocation" was dropped as its own option — relocations come through Labour service, which lands on the same `Hourly rate` type, so nothing changes on the board.

## Storage is now a job type
There was no `Storage` job type — only a `services` catalog row used for customer pricing presets, and a separate `storage_records` module. Added `Storage` to the `JobType` union and to `jobs_type_check`.

- **Pricing:** `Storage` has no rate-book entry — storage is billed per month against a storage record's `monthlyRate`, not per cube or per hour. `calculateQuote` returns **0 with the explainer "Storage — set the fee manually"** rather than inventing a per-cube figure that would look like a real price.
- **Zone:** Storage carries no Metro/Regional zone. The furniture sits in our own warehouse.
- **Calendar:** Grape (colorId 3) — held, not moving.
- **Completion SMS:** `completeDefaultFor` is now `Standard || White Glove`. Storage ends with the customer's furniture in our warehouse, which is not a completed job from their side.

## Delivery split rather than guessed
"Delivery & installation" became **Standard delivery** and **White glove delivery & installation**. One option cannot auto-pick two types, and only the customer knows whether their piece needs careful handling and inside placement. The `/logistics` service page prefills the white-glove option.

## Ordering
The constraint was widened **before** the code deployed. Purely additive — no existing row changes and the previously-deployed build never writes `Storage` — so there was no mismatch window at all, unlike the Hourly rate rename.

## What's left
- **Storage jobs price at $0 until Yamin sets a fee.** Deliberate, but it means a storage enquiry shows no quote. If storage should auto-price, it needs a rate-book field.
- ~~`services.builtin` for the Storage row is left `false`~~ — **done 2026-09-16**, migration 19. All four catalog rows are now `builtin: true` and locked, mirroring the job types.
