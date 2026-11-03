/** A point in canvas pixels. */
export interface Point {
  x: number;
  y: number;
}

/**
 * The shared contract for every firework type. Each type lives in its own
 * module in this folder and is listed in registry.ts.
 */
export interface FireworkType {
  id: string;
  name: string;
  /** Shop price. Zero means the type is free. */
  price: number;
  /** Money for a pop before any multipliers. */
  baseValue: number;
  /** Share of the flight finished per second. 0.25 means a 4 second flight. */
  riseSpeed: number;
  /** Click distance from the firework's centre, in pixels. */
  hitRadius: number;
  /**
   * Sideways offset in pixels at a given age. This sets the flight path.
   * For a star split off another firework, it is the distance in pixels
   * from the pop point along the star's heading instead.
   */
  pathOffset(age: number): number;
  /** Stars that fly out when this firework is popped: their type and how many. */
  split?: { type: FireworkType; count: number };
  drawRising(ctx: CanvasRenderingContext2D, at: Point, age: number): void;
  /** Draws the burst. Progress runs from 0 to 1. */
  drawBurst(ctx: CanvasRenderingContext2D, at: Point, progress: number): void;
}
