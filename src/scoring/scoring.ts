import type { Point } from "../fireworks/types";
import { clickAt, fireworkPosition, isShowOver, type Show, type ShowEvent } from "../game/show";
import { drawScoreHud } from "./hud";
import { formatMoney } from "../money";
import { addPopup, drawPopups, type Popup, popupAnchor, updatePopups } from "./popups";
import {
  createScore,
  type MissScore,
  resetScore,
  type ScoredEvent,
  type ScoreState,
  scoreEvent,
  scoreMiss,
  tickScore,
} from "./score";
import { PUFF_DURATION, PUFF_RADIUS } from "./tuning";

/** Gap in pixels between the cheer and the money below it. */
const MONEY_OFFSET = 26;

/**
 * Scoring for the running game: the score, the floating pop-ups and anyone
 * listening for scored events (the wallet, see src/game/wallet.ts).
 */
export interface Scoring {
  score: ScoreState;
  popups: Popup[];
  /** Grey puffs of smoke where clicks hit nothing. */
  puffs: Puff[];
  listeners: ((scored: ScoredEvent) => void)[];
}

/** A small puff of smoke where a click missed. */
export interface Puff {
  at: Point;
  age: number;
}

export function createScoring(): Scoring {
  return { score: createScore(), popups: [], puffs: [], listeners: [] };
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

/**
 * Scores a click at `at` that hit nothing: the crowd drops a little, the
 * combo ends, and a "Whiff" pop-up and a grey puff appear. Listeners are not
 * told, so the wallet does not change.
 */
export function handleMiss(scoring: Scoring, at: Point, width: number): MissScore {
  const missed = scoreMiss(scoring.score);
  addPopup(scoring.popups, "Whiff", "groan", popupAnchor(at, width));
  scoring.puffs.push({ at: { ...at }, age: 0 });
  return missed;
}

/** What a click during a show did. */
export type ShowClick =
  | { kind: "ignored" }
  | { kind: "missed"; score: MissScore }
  | { kind: "popped"; event: ShowEvent; scored: ScoredEvent[] };

/**
 * Handles a click on the show: pops the firework under it, or scores a miss.
 * Once the show is over (and between shows) clicks are ignored, so they can
 * never cost the crowd.
 */
export function handleShowClick(
  scoring: Scoring,
  show: Show,
  click: Point,
  width: number,
  height: number,
): ShowClick {
  if (isShowOver(show)) return { kind: "ignored" };
  const popped = clickAt(show, click, width, height);
  if (!popped) return { kind: "missed", score: handleMiss(scoring, click, width) };
  return { kind: "popped", event: popped, scored: handleShowEvents(scoring, [popped], width, height) };
}

export function updateScoring(scoring: Scoring, dt: number): void {
  tickScore(scoring.score, dt);
  scoring.popups = updatePopups(scoring.popups, dt);
  for (const puff of scoring.puffs) puff.age += dt;
  scoring.puffs = scoring.puffs.filter((puff) => puff.age < PUFF_DURATION);
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
  scoring.puffs = [];
}

/** Draws each puff as a few grey blobs that spread out and fade. */
function drawPuffs(ctx: CanvasRenderingContext2D, puffs: Puff[]): void {
  ctx.save();
  ctx.fillStyle = "#8a8f9c";
  for (const puff of puffs) {
    const progress = Math.min(puff.age / PUFF_DURATION, 1);
    const radius = PUFF_RADIUS * (0.4 + 0.6 * progress);
    ctx.globalAlpha = 0.6 * (1 - progress);
    for (let i = 0; i < 3; i++) {
      const angle = (i / 3) * Math.PI * 2 - Math.PI / 2;
      ctx.beginPath();
      ctx.arc(
        puff.at.x + Math.cos(angle) * radius * 0.5,
        puff.at.y + Math.sin(angle) * radius * 0.5 - progress * 6,
        radius * 0.6,
        0,
        Math.PI * 2,
      );
      ctx.fill();
    }
  }
  ctx.restore();
}

/** Draws the pop-ups and the score HUD (with the venue name) over the show. */
export function drawScoring(
  ctx: CanvasRenderingContext2D,
  scoring: Scoring,
  width: number,
  wallet: number,
  venue: string,
): void {
  drawPuffs(ctx, scoring.puffs);
  drawPopups(ctx, scoring.popups);
  drawScoreHud(ctx, scoring.score, width, wallet, venue);
}
