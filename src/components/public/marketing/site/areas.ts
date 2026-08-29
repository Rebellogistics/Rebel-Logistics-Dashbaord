// ---------------------------------------------------------------------------
// Local service-area pages.
//
// Search engines treat near-identical location pages as doorway pages, so the
// copy here is composed from real attributes rather than find-and-replace:
// each suburb carries a character archetype (which drives the access and
// handling narrative), its own postcode, region, neighbours and a specific
// local note. Suburbs sharing an archetype still receive different prose
// variants, selected deterministically from the slug.
// ---------------------------------------------------------------------------

export type Character =
  | 'period'        // Victorian/Edwardian homes, narrow halls, original floors
  | 'estate'        // large blocks, long driveways, pools, craning
  | 'highrise'      // towers, docks, service lifts, building inductions
  | 'coastal'       // bayside/peninsula, salt air, long runs
  | 'terrace'       // tight single-fronted terraces, bluestone lanes
  | 'warehouse'     // converted warehouses, studios, galleries
  | 'family'        // post-war/modern family homes, straightforward access
  | 'retail'        // showroom and retail strips, trade deliveries
  | 'regional';     // longer dedicated runs outside metro

type Archetype = {
  angle: string[];
  access: string[];
  note: (name: string) => string[];
};

const ARCHETYPES: Record<Character, Archetype> = {
  period: {
    angle: ['Period homes, modern pieces.', 'Original detail, carefully protected.'],
    access: [
      'Tessellated verandahs, narrow hallways and original floorboards that are covered before anything moves.',
      'Single-width entries and turned staircases, where the measurement matters more than the muscle.',
    ],
    note: (n) => [
      `Floor and doorway protection goes down first in ${n} period homes, because the house is as valuable as the furniture entering it.`,
      `Most ${n} jobs turn on one doorway or one stair turn, so we measure the route before quoting rather than on the day.`,
    ],
  },
  estate: {
    angle: ['Significant homes, significant pieces.', 'Large blocks, large pieces, careful lifts.'],
    access: [
      'Long driveways, deep setbacks and pool surrounds, which is where craning earns its keep.',
      'Generous grounds and glass balustrades, so lifts are surveyed and planned before the truck is loaded.',
    ],
    note: (n) => [
      `Craning over a pool or a glass balustrade is routine ${n} work for us, planned as a lift rather than improvised.`,
      `A great deal of our ${n} work is designer-led: a full room delivered, assembled and styled in a single visit.`,
    ],
  },
  highrise: {
    angle: ['Towers, docks and booked lifts.', 'Apartment logistics, handled properly.'],
    access: [
      'Loading docks, service lifts and building manager bookings decide the day, so dock windows are arranged in advance.',
      'Building inductions and protected lift cars govern every delivery, and the paperwork is ours to handle.',
    ],
    note: (n) => [
      `We move a great deal of high-rise furniture in ${n}, where a piece must clear a lift car and a corridor before it reaches the room.`,
      `${n} towers require lift protection and a booking sheet, and we arrange that with the building manager for you.`,
    ],
  },
  coastal: {
    angle: ['Coastal homes, one careful trip.', 'Bayside addresses, salt air, protected loads.'],
    access: [
      'Longer travel and unsealed coastal driveways, so loads are packed for the distance rather than shuttled.',
      'Open frontages and exposed approaches, with everything wrapped against weather before it leaves the warehouse.',
    ],
    note: (n) => [
      `${n} work is usually a full-home delivery in one run, packed and protected for the drive.`,
      `We schedule ${n} jobs as dedicated trips so your pieces are not sharing a truck with general freight.`,
    ],
  },
  terrace: {
    angle: ['Narrow frontages, patient handling.', 'Tight terraces, big pieces.'],
    access: [
      'Single-fronted terraces and bluestone lanes, where a piece often will not go through the front door.',
      'Narrow entries and rear laneways, so the route in is decided before the truck arrives.',
    ],
    note: (n) => [
      `When a piece cannot make the hallway in ${n}, it goes through a window or over the balcony, and that is planned, not discovered.`,
      `${n} jobs reward preparation: we scope the opening, the turn and the ceiling height before we quote.`,
    ],
  },
  warehouse: {
    angle: ['Studios, galleries and conversions.', 'Creative spaces, specialist handling.'],
    access: [
      'Converted warehouses with freight lifts, or none at all, so we confirm the route before arrival.',
      'Open floorplates and industrial entries, ideal for large-format pieces and art installs.',
    ],
    note: (n) => [
      `${n} studios and galleries call on us for art handling and event set-ups where the space itself is part of the brief.`,
      `We handle large-format artwork and furniture into ${n} conversions, including hoisting where the stair will not take it.`,
    ],
  },
  family: {
    angle: ['Whole-home deliveries, done in one visit.', 'Straightforward access, exacting standards.'],
    access: [
      'Generous rooms and workable access, which suits staged full-house installations.',
      'Standard suburban approaches, so the day is about care and finish rather than the lift.',
    ],
    note: (n) => [
      `${n} suits our full-home model: everything arrives protected, is assembled in place and the packaging leaves with us.`,
      `A good deal of our ${n} work is repeat business for designers fitting out whole homes in stages.`,
    ],
  },
  retail: {
    angle: ['Showroom deliveries and trade logistics.', 'Retail strips, timed deliveries.'],
    access: [
      'Retail frontages, clearway restrictions and narrow rear lanes make timing and trolley routes matter.',
      'Busy arterials where deliveries are timed outside peak so trading is never interrupted.',
    ],
    note: (n) => [
      `We work with ${n} showrooms on stock deliveries, window changeovers and client installations.`,
      `${n} retailers use us for stock rotation and customer deliveries, often in the same run.`,
    ],
  },
  regional: {
    angle: ['Regional Victoria, same standard of care.', 'Longer runs, undiminished care.'],
    access: [
      'Regional runs are scheduled as dedicated trips rather than shared freight.',
      'Distance is planned for: loads are braced and padded for the drive, not just for the lift.',
    ],
    note: (n) => [
      `${n} is a regular regional run for us, quoted as a flat regional job rather than by the metre.`,
      `We combine ${n} deliveries into a single dedicated trip so nothing is handled more than it needs to be.`,
    ],
  },
};

