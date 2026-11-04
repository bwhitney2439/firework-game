import { describe, expect, it } from "vitest";
import { basicRocket } from "../fireworks/basicRocket";
import { clickAt, createShow, fireworkPosition, updateShow } from "../game/show";
import {
  type Popup,
  addPopup,
  addWhiff,
  drawPopups,
  overlaps,
  popupPosition,
  updatePopups,
} from "./popups";
import { createScoring, handleMiss, handleShowEvents, updateScoring } from "./scoring";
import { POPUP_DURATION, WHIFF_HALF_WIDTH, WHIFF_TEXT_HEIGHT } from "./tuning";

const WIDTH = 1280;
const HEIGHT = 720;

/** An "Ooh!" with "+£6" under it, as scoring.ts adds for a pop at `at`. */
function scorePopups(at = { x: 400, y: 300 }, popups: Popup[] = []): Popup[] {
  addPopup(popups, "Ooh!", "cheer", at);
  addPopup(popups, "+£6", "money", { x: at.x, y: at.y + 26 });
  return popups;
}

const whiffs = (popups: Popup[]) => popups.filter((popup) => popup.style === "whiff");
const others = (popups: Popup[]) => popups.filter((popup) => popup.style !== "whiff");

/** Desktop and phone screen sizes, as width and height. */
const SCREENS = [
  [WIDTH, HEIGHT],
  [390, 844],
] as const;

/** Whether every "Whiff" is fully on a `width` by `height` screen, as drawn now. */
function whiffsOnScreen(popups: Popup[], width: number, height: number): boolean {
  return whiffs(popups).every((whiff) => {
    const at = popupPosition(whiff);
    return (
      at.x - WHIFF_HALF_WIDTH >= 0 &&
      at.x + WHIFF_HALF_WIDTH <= width &&
      at.y - WHIFF_TEXT_HEIGHT >= 0 &&
      at.y + 4 <= height
    );
  });
}

/** Whether any "Whiff" covers any other pop-up. */
function whiffCovers(popups: Popup[]): boolean {
  return whiffs(popups).some((whiff) => others(popups).some((other) => overlaps(whiff, other)));
}

