/** Playback timing (ms) for dungeon battle log actions. */
export const DUNGEON_VFX_MS = {
  turn: 450,
  skill: 550,
  attack: 950,
  attackCrit: 1100,
  dodge: 650,
  heal: 700,
  status: 550,
  dot: 600,
  ko: 750,
  banner: 400,
  info: 280,
  win: 1200,
  lose: 1200,
};

export function vfxDelayForLogEntry(entry) {
  const action = entry?.action;
  if (!action) {
    if (entry?.kind === 'turnBanner') return DUNGEON_VFX_MS.banner;
    if (entry?.kind === 'win' || entry?.kind === 'lose') return DUNGEON_VFX_MS[entry.kind];
    return DUNGEON_VFX_MS.info;
  }
  switch (action.type) {
    case 'turn':
      return DUNGEON_VFX_MS.turn;
    case 'skill':
      return DUNGEON_VFX_MS.skill;
    case 'attack':
      if (action.dodged) return DUNGEON_VFX_MS.dodge;
      if (action.crit) return DUNGEON_VFX_MS.attackCrit;
      return DUNGEON_VFX_MS.attack;
    case 'heal':
      return DUNGEON_VFX_MS.heal;
    case 'status':
      return DUNGEON_VFX_MS.status;
    case 'dot':
      return DUNGEON_VFX_MS.dot;
    case 'ko':
      return DUNGEON_VFX_MS.ko;
    default:
      return DUNGEON_VFX_MS.info;
  }
}

/** Map log entry → arena VFX payload for DungeonBattleArena. */
export function vfxFromLogEntry(entry) {
  const action = entry?.action;
  if (!action) {
    if (entry?.kind === 'turnBanner') {
      return { type: 'banner', text: entry.text };
    }
    return null;
  }
  return { ...action, logId: entry.id, text: entry.text, kind: entry.kind };
}
