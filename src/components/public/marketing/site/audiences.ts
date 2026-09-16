import { IMG } from './data';

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
//
// Craning is deliberately not mentioned on these pages (Yamin, 2026-09-16),
// including obliquely — no "over the house instead of through it". It is still
// covered on /logistics.
// ---------------------------------------------------------------------------

export type Audience = {
  slug: string;
  /** Nav and cross-link label. */
  label: string;
  /** H1. */
  title: string;
  /** Hero paragraph — full sentences, the register of the home page. */
  lead: string;
  /** Hero image. One per segment so the pages don't read as a template. */
  image: string;
  imageAlt: string;
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
    image: IMG.artHall,
    imageAlt: 'Artwork positioned along the approach of a private Melbourne residence',
    seoTitle: 'Furniture Logistics for Interior Designers Melbourne | Rebel Logistics',
    seoDescription:
      'Delivery, installation and storage for Melbourne interior designers. Pieces held until site is ready, placed to plan, and the room left finished — not just delivered.',
    problem: {
      heading: 'The install is the part clients remember.',
      body: [
        "A designer's reputation is built over months and spent in a single afternoon. The wrong crew in a finished house — no floor protection, a scuffed architrave, a sofa left in the wrong room because nobody read the plan — undoes work no client ever saw you do.",
        'Most of what goes wrong is scheduling, not handling. Site slips two weeks and the pieces have nowhere to go. Three suppliers deliver on three days and someone has to be there for all of them.',
        'We plan the access before quoting, hold the stock until the room is ready, and consolidate everything into one install day you attend once.',
      ],
    },
    included: [
      'Storage between supplier delivery and site readiness, billed by the month',
      'Consolidation — every supplier into one delivery, one day, one attendance',
      'Installation to your plan, placed to the millimetre rather than left in the hall',
      'Assembly, unwrapping and rubbish taken away with us',
      'Protection down first — floors, doorways and finished surfaces',
    ],
    process: [
      {
        t: 'Access before quote',
        d: 'We measure the route — doorway, stair turn, lift, entry — before quoting rather than discovering it on the day. If something will not fit, you hear it at quote stage rather than on delivery morning.',
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

  {
    slug: 'showrooms',
    label: 'Showrooms & brands',
    title: 'For showrooms and brands',
    lead: 'Your customer meets your brand twice: once in the showroom, and once when two people carry it through their front door.',
    image: IMG.chandelier,
    imageAlt: 'Bespoke lighting being installed to a designer plan',
    seoTitle: 'Furniture Delivery for Showrooms & Brands Melbourne | Rebel Logistics',
    seoDescription:
      'Warehousing, white-glove delivery and trade-fair set-up for Melbourne furniture and lighting brands. Your stock held, dispatched and delivered in your name.',
    problem: {
      heading: 'The delivery is the last thing they remember about you.',
      body: [
        'A customer forgives a lead time. They do not forgive a scratched table, a driver who would not take it upstairs, or a delivery window that came and went. Whatever happens on that doorstep is what they tell people about your brand.',
        'Most brands end up choosing between a freight company that treats a bespoke piece like a pallet, and hiring their own van and crew for volume that does not justify it.',
        'We hold your stock at Flemington, dispatch it as orders come in, and turn up in your name — with the wrapping, the care and the manner you would want if it were your own staff.',
      ],
    },
    included: [
      'Container unpack and receipting into storage, counted against your manifest',
      'Stock held by the cubic metre, short or long term',
      'Dispatch to end customers as orders come through, not in weekly batches',
      'White-glove delivery, unwrapping and placement in the customer\'s room',
      'Showroom changeovers and floor resets, usually overnight',
      'Trade fair and exhibition set-up, pack-down and return to store',
    ],
    process: [
      {
        t: 'Stock arrives, we count it',
        d: 'Containers unpacked and checked against your manifest at Flemington. Damage in transit is found by us on arrival rather than by your customer on their doorstep.',
      },
      {
        t: 'Held until sold',
        d: 'Stored by the cubic metre so you are not paying for a warehouse you half fill. You see what is on hand without ringing to ask.',
      },
      {
        t: 'Dispatched on your say-so',
        d: 'Orders go out as they come in. Deliveries are booked with the customer directly, with a call before arrival rather than a four-hour window.',
      },
      {
        t: 'Delivered as your brand',
        d: 'Wrapped, carried in, unwrapped, placed and the packaging taken away. The customer meets people who behave like they work for you.',
      },
    ],
    quote: {
      text: 'The team at Rebel Logistics are our go-to for everything from Trade Fair & Exhibition set up to local deliveries in Victoria. They specialise in ‘white glove’ deliveries ensuring that our fragile and often heavy products are delivered on time and in perfect condition. We highly recommend Yamin and his team at Rebel Logistics!',
      name: 'Cafe Lighting & Living',
      context: 'Google review',
    },
  },

  {
    slug: 'commercial',
    label: 'Commercial & office',
    title: 'For commercial and office moves',
    lead: 'Every hour the office is in boxes is an hour nobody is working. The job is to give the floor back, not to shift furniture.',
    image: IMG.diningFitout,
    imageAlt: 'A completed commercial fit-out in Melbourne',
    seoTitle: 'Office & Commercial Removalists Melbourne | Rebel Logistics',
    seoDescription:
      'Office and commercial relocations across Melbourne. After-hours moves, lift and dock bookings, staged by department, desks reassembled and working the next morning.',
    problem: {
      heading: 'A move that runs over costs more than the move.',
      body: [
        'The quote is rarely what the move costs you. The cost is forty people who cannot work on Monday because the desks are still flat-packed and nobody knows which floor their monitor went to.',
        'Most of the risk sits in the building, not the furniture — a dock that must be booked a fortnight out, a service lift shared with two other tenants, a strata window that closes at six, a certificate of currency the building manager wants before anyone touches the doors.',
        'We walk the building first, book what has to be booked, and move you in stages so the business is working the next morning.',
      ],
    },
    included: [
      'Site walk of both buildings before a price is given',
      'Dock and service-lift bookings, and building paperwork handled up front',
      'After-hours and weekend moves so nobody loses a working day',
      'Lift, floor and doorway protection in both buildings',
      'Staged by department so teams land together, not scattered',
      'Desks and workstations dismantled and reassembled, ready to sit at',
      'Old furniture removed, and storage for whatever does not fit the new floor',
    ],
    process: [
      {
        t: 'We walk both buildings',
        d: 'Access, docks, lifts, door widths and the route at each end, before quoting. You get a price that accounts for the building rather than an estimate that discovers it.',
      },
      {
        t: 'Bookings and paperwork',
        d: 'Dock times, lift bookings and certificates of currency sorted with both building managers. Not your problem, and not a reason the day slips.',
      },
      {
        t: 'Moved out of hours',
        d: 'Evenings or a weekend, staged department by department and labelled to the desk. The floor empties without anyone taking a day off.',
      },
      {
        t: 'Working Monday morning',
        d: 'Workstations rebuilt, chairs out, boxes at the right desks. People sit down and start, rather than spending the morning looking for their screen.',
      },
    ],
    quote: {
      text: 'I was referred to Rebel Logistics for a commercial move, and I couldn’t be happier with their service. Yamin and his team exceeded my expectations with their attention to detail and excellent communication. They gave me a courtesy call to confirm their arrival time, and arrived punctually. Upon arrival, they were meticulous in handling our goods, placing blankets on the floor to protect the furniture. I am pleased to report that there was no damage to any of our furniture or equipment. I highly recommend Rebel Logistics for their outstanding service!',
      name: 'Taige Alhadweh',
      context: 'Google review',
    },
  },

  {
    slug: 'private-clients',
    label: 'Private clients',
    title: 'For private clients',
    lead: 'Your things are not freight, and your home is not a loading dock. We move houses the way we move a gallery.',
    image: IMG.lounge,
    imageAlt: 'A finished, styled living room after a Rebel Logistics installation',
    seoTitle: 'White-Glove Home Removalists Melbourne | Rebel Logistics',
    seoDescription:
      'Careful house and apartment moves across Melbourne. Packing, protection, storage between settlement dates and everything set up at the other end, not stacked in a hallway.',
    problem: {
      heading: 'Moving is stressful enough without watching the truck.',
      body: [
        'Most of what makes moving day awful is not the lifting. It is standing in a doorway wondering whether anyone is being careful, whether the piece your grandmother left you is under the boxes, and whether the crew will still be here at six.',
        'Settlement dates rarely line up either. Keys on Friday, moving in Tuesday, and four days where your entire house has to be somewhere.',
        'We protect the house before anything moves, store whatever needs storing in between, and put the new place together rather than stacking it in the hallway.',
      ],
    },
    included: [
      'Full or partial packing, or just the things you would rather not pack yourself',
      'Floor, doorway and bannister protection at both ends',
      'Art, glass, stone and antiques handled the way we handle them for galleries',
      'Storage between settlement dates, billed by the month',
      'Beds, wardrobes and tables dismantled and rebuilt at the other end',
      'Packing materials taken away with us instead of left in your garage',
    ],
    process: [
      {
        t: 'A quote from a real look',
        d: 'We check the access at both ends — stairs, lift, driveway, parking — so the price holds on the day instead of growing once the truck arrives.',
      },
      {
        t: 'Protection first',
        d: 'Floors, doorways and bannisters covered before a single box moves, in the house you are leaving and the one you are arriving at.',
      },
      {
        t: 'Stored if the dates do not line up',
        d: 'If there is a gap between settlements, everything comes to Flemington and waits there. One crew loads it and the same crew delivers it.',
      },
      {
        t: 'Set up, not stacked',
        d: 'Beds rebuilt, wardrobes standing, boxes in the rooms they belong to. You unpack a home rather than excavate a pile.',
      },
    ],
    quote: {
      text: 'Yamin and Jay recently helped with a residential move and they were by far the best removalists we have ever had!! They arrived promptly on time, treated all our contents with care and nothing was too much trouble. Moving home, especially with kids, is stressful enough but they made the move so much easier and seamless. They provided superior service and were the nicest guys!',
      name: 'Sheila Roshan',
      context: 'Google review',
    },
  },
];

export const findAudience = (slug: string) => AUDIENCES.find((a) => a.slug === slug);
