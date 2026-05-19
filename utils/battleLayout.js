import { BREAKPOINT_MOBILE } from './responsive';

/** Symmetrical arcade battle layout — mirrored left/right fighters. */

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
    ? Math.max(118, Math.min(138, width * 0.34))
    : mobile
      ? Math.max(150, Math.min(190, width * 0.31))
      : 280;
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
    /** Shared ground line (% from bottom) */
    monsterBottom: phone ? '15%' : mobile ? '13%' : '10%',
    monsterSideInset: phone ? '3%' : mobile ? '4%' : '8%',
    statsTop: phone ? '10.5%' : mobile ? '9.5%' : '8.5%',
    statsSideInset: phone ? '3%' : '5%',
    stageBadgeTop: phone ? '6.2%' : mobile ? '5.8%' : '5.6%',
    stageBadgeW: phone ? 164 : mobile ? 184 : 220,
    stageBadgeMinH: phone ? 34 : mobile ? 36 : 40,
    turnTop: phone ? '27%' : mobile ? '28%' : '29%',
    combatTurnTop: phone ? '22%' : mobile ? '23%' : '24%',
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
