import { BREAKPOINT_MOBILE } from './responsive';

/** Symmetrical arcade battle layout — mirrored left/right fighters. */

export function isMobileLayout(width, height) {
  return width < BREAKPOINT_MOBILE || height < 640;
}

export function isPhoneLayout(width) {
  return width < 400;
}

export function getStrictLayout(width, height) {
  const mobile = isMobileLayout(width, height);
  const phone = isPhoneLayout(width);
  const monster = phone ? 150 : mobile ? 165 : 280;
  const statsW = phone ? 118 : mobile ? 132 : 188;
  return {
    /** Both fighters same scale — arcade mirror match */
    p1Monster: monster,
    p2Monster: monster,
    statsP1W: statsW,
    statsP2W: statsW,
    hudBannerW: mobile ? Math.min(160, width * 0.42) : 260,
    diceActive: mobile ? 68 : 92,
    diceInactive: mobile ? 48 : 64,
    /** Shared ground line (% from bottom) */
    monsterBottom: mobile ? '11%' : '10%',
    monsterLaneY: 0.48,
    compactHud: mobile,
    phone,
    /** Battle comment — ~25% from top (between top and screen center) */
    commentTop: Math.round(height * 0.25),
    commentLeft: Math.round(width * 0.05),
    commentW: Math.round(width * 0.9),
  };
}

/** @deprecated use getStrictLayout */
export function getMonsterSizes(width, height) {
  const L = getStrictLayout(width, height);
  return { p1: L.p1Monster, p2: L.p2Monster, statsP1W: L.statsP1W, statsP2W: L.statsP2W };
}

/** @deprecated use getStrictLayout */
export function getDiceSizes(width, height) {
  const L = getStrictLayout(width, height);
  return { active: L.diceActive, inactive: L.diceInactive };
}
