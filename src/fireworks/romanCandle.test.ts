import { describe, expect, it } from "vitest";
import { clickAt, createShow, fireworkPosition, updateShow } from "../game/show";
import { basicRocket } from "./basicRocket";
import { fireworkTypes } from "./registry";
import { romanCandle, starColour } from "./romanCandle";

const WIDTH = 1000;
const HEIGHT = 800;
const middle = () => 0.5;

/** A stand-in canvas context that records the calls the firework makes. */
function fakeContext() {
  const calls: string[] = [];
  const ctx = {
    fillStyle: "",
    globalAlpha: 1,
    beginPath: () => calls.push("beginPath"),
    arc: () => calls.push("arc"),
    fill: () => calls.push("fill"),
  };
  return { ctx: ctx as unknown as CanvasRenderingContext2D, calls, raw: ctx };
}

describe("roman candle", () => {
  it("is registered with a unique id", () => {
    expect(fireworkTypes).toContain(romanCandle);
    const ids = fireworkTypes.map((type) => type.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("flies faster than the basic rocket", () => {
    expect(romanCandle.riseSpeed).toBeGreaterThan(basicRocket.riseSpeed);
    expect(1 / romanCandle.riseSpeed).toBeGreaterThan(1.5);
  });

  it("is worth a medium amount and costs money in the shop", () => {
    expect(romanCandle.baseValue).toBeGreaterThan(basicRocket.baseValue);
    expect(romanCandle.baseValue).toBeLessThanOrEqual(5);
    expect(romanCandle.price).toBeGreaterThan(0);
  });

  it("drifts a little from side to side, starting from the launch point", () => {
    expect(romanCandle.pathOffset(0)).toBe(0);
    const offsets = Array.from({ length: 100 }, (_, i) =>
      romanCandle.pathOffset(i * 0.03),
    );
    expect(Math.max(...offsets.map(Math.abs))).toBeLessThanOrEqual(10);
    expect(Math.max(...offsets)).toBeGreaterThan(5);
    expect(Math.min(...offsets)).toBeLessThan(-5);
  });

  it("changes star colour as it rises", () => {
    expect(starColour(0)).not.toBe(starColour(0.2));
    expect(starColour(-1)).toBe(starColour(0));
  });

  it("fizzles sooner than a basic rocket launched at the same time", () => {
    const candleShow = createShow([romanCandle]);
    const rocketShow = createShow([basicRocket]);
    for (const show of [candleShow, rocketShow]) {
      updateShow(show, 0.01, middle);
      updateShow(show, 1 / romanCandle.riseSpeed, middle);
    }
    expect(candleShow.fizzled).toBe(1);
    expect(rocketShow.fizzled).toBe(0);
    expect(rocketShow.active).toHaveLength(1);
  });

  it("pops when clicked on its wobbling path", () => {
    const show = createShow([romanCandle]);
    updateShow(show, 0.01, middle);
    updateShow(show, 0.3, middle);
    const at = fireworkPosition(show.active[0], WIDTH, HEIGHT);
    expect(at.x).not.toBe(WIDTH / 2);
    const event = clickAt(show, at, WIDTH, HEIGHT);
    expect(event?.kind).toBe("popped");
  });

  it("draws while rising and bursting and leaves the alpha at 1", () => {
    const { ctx, calls, raw } = fakeContext();
    romanCandle.drawRising(ctx, { x: 100, y: 100 }, 0.5);
    expect(calls.filter((call) => call === "fill").length).toBeGreaterThan(1);
    expect(raw.globalAlpha).toBe(1);

    calls.length = 0;
    romanCandle.drawBurst(ctx, { x: 100, y: 100 }, 0.5);
    expect(calls.filter((call) => call === "fill").length).toBe(10);
    expect(raw.globalAlpha).toBe(1);
  });
});
