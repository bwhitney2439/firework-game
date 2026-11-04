import { describe, expect, it } from "vitest";
import { basicRocket } from "../fireworks/basicRocket";
import { crossette, crossetteStar, STAR_LIFE } from "../fireworks/crossette";
import {
  BURST_DURATION,
  LAUNCH_INTERVAL,
  clickAt,
  createShow,
  fireworkPosition,
  isShowOver,
  isStar,
  updateShow,
} from "./show";

const WIDTH = 1000;
const HEIGHT = 800;
const middle = () => 0.5;
const flightTime = 1 / basicRocket.riseSpeed;

function showWithOneFlying() {
  const show = createShow([basicRocket]);
  updateShow(show, 1, middle);
  return show;
}

describe("launching", () => {
  it("launches one firework at a time, on the interval", () => {
    const show = createShow([basicRocket, basicRocket]);
    updateShow(show, 0.01, middle);
    expect(show.active).toHaveLength(1);
    expect(show.queue).toHaveLength(1);

    updateShow(show, LAUNCH_INTERVAL, middle);
    expect(show.active).toHaveLength(2);
    expect(show.queue).toHaveLength(0);
  });

  it("starts a new firework at the time past its launch, not one frame more", () => {
    const show = createShow([basicRocket]);
    updateShow(show, 0.016, middle);
    expect(show.active[0].age).toBeCloseTo(0.016, 10);
  });

  it("starts a new firework at the time past its launch on a big frame", () => {
    const show = createShow([basicRocket]);
    updateShow(show, 1.3, middle);
    expect(show.active[0].age).toBeCloseTo(1.3, 10);
  });

  it("gives each firework launched in one frame its own time past launch", () => {
    const show = createShow([basicRocket, basicRocket, basicRocket]);
    updateShow(show, 2.5, middle);
    expect(show.active.map((firework) => firework.age)).toEqual([
      expect.closeTo(2.5, 10),
      expect.closeTo(2.5 - LAUNCH_INTERVAL, 10),
      expect.closeTo(2.5 - 2 * LAUNCH_INTERVAL, 10),
    ]);
  });

  it("ages a firework launched on an earlier frame by the full frame", () => {
    const show = createShow([basicRocket, basicRocket]);
    updateShow(show, 0.25, middle);
    updateShow(show, 0.5, middle);
    expect(show.active.map((firework) => firework.age)).toEqual([
      expect.closeTo(0.75, 10),
    ]);
  });

  it("does not change the stock it receives", () => {
    const stock = [basicRocket];
    updateShow(createShow(stock), 1, middle);
    expect(stock).toHaveLength(1);
  });
});

describe("flight", () => {
  it("rises from the bottom of the screen", () => {
    const show = showWithOneFlying();
    const before = fireworkPosition(show.active[0], WIDTH, HEIGHT);
    updateShow(show, 0.5, middle);
    const after = fireworkPosition(show.active[0], WIDTH, HEIGHT);
    expect(before.y).toBeLessThan(HEIGHT);
    expect(after.y).toBeLessThan(before.y);
  });

  it("fizzles at the top of the flight and reports the event", () => {
    const show = createShow([basicRocket]);
    updateShow(show, 0.01, middle);
    const events = updateShow(show, flightTime, middle);
    expect(show.active).toHaveLength(0);
    expect(show.fizzled).toBe(1);
    expect(events.map((event) => event.kind)).toEqual(["fizzled"]);
  });
});

describe("clicking", () => {
  it("pops a firework when the click is in range", () => {
    const show = showWithOneFlying();
    const at = fireworkPosition(show.active[0], WIDTH, HEIGHT);
    const event = clickAt(
      show,
      { x: at.x + basicRocket.hitRadius - 1, y: at.y },
      WIDTH,
      HEIGHT,
    );
    expect(event?.kind).toBe("popped");
    expect(show.popped).toBe(1);
    expect(show.active).toHaveLength(0);
    expect(show.bursts).toHaveLength(1);
  });

  it("does nothing when the click is out of range", () => {
    const show = showWithOneFlying();
    const at = fireworkPosition(show.active[0], WIDTH, HEIGHT);
    const event = clickAt(
      show,
      { x: at.x + basicRocket.hitRadius + 1, y: at.y },
      WIDTH,
      HEIGHT,
    );
    expect(event).toBeNull();
    expect(show.popped).toBe(0);
    expect(show.active).toHaveLength(1);
  });

  it("pops only the closest firework when two are in range", () => {
    const show = showWithOneFlying();
    const [first] = show.active;
    const second = { ...first };
    show.active.push(second);
    second.age += 0.01;
    const at = fireworkPosition(second, WIDTH, HEIGHT);

    const event = clickAt(show, at, WIDTH, HEIGHT);
    expect(event?.kind === "popped" && event.firework).toBe(second);
    expect(show.active).toEqual([first]);
  });

  it("removes a burst when its time ends", () => {
    const show = showWithOneFlying();
    clickAt(show, fireworkPosition(show.active[0], WIDTH, HEIGHT), WIDTH, HEIGHT);
    updateShow(show, BURST_DURATION, middle);
    expect(show.bursts).toHaveLength(0);
  });
});

