import type { FireworkType } from "./types";

/** Stars a crossette splits into when it is popped. */
export const STAR_COUNT = 4;
/** Seconds a star flies before it fades out. */
export const STAR_LIFE = 1.5;
/** How far a star flies out from the pop point by the end of its life, in pixels. */
export const STAR_REACH = 150;
/** Glow around the shell while it rises, in pixels. */
const SHELL_RADIUS = 9;
/** Length of the short flash lines in the shell's own burst, in pixels. */
const FLASH_REACH = 40;
const SHELL_COLOUR = "#b8f2ff";
const STAR_COLOUR = "#fff6a8";

/**
 * A crossette star, split off a popped crossette. It is not in the registry,
 * so it is never sold or put in the stock. It is fast, so it gets the full
 * speed factor (2x); half a basic rocket's base value makes a pop pay the
 * same as a basic rocket popped at the same height. Its "height" is how far
 * through its life it is, so a late pop pays more than an early one.
 */
export const crossetteStar: FireworkType = {
  id: "crossette-star",
  name: "Crossette star",
  price: 0,
  baseValue: 0.5,
  riseSpeed: 1 / STAR_LIFE,
  hitRadius: 16,

  // Flies out fast and slows down, as if the air drags on it.
  pathOffset: (age) => {
    const life = Math.min(Math.max(age / STAR_LIFE, 0), 1);
    return STAR_REACH * (1 - (1 - life) ** 2);
  },

  drawRising(ctx, at, age) {
    const life = Math.min(age / STAR_LIFE, 1);
    const twinkle = 1 + Math.sin(age * 50) * 0.25;
    ctx.globalAlpha = 1 - life * 0.7;
    ctx.fillStyle = STAR_COLOUR;
    ctx.beginPath();
    ctx.arc(at.x, at.y, 4 * twinkle, 0, Math.PI * 2);
    ctx.fill();

    // Four little points, so it reads as a star you can aim at.
    ctx.strokeStyle = STAR_COLOUR;
    ctx.lineWidth = 1.5;
    const spike = 9 * twinkle;
    ctx.beginPath();
    ctx.moveTo(at.x - spike, at.y);
    ctx.lineTo(at.x + spike, at.y);
    ctx.moveTo(at.x, at.y - spike);
    ctx.lineTo(at.x, at.y + spike);
    ctx.stroke();
    ctx.globalAlpha = 1;
  },

  drawBurst(ctx, at, progress) {
    const radius = 22 * Math.sqrt(progress);
    ctx.globalAlpha = 1 - progress;
    ctx.fillStyle = STAR_COLOUR;
    for (let i = 0; i < 8; i++) {
      const angle = (i / 8) * Math.PI * 2;
      ctx.beginPath();
      ctx.arc(
        at.x + Math.cos(angle) * radius,
        at.y + Math.sin(angle) * radius,
        2,
        0,
        Math.PI * 2,
      );
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  },
};

/** A slow, easy shell. Popping it starts four quick, harder shots. */
export const crossette: FireworkType = {
  id: "crossette",
  name: "Crossette",
  price: 80,
  baseValue: 4,
  riseSpeed: 0.2,
  hitRadius: 34,
  split: { type: crossetteStar, count: STAR_COUNT },

  pathOffset: () => 0,

  drawRising(ctx, at, age) {
    const pulse = 1 + Math.sin(age * 12) * 0.15;
    ctx.globalAlpha = 0.35;
    ctx.fillStyle = SHELL_COLOUR;
    ctx.beginPath();
    ctx.arc(at.x, at.y, SHELL_RADIUS * 1.8 * pulse, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;

    // A fizzing fuse trail below the shell.
    ctx.fillStyle = "#ffb347";
    for (let s = 1; s <= 4; s++) {
      ctx.globalAlpha = 1 - s * 0.22;
      ctx.beginPath();
      ctx.arc(
        at.x + Math.sin(age * 30 + s) * 2,
        at.y + SHELL_RADIUS + s * 6,
        2.5 - s * 0.4,
        0,
        Math.PI * 2,
      );
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    ctx.fillStyle = "#3b6fd1";
    ctx.beginPath();
    ctx.arc(at.x, at.y, SHELL_RADIUS, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = SHELL_COLOUR;
    ctx.fillRect(at.x - SHELL_RADIUS, at.y - 1.5, SHELL_RADIUS * 2, 3);
  },

  // A quick white flash; the stars themselves carry the rest of the show.
  drawBurst(ctx, at, progress) {
    const reach = FLASH_REACH * Math.sqrt(progress);
    ctx.globalAlpha = 1 - progress;
    ctx.fillStyle = "#ffffff";
    ctx.beginPath();
    ctx.arc(at.x, at.y, 12 * (1 - progress) + 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = SHELL_COLOUR;
    ctx.lineWidth = 2;
    ctx.beginPath();
    for (let i = 0; i < 8; i++) {
      const angle = Math.PI / 8 + (i / 8) * Math.PI * 2;
      ctx.moveTo(
        at.x + Math.cos(angle) * reach * 0.4,
        at.y + Math.sin(angle) * reach * 0.4,
      );
      ctx.lineTo(at.x + Math.cos(angle) * reach, at.y + Math.sin(angle) * reach);
    }
    ctx.stroke();
    ctx.globalAlpha = 1;
  },
};
