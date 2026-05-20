import { GRID_COLS, GRID_ROWS } from '../../../utils/monsterRescue/constants';

const PAD_X = 10;
const HUD_TOP = 48;
const FRAME_INSET = 3;
/** Top portion of canvas reserved for bubble grid (matches background art). */
export const GRID_ZONE_RATIO = 0.6;
/** Platform anchor: distance from inner frame bottom to shooter root. */
const PLATFORM_FOOT_DEPTH = 18;
/** Lift shooter so platform glow + monster are not clipped by canvas bottom. */
const SHOOTER_BOTTOM_LIFT = 14;
/** Clearance above shooter for bubble grid (layout only). */
const SHOOTER_ZONE_H = 58;
/** Extra touch area above shooter strip and past frame sides. */
export const AIM_ZONE_PAD_X = 44;
export const AIM_ZONE_EXTRA_TOP = 40;
const EVEN_ROW_SPAN = GRID_COLS - 1;
/** ~45% larger bubbles vs old 11-col / 0.46 layout, tuned to fill frame width. */
const RADIUS_RATIO = 0.58;
const CELL_H_RATIO = 0.84;

export function platformRadiusFor(bubbleRadius) {
  return Math.max(34, bubbleRadius * 1.55);
}

export function gridPixelWidth(originX, cellW, bubbleRadius) {
  const r = bubbleRadius;
  const evenRight = originX + EVEN_ROW_SPAN * cellW + r;
  const oddRight = originX + cellW * 0.5 + (GRID_COLS - 2) * cellW + r;
  const left = originX - r;
  return Math.max(evenRight, oddRight) - left;
}

/**
 * @param {number} w canvas width
 * @param {number} h canvas height
 * @param {number} fillRows stage config rows to fill
 */
export function computeRescueLayout(w, h, fillRows) {
  const playLeft = PAD_X;
  const playWidth = Math.max(200, w - PAD_X * 2);
  const playTop = HUD_TOP;
  const playHeight = Math.max(240, h - playTop - 2);

  const horizUnits = EVEN_ROW_SPAN + RADIUS_RATIO * 2;
  const cellW = playWidth / horizUnits;
  const bubbleRadius = cellW * RADIUS_RATIO;
  const cellH = cellW * CELL_H_RATIO;
  const platformRadius = platformRadiusFor(bubbleRadius);

  const innerFrameBottom = playTop + playHeight - FRAME_INSET;
  const platformFootDepth = platformRadius + PLATFORM_FOOT_DEPTH;
  const shooterY = innerFrameBottom - platformFootDepth - SHOOTER_BOTTOM_LIFT;
  const frameLineLocalY = platformFootDepth + SHOOTER_BOTTOM_LIFT;
  const shooterZoneTop = shooterY - SHOOTER_ZONE_H;

  const gridZoneBottom = playTop + h * GRID_ZONE_RATIO;
  const clusterTop = playTop + FRAME_INSET + 4;
  const clusterMaxBottom = gridZoneBottom - 6;
  const clusterZoneH = Math.max(
    72,
    Math.min(clusterMaxBottom - clusterTop, shooterZoneTop - clusterTop)
  );

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

  const wallInset = FRAME_INSET + bubbleRadius;
  const wallLeft = playLeft + wallInset;
  const wallRight = playLeft + playWidth - wallInset;

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
    gridZoneBottom,
    shooterY,
    platformY: shooterY,
    platformRadius,
    frameLineLocalY,
    innerFrameBottom,
    shooterZoneTop,
    aimZoneTop: shooterZoneTop - AIM_ZONE_EXTRA_TOP,
    aimZoneLeft: playLeft - AIM_ZONE_PAD_X,
    aimZoneRight: playLeft + playWidth + AIM_ZONE_PAD_X,
    gunBaseRight: 18,
    monsterRightNudgePx: Math.round(w * 0.028),
    wallLeft,
    wallRight,
  };
}