describe("show end", () => {
  it("is not over while fireworks wait or fly", () => {
    const show = createShow([basicRocket]);
    expect(isShowOver(show)).toBe(false);
    updateShow(show, 0.01, middle);
    expect(isShowOver(show)).toBe(false);
  });

  it("is over after the last firework pops", () => {
    const show = showWithOneFlying();
    clickAt(show, fireworkPosition(show.active[0], WIDTH, HEIGHT), WIDTH, HEIGHT);
    expect(isShowOver(show)).toBe(true);
  });

  it("is over after the last firework fizzles", () => {
    const show = createShow([basicRocket]);
    updateShow(show, 0.01, middle);
    updateShow(show, flightTime, middle);
    expect(isShowOver(show)).toBe(true);
  });
});

describe("split fireworks", () => {
  /** A show with one crossette in the air. */
  function showWithCrossette() {
    const show = createShow([crossette]);
    updateShow(show, 2, middle);
    return show;
  }

  function popFirst(show: ReturnType<typeof createShow>) {
    const at = fireworkPosition(show.active[0], WIDTH, HEIGHT);
    return { at, event: clickAt(show, at, WIDTH, HEIGHT) };
  }

  it("adds the split's stars at the pop point", () => {
    const show = showWithCrossette();
    const { at, event } = popFirst(show);
    expect(event?.kind).toBe("popped");
    expect(show.active).toHaveLength(crossette.split!.count);
    for (const star of show.active) {
      expect(star.type).toBe(crossetteStar);
      expect(isStar(star)).toBe(true);
      expect(fireworkPosition(star, WIDTH, HEIGHT)).toEqual(at);
    }
  });

  it("spreads the stars out evenly", () => {
    const show = showWithCrossette();
    popFirst(show);
    const headings = show.active.map((star) => star.heading!);
    const step = (Math.PI * 2) / headings.length;
    for (let i = 1; i < headings.length; i++) {
      expect(headings[i] - headings[i - 1]).toBeCloseTo(step);
    }
  });

  it("moves the stars outwards", () => {
    const show = showWithCrossette();
    const { at } = popFirst(show);
    const distances = () =>
      show.active.map((star) => {
        const place = fireworkPosition(star, WIDTH, HEIGHT);
        return Math.hypot(place.x - at.x, place.y - at.y);
      });
    updateShow(show, 0.2, middle);
    const before = distances();
    updateShow(show, 0.2, middle);
    distances().forEach((distance, i) => {
      expect(distance).toBeGreaterThan(before[i]);
    });
  });

  it("drops stars that run out, with no fizzle event", () => {
    const show = showWithCrossette();
    popFirst(show);
    const events = updateShow(show, STAR_LIFE, middle);
    expect(events).toEqual([]);
    expect(show.active).toHaveLength(0);
    expect(show.fizzled).toBe(0);
    expect(isShowOver(show)).toBe(true);
  });

  it("keeps the show going while stars are in the air", () => {
    const show = showWithCrossette();
    popFirst(show);
    expect(isShowOver(show)).toBe(false);
  });

  it("pops a star with a normal popped event, but not as a stock pop", () => {
    const show = showWithCrossette();
    popFirst(show);
    updateShow(show, 0.3, middle);
    const star = show.active[0];
    const { at, event } = popFirst(show);
    expect(event).toEqual({ kind: "popped", firework: star, at });
    expect(show.popped).toBe(1);
    expect(show.active).toHaveLength(crossette.split!.count - 1);
  });

  it("doesn't split a star again", () => {
    const show = showWithCrossette();
    popFirst(show);
    popFirst(show);
    expect(show.active).toHaveLength(crossette.split!.count - 1);
  });

  it("leaves fireworks without a split as they were", () => {
    const show = showWithOneFlying();
    popFirst(show);
    expect(show.active).toHaveLength(0);
    expect(isStar({ type: basicRocket, launchX: 0.5, age: 1 })).toBe(false);
  });
});

