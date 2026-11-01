import { describe, expect, it } from "vitest";
import { clickAt, createShow, fireworkPosition, updateShow } from "../game/show";
import { basicRocket } from "./basicRocket";
import { goldenRain, streakPoint, streaks } from "./goldenRain";
import { fireworkTypes } from "./registry";

const WIDTH = 1000;
const HEIGHT = 800;
const middle = () => 0.5;

/** A stand-in canvas context that records method calls and property writes. */
function fakeContext() {
  const calls: string[] = [];
  const state: Record<string | symbol, unknown> = { globalAlpha: 1 };
  const saved: Record<string | symbol, unknown>[] = [];
  const ctx = new Proxy(state, {
    get(target, key) {
      if (key in target) return target[key];
      return (...args: unknown[]) => {
        calls.push(String(key));
        if (key === "save") saved.push({ ...target });
        if (key === "restore") Object.assign(target, saved.pop());
        for (const arg of args) {
          if (typeof arg === "number" && !Number.isFinite(arg)) {
            throw new Error(`${String(key)} got ${arg}`);
          }
        }
      };
    },
    set(target, key, value) {
      target[key] = value;
      return true;
    },
  });
  return { ctx: ctx as unknown as CanvasRenderingContext2D, calls, state };
}

describe("golden rain finale", () => {
  it("is registered", () => {
    expect(fireworkTypes).toContain(goldenRain);
    const ids = fireworkTypes.map((type) => type.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("is expensive and pays out far more than a basic rocket", () => {
    expect(goldenRain.price).toBeGreaterThanOrEqual(200);
    expect(goldenRain.baseValue).toBeGreaterThanOrEqual(20 * basicRocket.baseValue);
  });

  it("climbs slower than a basic rocket but is a smaller target", () => {
    expect(goldenRain.riseSpeed).toBeLessThan(basicRocket.riseSpeed);
    expect(goldenRain.hitRadius).toBeLessThan(basicRocket.hitRadius);
  });

  it("starts on its launch line and sways a little while rising", () => {
    expect(goldenRain.pathOffset(0)).toBe(0);
    const flight = 1 / goldenRain.riseSpeed;
    const offsets = Array.from({ length: 100 }, (_, i) =>
      goldenRain.pathOffset((i / 100) * flight),
    );
    expect(Math.max(...offsets.map(Math.abs))).toBeLessThanOrEqual(20);
    expect(offsets.some((offset) => offset > 5)).toBe(true);
    expect(offsets.some((offset) => offset < -5)).toBe(true);
  });

  it("can be popped mid-flight in a show", () => {
    const show = createShow([goldenRain]);
    updateShow(show, 2, middle);
    const at = fireworkPosition(show.active[0], WIDTH, HEIGHT);
    const event = clickAt(show, at, WIDTH, HEIGHT);
    expect(event?.kind === "popped" && event.firework.type).toBe(goldenRain);
  });

  it("fizzles after a five second flight", () => {
    const show = createShow([goldenRain]);
    updateShow(show, 0.01, middle);
    expect(updateShow(show, 4.9, middle)).toEqual([]);
    const events = updateShow(show, 0.2, middle);
    expect(events.map((event) => event.kind)).toEqual(["fizzled"]);
  });
});

describe("golden rain burst", () => {
  const at = { x: 500, y: 200 };

  it("starts every streak at the burst centre", () => {
    for (const streak of streaks) {
      expect(streakPoint(at, streak, 0)).toEqual(at);
    }
  });

  it("spreads wide and then rains down", () => {
    const xs = streaks.map((streak) => streakPoint(at, streak, 1).x);
    expect(Math.max(...xs) - Math.min(...xs)).toBeGreaterThan(200);

    for (const streak of streaks) {
      const mid = streakPoint(at, streak, 0.5);
      const end = streakPoint(at, streak, 1);
      expect(end.y).toBeGreaterThan(mid.y);
    }
  });

  it("keeps the burst inside a sane area past the ends of progress", () => {
    for (const streak of streaks) {
      expect(streakPoint(at, streak, 2)).toEqual(streakPoint(at, streak, 1));
      expect(streakPoint(at, streak, -1)).toEqual(at);
    }
  });
});

describe("golden rain drawing", () => {
  it("draws the rising shell and restores the context", () => {
    const { ctx, calls, state } = fakeContext();
    goldenRain.drawRising(ctx, { x: 100, y: 400 }, 1.3);
    expect(calls).toContain("fill");
    expect(calls[0]).toBe("save");
    expect(calls.at(-1)).toBe("restore");
    expect(state.globalAlpha).toBe(1);
  });

  it.each([0, 0.1, 0.5, 0.99, 1])(
    "draws the burst at progress %s and restores the context",
    (progress) => {
      const { ctx, calls, state } = fakeContext();
      goldenRain.drawBurst(ctx, { x: 500, y: 200 }, progress);
      expect(calls.filter((call) => call === "stroke")).toHaveLength(streaks.length);
      expect(calls.at(-1)).toBe("restore");
      expect(state.globalAlpha).toBe(1);
    },
  );
});
