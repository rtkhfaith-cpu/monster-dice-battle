import { GRID_COLS, GRID_ROWS } from '../../../utils/monsterRescue/constants';

const PAD_X = 10;
const HUD_TOP = 44;
const FRAME_INSET = 4;
/** Root Y → lowest pixel (shadow pad) in RescueShooter */
const SHOOTER_FOOT_OFFSET = 16;
/** Clearance above shooter for cannon + loaded bubble */
const SHOOTER_ZONE_H = 54;
/** Even row (11 cols): span from center col 0 to col 10 */
const EVEN_ROW_SPAN = GRID_COLS - 1;
/** bubbleRadius = cellW * RADIUS_RATIO keeps full circles inside the hex pitch */
const RADIUS_RATIO = 0.46;

/**
 * Pixel width of the hex grid including bubble radius on both sides.
 */
export function gridPixelWidth(originX, cellW, bubbleRadius) {
  const r = bubbleRadius;
  const evenRight = originX + EVEN_ROW_SPAN * cellW + r;
  const oddRight = originX + cellW * 0.5 + (GRID_COLS - 2) * cellW + r;
  const left = originX - r;
  return Math.max(evenRight, oddRight) - left;
}

/**
 * Fit the bubble grid inside the Phaser canvas with full bubbles visible edge-to-edge.
 * Shooter sits on the inner bottom line of the play frame (visible above the finger).
 * @param {number} w canvas width
 * @param {number} h canvas height
 * @param {number} fillRows stage config rows to fill
 */
export function computeRescueLayout(w, h, fillRows) {
  const playLeft = PAD_X;
  const playWidth = Math.max(200, w - PAD_X * 2);
  const playTop = HUD_TOP;
  const playHeight = Math.max(200, h - playTop - 6);

  const innerFrameBottom = playTop + playHeight - FRAME_INSET;
  const shooterY = innerFrameBottom - SHOOTER_FOOT_OFFSET;
  const shooterZoneTop = shooterY - SHOOTER_ZONE_H;

  const clusterTop = playTop + FRAME_INSET;
  const clusterZoneH = Math.max(72, shooterZoneTop - clusterTop);

  const horizUnits = EVEN_ROW_SPAN + RADIUS_RATIO * 2;
  const cellW = playWidth / horizUnits;
  const bubbleRadius = cellW * RADIUS_RATIO;
  const cellH = cellW * 0.86;

  const spanX = 2 * bubbleRadius + EVEN_ROW_SPAN * cellW;
  const originX = (w - spanX) / 2 + bubbleRadius;
  const originY = clusterTop + bubbleRadius;

  const rowsFit = Math.max(
    3,
    Math.min(
      GRID_ROWS,
      Math.floor((clusterZoneH - bubbleRadius * 2) / cellH) + 1
    )
  );
  const displayFillRows = Math.min(fillRows, rowsFit);

  const clusterBottom = originY + (displayFillRows - 1) * cellH + bubbleRadius;

  return {
    originX,
    originY,
    cellW,
    cellH,
    bubbleRadius,
    displayFillRows,
    playLeft,
    playTop,
    playWidth,
    playHeight,
    clusterBottom,
    shooterY,
    innerFrameBottom,
    shooterZoneTop,
  };
}
