import { describe, expect, it } from "vitest";
import { basicRocket } from "../fireworks/basicRocket";
import {
  BURST_DURATION,
  LAUNCH_INTERVAL,
  clickAt,
  createShow,
  fireworkPosition,
  isShowOver,
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