describe("Whiff pop-ups", () => {
  it("show one at a time however fast the clicks come", () => {
    let popups: Popup[] = [];
    for (let i = 0; i < 20; i++) {
      popups = updatePopups(popups, 0.02);
      addWhiff(popups, { x: 300 + i, y: 400 }, WIDTH, HEIGHT);
    }
    expect(whiffs(popups)).toHaveLength(1);
    expect(whiffs(popups)[0].at).toEqual({ x: 319, y: 400 });
    expect(whiffs(popups)[0].age).toBe(0);
  });

  it("stay where the click was when nothing else is near", () => {
    const popups = scorePopups({ x: 400, y: 300 });
    addWhiff(popups, { x: 900, y: 300 }, WIDTH, HEIGHT);
    expect(whiffs(popups)[0].at).toEqual({ x: 900, y: 300 });
  });

  it("move below the cheer and money they would cover", () => {
    const popups = scorePopups({ x: 400, y: 300 });
    addWhiff(popups, { x: 410, y: 300 }, WIDTH, HEIGHT);
    const [whiff] = whiffs(popups);
    expect(whiff.at.x).toBe(410);
    expect(whiff.at.y).toBeGreaterThan(326);
    expect(whiffCovers(popups)).toBe(false);
  });

  it("stay clear of the cheer and money while they all drift up", () => {
    let popups = scorePopups({ x: 400, y: 300 });
    popups = updatePopups(popups, 0.5);
    addWhiff(popups, popupPosition(popups[1]), WIDTH, HEIGHT);
    for (let t = 0; t < POPUP_DURATION; t += 0.05) {
      expect(whiffCovers(popups), `at ${t.toFixed(2)}s`).toBe(false);
      popups = updatePopups(popups, 0.05);
    }
  });

  it("give way to a new cheer or money that lands on them", () => {
    const popups: Popup[] = [];
    addWhiff(popups, { x: 900, y: 300 }, WIDTH, HEIGHT);
    scorePopups({ x: 900, y: 290 }, popups);
    expect(popups.map((popup) => popup.text)).toEqual(["Ooh!", "+£6"]);
  });

  it("never cover the score while a player mashes around pops", () => {
    const show = createShow(Array.from({ length: 8 }, () => basicRocket));
    const scoring = createScoring();
    for (let step = 0; step < 300 && (show.queue.length || show.active.length); step++) {
      updateShow(show, 0.05, () => 0.5);
      for (const firework of [...show.active]) {
        const at = fireworkPosition(firework, WIDTH, HEIGHT);
        // Mash all round the rocket, then hit it.
        for (const [dx, dy] of [[-20, 0], [20, 10], [0, -15], [5, 30]]) {
          handleMiss(scoring, { x: at.x + dx, y: at.y + dy }, WIDTH, HEIGHT);
        }
        handleShowEvents(scoring, [clickAt(show, at, WIDTH, HEIGHT)], WIDTH, HEIGHT);
        handleMiss(scoring, { x: at.x + 3, y: at.y - 2 }, WIDTH, HEIGHT);
      }
      expect(whiffs(scoring.popups).length).toBeLessThanOrEqual(1);
      expect(whiffCovers(scoring.popups), `step ${step}`).toBe(false);
      updateScoring(scoring, 0.05);
    }
    expect(others(scoring.popups).length).toBeGreaterThan(0);
  });

  for (const [width, height] of SCREENS) {
    describe(`on a ${width}×${height} screen`, () => {
      it("stay on screen for a miss on the bottom edge or in a corner", () => {
        for (const at of [
          { x: width / 2, y: height },
          { x: width / 2, y: height - 1 },
          { x: 0, y: height },
          { x: width, y: height - 2 },
          { x: 0, y: height / 2 },
          { x: width, y: 0 },
        ]) {
          let popups: Popup[] = [];
          addWhiff(popups, at, width, height);
          expect(whiffs(popups), JSON.stringify(at)).toHaveLength(1);
          for (let t = 0; t < POPUP_DURATION; t += 0.05) {
            expect(whiffsOnScreen(popups, width, height), `${JSON.stringify(at)} at ${t.toFixed(2)}s`).toBe(true);
            popups = updatePopups(popups, 0.05);
          }
        }
      });

      it("go above a score at the bottom edge rather than off screen", () => {
        let popups = scorePopups({ x: width / 2, y: height - 40 });
        addWhiff(popups, { x: width / 2 + 5, y: height - 2 }, width, height);
        const [whiff] = whiffs(popups);
        expect(whiff.at.y).toBeLessThan(height - 40);
        for (let t = 0; t < POPUP_DURATION; t += 0.05) {
          expect(whiffsOnScreen(popups, width, height), `at ${t.toFixed(2)}s`).toBe(true);
          expect(whiffCovers(popups), `at ${t.toFixed(2)}s`).toBe(false);
          popups = updatePopups(popups, 0.05);
        }
      });

      it("stay on screen and off the score for a miss anywhere near a pop", () => {
        for (let y = height - 120; y <= height; y += 10) {
          for (let x = 0; x <= width; x += width / 13) {
            const popups = scorePopups({ x: width / 2, y: Math.min(y, height - 30) });
            updatePopups(popups, 0.3);
            addWhiff(popups, { x, y }, width, height);
            const where = `miss at ${x}, ${y}`;
            expect(whiffsOnScreen(popups, width, height), where).toBe(true);
            expect(whiffCovers(popups), where).toBe(false);
          }
        }
      });
    });
  }

  it("are left out when there is no room on screen clear of the score", () => {
    const popups: Popup[] = [];
    for (let y = 80; y <= HEIGHT; y += 40) scorePopups({ x: 400, y }, popups);
    addWhiff(popups, { x: 400, y: HEIGHT - 1 }, WIDTH, HEIGHT);
    expect(whiffs(popups)).toEqual([]);
  });

  it("are drawn under the other pop-ups", () => {
    const popups = scorePopups({ x: 400, y: 300 });
    addWhiff(popups, { x: 900, y: 300 }, WIDTH, HEIGHT);
    const drawn: string[] = [];
    const ctx = {
      save() {},
      restore() {},
      strokeText() {},
      fillText(text: string) {
        drawn.push(text);
      },
    } as unknown as CanvasRenderingContext2D;
    drawPopups(ctx, popups);
    expect(drawn).toEqual(["Whiff", "Ooh!", "+£6"]);
  });
});
