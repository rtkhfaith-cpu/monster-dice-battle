/**
 * Passive skill book inventory — grant, equip (consume), remove.
 */
import {
  getPassiveSkillDef,
  getPassiveDescription,
  passiveSlotLimitForRarity,
  PASSIVE_SKILLS,
} from './passiveSkills';
import { getMonsterTemplate } from '../../utils/monsterTemplates';
import { getLadderMonsterTemplate } from '../../utils/monsterLadder/ladderMonsterCatalog';

function newInstanceId() {
  return `psb_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 9)}`;
}

export function normalizePassiveBookRow(row) {
  if (!row || typeof row !== 'object') return null;
  const skillId = String(row.skillId || '');
  const def = getPassiveSkillDef(skillId);
  if (!def) return null;
  const rarity = ['rare', 'epic', 'legendary', 'mythic'].includes(row.rarity) ? row.rarity : 'rare';
  return {
    instanceId: String(row.instanceId || newInstanceId()),
    skillId,
    skillName: String(row.skillName || def.name),
    rarity,
    level: Math.max(1, Math.floor(row.level || 1)),
    acquiredAt: row.acquiredAt || new Date().toISOString(),
    equippedToMonsterId: row.equippedToMonsterId ?? null,
  };
}

export function normalizeEquippedPassiveRow(row) {
  if (!row?.skillId) return null;
  const def = getPassiveSkillDef(row.skillId);
  if (!def) return null;
  const rarity = ['rare', 'epic', 'legendary', 'mythic'].includes(row.rarity) ? row.rarity : 'rare';
  return {
    skillId: row.skillId,
    rarity,
    equippedAt: row.equippedAt || new Date().toISOString(),
    instanceId: row.instanceId ? String(row.instanceId) : null,
  };
}

/** @param {object} profile */
export function ensurePassiveInventory(profile) {
  if (!profile) return;
  if (!Array.isArray(profile.passiveSkillBooksOwned)) profile.passiveSkillBooksOwned = [];
  if (!profile.passiveSkillBookDropHistory) profile.passiveSkillBookDropHistory = [];
  if (!profile.equippedPassiveSkills || typeof profile.equippedPassiveSkills !== 'object') {
    profile.equippedPassiveSkills = {};
  }
  profile.passiveSkillBooksOwned = profile.passiveSkillBooksOwned
    .map(normalizePassiveBookRow)
    .filter(Boolean);
  for (const om of profile.ownedMonsters || []) {
    if (!Array.isArray(om.equippedPassives)) om.equippedPassives = [];
    om.equippedPassives = om.equippedPassives.map(normalizeEquippedPassiveRow).filter(Boolean);
    profile.equippedPassiveSkills[om.id] = om.equippedPassives.map((p) => p.instanceId).filter(Boolean);
  }
}

export function profileOwnsPassiveSkillId(profile, skillId) {
  ensurePassiveInventory(profile);
  const inInv = profile.passiveSkillBooksOwned.some((b) => b.skillId === skillId);
  if (inInv) return true;
  return (profile.ownedMonsters || []).some((om) =>
    (om.equippedPassives || []).some((p) => p.skillId === skillId),
  );
}

export function monsterEquippedPassives(monster) {
  return Array.isArray(monster?.equippedPassives) ? monster.equippedPassives : [];
}

export function getMonsterTemplateRarity(templateId) {
  const t = getMonsterTemplate(templateId) ?? getLadderMonsterTemplate(templateId);
  return t?.rarity ?? 'common';
}

/** @param {object} monster @param {object} skillBook @param {object[]} equippedOnMonster */
export function canEquipPassive(monster, skillBook, equippedOnMonster = null) {
  const equipped = equippedOnMonster ?? monsterEquippedPassives(monster);
  const rarity = getMonsterTemplateRarity(monster.templateId);
  const limit = passiveSlotLimitForRarity(rarity);
  if (limit <= 0) {
    return { ok: false, error: `${rarity} monsters cannot equip passive skills.` };
  }
  if (equipped.length >= limit) {
    return { ok: false, error: `Passive slots full (${equipped.length}/${limit}).` };
  }
  if (equipped.some((p) => p.skillId === skillBook.skillId)) {
    return { ok: false, error: 'This monster already has that passive.' };
  }
  return { ok: true, limit, used: equipped.length };
}

/**
 * Grant a new book to inventory (no duplicate skillId in inventory).
 * @returns {{ ok: boolean, book?: object, error?: string, duplicate?: boolean }}
 */
