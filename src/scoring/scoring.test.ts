import { describe, expect, it } from "vitest";
import { basicRocket } from "../fireworks/basicRocket";
import { clickAt, createShow, fireworkPosition, updateShow } from "../game/show";
import { HUD_BOTTOM } from "./hud";
import { popupAnchor, popupPosition, updatePopups } from "./popups";
import {
  createScoring,
  handleShowEvents,
  onScored,
  startScoringShow,
  updateScoring,
} from "./scoring";
import { COUNTS_LINE_BOTTOM, POPUP_DURATION, POPUP_TEXT_HEIGHT } from "./tuning";

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
    const scoring = createScoring(2);
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
