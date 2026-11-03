import { describe, expect, it } from "vitest";
import { BURST_DURATION } from "../game/show";
import {
  CROWD_BAND,
  crowdCount,
  crowdExcitement,
  crowdFigure,
  starField,
} from "./scenery";

describe("star field", () => {
  it("is the same for the same seed", () => {
    expect(starField(3, 50, 1000, 800)).toEqual(starField(3, 50, 1000, 800));
    expect(starField(4, 50, 1000, 800)).not.toEqual(starField(3, 50, 1000, 800));
  });

  it("stays inside the canvas and above the crowd", () => {
    const stars = starField(7, 200, 1000, 800);
    expect(stars).toHaveLength(200);
    for (const star of stars) {
      expect(star.x).toBeGreaterThanOrEqual(0);
      expect(star.x).toBeLessThanOrEqual(1000);
      expect(star.y).toBeGreaterThanOrEqual(0);
      expect(star.y).toBeLessThan(800 - CROWD_BAND);
    }
  });
});

describe("crowd excitement", () => {
  it("is 0 with no bursts", () => {
    expect(crowdExcitement([])).toBe(0);
  });

  it("goes up with new bursts", () => {
    const one = crowdExcitement([{ age: 0 }]);
    const two = crowdExcitement([{ age: 0 }, { age: 0 }]);
    expect(one).toBeGreaterThan(0);
    expect(two).toBeGreaterThan(one);
    expect(crowdExcitement(Array.from({ length: 10 }, () => ({ age: 0 })))).toBe(1);
  });

  it("fades as the bursts age", () => {
    const fresh = crowdExcitement([{ age: 0 }]);
    const older = crowdExcitement([{ age: BURST_DURATION / 2 }]);
    expect(older).toBeLessThan(fresh);
    expect(older).toBeGreaterThan(0);
    expect(crowdExcitement([{ age: BURST_DURATION }])).toBe(0);
  });
});

describe("crowd figures", () => {
  it("stay in the bottom band and inside the width", () => {
    for (const width of [390, 1000, 1920]) {
      for (const excitement of [0, 0.4, 1]) {
        for (let t = 0; t < 5; t += 0.13) {
          for (let i = 0; i < crowdCount(width); i++) {
            const figure = crowdFigure(i, width, excitement, t);
            expect(figure.x).toBeGreaterThanOrEqual(0);
            expect(figure.x).toBeLessThanOrEqual(width);
            expect(figure.lift).toBeGreaterThanOrEqual(0);
            expect(figure.reach).toBeGreaterThan(0);
            expect(figure.reach).toBeLessThanOrEqual(CROWD_BAND);
          }
        }
      }
    }
  });

  it("stand still with arms down when nothing pops", () => {
    for (let i = 0; i < crowdCount(1000); i++) {
      const figure = crowdFigure(i, 1000, 0, 1.3);
      expect(figure.armsUp).toBe(false);
      expect(figure.lift).toBe(0);
    }
  });

  it("all cheer when excitement is full", () => {
    for (let i = 0; i < crowdCount(1000); i++) {
      expect(crowdFigure(i, 1000, 1, 1.3).armsUp).toBe(true);
    }
  });
});
