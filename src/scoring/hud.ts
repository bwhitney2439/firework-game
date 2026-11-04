import { formatMoney } from "../money";
import { isNarrow } from "../polish/wrapText";
import { crowdMultiplier, type ScoreState } from "./score";
import { CROWD_MULTIPLIER_THRESHOLD } from "./tuning";

const METER_WIDTH = 180;
const METER_HEIGHT = 14;
const MARGIN = 16;
/** Baselines of the HUD rows, top to bottom. */
const VENUE_Y = 20;
const WALLET_Y = 44;
const CROWD_Y = 66;
const METER_TOP = 74;
const COMBO_Y = METER_TOP + METER_HEIGHT + 22;

/** Width of the HUD measured from the right edge of the canvas. */
export const HUD_WIDTH = METER_WIDTH + MARGIN;
/** Lowest point the HUD draws to, below the combo row. */
export const HUD_BOTTOM = COMBO_Y + 6;

/** Crowd meter width on phones, so the HUD leaves room for the counts line. */
const NARROW_METER_WIDTH = 132;
const NARROW_MARGIN = 12;

/**
 * Where the HUD's right edge and crowd meter go. Phones get a smaller HUD in
 * the same rows, so it stays inside `HUD_WIDTH` and `HUD_BOTTOM`.
 */
export function hudLayout(width: number): {
  right: number;
  meterLeft: number;
  meterWidth: number;
  walletSize: number;
} {
  const narrow = isNarrow(width);
  const right = width - (narrow ? NARROW_MARGIN : MARGIN);
  const meterWidth = narrow ? NARROW_METER_WIDTH : METER_WIDTH;
  return { right, meterLeft: right - meterWidth, meterWidth, walletSize: narrow ? 19 : 22 };
}

/** Venue, wallet, crowd meter, multiplier and combo in the top right corner. */
export function drawScoreHud(
  ctx: CanvasRenderingContext2D,
  score: ScoreState,
  width: number,
  wallet: number,
  venue: string,
): void {
  const { right, meterLeft: left, meterWidth, walletSize } = hudLayout(width);

  ctx.save();
  ctx.textAlign = "right";
  ctx.fillStyle = "#9aa3c7";
  ctx.font = "13px system-ui, sans-serif";
  ctx.fillText(venue, right, VENUE_Y);

  ctx.fillStyle = "#7ee081";
  ctx.font = `bold ${walletSize}px system-ui, sans-serif`;
  ctx.fillText(formatMoney(wallet), right, WALLET_Y);

  ctx.font = "14px system-ui, sans-serif";
  ctx.fillStyle = "#f5f5f5";
  ctx.textAlign = "left";
  ctx.fillText("Crowd", left, CROWD_Y);

  const multiplier = crowdMultiplier(score.crowd);
  if (multiplier > 1) {
    ctx.textAlign = "right";
    ctx.fillStyle = "#ffd166";
    ctx.fillText(`x${multiplier.toFixed(1)} money`, right, CROWD_Y);
  }

  const top = METER_TOP;
  ctx.fillStyle = "#1d2550";
  ctx.fillRect(left, top, meterWidth, METER_HEIGHT);
  ctx.fillStyle = score.crowd > CROWD_MULTIPLIER_THRESHOLD ? "#ffd166" : "#ff8c42";
  ctx.fillRect(left, top, meterWidth * score.crowd, METER_HEIGHT);
  // A tick where the multiplier kicks in.
  ctx.fillStyle = "#f5f5f5";
  ctx.fillRect(left + meterWidth * CROWD_MULTIPLIER_THRESHOLD - 1, top - 2, 2, METER_HEIGHT + 4);
  ctx.strokeStyle = "#f5f5f5";
  ctx.lineWidth = 1;
  ctx.strokeRect(left + 0.5, top + 0.5, meterWidth - 1, METER_HEIGHT - 1);

  if (score.combo > 1) {
    ctx.textAlign = "right";
    ctx.fillStyle = "#fff3b0";
    ctx.font = "bold 16px system-ui, sans-serif";
    ctx.fillText(`Combo x${score.combo}`, right, COMBO_Y);
  }
  ctx.restore();
}
