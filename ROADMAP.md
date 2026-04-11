# Rebel Logistics — Real Roadmap

This is not a wishlist. It is what Yemen should actually build to make this
product pay for itself inside 60 days. Every item has a reason and, where
possible, a rough time-to-value estimate. If an item cannot justify itself on
revenue, time saved, or risk reduced, it is not on this list.

Written with the assumption that: (a) Rebel Logistics is a real business with
two trucks operating in Melbourne; (b) Yemen wants to stop losing money on
missed invoices and missed repeat bookings; (c) every hour of development
should either bring in a job or save Yemen time on a job he already has.

---

## What has shipped

Five phases of work are in the repo. They add up to a functional ops
dashboard: quote intake, accept/assign workflow, daily truck-run view, daily
review dashboard, weekly and monthly review screens, SMS audit log. None of
it has been touched by a real customer yet. The SMS system is a logged-only
stub. The app runs on localhost.

**Nothing in this app makes money today.** The goal of the next 60 days is
to change that.

---

## Launch blockers — do this week or the app is a demo

These five items gate real use. Without them, Yemen cannot give out the URL,
SMS cannot go out, and any customer data that lands here is at risk.

### 1. Deploy to production. **Cost: 15 minutes. Value: unblocks everything.**
Push the repo to GitHub and connect it to Vercel. Point a real domain at it
(rebel-logistics-ops.com or a subdomain of the main site, whichever exists).
Free tier is more than enough for one user. Configure the two Supabase
environment variables in the Vercel dashboard. Done. This is not technical
work — it is a 15 minute wizard. The reason it is blocker #1 is that every
item below assumes the app is accessible from a phone in a warehouse, not
from a laptop on Yemen's kitchen table.

### 2. Authentication. **Cost: 2-4 hours. Value: nobody else can read your customer list.**
Supabase Auth ships with email + password login out of the box. Add a single
owner account with Yemen's email. Wire the Logout button in the sidebar.
That is it. No roles, no password reset flow, no forgot-password email — this
is a one-user app until it is not. Can be upgraded later. The risk of not
doing this is that your anon key is in the deployed JS bundle and anyone
with DevTools can read every customer name, phone number, pickup address,
and job value. Not a theoretical risk — it is a real, trivial exploit.

### 3. Harden row-level security. **Cost: 30 minutes. Value: defense in depth.**
Current RLS policies are `USING (true)` on every table, meaning anyone with
the anon key can read or write anything. Once auth is in place, change
every policy from `USING (true)` to `USING (auth.uid() IS NOT NULL)`. Four
tables × four operations = sixteen one-line SQL statements. Ship it in the
same SQL editor session as the migrations.

