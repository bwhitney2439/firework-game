import { describe, expect, it } from "vitest";
import { basicRocket } from "../fireworks/basicRocket";
import { goldenRain } from "../fireworks/goldenRain";
import type { FireworkType } from "../fireworks/types";
import { clickAt, createShow, fireworkPosition, type ShowEvent, updateShow } from "../game/show";
import { HUD_BOTTOM } from "./hud";
import { popupAnchor, popupPosition, updatePopups } from "./popups";
import {
  createScoring,
  handleMiss,
  handleShowClick,
  handleShowEvents,
  onScored,
  startScoringShow,
  updateScoring,
} from "./scoring";
import {
  BANNER_DURATION,
  BIG_MONEY_POPUP,
  COUNTS_LINE_BOTTOM,
  FLASH_DURATION,
  MISS_CROWD_LOSS,
  POPUP_DURATION,
  POPUP_TEXT_HEIGHT,
  PUFF_DURATION,
} from "./tuning";

const WIDTH = 1000;
const HEIGHT = 800;
const middle = () => 0.5;

function flyingShow() {
  const show = createShow([basicRocket]);
  updateShow(show, 1, middle);
  return show;
}

describe("scoring the show", () => {
  it("earns money and shows a cheer and a money pop-up for a click", () => {
    const show = flyingShow();
    const scoring = createScoring();
    const at = fireworkPosition(show.active[0], WIDTH, HEIGHT);
    const popped = clickAt(show, at, WIDTH, HEIGHT);
    const [scored] = handleShowEvents(scoring, [popped], WIDTH, HEIGHT);

    expect(scored.kind).toBe("popped");
    expect(scoring.score.showMoney).toBeGreaterThan(0);
    expect(scoring.popups.map((popup) => popup.style)).toEqual(["cheer", "money"]);
    expect(scoring.popups[1].text).toBe(`+£${scoring.score.showMoney}`);
  });

  it("ignores a click that missed", () => {
    const show = flyingShow();
    const scoring = createScoring();
    const popped = clickAt(show, { x: 0, y: 0 }, WIDTH, HEIGHT);
    expect(handleShowEvents(scoring, [popped], WIDTH, HEIGHT)).toEqual([]);
    expect(scoring.popups).toEqual([]);
  });

  it("earns nothing and groans for a firework that fizzles", () => {
    const show = flyingShow();
    const scoring = createScoring();
    const crowd = scoring.score.crowd;
    const events = updateShow(show, 10, middle);
    handleShowEvents(scoring, events, WIDTH, HEIGHT);

    expect(scoring.score.showMoney).toBe(0);
    expect(scoring.score.crowd).toBeLessThan(crowd);
    expect(scoring.popups.map((popup) => popup.style)).toEqual(["groan"]);
  });

  it("tells listeners about each scored event so they can fill a wallet", () => {
    const show = flyingShow();
    const scoring = createScoring();
    let wallet = 0;
    const heard: string[] = [];
    onScored(scoring, (scored) => {
      heard.push(scored.kind);
      if (scored.kind === "popped") wallet += scored.score.money;
    });
    const at = fireworkPosition(show.active[0], WIDTH, HEIGHT);
    handleShowEvents(scoring, [clickAt(show, at, WIDTH, HEIGHT)], WIDTH, HEIGHT);
    handleShowEvents(scoring, updateShow(show, 10, middle), WIDTH, HEIGHT);
    expect(heard).toEqual(["popped"]);
    expect(wallet).toBe(scoring.score.showMoney);
  });

  it("clears pop-ups and show money for a new show", () => {
    const show = flyingShow();
    const scoring = createScoring();
    startScoringShow(scoring, 2);
    const at = fireworkPosition(show.active[0], WIDTH, HEIGHT);
    handleShowEvents(scoring, [clickAt(show, at, WIDTH, HEIGHT)], WIDTH, HEIGHT);
    startScoringShow(scoring, 4);
    expect(scoring.popups).toEqual([]);
    expect(scoring.score.showMoney).toBe(0);
    expect(scoring.score.moneyMultiplier).toBe(4);
  });

  it("starts the best combo again for a new show", () => {
    const show = createShow([basicRocket, basicRocket]);
    updateShow(show, 1, middle);
    updateShow(show, 1, middle);
    const scoring = createScoring();
    for (const firework of [...show.active]) {
      const at = fireworkPosition(firework, WIDTH, HEIGHT);
      handleShowEvents(scoring, [clickAt(show, at, WIDTH, HEIGHT)], WIDTH, HEIGHT);
    }
    expect(scoring.score.bestCombo).toBe(2);
    startScoringShow(scoring);
    expect(scoring.score.bestCombo).toBe(0);
  });
});

