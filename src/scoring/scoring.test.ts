import { describe, expect, it } from "vitest";
import { basicRocket } from "../fireworks/basicRocket";
import { clickAt, createShow, fireworkPosition, updateShow } from "../game/show";
import { popupPosition, updatePopups } from "./popups";
import {
  createScoring,
  handleShowEvents,
  onScored,
  startScoringShow,
  updateScoring,
} from "./scoring";
import { POPUP_DURATION } from "./tuning";

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
    expect(scoring.score.money).toBeGreaterThan(0);
    expect(scoring.popups.map((popup) => popup.style)).toEqual(["cheer", "money"]);
    expect(scoring.popups[1].text).toBe(`+£${scoring.score.money}`);
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

    expect(scoring.score.money).toBe(0);
    expect(scoring.score.crowd).toBeLessThan(crowd);
    expect(scoring.popups.map((popup) => popup.style)).toEqual(["groan"]);
  });

  it("tells listeners about each scored event", () => {
    const show = flyingShow();
    const scoring = createScoring();
    const heard: string[] = [];
    onScored(scoring, (scored) => heard.push(scored.kind));
    const at = fireworkPosition(show.active[0], WIDTH, HEIGHT);
    handleShowEvents(scoring, [clickAt(show, at, WIDTH, HEIGHT)], WIDTH, HEIGHT);
    expect(heard).toEqual(["popped"]);
  });

  it("clears pop-ups but keeps money for a new show", () => {
    const show = flyingShow();
    const scoring = createScoring(5);
    const at = fireworkPosition(show.active[0], WIDTH, HEIGHT);
    handleShowEvents(scoring, [clickAt(show, at, WIDTH, HEIGHT)], WIDTH, HEIGHT);
    const money = scoring.score.money;
    startScoringShow(scoring);
    expect(scoring.popups).toEqual([]);
    expect(scoring.score.money).toBe(money);
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
