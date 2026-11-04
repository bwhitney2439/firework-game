import { describe, expect, it } from "vitest";
import { pauseButtonBox } from "./polish/pauseScreen";
import { weatherLinePlace } from "./render";
import { popupAnchor } from "./scoring/popups";
import {
  COUNTS_LINE_BOTTOM,
  POPUP_RISE,
  POPUP_TEXT_HEIGHT,
  WEATHER_LINE_BOTTOM,
  WEATHER_LINE_RIGHT,
} from "./scoring/tuning";

/** Half the height of the weather word's 16 px text. */
const HALF_TEXT = 8;

describe("weather word", () => {
  it("sits on its own line under the counts line", () => {
    const place = weatherLinePlace();
    expect(place.y - HALF_TEXT).toBeGreaterThan(COUNTS_LINE_BOTTOM);
    expect(place.y + HALF_TEXT).toBeLessThanOrEqual(WEATHER_LINE_BOTTOM);
  });

  it("sits beside the pause button, not on it", () => {
    const place = weatherLinePlace();
    const pause = pauseButtonBox();
    expect(place.x).toBeGreaterThan(pause.x + pause.width);
    expect(place.y).toBeGreaterThan(pause.y);
    expect(place.y).toBeLessThan(pause.y + pause.height);
  });

  it("ends well before the HUD on a 390 px phone", () => {
    const place = weatherLinePlace();
    expect(place.maxWidth).toBeGreaterThan(60);
    expect(place.x + place.maxWidth).toBe(WEATHER_LINE_RIGHT);
    expect(WEATHER_LINE_RIGHT).toBeLessThan(250);
  });

  it("keeps pop-ups in the top left corner below it", () => {
    for (const x of [20, 100, WEATHER_LINE_RIGHT]) {
      const anchor = popupAnchor({ x, y: 30 }, 390);
      const highestTop = anchor.y - POPUP_RISE - POPUP_TEXT_HEIGHT;
      expect(highestTop).toBeGreaterThan(WEATHER_LINE_BOTTOM);
    }
  });
});
