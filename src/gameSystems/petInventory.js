/**
 * Pet inventory — own, equip, unequip, grant.
 */
import { getPetDef, calculatePetStats } from './pets';
import { grantPetExp, reconcilePetLevelExp, PET_MAX_LEVEL } from './petExp';
import { describePetSkill, getPetSkillEffect } from './petSkills';
import { petDuplicateShardsForRarity } from '../gameBalance/gearShards';
import { getMonsterLadderState, setMonsterLadderState } from '../../utils/monsterLadder/ladderProfile';

function newInstanceId() {
  return `pet_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 9)}`;
}

export function normalizeOwnedPetRow(row) {
  if (!row || typeof row !== 'object') return null;
  const petId = String(row.petId || row.id || '');
  const def = getPetDef(petId);
  if (!def) return null;
  const rec = reconcilePetLevelExp({ level: row.level ?? 1, exp: row.exp ?? 0 });
  return {
    instanceId: String(row.instanceId || newInstanceId()),
    petId,
    name: String(row.name || def.name),
    emoji: row.emoji || def.emoji,
    rarity: def.rarity,
    level: rec.level,
    exp: rec.exp,
    expToNext: rec.expToNext,
    maxLevel: PET_MAX_LEVEL,
    skills: [...def.skills],
    equippedToMonsterId: row.equippedToMonsterId ?? null,
    acquiredAt: row.acquiredAt || new Date().toISOString(),
  };
}

/** @param {object} profile */
export function ensurePetInventory(profile) {
  if (!profile) return;
  if (!Array.isArray(profile.ownedPets)) profile.ownedPets = [];

  // Normalize in place so existing row references remain valid across calls.
  for (let i = profile.ownedPets.length - 1; i >= 0; i--) {
    const cur = profile.ownedPets[i];
    const norm = normalizeOwnedPetRow(cur);
    if (!norm) {
      profile.ownedPets.splice(i, 1);
      continue;
    }
    if (cur && typeof cur === 'object') {
      Object.assign(cur, norm);
    } else {
      profile.ownedPets[i] = norm;
    }
  }

  const byMonster = {};
  for (const pet of profile.ownedPets) {
    if (pet.equippedToMonsterId) {
      if (byMonster[pet.equippedToMonsterId] && byMonster[pet.equippedToMonsterId] !== pet.instanceId) {
        pet.equippedToMonsterId = null;
      } else {
        byMonster[pet.equippedToMonsterId] = pet.instanceId;
      }
    }
  }
  for (const om of profile.ownedMonsters || []) {
    const linked = profile.ownedPets.find((p) => p.equippedToMonsterId === om.id);
    om.equippedPetInstanceId = linked?.instanceId ?? null;
  }
}

export function findOwnedPet(profile, instanceId) {
  ensurePetInventory(profile);
  return profile.ownedPets.find((p) => p.instanceId === instanceId) ?? null;
}

export function petEquippedToMonster(profile, monsterId) {
  ensurePetInventory(profile);
  return profile.ownedPets.find((p) => p.equippedToMonsterId === monsterId) ?? null;
}

export function monsterNameForPet(profile, monsterId) {
  const om = (profile.ownedMonsters || []).find((m) => m.id === monsterId);
  if (!om) return null;
  return om.nickname || om.templateId;
}

/** Snapshot for battle / UI */
export function petBattleSnapshot(ownedPet) {
  if (!ownedPet) return null;
  const def = getPetDef(ownedPet.petId);
  if (!def) return null;
  const currentStats = calculatePetStats({ rarity: ownedPet.rarity, level: ownedPet.level });
  let petCritBonusPct = 0;
  let petDodgeBonusPct = 0;
  let coinBonusPct = 0;
  for (const skillType of def.skills) {
    const e = getPetSkillEffect(skillType, ownedPet.rarity);
    if (skillType === 'crit_boost') petCritBonusPct += e.petCritBonusPct ?? 0;
    if (skillType === 'dodge_boost') petDodgeBonusPct += e.petDodgeBonusPct ?? 0;
    if (skillType === 'lucky_coins') coinBonusPct += e.coinBonusPct ?? 0;
  }
  return {
    instanceId: ownedPet.instanceId,
    petId: ownedPet.petId,
    name: ownedPet.name || def.name,
    emoji: ownedPet.emoji || def.emoji,
    rarity: ownedPet.rarity,
    level: ownedPet.level,
    skills: [...def.skills],
    currentStats,
    petCritBonusPct,
    petDodgeBonusPct,
    coinBonusPct,
    skillDescriptions: def.skills.map((s) => describePetSkill(s, ownedPet.rarity)),
  };
}

/**
 * @param {object} profile
 * @param {string} petId
 * @param {{ source?: string }} [opts]
 */
export function grantPet(profile, petId, opts = {}) {
  ensurePetInventory(profile);
  const def = getPetDef(petId);
  if (!def) return { ok: false, error: 'Unknown pet' };

  const existing = profile.ownedPets.find((p) => p.petId === petId);
  if (existing) {
    const dust = def.rarity === 'mythic' ? 120 : def.rarity === 'epic' ? 60 : 30;
    profile.petExpDust = (profile.petExpDust ?? 0) + dust;

    const shards = petDuplicateShardsForRarity(def.rarity);
    const ml = getMonsterLadderState(profile);
    ml.ladderShards = (ml.ladderShards || 0) + shards;
    setMonsterLadderState(profile, ml);

    return {
      ok: true,
      duplicate: true,
      petExpDust: dust,
      monsterChestShards: shards,
      ladderShardsTotal: ml.ladderShards,
      pet: existing,
    };
  }

  const row = normalizeOwnedPetRow({
    instanceId: newInstanceId(),
    petId,
    level: 1,
    exp: 0,
    acquiredAt: new Date().toISOString(),
    source: opts.source,
  });
  profile.ownedPets.push(row);
  return { ok: true, pet: row, duplicate: false };
}

