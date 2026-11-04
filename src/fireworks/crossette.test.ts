import { describe, expect, it } from "vitest";
import { clickAt, createShow, fireworkPosition, updateShow } from "../game/show";
import { createGameState, useFirework } from "../game/state";
import { createScore, scoreEvent, scorePop, tickScore } from "../scoring/score";
import { basicRocket } from "./basicRocket";
import {
  STAR_COUNT,
  STAR_LIFE,
  STAR_REACH,
  crossette,
  crossetteStar,
} from "./crossette";
import { fireworkTypes } from "./registry";

const WIDTH = 1000;
const HEIGHT = 800;
const middle = () => 0.5;

/** A show with one crossette in the air, popped where it is. */
function poppedCrossette() {
  const show = createShow([crossette]);
  updateShow(show, 2, middle);
  const at = fireworkPosition(show.active[0], WIDTH, HEIGHT);
  clickAt(show, at, WIDTH, HEIGHT);
  return { show, at };
}

describe("Crossette", () => {
  it("is registered, but its star is not", () => {
    expect(fireworkTypes).toContain(crossette);
    expect(fireworkTypes).not.toContain(crossetteStar);
  });

  it("is a slow, easy shell that costs more than the others", () => {
    expect(crossette.price).toBe(80);
    expect(crossette.baseValue).toBe(4);
    expect(crossette.riseSpeed).toBeLessThan(basicRocket.riseSpeed);
    expect(crossette.hitRadius).toBeGreaterThan(basicRocket.hitRadius);
    expect(crossette.split).toEqual({ type: crossetteStar, count: STAR_COUNT });
  });

  it("splits into small, fast stars", () => {
    expect(crossetteStar.hitRadius).toBeLessThan(basicRocket.hitRadius);
    expect(crossetteStar.riseSpeed).toBeGreaterThan(basicRocket.riseSpeed);
    expect(crossetteStar.riseSpeed).toBeCloseTo(1 / STAR_LIFE);
    expect(crossetteStar.split).toBeUndefined();
  });

  it("sends its stars out in a cross", () => {
    const { show, at } = poppedCrossette();
    updateShow(show, STAR_LIFE / 2, middle);
    const places = show.active.map((star) =>
      fireworkPosition(star, WIDTH, HEIGHT),
    );
    const reach = crossetteStar.pathOffset(STAR_LIFE / 2);
    expect(places[0].x).toBeCloseTo(at.x);
    expect(places[0].y).toBeCloseTo(at.y - reach);
    expect(places[1].x).toBeCloseTo(at.x + reach);
    expect(places[2].y).toBeCloseTo(at.y + reach);
    expect(places[3].x).toBeCloseTo(at.x - reach);
  });

  it("flies a star out fast and slows it down, up to its reach", () => {
    expect(crossetteStar.pathOffset(0)).toBe(0);
    const first = crossetteStar.pathOffset(STAR_LIFE / 4);
    const second = crossetteStar.pathOffset(STAR_LIFE / 2) - first;
    expect(second).toBeGreaterThan(0);
    expect(second).toBeLessThan(first);
    expect(crossetteStar.pathOffset(STAR_LIFE)).toBeCloseTo(STAR_REACH);
    expect(crossetteStar.pathOffset(STAR_LIFE * 2)).toBeCloseTo(STAR_REACH);
  });

  it("carries on the combo when a star is popped", () => {
    const show = createShow([crossette]);
    const score = createScore();
    updateShow(show, 2, middle);
    const shell = clickAt(show, fireworkPosition(show.active[0], WIDTH, HEIGHT), WIDTH, HEIGHT)!;
    expect(scoreEvent(score, shell).kind).toBe("popped");

    updateShow(show, 0.4, middle);
    tickScore(score, 0.4);
    const star = clickAt(show, fireworkPosition(show.active[0], WIDTH, HEIGHT), WIDTH, HEIGHT)!;
    const scored = scoreEvent(score, star);
    expect(scored.kind === "popped" && scored.score.combo).toBe(2);
    expect(scored.kind === "popped" && scored.score.money).toBeGreaterThan(0);
  });

  it("pays a star pop like a basic rocket popped at the same height", () => {
    const star = { type: crossetteStar, launchX: 0, age: STAR_LIFE / 2 };
    const rocket = { type: basicRocket, launchX: 0.5, age: 2 };
    expect(scorePop(createScore(), star).money).toBe(
      scorePop(createScore(), rocket).money,
    );
  });

  it("pays more for a star popped late in its life", () => {
    const early = { type: crossetteStar, launchX: 0, age: 0.1 };
    const late = { type: crossetteStar, launchX: 0, age: STAR_LIFE * 0.9 };
    expect(scorePop(createScore(), late).money).toBeGreaterThan(
      scorePop(createScore(), early).money,
    );
  });

  it("takes nothing out of the stock when a star is used", () => {
    const state = createGameState();
    state.stock = { [crossette.id]: 2 };
    state.lockedStock = { [crossette.id]: 2 };
    const before = structuredClone(state);
    useFirework(state, crossetteStar);
    expect(state).toEqual(before);
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

    for (const type of [crossette, crossetteStar]) {
      type.drawRising(ctx, { x: 100, y: 100 }, 0.7);
      type.drawBurst(ctx, { x: 100, y: 100 }, 0.5);
    }
    expect(calls).toContain("arc");
    expect(ctx.globalAlpha).toBe(1);
  });
});
