import {
  BURST_DURATION,
  type Show,
  fireworkPosition,
} from "./game/show";
import { rainDrops, weatherLabel } from "./game/weather";
import { pauseButtonBox } from "./polish/pauseScreen";
import { crowdExcitement, drawScenery } from "./polish/scenery";
import { WEATHER_LINE_BOTTOM, WEATHER_LINE_RIGHT } from "./scoring/tuning";

/** Size of the weather word's font, in pixels. */
const WEATHER_FONT_SIZE = 16;
/** Pixels between the pause button and the weather word. */
const WEATHER_GAP = 10;

/**
 * Where the weather word goes: on its own line under the counts line,
 * beside the pause button, so it fits on a phone. `y` is the middle of
 * the text. The text is squeezed to fit `maxWidth`.
 */
export function weatherLinePlace(): { x: number; y: number; maxWidth: number } {
  const pause = pauseButtonBox();
  const x = pause.x + pause.width + WEATHER_GAP;
  const y = Math.min(pause.y + pause.height / 2, WEATHER_LINE_BOTTOM - WEATHER_FONT_SIZE / 2);
  return { x, y, maxWidth: WEATHER_LINE_RIGHT - x };
}

export function render(
  ctx: CanvasRenderingContext2D,
  show: Show,
  width: number,
  height: number,
): void {
  const time = performance.now() / 1000;
  // A popped lantern gets a boo, not a cheer, so its burst doesn't excite the crowd.
  const cheered = show.bursts.filter((burst) => !burst.type.avoid);
  drawScenery(ctx, width, height, time, crowdExcitement(cheered));
  if (show.weather === "drizzle") drawRain(ctx, time, width, height);

  for (const firework of show.active) {
    const at = fireworkPosition(firework, width, height);
    firework.type.drawRising(ctx, at, firework.age);
  }
  for (const burst of show.bursts) {
    burst.type.drawBurst(ctx, burst.at, burst.age / BURST_DURATION);
  }

  ctx.fillStyle = "#f5f5f5";
  ctx.textAlign = "left";
  ctx.font = "18px system-ui, sans-serif";
  ctx.fillText(
    `Popped ${show.popped}   Fizzled ${show.fizzled}   Left ${show.queue.length}`,
    16,
    30,
  );

  const label = weatherLabel(show.weather, show.windStrength);
  if (label) {
    const place = weatherLinePlace();
    ctx.save();
    ctx.fillStyle = "#c9d3f0";
    ctx.font = `${WEATHER_FONT_SIZE}px system-ui, sans-serif`;
    ctx.textBaseline = "middle";
    ctx.fillText(label, place.x, place.y, place.maxWidth);
    ctx.restore();
  }
}

/** Thin, faint rain lines over the sky, behind the fireworks. */
function drawRain(
  ctx: CanvasRenderingContext2D,
  time: number,
  width: number,
  height: number,
): void {
  ctx.strokeStyle = "rgba(170, 190, 220, 0.35)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  for (const drop of rainDrops(time, width, height)) {
    ctx.moveTo(drop.x, drop.y);
    ctx.lineTo(drop.x + drop.dx, drop.y + drop.dy);
  }
  ctx.stroke();
}
