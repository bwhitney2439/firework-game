import type { Firework, ShowEvent } from "../game/show";
import { flightProgress } from "../game/show";
import {
  AAH_PROGRESS,
  COMBO_FACTOR_MAX,
  COMBO_STEP,
  COMBO_WINDOW,
  CROWD_FIZZLE_LOSS,
  CROWD_GAIN_HIGH,
  CROWD_GAIN_LOW,
  CROWD_MULTIPLIER_MAX,
  CROWD_MULTIPLIER_THRESHOLD,
  CROWD_START,
  HEIGHT_FACTOR_HIGH,
  HEIGHT_FACTOR_LOW,
  MONEY_PER_BASE_VALUE,
  REFERENCE_RISE_SPEED,
  SPEED_FACTOR_MAX,
  SPEED_FACTOR_MIN,
} from "./tuning";

/**
 * Scoring for one show. The player's wallet is not kept here: listeners add
 * each pop's money to it (see onScored in scoring.ts).
 */
export interface ScoreState {
  /** Money earned in the current show. */
  showMoney: number;
  /**
   * Extra money factor set from outside, for example by the venue.
   * It carries over to the next show.
   */
  moneyMultiplier: number;
  /** Crowd meter from 0 to 1. */
  crowd: number;
  /** Pops in the current combo. Zero when there is no combo. */
  combo: number;
  bestCombo: number;
  /** Seconds since the show started. */
  time: number;
  /** Time of the last pop, or null before the first one. */
  lastPopTime: number | null;
}

/** How one pop was scored. Sound, summary or shop code can use this. */
export interface PopScore {
  money: number;
  /** Flight progress at the pop, from 0 to 1. */
  height: number;
  heightFactor: number;
  speedFactor: number;
  comboFactor: number;
  crowdMultiplier: number;
  moneyMultiplier: number;
  combo: number;
  /** Crowd meter after the pop. */
  crowd: number;
  cheer: "Ooh" | "Aah";
}

export interface FizzleScore {
  /** Crowd meter after the fizzle. */
  crowd: number;
  /** Length of the combo that the fizzle broke. */
  lostCombo: number;
}

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

export function createScore(moneyMultiplier = 1): ScoreState {
  return {
    showMoney: 0,
    moneyMultiplier,
    crowd: CROWD_START,
    combo: 0,
    bestCombo: 0,
    time: 0,
    lastPopTime: null,
  };
}

/** Starts a new show: the crowd, combo and show money start again. */
export function startShow(
  score: ScoreState,
  moneyMultiplier = score.moneyMultiplier,
): void {
  Object.assign(score, createScore(moneyMultiplier));
}

/** Moves the scoring clock forward by dt seconds. */
export function tickScore(score: ScoreState, dt: number): void {
  score.time += dt;
}

/** 0.5 for a pop at launch up to 1.5 at the top of the flight. */
export function heightFactor(height: number): number {
  const h = clamp(height, 0, 1);
  return HEIGHT_FACTOR_LOW + (HEIGHT_FACTOR_HIGH - HEIGHT_FACTOR_LOW) * h;
}

/** Faster fireworks are harder to hit, so they pay more. */
export function speedFactor(riseSpeed: number): number {
  return clamp(
    riseSpeed / REFERENCE_RISE_SPEED,
    SPEED_FACTOR_MIN,
    SPEED_FACTOR_MAX,
  );
}

export function comboFactor(combo: number): number {
  return Math.min(
    COMBO_FACTOR_MAX,
    1 + COMBO_STEP * Math.max(0, combo - 1),
  );
}

/** 1x up to the threshold, rising to the maximum with a full crowd. */
export function crowdMultiplier(crowd: number): number {
  const over =
    (clamp(crowd, 0, 1) - CROWD_MULTIPLIER_THRESHOLD) /
    (1 - CROWD_MULTIPLIER_THRESHOLD);
  return 1 + (CROWD_MULTIPLIER_MAX - 1) * Math.max(0, over);
}

/** Scores a popped firework: works out its money and raises the crowd. */
export function scorePop(score: ScoreState, firework: Firework): PopScore {
  const height = clamp(flightProgress(firework), 0, 1);

  const inCombo =
    score.lastPopTime !== null &&
    score.time - score.lastPopTime <= COMBO_WINDOW;
  score.combo = inCombo ? score.combo + 1 : 1;
  score.bestCombo = Math.max(score.bestCombo, score.combo);
  score.lastPopTime = score.time;

  const factors = {
    heightFactor: heightFactor(height),
    speedFactor: speedFactor(firework.type.riseSpeed),
    comboFactor: comboFactor(score.combo),
    // The crowd as it was when the firework was popped.
    crowdMultiplier: crowdMultiplier(score.crowd),
    moneyMultiplier: score.moneyMultiplier,
  };
  const money = Math.round(
    firework.type.baseValue *
      MONEY_PER_BASE_VALUE *
      factors.heightFactor *
      factors.speedFactor *
      factors.comboFactor *
      factors.crowdMultiplier *
      factors.moneyMultiplier,
  );
  score.showMoney += money;

  const gain = CROWD_GAIN_LOW + (CROWD_GAIN_HIGH - CROWD_GAIN_LOW) * height;
  score.crowd = clamp(score.crowd + gain, 0, 1);

  return {
    money,
    height,
    ...factors,
    combo: score.combo,
    crowd: score.crowd,
    cheer: height >= AAH_PROGRESS ? "Aah" : "Ooh",
  };
}

/** A fizzled firework earns nothing, lowers the crowd and ends the combo. */
export function scoreFizzle(score: ScoreState): FizzleScore {
  const lostCombo = score.combo;
  score.combo = 0;
  score.lastPopTime = null;
  score.crowd = clamp(score.crowd - CROWD_FIZZLE_LOSS, 0, 1);
  return { crowd: score.crowd, lostCombo };
}

export type ScoredEvent =
  | { kind: "popped"; event: Extract<ShowEvent, { kind: "popped" }>; score: PopScore }
  | { kind: "fizzled"; event: Extract<ShowEvent, { kind: "fizzled" }>; score: FizzleScore };

/** Scores one event from src/game/show.ts. */
export function scoreEvent(score: ScoreState, event: ShowEvent): ScoredEvent {
  if (event.kind === "popped") {
    return { kind: "popped", event, score: scorePop(score, event.firework) };
  }
  return { kind: "fizzled", event, score: scoreFizzle(score) };
}
