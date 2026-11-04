/**
 * Every scoring and crowd number in one place, so they are easy to tune.
 */

/** Money for a pop is the type's baseValue times this, before any factors. */
export const MONEY_PER_BASE_VALUE = 10;

/** Height factor for a pop right at launch (flight progress 0). */
export const HEIGHT_FACTOR_LOW = 0.5;
/** Height factor for a pop at the top of the flight (flight progress 1). */
export const HEIGHT_FACTOR_HIGH = 1.5;

/** The rise speed that counts as normal. Faster types pay more. */
export const REFERENCE_RISE_SPEED = 0.25;
/** Bounds for the speed factor (riseSpeed / REFERENCE_RISE_SPEED). */
export const SPEED_FACTOR_MIN = 0.75;
export const SPEED_FACTOR_MAX = 2;

/** A pop this many seconds or less after the last pop continues the combo. */
export const COMBO_WINDOW = 1.5;
/** Extra factor for each pop in a combo after the first. */
export const COMBO_STEP = 0.25;
/** Highest combo factor. */
export const COMBO_FACTOR_MAX = 2;

/** Crowd meter runs from 0 to 1. This is where each show starts. */
export const CROWD_START = 0.3;
/** Crowd gain for a pop right at launch. */
export const CROWD_GAIN_LOW = 0.03;
/** Crowd gain for a pop at the top of the flight. */
export const CROWD_GAIN_HIGH = 0.12;
/** Crowd loss for a firework that fizzles. */
export const CROWD_FIZZLE_LOSS = 0.15;
/** Crowd loss for a click that hits nothing (much less than a fizzle). */
export const MISS_CROWD_LOSS = 0.03;
/** Whether a click that hits nothing ends the combo. */
export const MISS_BREAKS_COMBO = true;

/** The crowd multiplier starts above this crowd level. */
export const CROWD_MULTIPLIER_THRESHOLD = 0.5;
/** Money multiplier with a full crowd meter. */
export const CROWD_MULTIPLIER_MAX = 3;

/** Pops at or above this flight progress get an "Aah" instead of an "Ooh". */
export const AAH_PROGRESS = 0.6;

/** Seconds a floating pop-up stays on screen. */
export const POPUP_DURATION = 1.2;
/** Pixels a pop-up drifts upwards over its life. */
export const POPUP_RISE = 50;
/** Height of the biggest pop-up text, in pixels. */
export const POPUP_TEXT_HEIGHT = 26;
/** About half the width of a wide pop-up such as "Aah! x3". */
export const POPUP_HALF_WIDTH = 70;
/** Lowest point of the counts line that render.ts draws in the top left. */
export const COUNTS_LINE_BOTTOM = 40;
/** Space kept between a pop-up and the text above it. */
export const POPUP_GAP = 8;

/** Seconds the grey puff of smoke from a missed click lasts. */
export const PUFF_DURATION = 0.45;
/** Radius in pixels of a puff of smoke at the end of its life. */
export const PUFF_RADIUS = 14;

/** Combos that get a big banner across the middle, and the word for each. */
export const COMBO_MILESTONES: readonly { combo: number; word: string }[] = [
  { combo: 5, word: "Sizzling" },
  { combo: 10, word: "Blazing" },
  { combo: 15, word: "Inferno" },
];
/** Seconds a combo banner stays up. Kept under a second so it never hides a launch for long. */
export const BANNER_DURATION = 0.9;
/** Most opacity of a combo banner, so the fireworks behind still show. */
export const BANNER_ALPHA_MAX = 0.6;

/** Types worth at least this baseValue light up the sky when popped (Chrysanthemum and up). */
export const FLASH_MIN_BASE_VALUE = 5;
/** Types worth this baseValue or more get the full flash (Golden rain). */
export const FLASH_FULL_BASE_VALUE = 25;
/** Strength of the weakest flash, as a share of the full flash. */
export const FLASH_MIN_STRENGTH = 0.5;
/** Opacity of the full flash. Kept soft for players sensitive to flashing light. */
export const FLASH_ALPHA_MAX = 0.25;
/** Seconds a flash takes to fade to nothing. */
export const FLASH_DURATION = 0.6;
/** Fewest seconds between the start of two flashes, so the sky never strobes. */
export const FLASH_MIN_GAP = 1;

/** A pop worth at least this much money gets the bigger money pop-up. */
export const BIG_MONEY_POPUP = 100;
