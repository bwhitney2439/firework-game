import {
  BANNER_ALPHA_MAX,
  BANNER_DURATION,
  COMBO_MILESTONES,
  FLASH_ALPHA_MAX,
  FLASH_DURATION,
  FLASH_FULL_BASE_VALUE,
  FLASH_MIN_BASE_VALUE,
  FLASH_MIN_GAP,
  FLASH_MIN_STRENGTH,
} from "../scoring/tuning";
import { drawPopupText, popupFont } from "../scoring/popups";

/** Share of the banner's life spent fading in. The rest fades out. */
const BANNER_FADE_IN = 0.15;
/** Size of the banner text as it appears, growing to full size. */
const BANNER_START_SCALE = 0.8;
/** How far down the screen the banner sits, as a share of the height. */
const BANNER_HEIGHT_SHARE = 0.42;
/** Widest the banner may be, as a share of the width. */
const BANNER_MAX_WIDTH_SHARE = 0.9;

/** A big text banner across the middle of the sky, such as "Sizzling! x5". */
export interface Banner {
  text: string;
  /** Seconds since it appeared. */
  age: number;
}

/**
 * Extra feedback for big moments in a show: a soft warm flash over the sky
 * for an expensive pop, and a banner for a combo milestone.
 */
export interface Juice {
  /** Flash strength from 0 to 1. 1 is drawn at FLASH_ALPHA_MAX. */
  flash: number;
  /** Seconds since the last flash started. Infinity before the first. */
  sinceFlash: number;
  banner: Banner | null;
}

export function createJuice(): Juice {
  return { flash: 0, sinceFlash: Infinity, banner: null };
}

/** Clears the flash and banner, for a new show. */
export function resetJuice(juice: Juice): void {
  juice.flash = 0;
  juice.sinceFlash = Infinity;
  juice.banner = null;
}

/**
 * How strongly a pop of a type with this baseValue lights the sky, from 0
 * (no flash) to 1. Cheap types don't flash at all.
 */
export function flashStrength(baseValue: number): number {
  if (baseValue < FLASH_MIN_BASE_VALUE) return 0;
  const span = FLASH_FULL_BASE_VALUE - FLASH_MIN_BASE_VALUE;
  const share = span > 0 ? (baseValue - FLASH_MIN_BASE_VALUE) / span : 1;
  return Math.min(1, FLASH_MIN_STRENGTH + (1 - FLASH_MIN_STRENGTH) * share);
}

/**
 * The banner text for reaching this combo, such as "Sizzling! x5", or null
 * if it isn't a milestone. A combo only grows one pop at a time, so each
 * milestone shows once per combo.
 */
export function comboBanner(combo: number): string | null {
  const milestone = COMBO_MILESTONES.find((entry) => entry.combo === combo);
  return milestone ? `${milestone.word}! x${milestone.combo}` : null;
}

/**
 * Starts a flash of the given strength. It is skipped if another flash
 * started less than FLASH_MIN_GAP seconds ago, so the sky never strobes.
 * Returns whether it started.
 */
export function triggerFlash(juice: Juice, strength: number): boolean {
  if (strength <= 0 || juice.sinceFlash < FLASH_MIN_GAP) return false;
  juice.flash = Math.max(juice.flash, Math.min(1, strength));
  juice.sinceFlash = 0;
  return true;
}

/** Shows a banner, replacing any banner already up. */
export function triggerBanner(juice: Juice, text: string): void {
  juice.banner = { text, age: 0 };
}

/** Fades the flash and ages the banner, dropping it once it's done. */
export function updateJuice(juice: Juice, dt: number): void {
  juice.sinceFlash += dt;
  juice.flash = Math.max(0, juice.flash - dt / FLASH_DURATION);
  if (juice.banner) {
    juice.banner.age += dt;
    if (juice.banner.age >= BANNER_DURATION) juice.banner = null;
  }
}

/** Opacity of the flash right now. Never more than FLASH_ALPHA_MAX. */
export function flashAlpha(juice: Juice): number {
  return Math.min(1, Math.max(0, juice.flash)) * FLASH_ALPHA_MAX;
}

/**
 * Opacity of a banner at its age: a quick fade in, then a fade out over the
 * rest of its life. Never more than BANNER_ALPHA_MAX.
 */
export function bannerAlpha(banner: Banner): number {
  const progress = Math.min(Math.max(banner.age / BANNER_DURATION, 0), 1);
  const shape = progress < BANNER_FADE_IN
    ? progress / BANNER_FADE_IN
    : (1 - progress) / (1 - BANNER_FADE_IN);
  return BANNER_ALPHA_MAX * shape;
}

/** Draws the flash as a warm glow over the sky, then the banner. */
export function drawJuice(
  ctx: CanvasRenderingContext2D,
  juice: Juice,
  width: number,
  height: number,
): void {
  const alpha = flashAlpha(juice);
  if (alpha > 0) {
    ctx.save();
    ctx.globalCompositeOperation = "screen";
    ctx.globalAlpha = alpha;
    const glow = ctx.createLinearGradient(0, 0, 0, height);
    glow.addColorStop(0, "#ffd08a");
    glow.addColorStop(0.7, "#ff9a4d");
    glow.addColorStop(1, "rgba(255, 120, 60, 0.3)");
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, width, height);
    ctx.restore();
  }

  const banner = juice.banner;
  if (banner) {
    const grow = Math.min(banner.age / (BANNER_DURATION * BANNER_FADE_IN), 1);
    ctx.save();
    // Shrink the banner to fit a narrow screen, such as a phone.
    ctx.font = popupFont("banner");
    const fit = Math.min(1, (width * BANNER_MAX_WIDTH_SHARE) / ctx.measureText(banner.text).width);
    const scale = fit * (BANNER_START_SCALE + (1 - BANNER_START_SCALE) * grow);
    ctx.globalAlpha = bannerAlpha(banner);
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.translate(width / 2, height * BANNER_HEIGHT_SHARE);
    ctx.scale(scale, scale);
    ctx.shadowColor = "#ff7a2e";
    ctx.shadowBlur = 24;
    drawPopupText(ctx, banner.text, "banner", { x: 0, y: 0 });
    ctx.restore();
  }
}
