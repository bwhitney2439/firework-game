import {
  BURST_DURATION,
  type Show,
  fireworkPosition,
  isShowOver,
} from "./game/show";

export function render(
  ctx: CanvasRenderingContext2D,
  show: Show,
  width: number,
  height: number,
): void {
  ctx.fillStyle = "#0b1026";
  ctx.fillRect(0, 0, width, height);

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

  if (isShowOver(show)) {
    ctx.textAlign = "center";
    ctx.font = "32px system-ui, sans-serif";
    ctx.fillText("Show over", width / 2, height / 2);
    ctx.font = "18px system-ui, sans-serif";
    ctx.fillText("Click to start the next show", width / 2, height / 2 + 36);
  }
}
