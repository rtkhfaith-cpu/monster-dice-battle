import { DEFAULT_GEAR_SLOTS } from '../gearSlots';
import { applyMonsterTheme } from '../monsterThemes';
import { getLadderMonsterTemplate } from './ladderMonsterCatalog';
import { resolveLadderTemplateId } from './ladderMonsterMigrate';
import { normalizeMonsterLadder } from './ladderProgress';

function uid(prefix) {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

export function mergeLadderMonsterParts(templateId, parts = {}) {
  const t = getLadderMonsterTemplate(templateId);
  const base = t?.visualProfile?.defaultParts ?? {};
  return applyMonsterTheme(templateId, { ...base, ...parts, templateId, ladderPremium: true }, t);
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

/** Find an owned row by id in main inventory or ladder collection. */
export function findOwnedMonsterForLadder(profile, ownedId) {
  if (!ownedId || !profile) return null;
  const ml = getMonsterLadderState(profile);
  return (
    profile.ownedMonsters?.find((m) => m.id === ownedId)
    ?? ml.ownedMonsters?.find((m) => m.id === ownedId)
    ?? null
  );
}

/** All monsters selectable for ladder battles (home roster + ladder exclusives). */
export function getAllLadderSelectableMonsters(profile) {
  const ml = getMonsterLadderState(profile);
  const seen = new Set();
  const out = [];
  for (const m of [...(profile.ownedMonsters ?? []), ...(ml.ownedMonsters ?? [])]) {
    if (!m?.id || seen.has(m.id)) continue;
    seen.add(m.id);
    out.push(m);
  }
  return out;
}

/**
 * Monster row used for the next ladder battle.
 * Home-screen pick is default; Collection "Set active" pins a specific monster.
 * @param {object} profile
 * @param {string|null} [setupP1Id] home-screen owned monster id
 */
export function getActiveLadderBattler(profile, setupP1Id = null) {
  if (!profile) return null;
  const ml = getMonsterLadderState(profile);
  const main = profile.ownedMonsters ?? [];
  const ladder = ml.ownedMonsters ?? [];

  const activeRow = ml.activeMonsterId
    ? findOwnedMonsterForLadder(profile, ml.activeMonsterId)
    : null;
  const activeIsLadderOnly =
    !!activeRow && !main.some((m) => m.id === activeRow.id);

  if (activeIsLadderOnly) return activeRow;
  if (ml.activeBattlerPinned && activeRow) return activeRow;

  if (setupP1Id) {
    const fromSetup = main.find((m) => m.id === setupP1Id);
    if (fromSetup) return fromSetup;
  }
  if (activeRow) return activeRow;
  if (profile.selectedMonsterId) {
    const selected = main.find((m) => m.id === profile.selectedMonsterId);
    if (selected) return selected;
  }
  return main[0] ?? ladder[0] ?? null;
}

/** @deprecated use getActiveLadderBattler */
export function getActiveLadderOwnedMonster(profile, setupP1Id = null) {
  return getActiveLadderBattler(profile, setupP1Id);
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
  const canonical = resolveLadderTemplateId(templateId) ?? templateId;
  return ml.ownedMonsters.some(
    (m) => (resolveLadderTemplateId(m.templateId) ?? m.templateId) === canonical,
  );
}