### 4. Real SMS provider. **Cost: half a day. Value: the whole notification layer starts working.**
Replace the body of `sendSms` in `src/lib/sms.ts` with a real provider call.
The cleanest path is ClickSend or MessageMedia for Australian numbers —
both have straightforward HTTP APIs, both support Australian short codes
and sender IDs, both are cheaper than Twilio for AU traffic (expect
$0.08-$0.10 per SMS versus Twilio's ~$0.12). Set up a Supabase Edge
Function that wraps the provider API so the provider API key never goes
near the browser. Env vars in the Edge Function, nothing in the client
bundle. The whole "Day-prior SMS" section, the "En-route" button, the
"Notifications Sent" KPI, and the SMS Log tab become real the moment this
ships. Budget ~$50-$150 per month for SMS, which is noise next to one
saved dispute.

### 5. Edit Job dialog. **Cost: 2 hours. Value: closes the Missing Info loop.**
The Dashboard flags jobs with missing info but there is no way to fix them
from the UI. Yemen would need to open the Supabase table editor. Build a
small `EditJobDialog` that reuses `NewQuoteDialog`'s form in edit mode —
same fields, pre-filled with existing values, submits via `useUpdateJob`.
This is the one piece of interaction that is obviously missing when you
use the app for 30 seconds.

**Total blocker work: ~2 days.** After this, the app is usable by Yemen
as his daily tool. Everything else on this roadmap assumes blockers are
done.

---

## Week 1 — plug the money leaks

These do not change what the app does. They stop Yemen from losing money he
has already earned. Each one pays for itself on the first use.

### 6. Xero integration (push only). **Cost: 1 day. Value: ~30 min/day saved, 0% invoice leakage.**
Xero has a standard OAuth2 flow and an Invoices API. After a job flips to
Completed, a button pushes the fee + fuel levy to Xero as a draft invoice
with the customer name, job ID as reference, and line items for the base
rate and the levy. Yemen reviews and sends from Xero. This is the single
highest-leverage build on the roadmap because the SOP explicitly names
Xero and because end-of-day invoicing is the thing owner-operators hate
doing most. 30 minutes saved per day × 5 days × 50 weeks = 125 hours per
year. Plus the "jobs completed but never invoiced" leakage goes to zero,
which is easily worth thousands per year on its own.

### 7. Customer FK and quick-add dialog. **Cost: 4 hours. Value: prerequisite for everything retention-related.**
Right now `jobs.customer_name` is a free text string. Two customers named
"Sarah" are indistinguishable. Repeat customer detection is impossible.
Migrate to `jobs.customer_id` referencing the existing `customers` table.
The NewQuoteDialog's customer name field becomes a searchable autocomplete
that either selects an existing customer or offers "Create new customer"
inline. Back-fill the existing string data by matching on name + phone.
Every retention move below depends on this.

### 8. Fuel levy audit on the Weekly Review. **Cost: 1 hour. Value: catches undercharges.**
Add one row to the Weekly Review's Long-distance Review section: "Jobs
over 40km without fuel levy applied." This is a direct revenue leak the
SOP mentions. Every missed levy is $25 walking out the door. If Yemen
catches one per week that is ~$1300 per year from one hour of work.

### 9. Repeat customer callout on NewQuoteDialog. **Cost: 2 hours. Value: faster quotes, more trust.**
When Yemen types a phone number into the quote form and it matches an
existing customer, show a small banner: "Repeat customer — 4 previous
jobs, last one 23 days ago. Default pickup: 513 Gunung Walat." Auto-fill
pickup if it matches. Trust signal both ways: Yemen sounds like he
remembers them, customer books faster.

**Total week-1 work: ~2.5 days.** At the end of week 1 the app is
defending Yemen's revenue instead of just describing it.

---

## Week 2-4 — acquisition channels

This is the growth-hacker section. The current app only manages inbound
jobs; it does nothing to produce them. Every item here turns on a new
channel or automates an existing one.

### 10. Public quote request form. **Cost: 1 day. Value: the cheapest lead channel you will ever have.**
A single-page public form at `/quote` where a prospective customer can
enter pickup, delivery, item description, phone, and preferred date. Hits
Supabase directly as a row with status `Quote`. Appears in Yemen's
Outstanding Quotes section within seconds. No auth required — that's the
point. Embed the link everywhere: Google Business Profile, Facebook page,
Instagram bio, email signature, invoice footer. Every lead that used to
require a phone call now takes 30 seconds of the customer's time and zero
of Yemen's. For every 20 submissions that are real, Yemen gets ~5-8
accepted jobs he would not otherwise have reached. At $80-$200 per job
that is $400-$1600 per 20 leads for a one-day build.

### 11. Airtasker/Facebook Marketplace lead capture. **Cost: half a day. Value: automates what Yemen already does manually.**
Yemen almost certainly gets leads from Airtasker, Gumtree, and Facebook
Marketplace today. Those leads arrive as emails or DMs. Set up a dedicated
email address (leads@rebel-logistics.com.au) with a forwarding rule that
pipes matching emails to a Supabase Edge Function, parses the body with a
regex or a quick LLM call, and inserts a row as a Quote. He stops
copy-pasting. Every lead lands in the same Outstanding Quotes inbox
regardless of source. The `customers.source` column (add it in the same
migration) captures which channel each lead came from, which feeds item
16 below.

### 12. Google Business Profile integration. **Cost: 2 hours. Value: free qualified leads.**
Not a code build — a setup task. Claim the business on Google Maps, add
photos of the trucks and completed jobs, set service areas, enable
messaging, add the public quote form URL. For a local logistics business
this is the single highest-ROI marketing move that does not involve code.
Rank above competitors in "removalist near me" for 20 minutes of work.

### 13. Review request SMS post-delivery. **Cost: 3 hours. Value: compounding trust.**
Three days after a job flips to Completed, send the customer an automated
SMS: "Hi {name}, thanks for booking with Rebel Logistics last week. If we
did a good job, would you mind dropping a quick review on Google? [link]
We're a small family business and reviews mean everything to us." Wire it
to the existing `sendSms` function with a new `type: 'review_request'`
entry. Schedule via a Supabase scheduled Edge Function that runs daily
and finds eligible completed jobs. Each Google review is worth roughly 5
future inquiries from organic search. 10 new reviews per month moves the
needle on the local pack ranking in 90 days.

**Total week 2-4 work: ~2 days of code + setup tasks.** By end of month 1
the app is acquiring jobs, not just managing them.

---

## Week 5-8 — measure what matters

Everything above is unmeasurable until Yemen can see the funnel. This
section turns the daily/weekly/monthly reviews into decision tools.

### 14. Quote conversion rate on the Weekly Review. **Cost: 2 hours. Value: tells Yemen if his pricing is right.**
Add one card to the Weekly Review: "Quote conversion rate — X of Y quotes
accepted this week (Z%)". If the number is below 50%, quotes are priced
too high or not being followed up on. If it is above 85%, quotes are
priced too low. Split by source (Airtasker vs public form vs phone) once
customer.source exists from item 11.

### 15. Time-to-quote metric. **Cost: 1 hour. Value: identifies slow response as a revenue killer.**
Track the time between a quote being created and being Accepted or
Declined. Show the median in the Weekly Review. Under 2 hours on a phone
lead is excellent; over 24 hours means Yemen is losing jobs to faster
competitors. This one metric reveals whether Yemen's quote workflow is
actually saving him time.

### 16. Channel attribution. **Cost: 1 hour once customer.source exists.**
Monthly Review gains one card: "Jobs by source" — pie or list showing
Airtasker, Public form, Google, Phone, Facebook, Referral. Yemen learns
within 60 days which channels are worth feeding and which to ignore. This
is the single most valuable data point a small service business can have,
and it costs one hour to display once the data exists.

### 17. Referral tracking. **Cost: half a day. Value: 5-15% of bookings from existing customers.**
Add a `referred_by_customer_id` column to jobs. When Yemen creates a
quote he can optionally link it to the customer who referred them. Each
completed referral triggers a $20 credit to the referrer's next booking.
Show the top referrers in the Monthly Review. Referred customers convert
at 4-5x the rate of cold leads and cost $0 to acquire. For a
micro-business with a good service this is usually the second-largest
acquisition channel after Google.

**Total week 5-8 work: ~1.5 days.** At the end of month 2 Yemen knows
which channels are producing and which are not.

---

## Month 3 and beyond — earned features

Do not start any of these until everything above is live and Yemen has been
using the app for 30+ days. They are speculative in priority. The data
collected in weeks 1-8 will tell Yemen which of these to build.

- **Stripe card-on-file for no-show protection.** A real problem if
  cancellations are above 10%. Not a problem if they are not.
- **Photo gallery per job** (multiple photos instead of one URL). Only
  valuable if Yemen actually wants to market "before and after" shots on
  Instagram, otherwise one stopgap URL is enough.
- **Driver mobile PWA.** Only worth building when there is a third driver.
  Until then the desktop view works because Yemen assigns and reviews from
  his own phone.
- **Recurring bookings.** Only worth building once a repeat-customer
  cohort of 5+ exists with weekly or bi-weekly cadence. Measurable via
  item 9.
- **Pricing engine** (rules-based quote calculator). Only worth building
  once Yemen is manually quoting >15 jobs per week, when consistency
  starts to matter more than flexibility.
- **Route optimization.** Only worth building with 5+ jobs per truck per
  day. Yemen currently has 2-4. Google Maps in the truck is the right
  tool until the job count justifies the code.
- **Damage claims workflow.** Build when a dispute actually happens and
  Yemen feels the pain of tracking it in a notebook, not before.
- **COI / insurance expiry reminders.** 30 minutes of work, but skip
  until Yemen has his first near-miss with an expired document.

Every item in this section is a reaction to real data Yemen does not have
yet. Building any of them before the data exists is guessing.

---

## Things to explicitly NOT build

These came up as ideas during the project. They do not belong in this
business at this stage. Discipline is saying no.

- **Multi-tenancy or franchise model.** Rebel Logistics is not a platform
  company. If this ever becomes a problem, it will be a 6-month rebuild
  and that is fine.
- **Real-time GPS truck tracking.** Customers do not need it, Yemen does
  not need it, Google Maps in the cabin does the job.
- **Native mobile apps.** A PWA or even a mobile-responsive web app is
  sufficient for a 2-3 truck operation forever.
- **Route optimization beyond "check Google Maps".** Premature.
- **Driver performance dashboards.** There are two drivers and Yemen
  knows how they are doing without a dashboard.
- **CoR / heavy vehicle compliance.** Only matters if trucks exceed 4.5t
  GVM. Check before going there.
- **Custom charts or BI dashboards beyond what is already in the Weekly
  and Monthly Review.** Simple numbers on cards are enough.
- **Multi-depot, interstate expansion, cross-docking.** All of these are
  2-3 years away if they ever happen, and the current codebase can be
  extended when they do.
- **Template editor UI for SMS messages.** Hardcoded constants in
  `src/lib/sms.ts` are fine forever. Yemen can PR a word change in 2
  minutes.
- **Automated testing.** Controversial take — but for a one-developer
  project at this stage, tests slow down iteration more than they protect
  it. Revisit after month 3 when the shape of the app has stabilized.

---

## Honest summary

**Total work to reach "actually making money" state: ~8-10 days of focused
development plus ~1 day of setup and deployment.** That is the entire
realistic roadmap for the next 60 days. Everything past item 17 is a
reaction to data that does not exist yet.

The mistake most technical founders make at this stage is building items
from the "Things to explicitly NOT build" list because they are
interesting, instead of items from the "Launch blockers" list because they
are necessary. Discipline here is worth more than cleverness.

If Yemen had to pick three items to ship next week and nothing else, the
answer is: deploy + auth (item 1-2), real SMS (item 4), and Xero push
(item 6). Those three unlock the whole app as a revenue tool. Everything
else waits for them.
