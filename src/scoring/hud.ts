import { formatMoney } from "./popups";
import { crowdMultiplier, type ScoreState } from "./score";
import { CROWD_MULTIPLIER_THRESHOLD } from "./tuning";

const METER_WIDTH = 180;
const METER_HEIGHT = 14;
const MARGIN = 16;

/** Wallet, crowd meter, multiplier and combo in the top right corner. */
export function drawScoreHud(
  ctx: CanvasRenderingContext2D,
  score: ScoreState,
  width: number,
  wallet: number,
): void {
  const right = width - MARGIN;
  const left = right - METER_WIDTH;

  ctx.save();
  ctx.textAlign = "right";
  ctx.fillStyle = "#7ee081";
  ctx.font = "bold 22px system-ui, sans-serif";
  ctx.fillText(formatMoney(wallet), right, 32);

  ctx.font = "14px system-ui, sans-serif";
  ctx.fillStyle = "#f5f5f5";
  ctx.textAlign = "left";
  ctx.fillText("Crowd", left, 54);

  const multiplier = crowdMultiplier(score.crowd);
  if (multiplier > 1) {
    ctx.textAlign = "right";
    ctx.fillStyle = "#ffd166";
    ctx.fillText(`x${multiplier.toFixed(1)} money`, right, 54);
  }

  const top = 62;
  ctx.fillStyle = "#1d2550";
  ctx.fillRect(left, top, METER_WIDTH, METER_HEIGHT);
  ctx.fillStyle = score.crowd > CROWD_MULTIPLIER_THRESHOLD ? "#ffd166" : "#ff8c42";
  ctx.fillRect(left, top, METER_WIDTH * score.crowd, METER_HEIGHT);
  // A tick where the multiplier kicks in.
  ctx.fillStyle = "#f5f5f5";
  ctx.fillRect(left + METER_WIDTH * CROWD_MULTIPLIER_THRESHOLD - 1, top - 2, 2, METER_HEIGHT + 4);
  ctx.strokeStyle = "#f5f5f5";
  ctx.lineWidth = 1;
  ctx.strokeRect(left + 0.5, top + 0.5, METER_WIDTH - 1, METER_HEIGHT - 1);

  if (score.combo > 1) {
    ctx.textAlign = "right";
    ctx.fillStyle = "#fff3b0";
    ctx.font = "bold 16px system-ui, sans-serif";
    ctx.fillText(`Combo x${score.combo}`, right, top + METER_HEIGHT + 22);
  }
  ctx.restore();
}