type Seed = {
  name: string;
  postcode: string;
  region: string;
  character: Character;
  /** Optional hand-written detail that overrides the archetype note. */
  custom?: string;
};

const SEEDS: Seed[] = [
  // Inner East
  { name: 'Toorak', postcode: '3142', region: 'Inner East', character: 'estate' },
  { name: 'South Yarra', postcode: '3141', region: 'Inner East', character: 'highrise' },
  { name: 'Armadale', postcode: '3143', region: 'Inner East', character: 'retail' },
  { name: 'Malvern', postcode: '3144', region: 'Inner East', character: 'period' },
  { name: 'Malvern East', postcode: '3145', region: 'Inner East', character: 'family' },
  { name: 'Prahran', postcode: '3181', region: 'Inner East', character: 'terrace' },
  { name: 'Windsor', postcode: '3181', region: 'Inner East', character: 'terrace' },
  { name: 'Richmond', postcode: '3121', region: 'Inner East', character: 'retail' },
  { name: 'Cremorne', postcode: '3121', region: 'Inner East', character: 'warehouse' },
  { name: 'Hawthorn', postcode: '3122', region: 'Inner East', character: 'family' },
  { name: 'Hawthorn East', postcode: '3123', region: 'Inner East', character: 'period' },
  { name: 'Kew', postcode: '3101', region: 'Inner East', character: 'estate' },
  { name: 'Kew East', postcode: '3102', region: 'Inner East', character: 'family' },
  { name: 'Camberwell', postcode: '3124', region: 'Inner East', character: 'family' },
  { name: 'Canterbury', postcode: '3126', region: 'Inner East', character: 'period' },
  { name: 'Balwyn', postcode: '3103', region: 'Inner East', character: 'family' },
  { name: 'Balwyn North', postcode: '3104', region: 'Inner East', character: 'family' },
  { name: 'Surrey Hills', postcode: '3127', region: 'Inner East', character: 'period' },
  { name: 'Glen Iris', postcode: '3146', region: 'Inner East', character: 'family' },
  { name: 'Ashburton', postcode: '3147', region: 'Inner East', character: 'family' },
  { name: 'Burwood', postcode: '3125', region: 'Inner East', character: 'family' },
  { name: 'Box Hill', postcode: '3128', region: 'Inner East', character: 'highrise' },
  { name: 'Doncaster', postcode: '3108', region: 'Inner East', character: 'family' },
  { name: 'Templestowe', postcode: '3106', region: 'Inner East', character: 'estate' },
  { name: 'Ivanhoe', postcode: '3079', region: 'Inner East', character: 'period' },

  // Central
  { name: 'Melbourne CBD', postcode: '3000', region: 'Central', character: 'highrise' },
  { name: 'Southbank', postcode: '3006', region: 'Central', character: 'highrise' },
  { name: 'Docklands', postcode: '3008', region: 'Central', character: 'highrise' },
  { name: 'East Melbourne', postcode: '3002', region: 'Central', character: 'period' },
  { name: 'West Melbourne', postcode: '3003', region: 'Central', character: 'warehouse' },
  { name: 'North Melbourne', postcode: '3051', region: 'Central', character: 'terrace' },
  { name: 'Carlton', postcode: '3053', region: 'Central', character: 'terrace' },
  { name: 'Carlton North', postcode: '3054', region: 'Central', character: 'terrace' },
  { name: 'Parkville', postcode: '3052', region: 'Central', character: 'period' },
  { name: 'Kensington', postcode: '3031', region: 'Central', character: 'warehouse' },
  { name: 'Flemington', postcode: '3031', region: 'Central', character: 'warehouse', custom: 'Our warehouse at 159 Racecourse Road is the hub for storage, container unpack and every job that leaves in a Rebel truck.' },

  // Inner North
  { name: 'Fitzroy', postcode: '3065', region: 'Inner North', character: 'terrace' },
  { name: 'Fitzroy North', postcode: '3068', region: 'Inner North', character: 'terrace' },
  { name: 'Collingwood', postcode: '3066', region: 'Inner North', character: 'warehouse' },
  { name: 'Abbotsford', postcode: '3067', region: 'Inner North', character: 'warehouse' },
  { name: 'Brunswick', postcode: '3056', region: 'Inner North', character: 'warehouse' },
  { name: 'Brunswick East', postcode: '3057', region: 'Inner North', character: 'warehouse' },
  { name: 'Brunswick West', postcode: '3055', region: 'Inner North', character: 'family' },
  { name: 'Northcote', postcode: '3070', region: 'Inner North', character: 'period' },
  { name: 'Thornbury', postcode: '3071', region: 'Inner North', character: 'period' },
  { name: 'Preston', postcode: '3072', region: 'Inner North', character: 'family' },
  { name: 'Coburg', postcode: '3058', region: 'Inner North', character: 'family' },
  { name: 'Pascoe Vale', postcode: '3044', region: 'Inner North', character: 'family' },
  { name: 'Reservoir', postcode: '3073', region: 'Inner North', character: 'family' },
  { name: 'Clifton Hill', postcode: '3068', region: 'Inner North', character: 'terrace' },

  // Bayside & Inner South
  { name: 'Brighton', postcode: '3186', region: 'Bayside', character: 'estate' },
  { name: 'Brighton East', postcode: '3187', region: 'Bayside', character: 'family' },
  { name: 'Hampton', postcode: '3188', region: 'Bayside', character: 'coastal' },
  { name: 'Sandringham', postcode: '3191', region: 'Bayside', character: 'coastal' },
  { name: 'Black Rock', postcode: '3193', region: 'Bayside', character: 'coastal' },
  { name: 'Beaumaris', postcode: '3193', region: 'Bayside', character: 'coastal' },
  { name: 'Elwood', postcode: '3184', region: 'Bayside', character: 'coastal' },
  { name: 'St Kilda', postcode: '3182', region: 'Bayside', character: 'highrise' },
  { name: 'Albert Park', postcode: '3206', region: 'Bayside', character: 'terrace' },
  { name: 'Middle Park', postcode: '3206', region: 'Bayside', character: 'terrace' },
  { name: 'Port Melbourne', postcode: '3207', region: 'Bayside', character: 'warehouse', custom: 'Close to the port, which makes direct container unpack and delivery straightforward for Port Melbourne clients.' },
  { name: 'South Melbourne', postcode: '3205', region: 'Bayside', character: 'retail' },
  { name: 'Caulfield', postcode: '3162', region: 'Inner South', character: 'period' },
  { name: 'Caulfield North', postcode: '3161', region: 'Inner South', character: 'period' },
  { name: 'Elsternwick', postcode: '3185', region: 'Inner South', character: 'period' },
  { name: 'Bentleigh', postcode: '3204', region: 'Inner South', character: 'family' },
  { name: 'Ormond', postcode: '3204', region: 'Inner South', character: 'family' },
  { name: 'Carnegie', postcode: '3163', region: 'Inner South', character: 'family' },
  { name: 'Oakleigh', postcode: '3166', region: 'Inner South', character: 'family' },
  { name: 'Glen Waverley', postcode: '3150', region: 'Inner South', character: 'family' },
  { name: 'Mount Waverley', postcode: '3149', region: 'Inner South', character: 'family' },
  { name: 'Cheltenham', postcode: '3192', region: 'Inner South', character: 'family' },
  { name: 'Mentone', postcode: '3194', region: 'Inner South', character: 'coastal' },
  { name: 'Mordialloc', postcode: '3195', region: 'Inner South', character: 'coastal' },

  // North West
  { name: 'Essendon', postcode: '3040', region: 'North West', character: 'family' },
  { name: 'Moonee Ponds', postcode: '3039', region: 'North West', character: 'period' },
  { name: 'Ascot Vale', postcode: '3032', region: 'North West', character: 'period' },
  { name: 'Aberfeldie', postcode: '3040', region: 'North West', character: 'estate' },
  { name: 'Strathmore', postcode: '3041', region: 'North West', character: 'family' },
  { name: 'Niddrie', postcode: '3042', region: 'North West', character: 'family' },
  { name: 'Keilor', postcode: '3036', region: 'North West', character: 'family' },
  { name: 'Sunshine', postcode: '3020', region: 'North West', character: 'family' },
  { name: 'Footscray', postcode: '3011', region: 'North West', character: 'warehouse' },
  { name: 'Yarraville', postcode: '3013', region: 'North West', character: 'terrace' },
  { name: 'Seddon', postcode: '3011', region: 'North West', character: 'terrace' },
  { name: 'Williamstown', postcode: '3016', region: 'North West', character: 'coastal' },
  { name: 'Altona', postcode: '3018', region: 'North West', character: 'coastal' },
  { name: 'Point Cook', postcode: '3030', region: 'North West', character: 'family' },
  { name: 'Werribee', postcode: '3030', region: 'North West', character: 'family' },
  { name: 'Craigieburn', postcode: '3064', region: 'North West', character: 'family' },
  { name: 'Bundoora', postcode: '3083', region: 'North West', character: 'family' },
  { name: 'Eltham', postcode: '3095', region: 'North West', character: 'estate' },

  // Outer East & South East
  { name: 'Ringwood', postcode: '3134', region: 'Outer East', character: 'family' },
  { name: 'Croydon', postcode: '3136', region: 'Outer East', character: 'family' },
  { name: 'Lilydale', postcode: '3140', region: 'Outer East', character: 'family' },
  { name: 'Wantirna', postcode: '3152', region: 'Outer East', character: 'family' },
  { name: 'Blackburn', postcode: '3130', region: 'Outer East', character: 'family' },
  { name: 'Vermont', postcode: '3133', region: 'Outer East', character: 'family' },
  { name: 'Berwick', postcode: '3806', region: 'South East', character: 'family' },
  { name: 'Narre Warren', postcode: '3805', region: 'South East', character: 'family' },
  { name: 'Dandenong', postcode: '3175', region: 'South East', character: 'retail' },
  { name: 'Frankston', postcode: '3199', region: 'South East', character: 'coastal' },
  { name: 'Brighton Beach', postcode: '3186', region: 'South East', character: 'coastal' },

  // Regional
  { name: 'Mornington', postcode: '3931', region: 'Regional', character: 'coastal' },
  { name: 'Mount Eliza', postcode: '3930', region: 'Regional', character: 'coastal' },
  { name: 'Sorrento', postcode: '3943', region: 'Regional', character: 'coastal' },
  { name: 'Portsea', postcode: '3944', region: 'Regional', character: 'coastal' },
  { name: 'Red Hill', postcode: '3937', region: 'Regional', character: 'regional' },
  { name: 'Flinders', postcode: '3929', region: 'Regional', character: 'coastal' },
  { name: 'Geelong', postcode: '3220', region: 'Regional', character: 'regional' },
  { name: 'Torquay', postcode: '3228', region: 'Regional', character: 'coastal' },
  { name: 'Barwon Heads', postcode: '3227', region: 'Regional', character: 'coastal' },
  { name: 'Ocean Grove', postcode: '3226', region: 'Regional', character: 'coastal' },
  { name: 'Bellarine', postcode: '3222', region: 'Regional', character: 'regional' },
  { name: 'Daylesford', postcode: '3460', region: 'Regional', character: 'regional' },
  { name: 'Ballarat', postcode: '3350', region: 'Regional', character: 'regional' },
  { name: 'Bendigo', postcode: '3550', region: 'Regional', character: 'regional' },
  { name: 'Macedon Ranges', postcode: '3441', region: 'Regional', character: 'regional' },
  { name: 'Yarra Valley', postcode: '3775', region: 'Regional', character: 'regional' },
  { name: 'Phillip Island', postcode: '3922', region: 'Regional', character: 'coastal' },
];

