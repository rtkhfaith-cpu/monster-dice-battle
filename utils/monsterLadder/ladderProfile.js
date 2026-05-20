import { DEFAULT_GEAR_SLOTS } from '../gearSlots';
import { applyMonsterTheme } from '../monsterThemes';
import { getLadderMonsterTemplate } from './ladderMonsterCatalog';
import { canonicalMonsterKey, resolveLadderTemplateId } from './ladderMonsterMigrate';
import { normalizeMonsterLadder } from './ladderProgress';

function uid(prefix) {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

export function mergeLadderMonsterParts(templateId, parts = {}) {
  const t = getLadderMonsterTemplate(templateId);
  const base = t?.visualProfile?.defaultParts ?? {};
  return applyMonsterTheme(templateId, { ...base, ...parts, templateId, ladderPremium: true }, t);
}

/** Build a new owned-monster row (stored in profile.ownedMonsters only). */
export function generateLadderOwnedMonster(templateId, nickname = '') {
  const t = getLadderMonsterTemplate(templateId);
  if (!t) throw new Error(`Unknown ladder template ${templateId}`);
  return {
    id: uid('om'),
    templateId,
    nickname: nickname || t.name,
    level: 1,
    exp: 0,
    monsterParts: mergeLadderMonsterParts(templateId),
    equippedGear: [],
    equippedLadderGear: [],
    gearSlotCount: DEFAULT_GEAR_SLOTS,
    mergeTier: 0,
    unlockedVisualTags: [],
  };
}

/** Add a ladder-exclusive monster to the player's main roster. */
export function grantLadderMonsterToProfile(profile, templateId, nickname = '') {
  const canonical = resolveLadderTemplateId(templateId) ?? templateId;
  const row = generateLadderOwnedMonster(canonical, nickname);
  if (!Array.isArray(profile.ownedMonsters)) profile.ownedMonsters = [];
  profile.ownedMonsters.push(row);
  if (!profile.selectedMonsterId) profile.selectedMonsterId = row.id;
  return row;
}

/** @param {object} profile */
export function getMonsterLadderState(profile) {
  return normalizeMonsterLadder(profile?.monsterLadder, profile?.ladderProgress);
}

/** Find an owned row by id (main roster only). */
export function findOwnedMonsterForLadder(profile, ownedId) {
  if (!ownedId || !profile) return null;
  return profile.ownedMonsters?.find((m) => m.id === ownedId) ?? null;
}

/** All monsters — same list as the home menu roster. */
export function getAllLadderSelectableMonsters(profile) {
  return profile?.ownedMonsters ?? [];
}

/**
 * Monster used for the next ladder battle (main roster id).
 * @param {object} profile
 * @param {string|null} [setupP1Id] home-screen owned monster id
 */
export function getActiveLadderBattler(profile, setupP1Id = null) {
  if (!profile) return null;
  const ml = getMonsterLadderState(profile);
  const main = profile.ownedMonsters ?? [];

  const activeRow = ml.activeMonsterId
    ? findOwnedMonsterForLadder(profile, ml.activeMonsterId)
    : null;

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
  return main[0] ?? null;
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
  return findOwnedMonsterForLadder(profile, ownedId);
}

/** @param {object} profile @param {string} templateId */
export function profileOwnsLadderTemplate(profile, templateId) {
  const canonical = canonicalMonsterKey(templateId) ?? templateId;
  return (profile.ownedMonsters ?? []).some(
    (m) => canonicalMonsterKey(m.templateId) === canonical,
  );
}
