import { describe, expect, it } from "vitest";
import { basicRocket } from "./fireworks/basicRocket";
import { fireworkTypes } from "./fireworks/registry";
import type { FireworkType } from "./fireworks/types";
import { createGameState } from "./game/state";
import { venues } from "./game/venues";
import {
  type Box,
  type ShopButton,
  bestsText,
  requestCardBox,
  shopButtons,
  shopClick,
  shopLayout,
  upgradeReason,
} from "./shopScreen";

const WIDTH = 1000;
const HEIGHT = 800;
const sparkler: FireworkType = { ...basicRocket, id: "sparkler", name: "Sparkler", price: 5 };
const types = [basicRocket, sparkler];

const overlaps = (a: Box, b: Box) =>
  a.x < b.x + b.width && b.x < a.x + a.width && a.y < b.y + b.height && b.y < a.y + a.height;

function centre(button: ShopButton) {
  return { x: button.x + button.width / 2, y: button.y + button.height / 2 };
}

function find(state = createGameState(), kind: string) {
  return shopButtons(state, types, WIDTH, HEIGHT).find(
    (button) => button.action.kind === kind,
  )!;
}

describe("shop screen", () => {
  it("has a buy button with the price for each paid type", () => {
    const buys = shopButtons(createGameState(), types, WIDTH, HEIGHT).filter(
      (button) => button.action.kind === "buy",
    );
    expect(buys.map((button) => button.label)).toEqual(["Buy £5"]);
  });

  it("buys when the buy button is clicked", () => {
    const state = { ...createGameState(), money: 10 };
    const result = shopClick(state, types, centre(find(state, "buy")), WIDTH, HEIGHT);
    expect(result).toBe("changed");
    expect(state.stock).toEqual({ sparkler: 1 });
  });

  it("ignores disabled buttons", () => {
    const state = createGameState();
    expect(find(state, "buy").enabled).toBe(false);
    expect(shopClick(state, types, centre(find(state, "buy")), WIDTH, HEIGHT)).toBeNull();
  });

  it("refunds with the minus button", () => {
    const state = { ...createGameState(), stock: { sparkler: 1 } };
    expect(shopClick(state, types, centre(find(state, "refund")), WIDTH, HEIGHT)).toBe(
      "changed",
    );
    expect(state.money).toBe(5);
  });

  it("disables the minus button for fireworks that went into a show", () => {
    const state = { ...createGameState(), stock: { sparkler: 1 }, lockedStock: { sparkler: 1 } };
    expect(find(state, "refund").enabled).toBe(false);
    expect(shopClick(state, types, centre(find(state, "refund")), WIDTH, HEIGHT)).toBeNull();
    expect(state.money).toBe(0);
  });

  it("upgrades the venue", () => {
    const state = { ...createGameState(), money: 1000 };
    state.records["back-garden"] = { stars: 2, bestMoney: 90, bestCombo: 6 };
    expect(find(state, "upgrade").label).toBe("Move to Village green: £300");
    expect(upgradeReason(state)).toBe("");
    shopClick(state, types, centre(find(state, "upgrade")), WIDTH, HEIGHT);
    expect(state.venueId).toBe(venues[1].id);
  });

  it("won't move up without the stars, and says why", () => {
    const state = { ...createGameState(), money: 100_000 };
    state.records["back-garden"] = { stars: 1, bestMoney: 900, bestCombo: 30 };
    expect(find(state, "upgrade").enabled).toBe(false);
    expect(upgradeReason(state)).toBe("Earn 2★ in one show here to move on");
    expect(shopClick(state, types, centre(find(state, "upgrade")), WIDTH, HEIGHT)).toBeNull();
    expect(state.venueId).toBe(venues[0].id);
    expect(state.money).toBe(100_000);
  });

  it("says how much more money a move takes once the stars are in", () => {
    const state = { ...createGameState(), money: 120 };
    state.records["back-garden"] = { stars: 3, bestMoney: 120, bestCombo: 9 };
    expect(find(state, "upgrade").enabled).toBe(false);
    expect(upgradeReason(state)).toBe("£180 more to move on");
  });

  it("gives no reason at the top venue", () => {
    expect(upgradeReason({ ...createGameState(), venueId: "city-stadium" })).toBe("");
  });

  it("shows the venue's best show", () => {
    const state = createGameState();
    expect(bestsText(state)).toBe("No show here yet");
    state.records["back-garden"] = { stars: 1, bestMoney: 1250, bestCombo: 12 };
    expect(bestsText(state)).toBe("Best show £1,250  ·  best combo 12");
  });

  it("starts the show", () => {
    const state = createGameState();
    expect(shopClick(state, types, centre(find(state, "start")), WIDTH, HEIGHT)).toBe(
      "start",
    );
  });

  it("resets only after confirming", () => {
    const state = { ...createGameState(), money: 50 };
    const at = centre(find(state, "new-game"));
    expect(shopClick(state, types, at, WIDTH, HEIGHT, () => false)).toBeNull();
    expect(state.money).toBe(50);
    expect(shopClick(state, types, at, WIDTH, HEIGHT, () => true)).toBe("changed");
    expect(state).toEqual(createGameState());
  });

  it("does nothing for a click on empty space", () => {
    expect(shopClick(createGameState(), types, { x: 1, y: 1 }, WIDTH, HEIGHT)).toBeNull();
  });
});

