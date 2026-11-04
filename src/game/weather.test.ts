import { describe, expect, it } from "vitest";
import {
  DRIZZLE_RISE_FACTOR,
  MAX_WIND,
  MIN_WIND,
  pickWeather,
  pickWindStrength,
  rainDrops,
  riseFactor,
  weatherLabel,
  windDrift,
} from "./weather";

/** A random that hands out the given values in turn. */
function sequence(...values: number[]) {
  let i = 0;
  return () => values[i++ % values.length];
}

describe("picking the weather", () => {
  it("picks the same weather for the same random", () => {
    for (const roll of [0, 0.1, 0.2, 0.5, 0.99]) {
      expect(pickWeather(() => roll)).toBe(pickWeather(() => roll));
    }
  });

  it("is clear 70%, windy 15% and drizzly 15% of the time", () => {
    const counts = { clear: 0, windy: 0, drizzle: 0 };
    for (let i = 0; i < 100; i++) counts[pickWeather(() => (i + 0.5) / 100)]++;
    expect(counts).toEqual({ clear: 70, windy: 15, drizzle: 15 });
  });

  it("only has wind on a windy night", () => {
    expect(pickWindStrength("clear", () => 0.9)).toBe(0);
    expect(pickWindStrength("drizzle", () => 0.9)).toBe(0);
  });

  it("blows either way, between the weakest and strongest wind", () => {
    const left = pickWindStrength("windy", sequence(0.2, 0));
    const right = pickWindStrength("windy", sequence(0.8, 1));
    expect(left).toBeCloseTo(-MIN_WIND);
    expect(right).toBeCloseTo(MAX_WIND);
  });
});

describe("what the weather does", () => {
  it("drifts further the longer a firework flies", () => {
    expect(windDrift(0, 0.05)).toBe(0);
    expect(windDrift(2, 0.05)).toBeCloseTo(0.1);
    expect(windDrift(2, -0.05)).toBeCloseTo(-0.1);
  });

  it("slows the climb only in the drizzle", () => {
    expect(riseFactor("clear")).toBe(1);
    expect(riseFactor("windy")).toBe(1);
    expect(riseFactor("drizzle")).toBe(DRIZZLE_RISE_FACTOR);
    expect(DRIZZLE_RISE_FACTOR).toBeLessThan(1);
  });

  it("names the night for the counts line, with the wind's direction", () => {
    expect(weatherLabel("clear", 0)).toBe("");
    expect(weatherLabel("windy", 0.04)).toBe("Windy →");
    expect(weatherLabel("windy", -0.04)).toBe("← Windy");
    expect(weatherLabel("drizzle", 0)).toBe("Drizzle");
  });
});

describe("rain", () => {
  it("keeps every rain line's top on screen", () => {
    for (const time of [0, 1.3, 47.9]) {
      for (const drop of rainDrops(time, 390, 700)) {
        expect(drop.x).toBeGreaterThanOrEqual(0);
        expect(drop.x).toBeLessThan(390);
        expect(drop.y).toBeGreaterThanOrEqual(0);
        expect(drop.y).toBeLessThan(700);
      }
    }
  });

  it("is the same for the same time and falls as time goes on", () => {
    expect(rainDrops(2, 1280, 720)).toEqual(rainDrops(2, 1280, 720));
    const before = rainDrops(2, 1280, 720)[0];
    const after = rainDrops(2.01, 1280, 720)[0];
    expect(after.y).toBeGreaterThan(before.y);
  });
});
