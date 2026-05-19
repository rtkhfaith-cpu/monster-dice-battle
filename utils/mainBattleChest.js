import { GEAR_CATALOG, getGear } from './cosmetics';
import { expWinForEnemyLevel } from './expLevel';
import { getAllowedCpuRarities } from './fighterFromOwned';
import { getMonsterTemplate, MONSTER_CATALOG } from './monsterTemplates';
import { coinWinForEnemyLevel } from './rewards';

/** 5% chance for a main-menu CPU battle to spawn a catalog mini boss. */
export const MAIN_MINI_BOSS_CHANCE = 0.05;

/** Mini boss stats = same template at level × this multiplier (vs normal CPU 0.9×). */
export const MAIN_MINI_BOSS_STAT_MULT = 1.5;

const CHEST_GEAR_POOL = GEAR_CATALOG.filter(
  (g) => g?.id && !g.ladderExclusive && typeof g.price === 'number' && g.price <= 55,
);

/**
 * Roll a single modest reward for beating a main-game mini boss.
 * @param {import('./gameStorage').PlayerProfile|null} profile
 * @param {{ enemyLevel?: number }} opts
 */
export function rollMainBattleChestDrop(profile, { enemyLevel = 1 } = {}) {
  const lvl = Math.max(1, Math.floor(enemyLevel || 1));
  const roll = Math.random();

  if (roll < 0.45) {
    const base = coinWinForEnemyLevel(lvl);
    const amount = Math.max(5, Math.floor(base * 0.6) + Math.floor(Math.random() * 8));
    return { kind: 'gold', amount, label: `${amount} coins`, rarity: 'common' };
  }

  if (roll < 0.75) {
    const amount = Math.max(8, Math.floor(expWinForEnemyLevel(lvl) * 0.38));
    return { kind: 'exp', amount, label: `${amount} bonus EXP`, rarity: 'common' };
  }

  if (roll < 0.95) {
    const pool = CHEST_GEAR_POOL.length ? CHEST_GEAR_POOL : GEAR_CATALOG.filter((g) => g?.id && !g.ladderExclusive);
    const gear = pool[Math.floor(Math.random() * pool.length)];
    if (!gear) {
      const amount = Math.max(5, Math.floor(coinWinForEnemyLevel(lvl) * 0.5));
      return { kind: 'gold', amount, label: `${amount} coins`, rarity: 'common' };
    }
    return {
      kind: 'gear',
      id: gear.id,
      name: gear.name,
      emoji: gear.emoji,
      label: gear.name,
      rarity: 'common',
    };
  }

  const allowed = new Set(getAllowedCpuRarities(lvl));
  let pool = MONSTER_CATALOG.filter((m) => m?.id && allowed.has(m.rarity));
  if (!pool.length) pool = MONSTER_CATALOG.filter((m) => m?.id);
  const pick = pool[Math.floor(Math.random() * pool.length)] || MONSTER_CATALOG[0];
  const tpl = getMonsterTemplate(pick.id);
  const duplicate = profile?.ownedMonsters?.some((m) => m.templateId === pick.id) ?? false;
  return {
    kind: 'monster',
    id: pick.id,
    name: tpl?.name ?? pick.id,
    label: tpl?.name ?? pick.id,
    rarity: tpl?.rarity ?? 'common',
    duplicate,
  };
}

export function chestDropTitle(drop) {
  if (!drop) return 'Chest reward';
  if (drop.kind === 'gold') return `${drop.amount} coins`;
  if (drop.kind === 'exp') return `${drop.amount} bonus EXP`;
  if (drop.kind === 'gear') {
    const g = getGear(drop.id);
    return g?.name ?? drop.name ?? drop.id;
  }
  return drop.name ?? drop.label ?? 'Monster';
}

export function chestDropSubtitle(drop) {
  if (!drop) return '';
  if (drop.kind === 'gold') return 'Gold from the chest';
  if (drop.kind === 'exp') return 'Experience for your fighter';
  if (drop.kind === 'gear') {
    if (drop.duplicate) return 'Already owned — converted to bonus coins';
    return 'Added to your gear inventory';
  }
  if (drop.duplicate) return 'Another copy joins your roster';
  return 'New monster added to your collection';
}
