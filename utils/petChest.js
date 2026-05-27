/**
 * Pet chest drops — mythic pets from chests; duplicates → petExpDust via grantPet.
 */
import { getPetDef, MYTHIC_PET_IDS } from '../src/gameSystems/pets';
import { grantPet } from '../src/gameSystems/petInventory';

/** @typedef {'miniBoss'|'boss'|'ladder'|'rescue'|'premium'|'spin'} PetChestKind */

const PET_DROP_RATE = {
  miniBoss: 0.04,
  boss: 0.05,
  ladder: 0.035,
  rescue: 0.04,
  premium: 0.08,
  spin: 0.02,
};

const PET_EXP_DUST_DROP = {
  miniBoss: { chance: 0.12, min: 15, max: 35 },
  ladder: { chance: 0.1, min: 10, max: 28 },
  rescue: { chance: 0.1, min: 12, max: 30 },
};

function pickMythicPetId() {
  const id = MYTHIC_PET_IDS[Math.floor(Math.random() * MYTHIC_PET_IDS.length)];
  return id || 'dragon_wisp';
}

/**
 * Optional bonus pet drop when opening a chest (mythic pet only).
 * @param {PetChestKind} chestKind
 * @param {object} [_profile]
 */
export function rollPetChestDrop(chestKind, _profile) {
  const rate = PET_DROP_RATE[chestKind] ?? 0.03;
  if (Math.random() >= rate) return null;

  const petId = pickMythicPetId();
  const def = getPetDef(petId);
  if (!def) return null;

  return {
    kind: 'pet',
    petId,
    name: def.name,
    emoji: def.emoji,
    rarity: def.rarity,
    label: `${def.emoji} ${def.name}`,
    source: chestKind,
  };
}

/**
 * Small pet EXP dust bundle (not a pet).
 * @param {PetChestKind} chestKind
 */
export function rollPetExpDustDrop(chestKind) {
  const cfg = PET_EXP_DUST_DROP[chestKind];
  if (!cfg || Math.random() >= cfg.chance) return null;
  const amount =
    cfg.min + Math.floor(Math.random() * Math.max(1, cfg.max - cfg.min + 1));
  return {
    kind: 'pet_exp_dust',
    amount,
    label: `+${amount} Pet EXP Dust`,
    rarity: 'rare',
  };
}

/**
 * Apply a pet chest drop to profile.
 * @param {object} profile
 * @param {object} drop
 */
export function applyPetChestDrop(profile, drop) {
  if (!drop) return { ok: false };
  if (drop.kind === 'pet') {
    const grant = grantPet(profile, drop.petId, { source: drop.source || 'chest' });
    return {
      ok: grant.ok,
      duplicate: grant.duplicate,
      pet: grant.pet,
      petExpDust: grant.petExpDust ?? 0,
      petExpDustTotal: profile.petExpDust ?? 0,
    };
  }
  if (drop.kind === 'pet_exp_dust') {
    const amt = Math.max(0, Math.floor(drop.amount || 0));
    profile.petExpDust = (profile.petExpDust ?? 0) + amt;
    return { ok: true, petExpDust: amt, petExpDustTotal: profile.petExpDust };
  }
  return { ok: false };
}
