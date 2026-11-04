import type { Point } from "../fireworks/types";
import { formatMoney } from "../money";
import { addPopup, popupAnchor } from "../scoring/popups";
import { onScored, type Scoring, startScoringShow } from "../scoring/scoring";
import { advanceRequest } from "./requests";
import { currentVenue, type GameState, useFirework } from "./state";

/** Pixels from a pop's cheer down to the "Request done!" pop-up, under its money. */
const REWARD_OFFSET = 52;

/**
 * Where the reward pop-up for a pop at `at` goes: under the pop's cheer and
 * money. A width of 0 makes popupAnchor keep it clear of the HUD wherever
 * the pop was, since the wallet doesn't know the canvas width.
 */
function rewardPopupAt(at: Point): Point {
  const anchor = popupAnchor(at, 0);
  return { x: anchor.x, y: anchor.y + REWARD_OFFSET };
}

/**
 * Settles each scored pop and fizzle against the saved state: the firework
 * comes out of the stock, and a pop's money goes into `state.money`, the
 * game's only wallet. Scoring already has the venue's money multiplier in
 * each pop's money, so nothing else should add money for a pop. The active
 * request is checked too: when it is done its reward is paid once, with a
 * gold pop-up. Saves after every event, so a reload mid-show keeps the
 * money, the request progress and the unused stock.
 */
export function settleScoredEvents(
  scoring: Scoring,
  state: GameState,
  save: (state: GameState) => void = () => {},
): void {
  onScored(scoring, (scored) => {
    useFirework(state, scored.event.firework.type);
    if (scored.kind === "popped") state.money += scored.score.money;

    const request = state.activeRequest;
    const progress = state.requestProgress;
    if (request && !progress.done && advanceRequest(progress, request, scored)) {
      progress.done = true;
      state.money += request.reward;
      if (scored.kind === "popped") {
        addPopup(
          scoring.popups,
          `Request done! +${formatMoney(request.reward)}`,
          "gold",
          rewardPopupAt(scored.event.at),
        );
      }
    }
    save(state);
  });
}

/** Resets the show scoring and sets the money multiplier from the venue. */
export function startScoringAtVenue(scoring: Scoring, state: GameState): void {
  startScoringShow(scoring, currentVenue(state).moneyMultiplier);
}
