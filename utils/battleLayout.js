import { BREAKPOINT_MOBILE } from './responsive';

/** Symmetrical arcade battle layout — mirrored left/right fighters. */

/** Extra % from top of arena for battle comment / turn badge text */
export const BATTLE_COMMENT_TOP_SHIFT_PCT = 10;

function battleCommentTopPct(base) {
  return `${base + BATTLE_COMMENT_TOP_SHIFT_PCT}%`;
}

/** All battle-screen monster sprites (RN arena + Phaser lab). */
export const BATTLE_MONSTER_SIZE_MULT = 0.7;

/** Enemy sprite scale vs normal fighter size during boss encounters */
export const BOSS_DISPLAY_SCALE = {
  miniBoss: 1.2,
  bigBoss: 1.5,
};

/** Player shrinks during mini boss / boss fights */
export const PLAYER_BOSS_ENCOUNTER_SCALE = 0.7;

export function isBossEncounter(stageKind) {
  return stageKind === 'miniBoss' || stageKind === 'bigBoss';
}

export function enemyBossDisplayScale(stageKind) {
  if (stageKind === 'bigBoss') return BOSS_DISPLAY_SCALE.bigBoss;
  if (stageKind === 'miniBoss') return BOSS_DISPLAY_SCALE.miniBoss;
  return 1;
}

export function playerBossEncounterScale(stageKind) {
  return isBossEncounter(stageKind) ? PLAYER_BOSS_ENCOUNTER_SCALE : 1;
}

/**
 * Feet anchor + horizontal lanes per fight type.
 * Uses pixel insets from screen width so wide battle padding boxes do not overlap in the center.
 *
 * @param {string} stageKind
 * @param {ReturnType<typeof getStrictLayout>} layout
 * @param {number} [screenWidth]
 */
export function getMonsterPlacement(stageKind, layout, screenWidth = 0) {
  const boss = isBossEncounter(stageKind);
  const w = Math.max(0, screenWidth);
  const phone = layout.phone;
  const mobile = layout.compactHud;

  /** Fraction of arena width reserved as empty margin on each side (normal fights = wider). */
  const normalInset = phone ? 0.1 : mobile ? 0.16 : 0.22;
  const insetFrac = boss
    ? phone
      ? 0.07
      : mobile
        ? 0.1
        : 0.15
    : normalInset * 1.15;

  const insetPx = w > 0 ? Math.round(w * insetFrac) : 0;

  return {
    p1Bottom: boss ? layout.monsterBottomBoss : layout.monsterBottom,
    p2Bottom: boss ? layout.monsterBottomBoss : layout.monsterBottom,
    /** @deprecated use p1Left / p2Right when screenWidth provided */
    sideInset: layout.monsterSideInset,
    p1Left: insetPx,
    p2Right: insetPx,
    insetFrac,
  };
}

/** Dev helper — log effective battle monster metrics in the console. */
export function debugBattleMonsterLayout(stageKind, layout, screenWidth) {
  const placement = getMonsterPlacement(stageKind, layout, screenWidth);
  const slotPad = 1.04;
  const slotW = Math.round(layout.p1Monster * slotPad);
  const gapPx =
    screenWidth > 0 ? screenWidth - placement.p1Left - placement.p2Right - slotW * 2 : 0;
  if (typeof console !== 'undefined' && console.debug) {
    console.debug('[battle-layout]', {
      stageKind,
      screenWidth,
      spritePx: layout.p1Monster,
      slotWidthPx: slotW,
      p1LeftPx: placement.p1Left,
      p2RightPx: placement.p2Right,
      centerGapPx: gapPx,
      sizeMult: BATTLE_MONSTER_SIZE_MULT,
      insetFrac: placement.insetFrac,
    });
  }
  return { placement, slotW, gapPx };
}

export function isMobileLayout(width, height) {
  return width < BREAKPOINT_MOBILE || height < 640;
}

export function isPhoneLayout(width) {
  return width < 400;
}

export function getStrictLayout(width, height) {
  const mobile = isMobileLayout(width, height);
  const phone = isPhoneLayout(width);
  const monsterBase = phone
    ? Math.max(110, Math.min(130, width * 0.3))
    : mobile
      ? Math.max(130, Math.min(158, width * 0.26))
      : Math.max(155, Math.min(200, width * 0.2));
  const monster = Math.round(monsterBase * BATTLE_MONSTER_SIZE_MULT);
  const statsW = phone
    ? Math.max(132, Math.min(150, width * 0.37))
    : mobile
      ? Math.max(162, Math.min(184, width * 0.32))
      : 188;
  return {
    /** Both fighters same scale — arcade mirror match */
    p1Monster: monster,
    p2Monster: monster,
    statsP1W: statsW,
    statsP2W: statsW,
    hudBannerW: phone ? Math.min(136, width * 0.34) : mobile ? Math.min(152, width * 0.38) : 260,
    diceActive: mobile ? 68 : 92,
    diceInactive: mobile ? 48 : 64,
    /** Shared ground line (% from bottom of arena) */
    monsterBottom: phone ? '15%' : mobile ? '13%' : '10%',
    /** Mini boss / boss — same ground line for player and enemy */
    monsterBottomBoss: phone ? '13%' : mobile ? '11%' : '9%',
    /** Horizontal inset from arena edges (higher = fighters farther apart) */
    monsterSideInset: phone ? '6%' : mobile ? '9%' : '14%',
    statsTop: phone ? '10.5%' : mobile ? '9.5%' : '8.5%',
    statsSideInset: phone ? '3%' : '5%',
    stageBadgeTop: phone ? '6.2%' : mobile ? '5.8%' : '5.6%',
    stageBadgeW: phone ? 164 : mobile ? 184 : 220,
    stageBadgeMinH: phone ? 34 : mobile ? 36 : 40,
    turnTop: battleCommentTopPct(phone ? 27 : mobile ? 28 : 29),
    combatTurnTop: battleCommentTopPct(phone ? 22 : mobile ? 23 : 24),
    monsterLaneY: 0.48,
    compactHud: mobile,
    phone,
    /** Battle comment — ~35% from top (between top and screen center) */
    commentTop: Math.round(height * 0.35),
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
