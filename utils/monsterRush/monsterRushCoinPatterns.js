/** Coin placement offsets relative to pattern origin (x, yOffset above ground surface). */

export const COIN_PATTERNS = {
  smallArc: [
    { x: 0, yOffset: 40 },
    { x: 32, yOffset: 68 },
    { x: 64, yOffset: 88 },
    { x: 96, yOffset: 68 },
    { x: 128, yOffset: 40 },
  ],
  highArc: [
    { x: 0, yOffset: 56 },
    { x: 36, yOffset: 96 },
    { x: 72, yOffset: 118 },
    { x: 108, yOffset: 96 },
    { x: 144, yOffset: 56 },
  ],
  line: [
    { x: 0, yOffset: 48 },
    { x: 36, yOffset: 48 },
    { x: 72, yOffset: 48 },
    { x: 108, yOffset: 48 },
  ],
  platformLine: [
    { x: 0, yOffset: 118 },
    { x: 38, yOffset: 118 },
    { x: 76, yOffset: 118 },
  ],
  gapGuide: [
    { x: 20, yOffset: 52 },
    { x: 55, yOffset: 72 },
    { x: 90, yOffset: 52 },
  ],
};

export function coinOffsetsForArc(count = 5) {
  if (count <= 5) return COIN_PATTERNS.smallArc;
  return COIN_PATTERNS.highArc;
}
