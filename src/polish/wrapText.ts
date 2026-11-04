/** Width of `text` drawn in the CSS `font`, e.g. from `ctx.measureText`. */
export type Measure = (text: string, font: string) => number;

/** Screens narrower than this get the phone layout. */
export const NARROW_WIDTH = 520;

export function isNarrow(width: number): boolean {
  return width < NARROW_WIDTH;
}

/**
 * Splits `text` at `separator` into lines no wider than `maxWidth`. A piece
 * that is wider than `maxWidth` on its own gets a line to itself.
 */
export function wrapText(
  text: string,
  maxWidth: number,
  font: string,
  measure: Measure,
  separator = " ",
): string[] {
  const lines: string[] = [];
  let line = "";
  for (const piece of text.split(separator)) {
    const joined = line ? line + separator + piece : piece;
    if (line && measure(joined, font) > maxWidth) {
      lines.push(line);
      line = piece;
    } else {
      line = joined;
    }
  }
  if (line) lines.push(line);
  return lines;
}

/** A `Measure` that uses the canvas, for drawing. */
export function canvasMeasure(ctx: CanvasRenderingContext2D): Measure {
  return (text, font) => {
    ctx.font = font;
    return ctx.measureText(text).width;
  };
}
