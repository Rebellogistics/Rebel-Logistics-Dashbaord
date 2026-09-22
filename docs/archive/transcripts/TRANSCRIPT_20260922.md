# Session record — 2026-09-22 → 23

Not a call transcript. A working session in the dashboard repo, recorded here
because it settled pricing rules and scoped the next cycle. Yamin's own words
are quoted verbatim; everything else is summary.

Six commits shipped: `c8b2706`, `c7bbe88`, `6739e4e`, `60287ed`, `3377c28`,
`0cda2d9`. One production migration applied: `jobs.travel_hours`.

---

## 1. The client is one field

> "the fields titled company name, contact person, phone are not required for
> that particular job. which means company name field is a duplicate field to
> what customer stands for. as customer field should always be our client's
> details regardless if they are a company or an individual."

And later, on the profile side:

> "customer name is company name i would merge them and just title it Client
> name so regardless if they are an individual or a company thats where that
> will be example client name is the company Bayliss rugs or client name an
> individual called Yamin Kassouah i dont need to seperate fields for that."

Shipped on the job side in `c8b2706`. The profile-side merge is V8 P2.

## 2. Zone comes off both ends

> "if the pick up is regional and delivery is metro it will be charged as
> regional if the pick up is metro and delivery is regional it will be charged
> as regional if both metro it will be charged as metro."

With worked examples: Rubber Anchor in Geelong → Melbourne CBD is regional.
Set 2 Impress in Heidelberg → Geelong is regional. Ten deliveries off one
Bayliss load in the CBD: six metro drops are metro charges, four regional drops
are regional charges — **each delivery is its own job**.

Then the case that changes what a blank pickup means:

> "sometimes the pick up address will not always be filled as the items
> requiring deliveries might have been picked up separately on another day and
> the deliveries booked are being loaded from our warehouse"
>
> "so then that means its the delivery address which decides the price"
>
> "we will never move regional so loading from our warehouse is always metro"

Shipped in `c7bbe88`. Verified against the live list: Hallam 3803 and
Heidelberg 3084 are metro, Geelong 3220 is not.

## 3. Travel time

> "we need to add an option to charge travel time if required depending on the
> distance"

Rate confirmed as the job's own truck rate. For Labour, where there is no truck:

> "four labourers × travel hours × $60 (the whole crew's time, same as their
> working time) is the correct answer"

And that regional on-site labour needs it:

> "good question yes they will require travel time charge"

Shipped in `6739e4e`, migration `20260922000001_v7_phase7_travel_time.sql`.

## 4. Container unload stays in-house

> "container unload the rate is different on the client's site but i would
> usually just booked it under labour service so there is no confusion as
> container unload is primarily a service we provide inhouse at our warehouse."

This deleted a whole branch from the V8 design — no on-site unload mode, no
second set of container rates, and scenario 3 collapsed into "a Labour job at
one of the client's sites".

## 5. Contacts are a list

> "we may have a client with multiple contacts one for their showroom one for
> their warehouse or one for the office in-charge of deliveries so depending on
> which is selected when the job is charged that will become the contact."

## 6. Who gets the SMS

> "on a bayliss job the recipient is the one to recieve the sms text"

Deferred to V8 P8 on Yamin's agreement — it is outward-facing and all three
outbound sends currently go to the account's number.

## 7. Proof photos and stops

Asked whether a three-warehouse install is one job or three, and whether each
stop needs its own photo and timestamp:

> "if for example any of the items are damaged then yes they must take a photo
> for our records to reduce liability so what we can do is when a collection is
> done ask a question is there damage visible if yes take photos if not then no
> need but we always take photos for final delivery. and yes to the timestamp.
> and only one line for the job which includes all pick up locations and
> delivery address."

## 8. Search, and the merge tool

> "when searching we always search by client never their address"

which removed work from V8 P7. And on duplicates:

> "im not too worried about job history i would rather start clean when all of
> this in order i might even delete everything and start fresh but for now if
> choosing two records and moving things across is what makes this work then do
> that."

## 9. The dialogs

> "i would like to have everything accessible with out having to scroll unless
> im using a phone screen"
>
> "when travelling a 13inch screen is my go to laptop size so if it can fit on
> that perfect and if it needs to adjust to others then do that too"

Led to `3377c28` and `0cda2d9`. Three columns was rejected on arithmetic —
at `4xl` a third column is 267px, narrower than the 294px it has today.

Yamin also approved folding Activity / History / Proof photos / Signature into
one tab strip, reversibly:

> "fold them for now and if we need to change that to having them stacked we
> should be able to do so later"

## 10. A correction worth recording

Mid-session I proposed hiding the job dialog's read rows while editing, on the
basis that they duplicated the edit grid. They do not — six of those rows are
the ONLY editors for pickup, delivery, recipient, recipient phone, date and
customer phone. Yamin had already said "hide the read rows when editing" before
the error was caught. It was corrected before anything was changed. Only the
genuinely read-only Truck and Total rows were ever safe to drop, and he chose to
leave those alone for now:

> "go with 1-3 and leave 4 alone for now i will review it when this is live and
> change it if needed after"

## 11. Process

After a commit-splitting script overwrote the working tree before its own check
ran, costing three commits' worth of edits that had to be replayed:

> "moving forward can we check before the build to make sure we dont make those
> mistakes again"

Recorded as memory `verify-before-overwriting`.