describe("weather", () => {
  const windyRight = () => {
    const values = [0.01, 0.9, 1];
    let i = 0;
    return () => values[i++];
  };

  function windyShow(stock = [basicRocket]) {
    const show = createShow(stock, windyRight());
    expect(show.weather).toBe("windy");
    return show;
  }

  it("is clear without a random, as before", () => {
    const show = createShow([basicRocket]);
    expect(show.weather).toBe("clear");
    expect(show.windStrength).toBe(0);
    updateShow(show, 1, middle);
    expect(show.active[0]).toEqual({ type: basicRocket, launchX: 0.5, age: 1 });
  });

  it("picks the same weather for the same random", () => {
    for (const roll of [0.05, 0.2, 0.6]) {
      const a = createShow([basicRocket], () => roll);
      const b = createShow([basicRocket], () => roll);
      expect([a.weather, a.windStrength]).toEqual([b.weather, b.windStrength]);
    }
    expect(createShow([], () => 0.2).weather).toBe("drizzle");
    expect(createShow([], () => 0.6).weather).toBe("clear");
  });

  it("plays a clear night from a random exactly like one without", () => {
    const picked = createShow([basicRocket], () => 0.9);
    const plain = createShow([basicRocket]);
    updateShow(picked, 1.5, middle);
    updateShow(plain, 1.5, middle);
    expect(picked.active).toEqual(plain.active);
  });

  it("blows a firework sideways as it climbs", () => {
    const show = windyShow();
    expect(show.windStrength).toBeGreaterThan(0);
    updateShow(show, 0.5, middle);
    const before = fireworkPosition(show.active[0], WIDTH, HEIGHT);
    updateShow(show, 1, middle);
    const after = fireworkPosition(show.active[0], WIDTH, HEIGHT);
    expect(after.x).toBeGreaterThan(before.x);
    expect(after.y).toBeLessThan(before.y);
  });

  it("keeps a drifting firework inside the side margins", () => {
    for (const roll of [0, 1]) {
      const show = createShow([basicRocket], () => 0.01);
      show.windStrength = roll === 0 ? -0.5 : 0.5;
      updateShow(show, 0.01, () => roll);
      for (let t = 0; t < flightTime - 0.1; t += 0.25) {
        const { x } = fireworkPosition(show.active[0], WIDTH, HEIGHT);
        expect(x).toBeGreaterThanOrEqual(WIDTH * 0.1);
        expect(x).toBeLessThanOrEqual(WIDTH * 0.9);
        updateShow(show, 0.25, middle);
      }
    }
  });

  it("pops a drifted firework where it is drawn, not where it launched", () => {
    const show = windyShow();
    updateShow(show, 3, middle);
    const drawn = fireworkPosition(show.active[0], WIDTH, HEIGHT);
    const launched = WIDTH * 0.5;
    expect(drawn.x - launched).toBeGreaterThan(basicRocket.hitRadius);
    expect(clickAt(show, { x: launched, y: drawn.y }, WIDTH, HEIGHT)).toBeNull();
    expect(clickAt(show, drawn, WIDTH, HEIGHT)?.kind).toBe("popped");
  });

  it("makes the flight take longer in the drizzle", () => {
    const show = createShow([basicRocket], () => 0.2);
    expect(show.weather).toBe("drizzle");
    updateShow(show, 0.01, middle);
    updateShow(show, flightTime, middle);
    expect(show.fizzled).toBe(0);
    expect(show.active).toHaveLength(1);
    updateShow(show, flightTime / 4, middle);
    expect(show.fizzled).toBe(1);
  });

  it("doesn't blow or slow stars split off a crossette", () => {
    const show = windyShow([crossette]);
    updateShow(show, 2, middle);
    const at = fireworkPosition(show.active[0], WIDTH, HEIGHT);
    clickAt(show, at, WIDTH, HEIGHT);
    for (const star of show.active) {
      expect(star.wind).toBeUndefined();
      expect(star.rise).toBeUndefined();
    }
  });
});
