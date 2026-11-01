import { fireworkPosition, type ShowEvent } from "../game/show";
import { drawScoreHud } from "./hud";
import { addPopup, drawPopups, formatMoney, type Popup, updatePopups } from "./popups";
import {
  createScore,
  type ScoredEvent,
  type ScoreState,
  scoreEvent,
  startShow,
  tickScore,
} from "./score";

/** Gap in pixels between the cheer and the money below it. */
const MONEY_OFFSET = 26;

/**
 * Scoring for the running game: the score, the floating pop-ups and anyone
 * listening for scored events (sound, summary, shop).
 */
export interface Scoring {
  score: ScoreState;
  popups: Popup[];
  listeners: ((scored: ScoredEvent) => void)[];
}

export function createScoring(venueMultiplier = 1): Scoring {
  return { score: createScore(venueMultiplier), popups: [], listeners: [] };
}

/**
 * Calls the listener for every scored pop and fizzle. This is where the
 * wallet gets the money: add `scored.score.money` for each pop.
 */
export function onScored(
  scoring: Scoring,
  listener: (scored: ScoredEvent) => void,
): void {
  scoring.listeners.push(listener);
}

/** Scores show events and adds the pop-ups for them. */
export function handleShowEvents(
  scoring: Scoring,
  events: Iterable<ShowEvent | null>,
  width: number,
  height: number,
): ScoredEvent[] {
  const results: ScoredEvent[] = [];
  for (const event of events) {
    if (!event) continue;
    const scored = scoreEvent(scoring.score, event);
    if (scored.kind === "popped") {
      const { at } = scored.event;
      const cheer = scored.score.combo > 1
        ? `${scored.score.cheer}! x${scored.score.combo}`
        : `${scored.score.cheer}!`;
      addPopup(scoring.popups, cheer, "cheer", at);
      addPopup(scoring.popups, `+${formatMoney(scored.score.money)}`, "money", {
        x: at.x,
        y: at.y + MONEY_OFFSET,
      });
    } else {
      const at = fireworkPosition(scored.event.firework, width, height);
      addPopup(scoring.popups, "Aww...", "groan", at);
    }
    for (const listener of scoring.listeners) listener(scored);
    results.push(scored);
  }
  return results;
}

export function updateScoring(scoring: Scoring, dt: number): void {
  tickScore(scoring.score, dt);
  scoring.popups = updatePopups(scoring.popups, dt);
}

/**
 * Resets the crowd, combo and show money for a new show. Pass a venue
 * multiplier to change it; otherwise the last one is kept.
 */
export function startScoringShow(
  scoring: Scoring,
  venueMultiplier?: number,
): void {
  startShow(scoring.score, venueMultiplier);
  scoring.popups = [];
}

/** Draws the pop-ups and the score HUD over the show. */
export function drawScoring(
  ctx: CanvasRenderingContext2D,
  scoring: Scoring,
  width: number,
  wallet: number,
): void {
  drawPopups(ctx, scoring.popups);
  drawScoreHud(ctx, scoring.score, width, wallet);
}
