/** Pet leveling — stats only scale with level, not skills. */

export const PET_MAX_LEVEL = 120;

export function expToAdvancePetLevel(level) {
  const lv = Math.max(1, Math.min(PET_MAX_LEVEL, Math.floor(level)));
  if (lv >= PET_MAX_LEVEL) return 0;
  if (lv <= 20) return 40 + lv * 12;
  if (lv <= 40) return 280 + (lv - 20) * 35;
  return 980 + (lv - 40) * 70;
}

export function totalExpForPetLevel(targetLevel) {
  let total = 0;
  for (let l = 1; l < targetLevel; l += 1) total += expToAdvancePetLevel(l);
  return total;
}

/** @param {number} exp @param {number} level */
export function reconcilePetLevelExp({ exp = 0, level = 1 }) {
  let lv = Math.max(1, Math.min(PET_MAX_LEVEL, Math.floor(level)));
  let remaining = Math.max(0, Math.floor(exp));
  while (lv < PET_MAX_LEVEL) {
    const need = expToAdvancePetLevel(lv);
    if (remaining < need) break;
    remaining -= need;
    lv += 1;
  }
  return { level: lv, exp: remaining, expToNext: expToAdvancePetLevel(lv) };
}

/** @param {number} amount */
export function grantPetExp(pet, amount) {
  const add = Math.max(0, Math.floor(amount));
  if (!add || !pet) return pet;
  const rec = reconcilePetLevelExp({
    level: pet.level ?? 1,
    exp: (pet.exp ?? 0) + add,
  });
  return { ...pet, ...rec };
}
