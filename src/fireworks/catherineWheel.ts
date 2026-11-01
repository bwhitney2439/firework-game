import type { FireworkType } from "./types";

/** Largest sideways swing from the launch line, in pixels. */
export const WOBBLE_AMPLITUDE = 45;
/** Full side-to-side swings per second. */
export const WOBBLE_FREQUENCY = 0.9;
/** Turns of the wheel per second while it rises. */
const SPIN_SPEED = 2.5;
const SPOKES = 6;
const WHEEL_RADIUS = 11;
const BURST_ARMS = 5;
const SPARKS_PER_ARM = 8;
const BURST_RADIUS = 80;
const COLOURS = ["#ff5fa2", "#ffd166", "#7ae7ff"];

export const catherineWheel: FireworkType = {
  id: "catherine-wheel",
  name: "Catherine wheel",
  price: 40,
  baseValue: 3,
  riseSpeed: 0.3,
  hitRadius: 18,

  pathOffset: (age) =>
    WOBBLE_AMPLITUDE * Math.sin(age * WOBBLE_FREQUENCY * Math.PI * 2),

  drawRising(ctx, at, age) {
    const spin = age * SPIN_SPEED * Math.PI * 2;

    for (let i = 0; i < SPOKES; i++) {
      const angle = spin + (i / SPOKES) * Math.PI * 2;
      const tipX = at.x + Math.cos(angle) * WHEEL_RADIUS;
      const tipY = at.y + Math.sin(angle) * WHEEL_RADIUS;

      ctx.strokeStyle = "#c98b4a";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(at.x, at.y);
      ctx.lineTo(tipX, tipY);
      ctx.stroke();

      // A short trail of sparks thrown off behind each spoke tip.
      ctx.fillStyle = COLOURS[i % COLOURS.length];
      for (let s = 1; s <= 3; s++) {
        const trail = angle - s * 0.35;
        const reach = WHEEL_RADIUS + s * 4;
        ctx.globalAlpha = 1 - s * 0.25;
        ctx.beginPath();
        ctx.arc(
          at.x + Math.cos(trail) * reach,
          at.y + Math.sin(trail) * reach,
          2.5 - s * 0.5,
          0,
          Math.PI * 2,
        );
        ctx.fill();
      }
      ctx.globalAlpha = 1;
    }

    ctx.fillStyle = "#f5f5f5";
    ctx.beginPath();
    ctx.arc(at.x, at.y, 3, 0, Math.PI * 2);
    ctx.fill();
  },

  drawBurst(ctx, at, progress) {
    const twist = progress * Math.PI * 1.5;
    ctx.globalAlpha = 1 - progress;
    for (let arm = 0; arm < BURST_ARMS; arm++) {
      ctx.fillStyle = COLOURS[arm % COLOURS.length];
      const armAngle = (arm / BURST_ARMS) * Math.PI * 2;
      for (let s = 1; s <= SPARKS_PER_ARM; s++) {
        const share = s / SPARKS_PER_ARM;
        const radius = BURST_RADIUS * Math.sqrt(progress) * share;
        const angle = armAngle + twist + share * Math.PI;
        ctx.beginPath();
        ctx.arc(
          at.x + Math.cos(angle) * radius,
          at.y + Math.sin(angle) * radius + progress * progress * 20,
          3 - share * 1.5,
          0,
          Math.PI * 2,
        );
        ctx.fill();
      }
    }
    ctx.globalAlpha = 1;
  },
};
