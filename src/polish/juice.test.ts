import { describe, expect, it } from "vitest";
import { basicRocket } from "../fireworks/basicRocket";
import { chrysanthemum } from "../fireworks/chrysanthemum";
import { crossette } from "../fireworks/crossette";
import { goldenRain } from "../fireworks/goldenRain";
import { romanCandle } from "../fireworks/romanCandle";
import {
  BANNER_ALPHA_MAX,
  BANNER_DURATION,
  FLASH_ALPHA_MAX,
  FLASH_DURATION,
  FLASH_MIN_GAP,
} from "../scoring/tuning";
import {
  bannerAlpha,
  comboBanner,
  createJuice,
  flashAlpha,
  flashStrength,
  resetJuice,
  triggerBanner,
  triggerFlash,
  updateJuice,
} from "./juice";

describe("flash strength", () => {
  it("is nothing for cheap types", () => {
    expect(flashStrength(basicRocket.baseValue)).toBe(0);
    expect(flashStrength(romanCandle.baseValue)).toBe(0);
    expect(flashStrength(crossette.baseValue)).toBe(0);
    expect(flashStrength(0.5)).toBe(0);
  });

  it("lights the sky for a Chrysanthemum and fully for a Golden rain", () => {
    const chrysanthemumFlash = flashStrength(chrysanthemum.baseValue);
    expect(chrysanthemumFlash).toBeGreaterThan(0);
    expect(chrysanthemumFlash).toBeLessThan(1);
    expect(flashStrength(goldenRain.baseValue)).toBe(1);
    expect(flashStrength(1000)).toBe(1);
  });
});

describe("combo banners", () => {
  it("show at 5, 10 and 15 with their words", () => {
    expect(comboBanner(5)).toBe("Sizzling! x5");
    expect(comboBanner(10)).toBe("Blazing! x10");
    expect(comboBanner(15)).toBe("Inferno! x15");
  });

  it("don't show for other combos", () => {
    for (const combo of [0, 1, 4, 6, 9, 11, 14, 16, 20]) expect(comboBanner(combo)).toBeNull();
  });
});

describe("the flash", () => {
  it("never goes over FLASH_ALPHA_MAX", () => {
    const juice = createJuice();
    triggerFlash(juice, 5);
    expect(flashAlpha(juice)).toBeLessThanOrEqual(FLASH_ALPHA_MAX);
    expect(FLASH_ALPHA_MAX).toBeLessThanOrEqual(0.25);
  });

  it("doesn't start for a strength of nothing", () => {
    const juice = createJuice();
    expect(triggerFlash(juice, 0)).toBe(false);
    expect(flashAlpha(juice)).toBe(0);
  });

  it("fades to nothing", () => {
    const juice = createJuice();
    triggerFlash(juice, 1);
    updateJuice(juice, FLASH_DURATION / 2);
    expect(flashAlpha(juice)).toBeGreaterThan(0);
    expect(flashAlpha(juice)).toBeLessThan(FLASH_ALPHA_MAX);
    updateJuice(juice, FLASH_DURATION);
    expect(flashAlpha(juice)).toBe(0);
  });

  it("doesn't strobe: a second flash too soon is skipped", () => {
    const juice = createJuice();
    expect(triggerFlash(juice, 1)).toBe(true);
    updateJuice(juice, FLASH_DURATION);
    expect(flashAlpha(juice)).toBe(0);
    expect(triggerFlash(juice, 1)).toBe(FLASH_DURATION >= FLASH_MIN_GAP);
    updateJuice(juice, FLASH_MIN_GAP);
    expect(triggerFlash(juice, 1)).toBe(true);
    expect(flashAlpha(juice)).toBe(FLASH_ALPHA_MAX);
  });

  it("always fades out before it may start again", () => {
    expect(FLASH_MIN_GAP).toBeGreaterThanOrEqual(FLASH_DURATION);
  });
});

describe("the banner", () => {
  it("is up for under a second, half see-through, then gone", () => {
    expect(BANNER_DURATION).toBeLessThan(1);
    const juice = createJuice();
    triggerBanner(juice, "Sizzling! x5");
    updateJuice(juice, BANNER_DURATION / 3);
    expect(juice.banner?.text).toBe("Sizzling! x5");
    expect(bannerAlpha(juice.banner!)).toBeGreaterThan(0);
    expect(bannerAlpha(juice.banner!)).toBeLessThanOrEqual(BANNER_ALPHA_MAX);
    expect(BANNER_ALPHA_MAX).toBeLessThanOrEqual(0.6);
    updateJuice(juice, BANNER_DURATION);
    expect(juice.banner).toBeNull();
  });

  it("fades in and out", () => {
    expect(bannerAlpha({ text: "x", age: 0 })).toBe(0);
    expect(bannerAlpha({ text: "x", age: BANNER_DURATION })).toBe(0);
    expect(bannerAlpha({ text: "x", age: BANNER_DURATION * 0.15 })).toBeCloseTo(BANNER_ALPHA_MAX);
  });
});

describe("resetting", () => {
  it("clears the flash and banner for a new show", () => {
    const juice = createJuice();
    triggerFlash(juice, 1);
    triggerBanner(juice, "Blazing! x10");
    resetJuice(juice);
    expect(juice).toEqual(createJuice());
    expect(triggerFlash(juice, 1)).toBe(true);
  });
});
