import { getGear } from './cosmetics';
import { getMonsterTemplate } from './monsterTemplates';
import { getLadderGear } from './monsterLadder/ladderGearCatalog';
import { getLadderMonsterTemplate } from './monsterLadder/ladderMonsterCatalog';

export function isLadderMonsterId(id) {
  return !!getLadderMonsterTemplate(id);
}

export function isLadderGearId(id) {
  return !!getLadderGear(id);
}

export function isShopMonsterId(id) {
  return !!getMonsterTemplate(id) && !isLadderMonsterId(id);
}

export function isShopGearId(id) {
  return !!getGear(id) && !isLadderGearId(id);
}

export function assertShopMonsterPurchase(id) {
  if (isLadderMonsterId(id)) {
    return { ok: false, error: 'Ladder monsters are only from Monster Ladder chests.' };
  }
  if (!getMonsterTemplate(id)) {
    return { ok: false, error: 'Unknown monster.' };
  }
  return { ok: true };
}

export function assertShopGearPurchase(id) {
  if (isLadderGearId(id)) {
    return { ok: false, error: 'Ladder gear is only from Monster Ladder chests.' };
  }
  if (!getGear(id)) {
    return { ok: false, error: 'Unknown gear.' };
  }
  return { ok: true };
}
