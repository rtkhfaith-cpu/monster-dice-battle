import { bossCoinsForEnemyLevel, bossExpForEnemyLevel } from '../src/gameBalance/rewards';
import { GEAR_CATALOG, getGear } from './cosmetics';
import { getAllowedCpuRarities } from './fighterFromOwned';
import { getMonsterTemplate, MONSTER_CATALOG } from './monsterTemplates';

/** 20% chance for a main-menu CPU battle to spawn a catalog mini boss (testing). */
export const MAIN_MINI_BOSS_CHANCE = 0.2;

/** Mini boss stats = same template at level × this multiplier (vs normal CPU 0.9×). */
export const MAIN_MINI_BOSS_STAT_MULT = 1.5;

export function normalizeMainBattleState(profile) {
  if (!profile) return;
  if (!profile.mainBattle || typeof profile.mainBattle !== 'object') {
    profile.mainBattle = {};
  }
  if (typeof profile.mainBattle.skipNextMiniBoss !== 'boolean') {
    profile.mainBattle.skipNextMiniBoss = false;
  }
  if ('blockMiniBossUntilBattle' in profile.mainBattle) {
    delete profile.mainBattle.blockMiniBossUntilBattle;
  }
}

/** Whether this profile may roll a new main-game mini boss encounter. */
export function canSpawnMainMiniBoss(profile) {
  if (!profile) return true;
  normalizeMainBattleState(profile);
  return !profile.mainBattle.skipNextMiniBoss;
}

/** After lose or flee vs a main mini boss — skip mini boss on the next CPU battle only. */
export function recordMainMiniBossSkipNext(profile) {
  if (!profile) return;
  normalizeMainBattleState(profile);
  profile.mainBattle.skipNextMiniBoss = true;
}

export function clearMainMiniBossSkipNext(profile) {
  if (!profile) return;
  normalizeMainBattleState(profile);
  profile.mainBattle.skipNextMiniBoss = false;
}

/**
 * Consume a pending skip when starting the next main CPU battle.
 * @returns {boolean} true if a skip was pending (caller must not roll mini boss this battle)
 */
export function consumeMainMiniBossSkipNext(profile) {
  if (!profile) return false;
  normalizeMainBattleState(profile);
  if (!profile.mainBattle.skipNextMiniBoss) return false;
  profile.mainBattle.skipNextMiniBoss = false;
  return true;
}

const CHEST_GEAR_STANDARD = GEAR_CATALOG.filter(
  (g) => g?.id && !g.ladderExclusive && typeof g.price === 'number' && g.price <= 85,
);

const CHEST_GEAR_PREMIUM = GEAR_CATALOG.filter(
  (g) => g?.id && !g.ladderExclusive && typeof g.price === 'number' && g.price > 85 && g.price <= 140,
);

const CHEST_GEAR_POOL = [...CHEST_GEAR_STANDARD, ...CHEST_GEAR_PREMIUM];

function miniBossCoinPayout(level) {
  const bossCoins = bossCoinsForEnemyLevel(level, 'miniBoss');
  const bonus = Math.floor(Math.random() * Math.max(6, Math.floor(bossCoins * 0.3)));
  return Math.max(bossCoins, Math.floor(bossCoins * 1.2) + bonus);
}

function miniBossExpPayout(level) {
  const bossExp = bossExpForEnemyLevel(level, 'miniBoss');
  const mult = 0.95 + Math.random() * 0.45;
  return Math.max(14, Math.floor(bossExp * mult));
}

function pickChestGear() {
  const premium = CHEST_GEAR_PREMIUM.length > 0 && Math.random() < 0.4;
  const pool = premium
    ? CHEST_GEAR_PREMIUM
    : CHEST_GEAR_STANDARD.length
      ? CHEST_GEAR_STANDARD
      : CHEST_GEAR_POOL;
  const fallback = GEAR_CATALOG.filter((g) => g?.id && !g.ladderExclusive);
  const list = pool.length ? pool : fallback;
  return list[Math.floor(Math.random() * list.length)] ?? null;
}

/**
 * Roll a reward for beating a main-game mini boss (on top of normal battle payout).
 * @param {import('./gameStorage').PlayerProfile|null} profile
 * @param {{ enemyLevel?: number }} opts
 */
export function rollMainBattleChestDrop(profile, { enemyLevel = 1 } = {}) {
  const lvl = Math.max(1, Math.floor(enemyLevel || 1));
  const roll = Math.random();

  if (roll < 0.28) {
    const amount = miniBossCoinPayout(lvl);
    const bossCoins = bossCoinsForEnemyLevel(lvl, 'miniBoss');
    return {
      kind: 'gold',
      amount,
      label: `${amount} coins`,
      rarity: amount >= bossCoins * 1.35 ? 'rare' : 'common',
    };
  }

  if (roll < 0.56) {
    const amount = miniBossExpPayout(lvl);
    return { kind: 'exp', amount, label: `${amount} bonus EXP`, rarity: 'rare' };
  }

  if (roll < 0.82) {
    const gear = pickChestGear();
    if (!gear) {
      const amount = miniBossCoinPayout(lvl);
      return { kind: 'gold', amount, label: `${amount} coins`, rarity: 'common' };
    }
    const premium = (gear.price ?? 0) > 85;
    return {
      kind: 'gear',
      id: gear.id,
      name: gear.name,
      emoji: gear.emoji,
      label: gear.name,
      rarity: premium ? 'rare' : 'common',
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

/** Coins when chest gear is already owned. */
export function mainBattleChestDuplicateGold(enemyLevel = 1) {
  const lvl = Math.max(1, Math.floor(enemyLevel || 1));
  const bossCoins = bossCoinsForEnemyLevel(lvl, 'miniBoss');
  return Math.max(18, Math.floor(bossCoins * 0.75));
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
    if (drop.duplicate && drop.exchangedForShards) {
      return `Duplicate gear → +${drop.shardsGained ?? 0} ladder shards`;
    }
    if (drop.duplicate) return 'Already owned';
    return 'Added to your gear inventory';
  }
  if (drop.duplicate) return 'Another copy joins your roster';
  return 'New monster added to your collection';
}
