import { describe, expect, it } from "vitest";
import { clickAt, createShow, fireworkPosition, updateShow } from "../game/show";
import { basicRocket } from "./basicRocket";
import {
  BURST_RADIUS,
  INNER_STARS,
  OUTER_STARS,
  chrysanthemum,
  chrysanthemumStars,
} from "./chrysanthemum";
import { fireworkTypes } from "./registry";

const centre = { x: 500, y: 300 };

/** A stand-in canvas context that counts the calls the burst makes. */
function fakeContext() {
  const calls: Record<string, number> = {};
  const count =
    (name: string) =>
    () => {
      calls[name] = (calls[name] ?? 0) + 1;
    };
  const ctx = {
    globalAlpha: 1,
    fillStyle: "",
    strokeStyle: "",
    lineWidth: 1,
    lineCap: "butt",
    save: count("save"),
    restore: count("restore"),
    beginPath: count("beginPath"),
    moveTo: count("moveTo"),
    lineTo: count("lineTo"),
    arc: count("arc"),
    fill: count("fill"),
    stroke: count("stroke"),
  };
  return { ctx: ctx as unknown as CanvasRenderingContext2D, calls };
}

describe("chrysanthemum shell", () => {
  it("is in the registry", () => {
    expect(fireworkTypes).toContain(chrysanthemum);
    const ids = fireworkTypes.map((type) => type.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("is worth more than a basic rocket and costs money", () => {
    expect(chrysanthemum.baseValue).toBeGreaterThan(basicRocket.baseValue);
    expect(chrysanthemum.price).toBeGreaterThan(0);
  });

  it("sways only a little either side of its launch point", () => {
    for (let age = 0; age < 1 / chrysanthemum.riseSpeed; age += 0.1) {
      expect(Math.abs(chrysanthemum.pathOffset(age))).toBeLessThanOrEqual(12);
    }
    expect(chrysanthemum.pathOffset(0)).toBe(0);
  });

  it("can be popped in a show", () => {
    const show = createShow([chrysanthemum]);
    updateShow(show, 1, () => 0.5);
    const at = fireworkPosition(show.active[0], 1000, 800);
    const event = clickAt(show, at, 1000, 800);
    expect(event?.kind).toBe("popped");
    expect(show.bursts[0].type).toBe(chrysanthemum);
  });
});

describe("chrysanthemum burst", () => {
  it("has two rings of stars", () => {
    const stars = chrysanthemumStars(centre, 0.5);
    expect(stars).toHaveLength(OUTER_STARS + INNER_STARS);
    expect(stars.filter((star) => star.outer)).toHaveLength(OUTER_STARS);
  });

  it("starts with every star at the centre", () => {
    for (const star of chrysanthemumStars(centre, 0)) {
      expect(star.head).toEqual(centre);
      expect(star.tail).toEqual(centre);
    }
  });

  it("opens wider than a basic rocket burst", () => {
    const stars = chrysanthemumStars(centre, 1);
    const widest = Math.max(...stars.map((star) => star.head.x - centre.x));
    expect(widest).toBeCloseTo(BURST_RADIUS);
    expect(widest).toBeGreaterThan(70 * 2);
  });

  it("grows outwards over time", () => {
    const spread = (progress: number) =>
      chrysanthemumStars(centre, progress)[0].head.x - centre.x;
    expect(spread(0.25)).toBeGreaterThan(0);
    expect(spread(0.5)).toBeGreaterThan(spread(0.25));
    expect(spread(1)).toBeGreaterThan(spread(0.5));
  });

  it("droops as it fades", () => {
    const stars = chrysanthemumStars(centre, 1);
    const down = stars[OUTER_STARS / 4];
    const up = stars[(OUTER_STARS * 3) / 4];
    expect(down.head.y - centre.y).toBeGreaterThan(BURST_RADIUS);
    expect(centre.y - up.head.y).toBeLessThan(BURST_RADIUS);
  });

  it("gives each star a trail to where its head was earlier", () => {
    const now = chrysanthemumStars(centre, 0.8);
    const earlier = chrysanthemumStars(centre, 0.65);
    now.forEach((star, i) => {
      expect(star.tail.x).toBeCloseTo(earlier[i].head.x);
      expect(star.tail.y).toBeCloseTo(earlier[i].head.y);
      expect(star.tail).not.toEqual(star.head);
    });
  });

  it("draws a trail and a head per star and restores the context", () => {
    const { ctx, calls } = fakeContext();
    chrysanthemum.drawBurst(ctx, centre, 0.5);
    const stars = OUTER_STARS + INNER_STARS;
    expect(calls.stroke).toBe(stars);
    expect(calls.fill).toBe(stars);
    expect(calls.save).toBe(1);
    expect(calls.restore).toBe(1);
  });

  it("draws the rising shell without throwing", () => {
    const { ctx, calls } = fakeContext();
    chrysanthemum.drawRising(ctx, centre, 1.2);
    expect(calls.fill).toBeGreaterThan(0);
  });
});
