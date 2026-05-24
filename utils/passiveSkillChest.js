/**
 * Roll passive skill book drops for chests and spin.
 */
import {
  allPassiveSkillIds,
  rollChestContentBand,
  rollPassiveBookRarity,
  rollLuckySpinSkillBookRarity,
  rollRandomPassiveSkillId,
} from '../src/gameSystems/passiveSkillDrops';
import { getPassiveSkillDef } from '../src/gameSystems/passiveSkills';
import { grantPassiveSkillBook, profileOwnsPassiveSkillId } from '../src/gameSystems/passiveInventory';

/** @param {'miniBoss'|'boss'|'item'} chestKind @param {object} profile */
export function rollPassiveSkillBookDrop(chestKind, profile) {
  const skillId = rollRandomPassiveSkillId(allPassiveSkillIds());
  if (!skillId) return null;
  if (profile && profileOwnsPassiveSkillId(profile, skillId)) {
    return { kind: 'skill_book_duplicate', skillId, duplicate: true };
  }
  const rarity = rollPassiveBookRarity(chestKind);
  const def = getPassiveSkillDef(skillId);
  return {
    kind: 'skill_book',
    skillId,
    rarity,
    name: def?.name ?? skillId,
    label: `${def?.name ?? skillId} (${rarity})`,
  };
}

/** @param {'miniBoss'|'boss'|'item'} chestKind */
export function rollChestWithPassiveBand(chestKind, profile) {
  const band = rollChestContentBand(chestKind);
  if (band === 'skillBook') {
    return rollPassiveSkillBookDrop(chestKind, profile);
  }
  return { kind: 'band', band };
}

export function applyPassiveSkillBookDrop(profile, drop, source) {
  if (!drop || drop.kind !== 'skill_book') return { ok: false, duplicate: drop?.duplicate };
  const res = grantPassiveSkillBook(profile, drop.skillId, drop.rarity, source);
  return { ...res, drop };
}

export function tryLuckySpinSkillBook(profile) {
  const rarity = rollLuckySpinSkillBookRarity();
  if (!rarity) return null;
  const skillId = rollRandomPassiveSkillId(allPassiveSkillIds());
  if (!skillId || (profile && profileOwnsPassiveSkillId(profile, skillId))) {
    return { kind: 'skill_book_duplicate', skillId, duplicate: true };
  }
  const def = getPassiveSkillDef(skillId);
  return {
    kind: 'skill_book',
    skillId,
    rarity,
    name: def?.name ?? skillId,
  };
}
