import { describe, expect, it } from "vitest";
import {
  type Show,
  clickAt,
  createShow,
  fireworkPosition,
  isAvoid,
  isShowOver,
  updateShow,
} from "../game/show";
import { LANTERN_FIRST_DELAY, LANTERN_INTERVAL } from "../scoring/tuning";
import { basicRocket } from "./basicRocket";
import { fireworkTypes } from "./registry";
import { LANTERN_MAX_DRIFT, LANTERN_MIN_DRIFT, skyLantern } from "./skyLantern";

const WIDTH = 1000;
const HEIGHT = 800;
const middle = () => 0.5;
const lanternFlight = 1 / skyLantern.riseSpeed;

const rockets = (count: number) => Array.from({ length: count }, () => basicRocket);
const lanterns = (show: Show) => show.active.filter(isAvoid);

/** Runs the show in small steps for `seconds`. */
function run(show: Show, seconds: number, random = middle) {
  const events = [];
  for (let t = 0; t < seconds - 1e-9; t += 0.1) events.push(...updateShow(show, 0.1, random));
  return events;
}

describe("the sky lantern type", () => {
  it("is something to avoid, worth nothing", () => {
    expect(skyLantern.avoid).toBe(true);
    expect(skyLantern.baseValue).toBe(0);
    expect(skyLantern.price).toBe(0);
  });

  it("is never sold, so it never goes in the stock", () => {
    expect(fireworkTypes).not.toContain(skyLantern);
  });

  it("floats up slower than any firework", () => {
    for (const type of fireworkTypes) expect(skyLantern.riseSpeed).toBeLessThan(type.riseSpeed);
  });
});

describe("letting lanterns go", () => {
  it("lets the first one go after the first delay, then one every interval", () => {
    const show = createShow(rockets(30));
    updateShow(show, LANTERN_FIRST_DELAY - 0.01, middle);
    expect(lanterns(show)).toHaveLength(0);
    updateShow(show, 0.02, middle);
    expect(lanterns(show)).toHaveLength(1);
    updateShow(show, LANTERN_INTERVAL - 0.02, middle);
    expect(lanterns(show)).toHaveLength(1);
    updateShow(show, 0.02, middle);
    expect(lanterns(show)).toHaveLength(2);
  });

  it("never takes a lantern from the queue", () => {
    const show = createShow(rockets(30));
    run(show, LANTERN_FIRST_DELAY + 0.05);
    expect(lanterns(show)).toHaveLength(1);
    expect(show.queue.every((type) => type === basicRocket)).toBe(true);
    // One launch per second from 0 s, and lanterns don't use up any.
    expect(show.queue).toHaveLength(30 - Math.ceil(LANTERN_FIRST_DELAY + 0.05));
  });

  it("stops once every firework has been launched", () => {
    const show = createShow(rockets(2));
    run(show, 30);
    expect(lanterns(show)).toHaveLength(0);
    expect(show.active).toHaveLength(0);
  });

  it("shows up a few times in a starter show of 10 rockets", () => {
    const show = createShow(rockets(10));
    let seen = 0;
    for (let t = 0; t < 12; t += 0.1) {
      const before = lanterns(show).length;
      updateShow(show, 0.1, middle);
      seen += Math.max(0, lanterns(show).length - before);
    }
    expect(seen).toBeGreaterThanOrEqual(2);
  });

  it("starts on one side and drifts across towards the other", () => {
    for (const roll of [0.1, 0.9]) {
      const show = createShow(rockets(30));
      updateShow(show, LANTERN_FIRST_DELAY, () => roll);
      const lantern = lanterns(show)[0];
      const start = fireworkPosition(lantern, WIDTH, HEIGHT);
      updateShow(show, 3, () => roll);
      const later = fireworkPosition(lantern, WIDTH, HEIGHT);
      const towardsMiddle = Math.sign(WIDTH / 2 - start.x);
      expect(Math.sign(later.x - start.x)).toBe(towardsMiddle);
      expect(Math.abs(lantern.wind!)).toBeGreaterThanOrEqual(LANTERN_MIN_DRIFT);
      expect(Math.abs(lantern.wind!)).toBeLessThanOrEqual(LANTERN_MAX_DRIFT);
      expect(later.y).toBeLessThan(start.y);
    }
  });

  it("is carried by the night's wind too", () => {
    const show = createShow(rockets(30));
    show.windStrength = 0.05;
    updateShow(show, LANTERN_FIRST_DELAY, middle);
    expect(lanterns(show)[0].wind).toBeCloseTo(0.05 + (LANTERN_MIN_DRIFT + LANTERN_MAX_DRIFT) / 2, 10);
  });
});

describe("leaving a lantern", () => {
  it("floats off the top with no event and no fizzle", () => {
    const show = createShow(rockets(30));
    updateShow(show, LANTERN_FIRST_DELAY, middle);
    const lantern = lanterns(show)[0];
    const events = run(show, lanternFlight + 0.5);
    expect(show.active).not.toContain(lantern);
    expect(events.some((event) => event.firework === lantern)).toBe(false);
    expect(show.fizzled).toBe(events.length);
    expect(events.every((event) => event.firework.type === basicRocket)).toBe(true);
  });

  it("floats off the side with no event", () => {
    const show = createShow(rockets(30));
    show.windStrength = 0.3;
    updateShow(show, LANTERN_FIRST_DELAY, middle);
    const lantern = lanterns(show)[0];
    const events = run(show, 4);
    expect(show.active).not.toContain(lantern);
    expect(events.some((event) => event.firework === lantern)).toBe(false);
  });

  it("doesn't hold up the end of the show", () => {
    const show = createShow(rockets(5));
    updateShow(show, LANTERN_FIRST_DELAY, middle);
    run(show, 6);
    expect(show.queue).toHaveLength(0);
    expect(show.active.length).toBeGreaterThan(0);
    expect(show.active.every(isAvoid)).toBe(true);
    expect(isShowOver(show)).toBe(true);
  });
});

describe("popping a lantern", () => {
  it("gives a popped event with a burst, but doesn't count as a pop", () => {
    const show = createShow(rockets(30));
    updateShow(show, LANTERN_FIRST_DELAY, middle);
    // Let the rockets launched so far fly off so only the lantern is in reach.
    const lantern = lanterns(show)[0];
    show.active = [lantern];
    const at = fireworkPosition(lantern, WIDTH, HEIGHT);
    const event = clickAt(show, at, WIDTH, HEIGHT);
    expect(event).toMatchObject({ kind: "popped", firework: lantern });
    expect(show.popped).toBe(0);
    expect(show.bursts).toHaveLength(1);
    expect(show.active).toHaveLength(0);
  });
});