describe("missed clicks", () => {
  it("cost crowd, show a Whiff and a puff, and tell no listeners", () => {
    const scoring = createScoring();
    const heard: string[] = [];
    onScored(scoring, (scored) => heard.push(scored.kind));
    const crowd = scoring.score.crowd;
    handleMiss(scoring, { x: 300, y: 400 }, WIDTH);

    expect(scoring.score.crowd).toBeCloseTo(crowd - MISS_CROWD_LOSS);
    expect(scoring.score.showMoney).toBe(0);
    expect(scoring.popups.map((popup) => [popup.text, popup.style])).toEqual([["Whiff", "groan"]]);
    expect(scoring.puffs).toEqual([{ at: { x: 300, y: 400 }, age: 0 }]);
    expect(heard).toEqual([]);
  });

  it("keep a Whiff near the top below the counts line", () => {
    const scoring = createScoring();
    handleMiss(scoring, { x: 100, y: 5 }, WIDTH);
    expect(highestTop(scoring.popups[0])).toBeGreaterThan(COUNTS_LINE_BOTTOM);
  });

  it("end the combo and leave the show money alone", () => {
    const show = createShow([basicRocket, basicRocket]);
    updateShow(show, 1, middle);
    updateShow(show, 1, middle);
    const scoring = createScoring();
    const [first, second] = show.active;
    handleShowClick(scoring, show, fireworkPosition(first, WIDTH, HEIGHT), WIDTH, HEIGHT);
    const money = scoring.score.showMoney;
    expect(handleShowClick(scoring, show, { x: 0, y: 0 }, WIDTH, HEIGHT).kind).toBe("missed");
    expect(scoring.score.showMoney).toBe(money);
    const result = handleShowClick(scoring, show, fireworkPosition(second, WIDTH, HEIGHT), WIDTH, HEIGHT);
    expect(result.kind).toBe("popped");
    expect(scoring.score.combo).toBe(1);
  });

  it("leave puffs on screen only briefly, and not into the next show", () => {
    const scoring = createScoring();
    handleMiss(scoring, { x: 300, y: 400 }, WIDTH);
    updateScoring(scoring, PUFF_DURATION / 2);
    expect(scoring.puffs).toHaveLength(1);
    updateScoring(scoring, PUFF_DURATION);
    expect(scoring.puffs).toEqual([]);
    handleMiss(scoring, { x: 300, y: 400 }, WIDTH);
    startScoringShow(scoring);
    expect(scoring.puffs).toEqual([]);
  });

  it("are never counted once the show is over or between shows", () => {
    const scoring = createScoring();
    const before = { ...scoring.score };
    // Title and shop before the first show: the show is empty.
    expect(handleShowClick(scoring, createShow([]), { x: 10, y: 10 }, WIDTH, HEIGHT).kind).toBe("ignored");
    // Summary and shop after a show: everything has popped or fizzled.
    const show = flyingShow();
    updateShow(show, 10, middle);
    expect(handleShowClick(scoring, show, { x: 10, y: 10 }, WIDTH, HEIGHT).kind).toBe("ignored");
    expect(scoring.score).toEqual(before);
    expect(scoring.popups).toEqual([]);
    expect(scoring.puffs).toEqual([]);
  });

  it("let one careful click per firework keep the combo going", () => {
    const show = createShow([basicRocket, basicRocket, basicRocket]);
    const scoring = createScoring();
    for (let i = 0; i < 3; i++) {
      updateShow(show, 1, middle);
      updateScoring(scoring, 1);
      const at = fireworkPosition(show.active[0], WIDTH, HEIGHT);
      expect(handleShowClick(scoring, show, at, WIDTH, HEIGHT).kind).toBe("popped");
    }
    expect(scoring.score.combo).toBe(3);
  });
});

/** Top of a pop-up's text at the end of its life, when it is highest. */
function highestTop(popup: Parameters<typeof popupPosition>[0]) {
  return popupPosition({ ...popup, age: POPUP_DURATION }).y - POPUP_TEXT_HEIGHT;
}

