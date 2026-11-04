import {
  BURST_DURATION,
  type Show,
  fireworkPosition,
} from "./game/show";
import { rainDrops, weatherLabel } from "./game/weather";
import { crowdExcitement, drawScenery } from "./polish/scenery";

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

  const label = weatherLabel(show.weather, show.windStrength);
  ctx.fillStyle = "#f5f5f5";
  ctx.textAlign = "left";
  ctx.font = "18px system-ui, sans-serif";
  ctx.fillText(
    `Popped ${show.popped}   Fizzled ${show.fizzled}   Left ${show.queue.length}` +
      (label ? `   ${label}` : ""),
    16,
    30,
  );
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
