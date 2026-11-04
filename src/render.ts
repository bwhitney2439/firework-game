import {
  BURST_DURATION,
  type Show,
  fireworkPosition,
} from "./game/show";
import { crowdExcitement, drawScenery } from "./polish/scenery";

export function render(
  ctx: CanvasRenderingContext2D,
  show: Show,
  width: number,
  height: number,
): void {
  drawScenery(ctx, width, height, performance.now() / 1000, crowdExcitement(show.bursts));

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
}
