import { fireworkPosition, type ShowEvent } from "../game/show";
import { drawScoreHud } from "./hud";
import { formatMoney } from "../money";
import { addPopup, drawPopups, type Popup, popupAnchor, updatePopups } from "./popups";
import {
  createScore,
  resetScore,
  type ScoredEvent,
  type ScoreState,
  scoreEvent,
  tickScore,
} from "./score";

/** Gap in pixels between the cheer and the money below it. */
const MONEY_OFFSET = 26;

/**
 * Scoring for the running game: the score, the floating pop-ups and anyone
 * listening for scored events (the wallet, see src/game/wallet.ts).
 */
export interface Scoring {
  score: ScoreState;
  popups: Popup[];
  listeners: ((scored: ScoredEvent) => void)[];
}

export function createScoring(): Scoring {
  return { score: createScore(), popups: [], listeners: [] };
}

/**
 * Calls the listener for every scored pop and fizzle. The wallet uses this
 * to add `scored.score.money` for each pop (see settleScoredEvents).
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
      const at = popupAnchor(scored.event.at, width);
      const cheer = scored.score.combo > 1
        ? `${scored.score.cheer}! x${scored.score.combo}`
        : `${scored.score.cheer}!`;
      addPopup(scoring.popups, cheer, "cheer", at);
      addPopup(scoring.popups, `+${formatMoney(scored.score.money)}`, "money", {
        x: at.x,
        y: at.y + MONEY_OFFSET,
      });
    } else {
      const at = popupAnchor(fireworkPosition(scored.event.firework, width, height), width);
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
 * Resets the crowd, combo and show money for a new show. Pass a money
 * multiplier to change it; otherwise the last one is kept.
 */
export function startScoringShow(
  scoring: Scoring,
  moneyMultiplier?: number,
): void {
  resetScore(scoring.score, moneyMultiplier);
  scoring.popups = [];
}

/** Draws the pop-ups and the score HUD (with the venue name) over the show. */
export function drawScoring(
  ctx: CanvasRenderingContext2D,
  scoring: Scoring,
  width: number,
  wallet: number,
  venue: string,
): void {
  drawPopups(ctx, scoring.popups);
  drawScoreHud(ctx, scoring.score, width, wallet, venue);
}
