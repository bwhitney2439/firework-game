import { describe, expect, it } from "vitest";
import { COUNTS_LINE_BOTTOM } from "../scoring/tuning";
import { HUD_WIDTH } from "../scoring/hud";
import {
  type Box,
  isInside,
  pauseButtonBox,
  pauseButtons,
  pauseClick,
  speakerButtonBox,
} from "./pauseScreen";

function centre(box: Box) {
  return { x: box.x + box.width / 2, y: box.y + box.height / 2 };
}

function overlaps(a: Box, b: Box): boolean {
  return (
    a.x < b.x + b.width &&
    b.x < a.x + a.width &&
    a.y < b.y + b.height &&
    b.y < a.y + a.height
  );
}

describe("pause menu", () => {
  it("has Resume, Sound and Quit to shop, top to bottom", () => {
    const buttons = pauseButtons(1000, 800);
    expect(buttons.map((b) => b.action)).toEqual(["resume", "sound", "quit"]);
    for (let i = 1; i < buttons.length; i++) {
      expect(buttons[i].y).toBeGreaterThan(buttons[i - 1].y + buttons[i - 1].height);
    }
  });

  it("works out which button was clicked", () => {
    for (const button of pauseButtons(1000, 800)) {
      expect(pauseClick(centre(button), 1000, 800)).toBe(button.action);
    }
  });

  it("ignores clicks between and outside the buttons", () => {
    const [resume, sound] = pauseButtons(1000, 800);
    const between = { x: centre(resume).x, y: (resume.y + resume.height + sound.y) / 2 };
    expect(pauseClick(between, 1000, 800)).toBeNull();
    expect(pauseClick({ x: 5, y: 5 }, 1000, 800)).toBeNull();
    expect(pauseClick({ x: resume.x - 2, y: centre(resume).y }, 1000, 800)).toBeNull();
  });

  it("fits on a narrow phone screen with thumb-sized buttons", () => {
    for (const button of pauseButtons(320, 568)) {
      expect(button.x).toBeGreaterThanOrEqual(0);
      expect(button.x + button.width).toBeLessThanOrEqual(320);
      expect(button.y).toBeGreaterThan(0);
      expect(button.y + button.height).toBeLessThan(568);
      expect(button.height).toBeGreaterThanOrEqual(44);
    }
  });
});

describe("corner buttons", () => {
  it("puts the pause button under the counts line, in the top left", () => {
    const box = pauseButtonBox();
    expect(box.y).toBeGreaterThan(COUNTS_LINE_BOTTOM);
    expect(box.x).toBeLessThan(40);
    expect(box.width).toBeGreaterThanOrEqual(44);
    expect(isInside(box, centre(box))).toBe(true);
    expect(isInside(box, { x: box.x + box.width + 1, y: centre(box).y })).toBe(false);
    expect(isInside(box, { x: centre(box).x, y: COUNTS_LINE_BOTTOM })).toBe(false);
  });

  it("keeps the pause button clear of the HUD on a phone", () => {
    const width = 320;
    const hud = { x: width - HUD_WIDTH, y: 0, width: HUD_WIDTH, height: 100 };
    expect(overlaps(pauseButtonBox(), hud)).toBe(false);
  });

  it("puts the speaker button in the top right corner", () => {
    const box = speakerButtonBox(1000);
    expect(box.x + box.width).toBeLessThanOrEqual(1000);
    expect(box.x).toBeGreaterThan(900);
    expect(box.width).toBeGreaterThanOrEqual(44);
    expect(isInside(box, centre(box))).toBe(true);
    expect(isInside(box, { x: 500, y: 400 })).toBe(false);
  });
});
