// ---------------------------------------------------------------------------
// Rebel Logistics marketing site — content & business truth.
// Facts sourced from the client's own material (Website content.pdf, logo,
// Instagram bio). Phone + hours are BEST-GUESS PLACEHOLDERS pending client
// confirmation — see PRODUCT.md "Evidence on Hand".
// ---------------------------------------------------------------------------

export const BUSINESS = {
  name: 'Rebel Logistics',
  legal: 'Rebel Logistics Pty Ltd',
  tagline: 'White-glove logistics for luxury interiors',
  abn: '42 632 300 022',
  address: '159 Racecourse Road, Flemington VIC 3031',
  addressShort: 'Flemington, Melbourne',
  suburb: 'Melbourne, Australia',
  email: 'info@rebellogistics.com.au',
  // TODO(client): confirm public phone. Taken from crew signage / repo default.
  phone: '0420 411 168',
  phoneIntl: '+61420411168',
  instagram: 'https://www.instagram.com/rebellogistics/',
  instagramHandle: '@rebellogistics',
  founded: 2019,
  // TODO(client): confirm trading hours.
  hours: 'Monday to Friday, 7am to 5pm. Weekends by arrangement.',
} as const;

export type NavItem = { label: string; to: string };
export const NAV: NavItem[] = [
  { label: 'Logistics', to: '/logistics' },
  { label: 'Warehousing', to: '/warehousing' },
  { label: 'Labour', to: '/labour' },
  { label: 'About', to: '/about' },
  { label: 'Contact', to: '/contact' },
];

export const PHOTO = (name: string) => `/site/photos/${name}`;

// Featured, hand-picked photography (face-blurred, web-optimised locally).
export const IMG = {
  heroStill: '/site/hero-1.jpg',
  craneAirborne: PHOTO('IMG-20200313-WA0012.jpg'),
  craneLift: PHOTO('IMG-20200313-WA0006.jpg'),
  craneVertical: PHOTO('IMG-20200313-WA0013.jpg'),
  marble: PHOTO('IMG-20200313-WA0020.jpg'),
  marbleVertical: PHOTO('IMG-20200313-WA0022.jpg'),
  wrapping: PHOTO('IMG-20200313-WA0027.jpg'),
  crew: PHOTO('IMG-20200313-WA0009.jpg'),
  lounge: PHOTO('IMG_3427.jpg'),
  loungeWide: PHOTO('IMG_3429.jpg'),
  artHall: PHOTO('IMG_3505.jpg'),
  artDetail: PHOTO('IMG_3504.jpg'),
  chandelier: PHOTO('IMG_3416.jpg'),
  warehouse: PHOTO('IMG_3812.jpg'),
  warehouseAlt: PHOTO('IMG_3817 2.jpg'),
  dining: PHOTO('20210226_181535.jpg'),
} as const;

// Hero: three static frames pulled from the client's own job footage. Each
// carries its own line, so scrolling walks care -> method -> result.
export type HeroFrame = { src: string; video: string; alt: string; line1: string; line2: string };
export const HERO_FRAMES: HeroFrame[] = [
  {
    src: '/site/hero-1.jpg',
    video: '/site/hero-1.mp4',
    alt: 'Rebel Logistics crew in white gloves setting a marble table into a styled Melbourne living room',
    line1: 'Handled like',
    line2: "it's irreplaceable.",
  },
  {
    src: '/site/hero-2.jpg',
    video: '/site/hero-2.mp4',
    alt: 'A Rebel Logistics handler in white cotton gloves talking a client through a piece',
    line1: 'White gloves.',
    line2: 'Every piece.',
  },
  {
    src: '/site/hero-3.jpg',
    video: '/site/hero-3.mp4',
    alt: 'A finished, styled interior after a Rebel Logistics delivery and installation',
    line1: 'Left finished,',
    line2: 'not just delivered.',
  },
];

export type Service = {
  slug: string;
  index: string;
  title: string;
  lead: string;
  blurb: string;
  points: string[];
  image: string;
  imageAlt: string;
  /** Silent looping clip behind the page hero. */
  heroVideo: string;
  /** Photographs for the page's scrolling rail. */
  rail: string[];
  /** Full-sentence hero description, in the register of the home page. */
  heroLead: string;
  /** Longer-form supporting content. */
  detail: { t: string; d: string }[];
};