export type Area = {
  slug: string;
  name: string;
  region: string;
  postcode: string;
  character: Character;
  angle: string;
  access: string;
  note: string;
  near: string[];
};

const slugify = (s: string) =>
  s.toLowerCase().replace(/&/g, 'and').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

// Deterministic pick so a suburb's copy never changes between renders.
const hash = (s: string) => {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h;
};
const pick = <T,>(arr: T[], key: string, salt = 0) => arr[(hash(key) + salt) % arr.length];

export const AREAS_DATA: Area[] = SEEDS.map((s) => {
  const arch = ARCHETYPES[s.character];
  const slug = slugify(s.name);
  const siblings = SEEDS.filter((o) => o.region === s.region && o.name !== s.name);
  const start = hash(slug) % Math.max(1, siblings.length);
  const near = [0, 1, 2]
    .map((i) => siblings[(start + i) % siblings.length])
    .filter(Boolean)
    .map((o) => o.name);
  return {
    slug,
    name: s.name,
    region: s.region,
    postcode: s.postcode,
    character: s.character,
    angle: pick(arch.angle, slug),
    access: pick(arch.access, slug, 1),
    note: s.custom ?? pick(arch.note(s.name), slug, 2),
    near: [...new Set(near)],
  };
});

export const AREA_REGIONS = [...new Set(AREAS_DATA.map((a) => a.region))];
export const findArea = (slug: string) => AREAS_DATA.find((a) => a.slug === slug);