export function canEquipPet(profile, monsterId, petInstanceId) {
  ensurePetInventory(profile);
  const pet = findOwnedPet(profile, petInstanceId);
  if (!pet) return { ok: false, error: 'Pet not found' };
  const om = (profile.ownedMonsters || []).find((m) => m.id === monsterId);
  if (!om) return { ok: false, error: 'Monster not found' };
  if (pet.equippedToMonsterId === monsterId) return { ok: true, already: true };
  return { ok: true };
}

/** Unequip pet from any monster, then equip to target. */
export function equipPetOnMonster(profile, monsterId, petInstanceId) {
  ensurePetInventory(profile);
  const om = (profile.ownedMonsters || []).find((m) => m.id === monsterId);
  if (!om) return { ok: false, error: 'Monster not found' };
  const pet = profile.ownedPets.find((p) => p.instanceId === petInstanceId);
  if (!pet) return { ok: false, error: 'Pet not found' };
  if (pet.equippedToMonsterId === monsterId) {
    om.equippedPetInstanceId = pet.instanceId;
    return { ok: true, already: true, pet };
  }

  // Unequip any pet currently on the target monster (other than this one).
  for (const other of profile.ownedPets) {
    if (other !== pet && other.equippedToMonsterId === monsterId) {
      other.equippedToMonsterId = null;
    }
  }
  // Unequip this pet from a previous monster.
  if (pet.equippedToMonsterId && pet.equippedToMonsterId !== monsterId) {
    const prev = (profile.ownedMonsters || []).find((m) => m.id === pet.equippedToMonsterId);
    if (prev) prev.equippedPetInstanceId = null;
  }

  pet.equippedToMonsterId = monsterId;
  om.equippedPetInstanceId = pet.instanceId;
  return { ok: true, pet };
}

export function unequipPetFromMonster(profile, monsterId) {
  ensurePetInventory(profile);
  const om = (profile.ownedMonsters || []).find((m) => m.id === monsterId);
  const pet = profile.ownedPets.find((p) => p.equippedToMonsterId === monsterId);
  if (!pet) {
    if (om) om.equippedPetInstanceId = null;
    return { ok: false, error: 'No pet equipped' };
  }
  pet.equippedToMonsterId = null;
  if (om) om.equippedPetInstanceId = null;
  return { ok: true, pet };
}

/** Coin bonus % from equipped pet lucky_coins (battle rewards). */
export function getCoinBonusPctForMonster(profile, monsterId) {
  const pet = petEquippedToMonster(profile, monsterId);
  if (!pet) return 0;
  const snap = petBattleSnapshot(pet);
  return snap?.coinBonusPct ?? 0;
}

/**
 * Award EXP to the pet equipped on a monster.
 * @param {object} profile
 * @param {string|null} monsterId
 * @param {number} amount
 */
export function awardPetExpToEquippedMonster(profile, monsterId, amount) {
  ensurePetInventory(profile);
  const add = Math.max(0, Math.floor(amount));
  if (!add || !monsterId) return { ok: false, awarded: 0 };

  const pet = petEquippedToMonster(profile, monsterId);
  if (!pet) return { ok: false, awarded: 0 };

  const prevLevel = pet.level;
  const updated = grantPetExp(pet, add);
  const idx = profile.ownedPets.findIndex((p) => p.instanceId === pet.instanceId);
  if (idx >= 0) profile.ownedPets[idx] = normalizeOwnedPetRow(updated);

  return {
    ok: true,
    awarded: add,
    pet: profile.ownedPets[idx],
    leveledUp: (updated.level ?? 1) > prevLevel,
    prevLevel,
  };
}

/** Spend pet EXP dust on a pet instance (1 dust = 8 EXP). */
export function spendPetExpDustOnPet(profile, petInstanceId, dustAmount) {
  ensurePetInventory(profile);
  const dust = Math.max(0, Math.floor(dustAmount));
  if (dust <= 0) return { ok: false, error: 'Invalid amount' };
  if ((profile.petExpDust ?? 0) < dust) return { ok: false, error: 'Not enough pet EXP dust' };

  const pet = findOwnedPet(profile, petInstanceId);
  if (!pet) return { ok: false, error: 'Pet not found' };

  profile.petExpDust -= dust;
  const expGain = dust * 8;
  const prevLevel = pet.level;
  const updated = grantPetExp(pet, expGain);
  const idx = profile.ownedPets.findIndex((p) => p.instanceId === petInstanceId);
  if (idx >= 0) profile.ownedPets[idx] = normalizeOwnedPetRow(updated);

  return {
    ok: true,
    dustSpent: dust,
    expGained: expGain,
    pet: profile.ownedPets[idx],
    leveledUp: (updated.level ?? 1) > prevLevel,
    petExpDustTotal: profile.petExpDust,
  };
}
