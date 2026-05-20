import { GRID_COLS, GRID_ROWS } from '../../../utils/monsterRescue/constants';

const PAD_X = 10;
const HUD_TOP = 48;
const FRAME_INSET = 3;
/** Top portion of canvas reserved for bubble grid (matches background art). */
export const GRID_ZONE_RATIO = 0.6;
/** Lift shooter upward from frame bottom (~10%). */
export const SHOOTER_LIFT_RATIO = 0.1;
/** Root Y → platform center in RescueShooter */
const SHOOTER_PLATFORM_OFFSET = 6;
/** Clearance above shooter for cannon + loaded bubble */
const SHOOTER_ZONE_H = 58;
const EVEN_ROW_SPAN = GRID_COLS - 1;
const RADIUS_RATIO = 0.46;

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
  const playHeight = Math.max(200, h - playTop - 6);

  const gridZoneBottom = playTop + h * GRID_ZONE_RATIO;
  const innerFrameBottom = playTop + playHeight - FRAME_INSET;
  const platformY = innerFrameBottom - SHOOTER_PLATFORM_OFFSET - h * SHOOTER_LIFT_RATIO;
  const shooterY = platformY;
  const shooterZoneTop = shooterY - SHOOTER_ZONE_H;

  const clusterTop = playTop + FRAME_INSET + 4;
  const clusterMaxBottom = gridZoneBottom - 6;
  const clusterZoneH = Math.max(
    72,
    Math.min(clusterMaxBottom - clusterTop, shooterZoneTop - clusterTop)
  );

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
    gridZoneBottom,
    shooterY,
    platformY,
    innerFrameBottom,
    shooterZoneTop,
  };
}
