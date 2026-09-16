// ---------------------------------------------------------------------------
// Audience pages — the same services, told from the reader's side of the desk.
//
// The service pages (/logistics, /warehousing, /labour) are organised the way
// the business is organised. These are organised the way a customer searches:
// a designer looking for someone to install a client's job does not search for
// "logistics", and does not want to read about container unpacks on the way to
// finding out whether we can be trusted in a finished house.
//
// Every segment here has a real customer behind it, drawn from the Google
// reviews and the client list rather than invented:
//   designers  — Lisa Hunter, Dani McMillan-Lyons; Blainey North
//   showrooms  — Cafe Lighting & Living; Fendi, Versace, Articolo, Cult
//   commercial — Taige Alhadweh
//   private    — Sheila Roshan
//
// `quote` is a verbatim Google review. Do not paraphrase these or attribute
// them to anyone who did not write them.
// ---------------------------------------------------------------------------

export type Audience = {
  slug: string;
  /** Nav and breadcrumb label. */
  label: string;
  /** H1. */
  title: string;
  /** Hero paragraph — full sentences, the register of the home page. */
  lead: string;
  seoTitle: string;
  seoDescription: string;
  /** The reader's problem, in their terms, before any pitch. */
  problem: { heading: string; body: string[] };
  /** Concrete deliverables. Keep to things we actually do. */
  included: string[];
  /** How a job runs, start to finish. Numbered on the page, so order matters. */
  process: { t: string; d: string }[];
  /** Verbatim Google review from someone in this segment. */
  quote: { text: string; name: string; context: string };
};

export const AUDIENCES: Audience[] = [
  {
    slug: 'designers',
    label: 'Interior designers',
    title: 'For interior designers',
    lead: 'You specified it, sourced it and waited months for it. We are the part between the showroom floor and the photograph.',
    seoTitle: 'Furniture Logistics for Interior Designers Melbourne | Rebel Logistics',
    seoDescription:
      'Delivery, installation and storage for Melbourne interior designers. Pieces held until site is ready, placed to plan, and the room left finished — not just delivered.',
    problem: {
      heading: 'The install is the part clients remember.',
      body: [
        'A designer\'s reputation is built over months and spent in a single afternoon. The wrong crew in a finished house — no floor protection, a scuffed architrave, a sofa left in the wrong room because nobody read the plan — undoes work no client ever saw you do.',
        'Most of what goes wrong is scheduling, not handling. Site slips two weeks and the pieces have nowhere to go. Three suppliers deliver on three days and someone has to be there for all of them. The crane booking depends on a window that has not been measured.',
        'We plan the access before quoting, hold the stock until the room is ready, and consolidate everything into one install day you attend once.',
      ],
    },
    included: [
      'Storage between supplier delivery and site readiness, billed by the month',
      'Consolidation — every supplier into one delivery, one day, one attendance',
      'Installation to your plan, placed to the millimetre rather than left in the hall',
      'Craning when a piece will not make the stairs, surveyed before the day',
      'Assembly, unwrapping and rubbish taken away with us',
      'Protection down first — floors, doorways and finished surfaces',
    ],
    process: [
      {
        t: 'Access before quote',
        d: 'We measure the route — doorway, stair turn, lift, balcony — before quoting rather than discovering it on the day. If a piece needs to go over the house instead of through it, you know at quote stage.',
      },
      {
        t: 'Stock held until you say go',
        d: 'Pieces land at Flemington and stay there while site finishes. No storage charges on your client while a trade runs late, and nothing sitting in a hallway getting knocked.',
      },
      {
        t: 'One install day',
        d: 'Everything arrives together, in the order the rooms need it. You attend once, not five times, and we work to the plan rather than asking where things go.',
      },
      {
        t: 'Room left finished',
        d: 'Unwrapped, assembled, positioned, packaging removed. The state we leave it in is the state you would photograph it in.',
      },
    ],
    quote: {
      text: 'Yamin and the Rebel Logistics staff always take the utmost care with our installations. They can be trusted with expensive, high end product and leave the job site in immaculate condition. No job is too small or too difficult. I happily recommend Rebel Logistics to all of my Interior Design colleagues.',
      name: 'Dani McMillan-Lyons',
      context: 'Google review',
    },
  },
];

export const findAudience = (slug: string) => AUDIENCES.find((a) => a.slug === slug);