export function grantPassiveSkillBook(profile, skillId, rarity, source = 'unknown') {
  ensurePassiveInventory(profile);
  const def = getPassiveSkillDef(skillId);
  if (!def) return { ok: false, error: 'Unknown passive skill' };
  if (profileOwnsPassiveSkillId(profile, skillId)) {
    return { ok: false, error: 'Already own this skill book', duplicate: true };
  }
  const book = normalizePassiveBookRow({
    instanceId: newInstanceId(),
    skillId,
    skillName: def.name,
    rarity,
    level: 1,
    acquiredAt: new Date().toISOString(),
    equippedToMonsterId: null,
  });
  profile.passiveSkillBooksOwned.push(book);
  profile.passiveSkillBookDropHistory.push({
    skillId,
    rarity,
    source,
    at: new Date().toISOString(),
  });
  if (profile.passiveSkillBookDropHistory.length > 100) {
    profile.passiveSkillBookDropHistory = profile.passiveSkillBookDropHistory.slice(-100);
  }
  profile.updatedAt = new Date().toISOString();
  return { ok: true, book };
}

/**
 * Consume book from inventory → permanent passive on monster.
 */
export function equipPassiveSkill(profile, monsterId, skillBookInstanceId) {
  ensurePassiveInventory(profile);
  const om = (profile.ownedMonsters || []).find((m) => m.id === monsterId);
  if (!om) return { ok: false, error: 'Monster not found' };
  const idx = profile.passiveSkillBooksOwned.findIndex((b) => b.instanceId === skillBookInstanceId);
  if (idx < 0) return { ok: false, error: 'Skill book not in inventory' };
  const book = profile.passiveSkillBooksOwned[idx];
  const check = canEquipPassive(om, book);
  if (!check.ok) return { ok: false, error: check.error };

  profile.passiveSkillBooksOwned.splice(idx, 1);
  const equipped = {
    skillId: book.skillId,
    rarity: book.rarity,
    equippedAt: new Date().toISOString(),
    instanceId: book.instanceId,
  };
  if (!Array.isArray(om.equippedPassives)) om.equippedPassives = [];
  om.equippedPassives.push(equipped);
  profile.equippedPassiveSkills[monsterId] = om.equippedPassives.map((p) => p.instanceId).filter(Boolean);
  profile.updatedAt = new Date().toISOString();
  return { ok: true, equipped, slots: { used: om.equippedPassives.length, limit: check.limit } };
}

/** Remove passive from monster (book is not returned). */
export function removeEquippedPassive(profile, monsterId, skillId) {
  ensurePassiveInventory(profile);
  const om = (profile.ownedMonsters || []).find((m) => m.id === monsterId);
  if (!om) return { ok: false, error: 'Monster not found' };
  const before = om.equippedPassives?.length ?? 0;
  om.equippedPassives = (om.equippedPassives || []).filter((p) => p.skillId !== skillId);
  if (om.equippedPassives.length === before) return { ok: false, error: 'Passive not equipped' };
  profile.equippedPassiveSkills[monsterId] = om.equippedPassives.map((p) => p.instanceId).filter(Boolean);
  profile.updatedAt = new Date().toISOString();
  return { ok: true };
}

/** Replace: remove one skill id then equip book. */
export function replaceEquippedPassive(profile, monsterId, removeSkillId, skillBookInstanceId) {
  const om = (profile.ownedMonsters || []).find((m) => m.id === monsterId);
  if (om?.equippedPassives?.some((p) => p.skillId === removeSkillId)) {
    removeEquippedPassive(profile, monsterId, removeSkillId);
  }
  return equipPassiveSkill(profile, monsterId, skillBookInstanceId);
}

export function listUnequippedBooks(profile) {
  ensurePassiveInventory(profile);
  return profile.passiveSkillBooksOwned.filter((b) => !b.equippedToMonsterId);
}

export function formatBookLabel(book) {
  const def = getPassiveSkillDef(book.skillId);
  const name = def?.name ?? book.skillName ?? book.skillId;
  return `${name} (${book.rarity})`;
}

export function getPassiveCatalogForShop() {
  return Object.values(PASSIVE_SKILLS).map((def) => ({
    skillId: def.id,
    name: def.name,
    effectType: def.effectType,
  }));
}

export function bookRewardSummary(book) {
  return {
    instanceId: book.instanceId,
    skillId: book.skillId,
    skillName: book.skillName,
    rarity: book.rarity,
    description: getPassiveDescription(book.skillId, book.rarity),
  };
}
