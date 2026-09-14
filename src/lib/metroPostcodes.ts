import type { JobLocation } from './types';

/**
 * Rebel Logistics' own definition of the Melbourne Metropolitan Area.
 *
 * Source: "Melbourne Metro — As defined by Rebel Logistics" (supplied by Yamin,
 * 14 Sep 2026). A delivery postcode in this set prices as Metro; anything else
 * is Regional, which swaps per-cubic-metre pricing for the flat regional
 * minimum — so getting it wrong misprices the job in one direction or the other.
 *
 * The list deliberately runs further out than "metro" intuitively suggests:
 * Kangaroo Ground (3097), Cottles Bridge (3099), Berwick (3806), Langwarrin
 * (3910) and the Cranbourne group (3975-3978) are all Metro under it. Judge by
 * the number, never by how far away the suburb feels.
 */
export const MELBOURNE_METRO_POSTCODES: ReadonlySet<number> = new Set([
  3000, 3002, 3003, 3004, 3006, 3008, 3011, 3012, 3013, 3015, 3016, 3018, 3019,
  3020, 3021, 3022, 3023, 3024, 3025, 3026, 3027, 3028, 3029, 3030, 3031, 3032,
  3033, 3034, 3036, 3037, 3038, 3040, 3041, 3042, 3043, 3044, 3045, 3046, 3047,
  3048, 3049, 3051, 3052, 3053, 3054, 3055, 3056, 3057, 3058, 3059, 3060, 3061,
  3062, 3063, 3064, 3065, 3066, 3067, 3068, 3070, 3071, 3072, 3073, 3074, 3075,
  3076, 3078, 3079, 3081, 3082, 3083, 3084, 3085, 3087, 3088, 3089, 3090, 3091,
  3093, 3094, 3095, 3096, 3097, 3099, 3101, 3102, 3103, 3104, 3105, 3106, 3107,
  3108, 3109, 3111, 3113, 3114, 3115, 3116, 3121, 3122, 3123, 3124, 3125, 3126,
  3127, 3128, 3129, 3130, 3131, 3132, 3133, 3134, 3135, 3136, 3137, 3138, 3140,
  3141, 3142, 3143, 3144, 3145, 3146, 3147, 3148, 3149, 3150, 3151, 3152, 3153,
  3154, 3155, 3156, 3158, 3159, 3160, 3161, 3162, 3163, 3165, 3166, 3167, 3168,
  3169, 3170, 3171, 3172, 3173, 3174, 3175, 3177, 3178, 3179, 3180, 3181, 3182,
  3183, 3184, 3185, 3186, 3187, 3188, 3189, 3190, 3191, 3192, 3193, 3194, 3195,
  3196, 3197, 3198, 3199, 3200, 3201, 3202, 3204, 3205, 3206, 3207, 3796, 3802,
  3803, 3804, 3805, 3806, 3807, 3910, 3975, 3976, 3977, 3978,
]);

/**
 * Pulls a Victorian postcode out of a free-text address.
 *
 * Takes the LAST 3xxx match rather than the first: addresses put the postcode
 * at the end, so a street number that happens to look like one ("3000 Point
 * Nepean Rd, Sorrento 3943") would otherwise win. Returns null when there is
 * nothing postcode-shaped to read.
 */
export function extractPostcode(address: string | null | undefined): number | null {
  if (!address) return null;
  const matches = address.match(/\b3\d{3}\b/g);
  if (!matches || matches.length === 0) return null;
  return Number(matches[matches.length - 1]);
}

/** Metro when the postcode is on Rebel's list, Regional otherwise. */
export function locationForPostcode(postcode: number): JobLocation {
  return MELBOURNE_METRO_POSTCODES.has(postcode) ? 'Metro' : 'Regional';
}

/**
 * The zone an address implies, or null when it carries no readable postcode.
 *
 * Null means "no opinion" — callers should leave the manual selection alone
 * rather than guessing from a suburb name.
 */
export function locationForAddress(address: string | null | undefined): JobLocation | null {
  const postcode = extractPostcode(address);
  return postcode === null ? null : locationForPostcode(postcode);
}