describe("pop-up placement", () => {
  it("keeps a fizzle's Aww... below the counts line in the top left", () => {
    const groan = { kind: "fizzled" as const, firework: { type: basicRocket, launchX: 0.1, age: 99 } };
    const scoring = createScoring();
    handleShowEvents(scoring, [groan], WIDTH, HEIGHT);
    const [popup] = scoring.popups;
    expect(popup.text).toBe("Aww...");
    expect(highestTop(popup)).toBeGreaterThan(COUNTS_LINE_BOTTOM);
  });

  it("keeps pop-ups near the top right below the HUD", () => {
    const scoring = createScoring();
    handleShowEvents(
      scoring,
      [{ kind: "popped", firework: { type: basicRocket, launchX: 0.9, age: 2 }, at: { x: WIDTH - 60, y: 40 } }],
      WIDTH,
      HEIGHT,
    );
    for (const popup of scoring.popups) {
      expect(highestTop(popup)).toBeGreaterThan(HUD_BOTTOM);
    }
  });

  it("leaves pop-ups lower down where they are", () => {
    expect(popupAnchor({ x: 500, y: 400 }, WIDTH)).toEqual({ x: 500, y: 400 });
    expect(popupAnchor({ x: WIDTH - 20, y: 400 }, WIDTH)).toEqual({ x: WIDTH - 20, y: 400 });
  });
});

describe("pop-ups", () => {
  it("drift upwards and fade out", () => {
    const scoring = createScoring();
    handleShowEvents(
      scoring,
      [{ kind: "popped", firework: { type: basicRocket, launchX: 0.5, age: 2 }, at: { x: 100, y: 300 } }],
      WIDTH,
      HEIGHT,
    );
    const start = popupPosition(scoring.popups[0]).y;
    updateScoring(scoring, POPUP_DURATION / 2);
    expect(popupPosition(scoring.popups[0]).y).toBeLessThan(start);
    updateScoring(scoring, POPUP_DURATION);
    expect(scoring.popups).toEqual([]);
    expect(updatePopups([], 1)).toEqual([]);
  });
});

/** A pop of a firework of this type high in its flight, in the middle of the sky. */
function popOf(type: FireworkType): ShowEvent {
  return { kind: "popped", firework: { type, launchX: 0.5, age: 0.9 / type.riseSpeed }, at: { x: 500, y: 300 } };
}

describe("big-pop juice", () => {
  it("lights the sky for a Golden rain but not for a rocket", () => {
    const scoring = createScoring();
    handleShowEvents(scoring, [popOf(basicRocket)], WIDTH, HEIGHT);
    expect(scoring.juice.flash).toBe(0);
    handleShowEvents(scoring, [popOf(goldenRain)], WIDTH, HEIGHT);
    expect(scoring.juice.flash).toBe(1);
  });

  it("shows each combo milestone banner just once", () => {
    const scoring = createScoring();
    const banners: (string | undefined)[] = [];
    for (let i = 1; i <= 16; i++) {
      const before = scoring.juice.banner;
      handleShowEvents(scoring, [popOf(basicRocket)], WIDTH, HEIGHT);
      if (scoring.juice.banner !== before) banners.push(scoring.juice.banner?.text);
      updateScoring(scoring, 0.1);
    }
    expect(banners).toEqual(["Sizzling! x5", "Blazing! x10", "Inferno! x15"]);
  });

  it("fades the flash and banner away as the show goes on", () => {
    const scoring = createScoring();
    for (let i = 0; i < 5; i++) handleShowEvents(scoring, [popOf(goldenRain)], WIDTH, HEIGHT);
    expect(scoring.juice.banner?.text).toBe("Sizzling! x5");
    updateScoring(scoring, Math.max(FLASH_DURATION, BANNER_DURATION));
    expect(scoring.juice.flash).toBe(0);
    expect(scoring.juice.banner).toBeNull();
  });

  it("clears the flash and banner for a new show", () => {
    const scoring = createScoring();
    for (let i = 0; i < 5; i++) handleShowEvents(scoring, [popOf(goldenRain)], WIDTH, HEIGHT);
    startScoringShow(scoring);
    expect(scoring.juice.flash).toBe(0);
    expect(scoring.juice.banner).toBeNull();
  });

  it("makes the money pop-up bigger for a big pop", () => {
    const scoring = createScoring();
    handleShowEvents(scoring, [popOf(basicRocket)], WIDTH, HEIGHT);
    handleShowEvents(scoring, [popOf(goldenRain)], WIDTH, HEIGHT);
    const money = scoring.popups.filter((popup) => popup.style !== "cheer");
    expect(money.map((popup) => popup.style)).toEqual(["money", "bigMoney"]);
    expect(scoring.score.showMoney).toBeGreaterThan(BIG_MONEY_POPUP);
  });
});