describe("the booker's request card", () => {
  const fiveRows = [
    basicRocket,
    ...Array.from({ length: 5 }, (_, i) => ({ ...sparkler, id: `sparkler-${i}` })),
  ];

  for (const [width, height, list] of [
    [1280, 720, fireworkTypes],
    [1280, 720, fiveRows],
    [WIDTH, HEIGHT, types],
    [390, 844, fireworkTypes],
  ] as const) {
    it(`sits between the list and the Start button at ${width}×${height} with ${list.length} types`, () => {
      const state = createGameState();
      const card = requestCardBox([...list], width, height)!;
      expect(card).not.toBeNull();
      const buttons = shopButtons(state, [...list], width, height);
      const lowestRow = Math.max(
        ...buttons.filter((button) => button.action.kind === "buy").map((b) => b.y + b.height),
      );
      expect(card.y).toBeGreaterThan(lowestRow);
      for (const button of buttons) expect(overlaps(card, button)).toBe(false);
      expect(card.x + card.width).toBeLessThanOrEqual(width);
    });
  }

  it("is left out when the screen is too short for it", () => {
    expect(requestCardBox(fireworkTypes, 1280, 480)).toBeNull();
  });

  it("doesn't catch clicks", () => {
    const card = requestCardBox(types, WIDTH, HEIGHT)!;
    const at = { x: card.x + 20, y: card.y + card.height / 2 };
    expect(shopClick(createGameState(), types, at, WIDTH, HEIGHT)).toBeNull();
  });
});

describe("shop layout", () => {
  const sizes = [
    [390, 700],
    [390, 844],
    [1280, 720],
  ] as const;

  for (const [width, height] of sizes) {
    describe(`at ${width}×${height}`, () => {
      const state = { ...createGameState(), money: 100_000, stock: { "roman-candle": 2 } };
      const buttons = shopButtons(state, fireworkTypes, width, height);

      it("has no two buttons overlapping", () => {
        for (const [i, a] of buttons.entries()) {
          for (const b of buttons.slice(i + 1)) {
            expect(overlaps(a, b), `${a.label} and ${b.label}`).toBe(false);
          }
        }
      });

      it("has every button on screen", () => {
        for (const button of buttons) {
          expect(button.x, button.label).toBeGreaterThanOrEqual(0);
          expect(button.y, button.label).toBeGreaterThanOrEqual(0);
          expect(button.x + button.width, button.label).toBeLessThanOrEqual(width);
          expect(button.y + button.height, button.label).toBeLessThanOrEqual(height);
        }
      });

      it("keeps the venue button off the venue text", () => {
        const layout = shopLayout(width, height);
        expect(overlaps(layout.upgrade, layout.venueText)).toBe(false);
        expect(layout.venueText.x + layout.venueText.width).toBeLessThanOrEqual(width);
      });

      it("clicks every button where it is drawn", () => {
        for (const button of buttons) {
          const at = centre(button);
          const hit = shopButtons(state, fireworkTypes, width, height).find(
            (other) =>
              at.x >= other.x &&
              at.x <= other.x + other.width &&
              at.y >= other.y &&
              at.y <= other.y + other.height,
          );
          expect(hit?.label).toBe(button.label);
        }
      });
    });
  }

  it("stacks the shop under 520 px wide", () => {
    expect(shopLayout(390, 844).narrow).toBe(true);
    expect(shopLayout(519, 844).narrow).toBe(true);
    expect(shopLayout(520, 844).narrow).toBe(false);
  });

  for (const [width, height] of [
    [390, 844],
    [1280, 720],
  ]) {
    it(`puts the reason under the venue button and above the next show at ${width}×${height}`, () => {
      const layout = shopLayout(width, height);
      expect(layout.reason.y - 13).toBeGreaterThanOrEqual(layout.upgrade.y + layout.upgrade.height);
      expect(layout.reason.y).toBeLessThan(layout.nextShowY - layout.nextShowSize);
    });
  }

  it("puts the venue button under the venue details on a phone", () => {
    const layout = shopLayout(390, 844);
    expect(layout.upgrade.y).toBeGreaterThanOrEqual(layout.venueText.y + layout.venueText.height);
  });

  it("keeps New game well away from Start show on a phone", () => {
    const { start, newGame } = shopLayout(390, 844);
    expect(newGame.y + newGame.height).toBeLessThan(start.y - 300);
  });

  it("keeps the desktop layout as it was", () => {
    const buttons = shopButtons(createGameState(), types, 1280, 720);
    const at = (kind: string) => {
      const { x, y, width, height } = buttons.find((button) => button.action.kind === kind)!;
      return { x, y, width, height };
    };
    expect(at("upgrade")).toEqual({ x: 740, y: 120, width: 220, height: 36 });
    expect(at("refund")).toEqual({ x: 820, y: 256, width: 36, height: 36 });
    expect(at("buy")).toEqual({ x: 864, y: 256, width: 96, height: 36 });
    expect(at("start")).toEqual({ x: 530, y: 640, width: 220, height: 48 });
    expect(at("new-game")).toEqual({ x: 1144, y: 668, width: 120, height: 32 });
  });
});