export const SERVICES: Service[] = [
  {
    slug: 'logistics',
    index: '01',
    title: 'Logistics',
    lead: 'From the loading dock to the exact spot in the room.',
    blurb:
      'Specialist transport, craning and white-glove installation for furniture, stone, art and lighting. Delivered and placed with the care a designer expects.',
    points: [
      'Furniture pick-ups and deliveries',
      'Interior-designer installations and assembly',
      'Media and specialist event execution',
      'Full house relocation',
    ],
    image: IMG.craneAirborne,
    imageAlt: 'Craning a crated piece over a glass pool house',
    heroVideo: '/site/reels/bg/logistics.mp4',
    rail: [
      IMG.craneAirborne, IMG.craneLift, IMG.craneVertical, IMG.marble,
      IMG.artHall, IMG.lounge, IMG.chandelier, IMG.warehouse,
    ],
    heroLead:
      "We move furniture, stone, art and lighting into Melbourne's best homes and showrooms. Access is surveyed before we quote, the piece is wrapped before it travels, and it is assembled and placed to the drawing rather than left at the door.",
    detail: [
      { t: 'Access planned before the day', d: 'We assess the approach first: driveway, doorway, lift car, stair turn. If a piece will not make the hallway, the crane is booked before the truck is loaded, not discovered on arrival.' },
      { t: 'Protection goes down first', d: 'Floors, corners and balustrades are covered before anything crosses the threshold. The house is as valuable as the furniture entering it.' },
      { t: 'Assembled and positioned', d: 'Legs on, packaging out, piece placed to the drawing. We finish the room and take the rubbish with us.' },
      { t: 'One team, start to finish', d: 'The crew that collects from the showroom is the crew that places it in the room, so nothing is lost in a handover.' },
    ],
  },
  {
    slug: 'warehousing',
    index: '02',
    title: 'Warehousing',
    lead: 'Somewhere considered, between the showroom and the home.',
    blurb:
      'Secure warehousing for high-value pieces, billed by the cubic metre, with container handling and full third-party logistics.',
    points: [
      'Storage per cubic metre',
      'Container unpack and delivery',
      'Short and long-term storage',
      'Third-party logistics (3PL)',
    ],
    image: IMG.warehouse,
    imageAlt: 'High-value furniture wrapped and stored on pallets',
    heroVideo: '/site/reels/bg/warehousing.mp4',
    rail: [
      IMG.warehouse, IMG.warehouseAlt, IMG.marble, IMG.craneLift,
      IMG.lounge, IMG.artDetail, IMG.dining, IMG.craneAirborne,
    ],
    heroLead:
      "Secure storage for pieces that cannot be replaced, billed by the cubic metre at our Flemington warehouse. We take containers straight from the port, unpack and catalogue them, and deliver piece by piece on your schedule.",
    detail: [
      { t: 'Billed by the cubic metre', d: 'You pay for the space your pieces occupy, measured honestly, with no minimum pallet counts or padded volumes.' },
      { t: 'Container unpack and delivery', d: 'We collect from the port, unpack at our Flemington warehouse and deliver piece by piece on your schedule rather than dumping a full container on site.' },
      { t: 'Short or long term', d: 'A week between a settlement and a handover, or a year while a build finishes. Both are normal here.' },
      { t: 'Third-party logistics', d: 'Receive, store, pick and deliver on your behalf, so your showroom holds display stock rather than boxes.' },
    ],
  },
  {
    slug: 'labour',
    index: '03',
    title: 'Labour',
    lead: 'The right people, exactly when the job needs them.',
    blurb:
      'Trained crews for install days, showroom resets and event turnarounds. Used to moving large pieces through tight, precious spaces.',
    points: [
      'Onsite labour hire',
      'Home furniture rearrangement and assembly',
      'Showroom rearrangement and assembly',
      'Trade-fair and event set-up and pack-down',
    ],
    image: IMG.wrapping,
    imageAlt: 'Crew protectively wrapping furniture on site',
    heroVideo: '/site/reels/bg/labour.mp4',
    rail: [
      IMG.wrapping, IMG.crew, IMG.lounge, IMG.loungeWide,
      IMG.chandelier, IMG.dining, IMG.artHall, IMG.craneLift,
    ],
    heroLead:
      "Trained crews for install days, showroom resets and event turnarounds. Not general labour hire: our people handle designer furniture, stone and artwork every day, and know how to carry it, wrap it and set it down.",
    detail: [
      { t: 'Crews who move precious things daily', d: 'Not general labour hire. Our people handle designer furniture, stone and artwork every day and know how to carry, wrap and set it down.' },
      { t: 'Install days and showroom resets', d: 'A styling team can direct; we do the lifting, assembly and reinstatement, then clear the packaging.' },
      { t: 'Trade fairs and events', d: 'Set-up and pack-down to a run sheet, working to venue access windows and bump-out deadlines.' },
      { t: 'Big things, tight spaces', d: 'Stairwells, lift cars, narrow terrace hallways. The awkward jobs are the ones we get called for.' },
    ],
  },
];

// Brand marks supplied by the client, normalised locally to one monochrome set.
export const CLIENTS = [
  { name: 'Fendi Casa', file: '/site/clients/fendi.png' },
  { name: 'Versace Home', file: '/site/clients/versace.png' },
  { name: 'Bentley Home', file: '/site/clients/bentley.png' },
  { name: 'Roberto Cavalli Home', file: '/site/clients/roberto-cavalli.png' },
  { name: 'Articolo', file: '/site/clients/articolo.png' },
  { name: 'Blainey North', file: '/site/clients/blainey-north.png' },
  { name: 'TLC Interiors', file: '/site/clients/tlc-interiors.png' },
  { name: 'Clifton Upholstery', file: '/site/clients/clifton.png' },
  { name: 'art to art', file: '/site/clients/art-to-art.png' },
];

