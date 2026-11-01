import { describe, expect, it } from "vitest";
import { basicRocket } from "../fireworks/basicRocket";
import type { FireworkType } from "../fireworks/types";
import type { Firework } from "../game/show";
import {
  comboFactor,
  createScore,
  crowdMultiplier,
  heightFactor,
  scoreEvent,
  scoreFizzle,
  scorePop,
  speedFactor,
  startShow,
  tickScore,
} from "./score";
import {
  COMBO_FACTOR_MAX,
  COMBO_WINDOW,
  CROWD_FIZZLE_LOSS,
  CROWD_MULTIPLIER_MAX,
  CROWD_START,
  MONEY_PER_BASE_VALUE,
} from "./tuning";

/** A firework at the given share of its flight. */
function fireworkAt(progress: number, type: FireworkType = basicRocket): Firework {
  return { type, launchX: 0.5, age: progress / type.riseSpeed };
}

const fastRocket: FireworkType = { ...basicRocket, riseSpeed: 0.5 };

describe("pop value", () => {
  it("pays more for higher pops", () => {
    const low = scorePop(createScore(), fireworkAt(0.2));
    const high = scorePop(createScore(), fireworkAt(0.9));
    expect(high.money).toBeGreaterThan(low.money);
    expect(heightFactor(1)).toBeGreaterThan(heightFactor(0));
  });

  it("pays more for faster fireworks", () => {
    const normal = scorePop(createScore(), fireworkAt(0.5));
    const fast = scorePop(createScore(), fireworkAt(0.5, fastRocket));
    expect(fast.money).toBeGreaterThan(normal.money);
    expect(speedFactor(basicRocket.riseSpeed)).toBe(1);
  });

  it("pays the base value times the scale at mid height with no bonuses", () => {
    const score = createScore();
    const pop = scorePop(score, fireworkAt(0.5));
    expect(pop.money).toBe(basicRocket.baseValue * MONEY_PER_BASE_VALUE);
    expect(score.showMoney).toBe(pop.money);
  });

  it("caps the speed factor", () => {
    expect(speedFactor(100)).toBe(2);
    expect(speedFactor(0.01)).toBe(0.75);
  });
});

describe("combo", () => {
  it("grows when pops follow each other quickly", () => {
    const score = createScore();
    scorePop(score, fireworkAt(0.5));
    tickScore(score, COMBO_WINDOW / 2);
    const second = scorePop(score, fireworkAt(0.5));
    expect(second.combo).toBe(2);
    expect(second.comboFactor).toBeGreaterThan(1);
    expect(score.bestCombo).toBe(2);
  });

  it("starts again after a slow pop", () => {
    const score = createScore();
    scorePop(score, fireworkAt(0.5));
    tickScore(score, COMBO_WINDOW + 0.1);
    expect(scorePop(score, fireworkAt(0.5)).combo).toBe(1);
  });

  it("is broken by a fizzle", () => {
    const score = createScore();
    scorePop(score, fireworkAt(0.5));
    scorePop(score, fireworkAt(0.5));
    expect(scoreFizzle(score).lostCombo).toBe(2);
    expect(scorePop(score, fireworkAt(0.5)).combo).toBe(1);
  });

  it("has a capped factor", () => {
    expect(comboFactor(1)).toBe(1);
    expect(comboFactor(100)).toBe(COMBO_FACTOR_MAX);
  });
});

describe("crowd meter", () => {
  it("rises with pops, more for high ones", () => {
    const low = scorePop(createScore(), fireworkAt(0.1)).crowd;
    const high = scorePop(createScore(), fireworkAt(1)).crowd;
    expect(low).toBeGreaterThan(CROWD_START);
    expect(high).toBeGreaterThan(low);
  });

  it("falls when a firework fizzles", () => {
    const score = createScore();
    scoreFizzle(score);
    expect(score.crowd).toBeCloseTo(CROWD_START - CROWD_FIZZLE_LOSS);
  });

  it("stays between 0 and 1", () => {
    const score = createScore();
    for (let i = 0; i < 20; i++) scoreFizzle(score);
    expect(score.crowd).toBe(0);
    for (let i = 0; i < 50; i++) scorePop(score, fireworkAt(1));
    expect(score.crowd).toBe(1);
  });
});

describe("crowd multiplier", () => {
  it("is 1x for a quiet crowd and the maximum for a full one", () => {
    expect(crowdMultiplier(0)).toBe(1);
    expect(crowdMultiplier(0.5)).toBe(1);
    expect(crowdMultiplier(1)).toBe(CROWD_MULTIPLIER_MAX);
    expect(crowdMultiplier(0.75)).toBeGreaterThan(1);
  });

  it("raises the money for a pop", () => {
    const quiet = createScore();
    const loud = createScore();
    loud.crowd = 1;
    const quietPop = scorePop(quiet, fireworkAt(0.5));
    const loudPop = scorePop(loud, fireworkAt(0.5));
    expect(loudPop.money).toBe(quietPop.money * CROWD_MULTIPLIER_MAX);
  });
});

describe("venue multiplier", () => {
  it("scales the money for a pop", () => {
    const plain = scorePop(createScore(), fireworkAt(0.5));
    const venue = scorePop(createScore(4), fireworkAt(0.5));
    expect(venue.venueMultiplier).toBe(4);
    expect(venue.money).toBe(plain.money * 4);
  });
});

describe("fizzles", () => {
  it("earn nothing", () => {
    const score = createScore();
    scoreFizzle(score);
    expect(score.showMoney).toBe(0);
  });
});

describe("cheers", () => {
  it("says Ooh for low pops and Aah for high ones", () => {
    expect(scorePop(createScore(), fireworkAt(0.2)).cheer).toBe("Ooh");
    expect(scorePop(createScore(), fireworkAt(0.9)).cheer).toBe("Aah");
  });
});

describe("show events", () => {
  it("scores popped and fizzled events", () => {
    const score = createScore();
    const firework = fireworkAt(0.5);
    const popped = scoreEvent(score, { kind: "popped", firework, at: { x: 0, y: 0 } });
    expect(popped.kind).toBe("popped");
    expect(score.showMoney).toBeGreaterThan(0);
    const fizzled = scoreEvent(score, { kind: "fizzled", firework });
    expect(fizzled.kind).toBe("fizzled");
  });
});

describe("new show", () => {
  it("resets the crowd, combo and show money", () => {
    const score = createScore(2);
    scorePop(score, fireworkAt(1));
    scorePop(score, fireworkAt(1));
    startShow(score);
    expect(score.venueMultiplier).toBe(2);
    expect(score.showMoney).toBe(0);
    expect(score.crowd).toBe(CROWD_START);
    expect(score.combo).toBe(0);
    expect(score.time).toBe(0);
  });

  it("can change the venue multiplier", () => {
    const score = createScore(2);
    startShow(score, 4);
    expect(score.venueMultiplier).toBe(4);
  });
});
