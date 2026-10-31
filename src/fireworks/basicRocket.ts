import type { FireworkType } from "./types";

const SPARKS = 16;
const BURST_RADIUS = 70;

export const basicRocket: FireworkType = {
  id: "basic-rocket",
  name: "Basic rocket",
  price: 0,
  baseValue: 1,
  riseSpeed: 0.25,
  hitRadius: 28,

  pathOffset: () => 0,

  drawRising(ctx, at, age) {
    const flicker = 6 + Math.sin(age * 40) * 3;
    ctx.fillStyle = "#ffb347";
    ctx.beginPath();
    ctx.moveTo(at.x - 3, at.y + 10);
    ctx.lineTo(at.x + 3, at.y + 10);
    ctx.lineTo(at.x, at.y + 10 + flicker * 2);
    ctx.fill();

    ctx.fillStyle = "#e23d3d";
    ctx.fillRect(at.x - 4, at.y - 10, 8, 20);
    ctx.fillStyle = "#f5f5f5";
    ctx.beginPath();
    ctx.moveTo(at.x - 4, at.y - 10);
    ctx.lineTo(at.x + 4, at.y - 10);
    ctx.lineTo(at.x, at.y - 18);
    ctx.fill();
  },

  drawBurst(ctx, at, progress) {
    const radius = BURST_RADIUS * Math.sqrt(progress);
    ctx.globalAlpha = 1 - progress;
    ctx.fillStyle = "#ffd166";
    for (let i = 0; i < SPARKS; i++) {
      const angle = (i / SPARKS) * Math.PI * 2;
      ctx.beginPath();
      ctx.arc(
        at.x + Math.cos(angle) * radius,
        at.y + Math.sin(angle) * radius + progress * progress * 20,
        3,
        0,
        Math.PI * 2,
      );
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  },
};
