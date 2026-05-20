import { GRID_COLS, GRID_ROWS } from '../../../utils/monsterRescue/constants';
import { shooterMonsterDisplaySize } from './RescueShooter';

const PAD_X = 10;
const HUD_TOP = 48;
const FRAME_INSET = 3;
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
/** Max ~0.48 — larger values overlap (centers are cellW apart on a row). */
const RADIUS_RATIO = 0.47;
/** Hex row pitch (√3/2) so staggered neighbors do not overlap. */
const CELL_H_RATIO = 0.866;
/** Extra px kept free at the bottom of the canvas for gun + platform + monster. */
const SHOOTER_SAFE_PAD = 10;

export function platformRadiusFor(bubbleRadius) {
  return Math.max(34, bubbleRadius * 1.55);
}

/** Pixels below shooter root (y=0) consumed by platform, gun base, and monster feet. */
export function shooterStackBelowRoot(bubbleRadius) {
  const platformR = platformRadiusFor(bubbleRadius);
  const platformBottom = 4 + platformR + 14;
  const gunBaseBottom = 6 + 14;
  const monsterFootY = 4 + platformR * 0.38;
  return Math.max(platformBottom, gunBaseBottom, monsterFootY);
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

  const horizUnits = EVEN_ROW_SPAN + RADIUS_RATIO * 2;
  const cellW = playWidth / horizUnits;
  const bubbleRadius = cellW * RADIUS_RATIO;
  const cellH = cellW * CELL_H_RATIO;
  const platformRadius = platformRadiusFor(bubbleRadius);
  const platformFootDepth = platformRadius + PLATFORM_FOOT_DEPTH;
  const stackBelow = shooterStackBelowRoot(bubbleRadius);
  const shooterBottomReserve = stackBelow + SHOOTER_BOTTOM_LIFT + SHOOTER_SAFE_PAD;

  /** Anchor shooter from canvas bottom so gun + monster are never clipped on tall/short viewports. */
  const shooterY = Math.max(playTop + 120, h - shooterBottomReserve);
  const frameLineLocalY = platformFootDepth + SHOOTER_BOTTOM_LIFT;
  const shooterZoneTop = shooterY - SHOOTER_ZONE_H;

  const clusterTop = playTop + FRAME_INSET + 4;
  const clusterMaxBottom = shooterZoneTop - 6;
  const clusterZoneH = Math.max(72, clusterMaxBottom - clusterTop);

  const spanX = 2 * bubbleRadius + EVEN_ROW_SPAN * cellW;
  const originX = (w - spanX) / 2 + bubbleRadius;
  const originY = clusterTop + bubbleRadius;

  const rowsFit = Math.max(
    3,
    Math.min(
      GRID_ROWS,
      Math.floor((clusterZoneH - bubbleRadius * 2) / cellH) + 1,
    ),
  );
  const displayFillRows = Math.min(fillRows, rowsFit);

  const clusterBottom = originY + (displayFillRows - 1) * cellH + bubbleRadius;

  const wallInset = FRAME_INSET + bubbleRadius;
  const wallLeft = playLeft + wallInset;
  const wallRight = playLeft + playWidth - wallInset;

  const monsterSize = shooterMonsterDisplaySize(bubbleRadius);
  const gunRight = 18;
  const maxMonsterLocalX = Math.max(gunRight + 8, w / 2 - 12 - monsterSize * 0.55);

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
    playHeight: Math.max(0, shooterZoneTop - playTop),
    clusterBottom,
    gridZoneBottom: clusterMaxBottom,
    shooterY,
    platformY: shooterY,
    platformRadius,
    frameLineLocalY,
    innerFrameBottom: shooterY + frameLineLocalY,
    shooterZoneTop,
    aimZoneTop: shooterZoneTop - AIM_ZONE_EXTRA_TOP,
    aimZoneLeft: playLeft - AIM_ZONE_PAD_X,
    aimZoneRight: playLeft + playWidth + AIM_ZONE_PAD_X,
    gunBaseRight: gunRight,
    monsterRightNudgePx: Math.min(Math.round(w * 0.028), Math.round(maxMonsterLocalX - gunRight - w * 0.012 - 8)),
    maxMonsterLocalX,
    wallLeft,
    wallRight,
  };
}
