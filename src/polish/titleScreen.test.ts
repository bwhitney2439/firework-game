import { describe, expect, it } from "vitest";
import { titleBurst } from "./titleScreen";

describe("title screen bursts", () => {
  it("stay in the upper sky", () => {
    for (let t = 0; t < 30; t += 0.37) {
      for (let slot = 0; slot < 3; slot++) {
        const { at, progress } = titleBurst(slot, t, 1000, 800);
        expect(at.x).toBeGreaterThanOrEqual(0);
        expect(at.x).toBeLessThanOrEqual(1000);
        expect(at.y).toBeLessThan(800 * 0.5);
        expect(progress).toBeGreaterThanOrEqual(0);
        expect(progress).toBeLessThan(1);
      }
    }
  });

  it("move somewhere new each cycle", () => {
    const first = titleBurst(0, 0.1, 1000, 800).at;
    const later = titleBurst(0, 2.5, 1000, 800).at;
    expect(later).not.toEqual(first);
  });
});
