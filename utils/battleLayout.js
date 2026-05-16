/** Symmetrical arcade battle layout — mirrored left/right fighters. */

export function isMobileLayout(width, height) {
  return width < 520 || height < 680;
}

export function getStrictLayout(width, height) {
  const mobile = isMobileLayout(width, height);
  const monster = mobile ? 255 : 345;
  const statsW = mobile ? 158 : 188;
  return {
    /** Both fighters same scale — arcade mirror match */
    p1Monster: monster,
    p2Monster: monster,
    statsP1W: statsW,
    statsP2W: statsW,
    hudBannerW: mobile ? 180 : 260,
    diceActive: mobile ? 72 : 92,
    diceInactive: mobile ? 52 : 64,
    /** Shared ground line (% from bottom) */
    monsterBottom: '10%',
    monsterLaneY: 0.48,
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
