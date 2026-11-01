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
