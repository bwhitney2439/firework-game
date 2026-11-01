import { basicRocket } from "./basicRocket";
import { romanCandle } from "./romanCandle";
import { catherineWheel } from "./catherineWheel";
import { chrysanthemum } from "./chrysanthemum";
import type { FireworkType } from "./types";

/** Every firework type in the game. Add one line per new type. */
export const fireworkTypes: FireworkType[] = [
  basicRocket,
  romanCandle,
  catherineWheel,
  chrysanthemum,
];
