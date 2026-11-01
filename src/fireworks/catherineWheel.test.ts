import { describe, expect, it } from "vitest";
import { clickAt, createShow, fireworkPosition, updateShow } from "../game/show";
import { basicRocket } from "./basicRocket";
import {
  WOBBLE_AMPLITUDE,
  WOBBLE_FREQUENCY,
  catherineWheel,
} from "./catherineWheel";
import { fireworkTypes } from "./registry";

const WIDTH = 1000;
const HEIGHT = 800;
const middle = () => 0.5;
/** Age when the wobble is at its widest swing to the right. */
const peakAge = 1 / (4 * WOBBLE_FREQUENCY);

/** One firework in the air at the widest point of its wobble. */
function showAtPeak() {
  const show = createShow([catherineWheel]);
  // The first update launches the firework at the time past its launch.
  updateShow(show, peakAge, middle);
  expect(show.active[0].age).toBeCloseTo(peakAge);
  return show;
}

describe("Catherine wheel", () => {
  it("is registered", () => {
    expect(fireworkTypes).toContain(catherineWheel);
  });

  it("is harder to click and worth more than a basic rocket", () => {
    expect(catherineWheel.hitRadius).toBeLessThan(basicRocket.hitRadius);
    expect(catherineWheel.baseValue).toBeGreaterThan(basicRocket.baseValue);
    expect(catherineWheel.price).toBeGreaterThan(0);
  });

  it("starts on the launch line and wobbles to both sides", () => {
    expect(catherineWheel.pathOffset(0)).toBeCloseTo(0);
    expect(catherineWheel.pathOffset(peakAge)).toBeCloseTo(WOBBLE_AMPLITUDE);
    expect(catherineWheel.pathOffset(peakAge * 3)).toBeCloseTo(
      -WOBBLE_AMPLITUDE,
    );
  });

  it("never swings further than its amplitude", () => {
    const flightTime = 1 / catherineWheel.riseSpeed;
    for (let age = 0; age <= flightTime; age += 0.05) {
      expect(Math.abs(catherineWheel.pathOffset(age))).toBeLessThanOrEqual(
        WOBBLE_AMPLITUDE,
      );
    }
  });

  it("must be clicked where it is, not on its launch line", () => {
    const show = showAtPeak();
    const at = fireworkPosition(show.active[0], WIDTH, HEIGHT);
    const launchLine = { x: show.active[0].launchX * WIDTH, y: at.y };

    expect(clickAt(show, launchLine, WIDTH, HEIGHT)).toBeNull();
    expect(clickAt(show, at, WIDTH, HEIGHT)?.kind).toBe("popped");
  });

  it("misses a click a basic rocket would still catch", () => {
    const show = showAtPeak();
    const at = fireworkPosition(show.active[0], WIDTH, HEIGHT);
    const click = { x: at.x + basicRocket.hitRadius - 1, y: at.y };
    expect(clickAt(show, click, WIDTH, HEIGHT)).toBeNull();
  });

  it("draws without leaving the canvas see-through", () => {
    const calls: string[] = [];
    const ctx = new Proxy(
      { globalAlpha: 1 },
      {
        get(target, key) {
          if (key in target) return target[key as keyof typeof target];
          return () => calls.push(String(key));
        },
        set(target, key, value) {
          (target as Record<string | symbol, unknown>)[key] = value;
          return true;
        },
      },
    ) as unknown as CanvasRenderingContext2D;

    catherineWheel.drawRising(ctx, { x: 100, y: 100 }, 1.3);
    catherineWheel.drawBurst(ctx, { x: 100, y: 100 }, 0.5);
    expect(calls).toContain("arc");
    expect(ctx.globalAlpha).toBe(1);
  });
});
