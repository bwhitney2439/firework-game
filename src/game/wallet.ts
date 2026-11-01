import { onScored, type Scoring, startScoringShow } from "../scoring/scoring";
import { currentVenue, type GameState } from "./state";

/**
 * Pays each scored pop into `state.money`, the game's only wallet. Scoring
 * already has the venue's money multiplier in each pop's money, so nothing
 * else should add money for a pop.
 */
export function payPopsIntoWallet(
  scoring: Scoring,
  state: GameState,
  save: (state: GameState) => void = () => {},
): void {
  onScored(scoring, (scored) => {
    if (scored.kind !== "popped") return;
    state.money += scored.score.money;
    save(state);
  });
}

/** Resets the show scoring and sets the money multiplier from the venue. */
export function startShowScoring(scoring: Scoring, state: GameState): void {
  startScoringShow(scoring, currentVenue(state).moneyMultiplier);
}