export const CLIENT_NAMES = CLIENTS.map((c) => c.name);

export type GalleryItem = { src: string; caption: string; tall?: boolean };
export const GALLERY: GalleryItem[] = [
  { src: IMG.craneAirborne, caption: 'Craning a crated piece over a glass pool house' },
  { src: IMG.artHall, caption: 'Positioning gallery artwork in a private residence' },
  { src: IMG.marble, caption: 'Delivering full-height stone slabs', tall: true },
  { src: IMG.lounge, caption: 'Styled, placed and finished' },
  { src: IMG.chandelier, caption: 'Assembling a bespoke lighting installation' },
  { src: IMG.warehouse, caption: 'Considered warehousing and 3PL' },
  { src: IMG.craneVertical, caption: 'Heavy-lift access, done safely', tall: true },
  { src: IMG.wrapping, caption: 'Protective wrapping, poolside handling' },
];

// Real client footage, cut and encoded locally from the supplied media.
// Every entry is a distinct moment so the rail never shows a repeat on screen.
export type Reel = {
  slug: string;
  title: string;
  caption: string;
  /** Full-length clip with audio, played in the popup. */
  src: string;
  /** Silent, low-resolution full-length loop used by the rail. */
  preview: string;
  poster: string;
  duration: string;
};
const reel = (slug: string, title: string, caption: string, duration: string): Reel => ({
  slug,
  title,
  caption,
  duration,
  src: `/site/reels/${slug}.mp4`,
  preview: `/site/reels/${slug}-preview.mp4`,
  poster: `/site/reels/${slug}.jpg`,
});

export const REELS: Reel[] = [
  reel('styling-transformation', 'Before and after', 'A warehouse styling job, from bare floor to finished room.', '1:26'),
  reel('lighting-collab', 'Lighting collaboration', 'Specialist lighting delivered, assembled and installed on site.', '1:02'),
  reel('install-walkthrough', 'Install walkthrough', 'Walking a completed installation, piece by piece.', '0:53'),
  reel('onsite-highlights', 'On site highlights', 'Moments from a specialist install day.', '0:11'),
];

// Sectors we serve — depth + local SEO surface.
export const SECTORS = [
  { t: 'Interior designers', d: 'Install days run to your plan, with pieces placed exactly to the drawing.' },
  { t: 'Luxury furniture showrooms', d: 'Deliveries, showroom resets and client installs handled under your brand.' },
  { t: 'Art galleries and dealers', d: 'Careful handling, crating and hanging for works that cannot be replaced.' },
  { t: 'Stone and surfaces', d: 'Full-height slabs moved, craned and set without a chip.' },
  { t: 'Architects and builders', d: 'Site deliveries co-ordinated around trades, access and handover dates.' },
  { t: 'Private clients', d: 'Discreet relocations and installations for significant homes.' },
];

// Service areas — real local SEO value for Melbourne search.
export const AREAS = [
  'Flemington', 'Melbourne CBD', 'South Yarra', 'Toorak', 'Brighton', 'Armadale',
  'Malvern', 'Kew', 'Hawthorn', 'Camberwell', 'Richmond', 'Fitzroy',
  'Port Melbourne', 'Docklands', 'Brunswick', 'Essendon', 'Mornington Peninsula', 'Geelong',
];

export const FAQS = [
  {
    q: 'Do you handle fragile and high-value pieces?',
    a: 'Yes. Specialist handling is the core of what we do: designer furniture, stone, artwork, lighting and antiques. Pieces are wrapped and protected before they move, and placed rather than dropped off.',
  },
  {
    q: 'Can you crane items into difficult sites?',
    a: 'Yes. We regularly crane crated furniture and stone over pool houses, glass balustrades and tight side access across Melbourne. We assess access first and plan the lift before the day.',
  },
  {
    q: 'Do you offer storage as well as transport?',
    a: 'Yes. We store per cubic metre in our Flemington warehouse, short or long term, including container unpack and full third-party logistics.',
  },
  {
    q: 'Which areas do you service?',
    a: 'Melbourne metro and regional Victoria as standard, with interstate work by arrangement. Our warehouse is at 159 Racecourse Road, Flemington.',
  },
  {
    q: 'Can you supply labour for an install day or event?',
    a: 'Yes. We provide trained onsite crews for installations, showroom rearrangements, trade fairs and event set-up and pack-down.',
  },
  {
    q: 'How quickly will I get a quote?',
    a: 'Send through the pieces, the addresses and any access notes and we will come back the same business day with a plan and a clear price.',
  },
];
