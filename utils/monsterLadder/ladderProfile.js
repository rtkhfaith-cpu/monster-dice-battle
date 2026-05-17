import { DEFAULT_GEAR_SLOTS } from '../gearSlots';
import { getLadderMonsterTemplate } from './ladderMonsterCatalog';
import { normalizeMonsterLadder } from './ladderProgress';

function uid(prefix) {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

export function mergeLadderMonsterParts(templateId, parts = {}) {
  const t = getLadderMonsterTemplate(templateId);
  const base = t?.visualProfile?.defaultParts ?? {};
  return { ...base, ...parts, ladderPremium: true };
}

/** @param {import('./ladderProgress').MonsterLadderState} ml */
export function generateLadderOwnedMonster(templateId, nickname = '') {
  const t = getLadderMonsterTemplate(templateId);
  if (!t) throw new Error(`Unknown ladder template ${templateId}`);
  return {
    id: uid('lm'),
    templateId,
    nickname: nickname || t.name,
    level: 1,
    exp: 0,
    monsterParts: mergeLadderMonsterParts(templateId),
    equippedLadderGear: [],
    gearSlotCount: DEFAULT_GEAR_SLOTS,
  };
}

/** @param {object} profile */
export function getMonsterLadderState(profile) {
  return normalizeMonsterLadder(profile?.monsterLadder, profile?.ladderProgress);
}

/** @param {object} profile */
export function setMonsterLadderState(profile, ml) {
  profile.monsterLadder = ml;
  delete profile.ladderProgress;
}

/** @param {object} profile @param {string} ownedId */
export function getLadderOwnedMonster(profile, ownedId) {
  const ml = getMonsterLadderState(profile);
  return ml.ownedMonsters.find((m) => m.id === ownedId) ?? null;
}

/** @param {object} profile @param {string} templateId */
export function profileOwnsLadderTemplate(profile, templateId) {
  const ml = getMonsterLadderState(profile);
  return ml.ownedMonsters.some((m) => m.templateId === templateId);
}
