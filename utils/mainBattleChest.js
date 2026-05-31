import { bossCoinsForEnemyLevel, bossExpForEnemyLevel } from '../src/gameBalance/rewards';
import { CHEST_RARITY_RATES } from '../src/gameBalance/chestRarityRates';
import { getChestMonstersByRarity } from './chestMonsterPools';
import { rollGearDropRarity } from '../src/gameSystems/gear/gearDrops';
import { formatGearStatLines } from '../src/gameSystems/gear/gearGenerator';
import { getAllowedCpuRarities } from './fighterFromOwned';
import { profileOwnsMonsterTemplate } from './monsterLadder/ladderProfile';
import { getLadderMonsterTemplate } from './monsterLadder/ladderMonsterCatalog';
import { getMonsterTemplate, MONSTER_CATALOG, RARITY_ORDER } from './monsterTemplates';
import { rollPassiveSkillBookDrop } from './passiveSkillChest';
import { rollPetChestDrop, rollPetExpDustDrop } from './petChest';
import {
  EPIC_GEM_DROP_RATES,
  GEM_STATS,
  gemKey,
  gemDisplayName,
  gemEmoji,
} from '../src/gameSystems/gems/gemDefinitions';

/** 20% chance for a main-menu CPU battle to spawn a catalog mini boss (testing). */
export const MAIN_MINI_BOSS_CHANCE = 0.2;

/** Chest reward bands (must match rollMainBattleChestDrop). */
export const MAIN_MINI_BOSS_CHEST_ROWS = [
  {
    id: 'gold',
    label: 'Bonus coins',
    chancePct: 28,
    detail: 'Extra coins on top of the normal win payout (scales with enemy level).',
  },
  {
    id: 'exp',
    label: 'Bonus EXP',
    chancePct: 28,
    detail: 'Bonus EXP for your active monster (scales with enemy level).',
  },
  {
    id: 'gear',
    label: 'Gear Mart item',
    chancePct: 26,
    detail: 'Random gear instance (rare/epic/mythic) from the active equipment system. Includes rolled stat lines and sockets.',
  },
  {
    id: 'monster',
    label: 'Monster',
    chancePct: 18,
    detail:
      'Roll rarity first (fixed weights below), then a random monster of that rarity (equal chance per species). Mythic pool includes 67-Rex, Goldzilla (Ultra Mythic), and ladder mythics. Duplicate → another copy on your roster.',
  },
];

/** Rarity weights for the 18% monster chest (not split by how many monsters exist per tier). */
export const MAIN_MINI_BOSS_MONSTER_RARITY_WEIGHTS = { ...CHEST_RARITY_RATES };

export const MAIN_MINI_BOSS_MONSTER_RARITY_ROWS = [
  { levelRange: '1–15', rarities: 'Common only (100%)' },
  { levelRange: '16–25', rarities: 'Common 57.1% · Rare 42.9%' },
  { levelRange: '26–35', rarities: 'Common 47.1% · Rare 35.3% · Epic 17.6%' },
  { levelRange: '36+', rarities: 'Common 40% · Rare 30% · Epic 15% · Legendary 10% · Mythic 5%' },
];

/**
 * Rarity % inside the monster chest roll, renormalized for allowed tiers at this level.
 * @param {number} playerLevel
 */
export function getMainMiniBossMonsterRarityPercents(playerLevel) {
  const lvl = Math.max(1, Math.floor(playerLevel || 1));
  const allowed = getAllowedCpuRarities(lvl);
  const order = RARITY_ORDER.filter((r) => allowed.includes(r));
  const total = order.reduce((s, r) => s + (MAIN_MINI_BOSS_MONSTER_RARITY_WEIGHTS[r] ?? 0), 0);
  if (!total) return [];
  return order.map((rarity) => ({
    rarity,
    percent: Math.round(((MAIN_MINI_BOSS_MONSTER_RARITY_WEIGHTS[rarity] ?? 0) / total) * 1000) / 10,
  }));
}

/** Mini boss stats = same template at level × this multiplier (vs normal CPU 0.9×). */
export const MAIN_MINI_BOSS_STAT_MULT = 1.2;

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

function rollChestMonsterRarity(allowedSet) {
  const order = RARITY_ORDER.filter((r) => allowedSet.has(r));
  const total = order.reduce((s, r) => s + (MAIN_MINI_BOSS_MONSTER_RARITY_WEIGHTS[r] ?? 0), 0);
  if (!total) return 'common';
  let roll = Math.random() * total;
  for (const r of order) {
    roll -= MAIN_MINI_BOSS_MONSTER_RARITY_WEIGHTS[r] ?? 0;
    if (roll <= 0) return r;
  }
  return order[order.length - 1] ?? 'common';
}

function pickChestMonster(profile, enemyLevel) {
  const lvl = Math.max(1, Math.floor(enemyLevel || 1));
  const allowed = new Set(getAllowedCpuRarities(lvl));
  const tryRarities = [
    rollChestMonsterRarity(allowed),
    ...RARITY_ORDER.filter((r) => allowed.has(r)),
  ];
  let pick = null;
  const seen = new Set();
  for (const rarity of tryRarities) {
    if (seen.has(rarity)) continue;
    seen.add(rarity);
    const pool = getChestMonstersByRarity(rarity).filter((m) => allowed.has(m.rarity));
    if (pool.length) {
      pick = pool[Math.floor(Math.random() * pool.length)];
      break;
    }
  }
  if (!pick) {
    const fallback = RARITY_ORDER.flatMap((r) =>
      allowed.has(r) ? getChestMonstersByRarity(r) : [],
    );
    pick = fallback[Math.floor(Math.random() * fallback.length)]
      ?? getChestMonstersByRarity('common')[0]
      ?? MONSTER_CATALOG[0];
  }
  const tpl = getMonsterTemplate(pick.id);
  const ladderTpl = tpl ? null : getLadderMonsterTemplate(pick.id);
  const displayName = tpl?.name ?? ladderTpl?.name ?? pick.name ?? pick.id;
  const displayRarity = tpl?.rarity ?? ladderTpl?.rarity ?? pick.rarity ?? 'common';
  return {
    kind: 'monster',
    id: pick.id,
    name: displayName,
    label: displayName,
    rarity: displayRarity,
    duplicate: profileOwnsMonsterTemplate(profile, pick.id),
  };
}

function pickChestGearInstance() {
  const rarity = rollGearDropRarity('miniBoss');
  if (!rarity) return null;
  return { rarity };
}

/**
 * Roll a reward for beating a main-game mini boss (on top of normal battle payout).
 * @param {import('./gameStorage').PlayerProfile|null} profile
 * @param {{ enemyLevel?: number }} opts
 */
export function rollMainBattleChestDrop(profile, { enemyLevel = 1 } = {}) {
  const lvl = Math.max(1, Math.floor(enemyLevel || 1));

  const petDrop = rollPetChestDrop('miniBoss', profile);
  if (petDrop) return petDrop;

  const dustDrop = rollPetExpDustDrop('miniBoss');
  if (dustDrop) return dustDrop;

  const roll = Math.random();

  // Bands match MAIN_MINI_BOSS_CHEST_ROWS: gold 28% · exp 28% · gear 26% · monster 18%.
  if (roll < 0.28) {
    const amount = miniBossCoinPayout(lvl);
    return {
      kind: 'gold',
      amount,
      label: `${amount} bonus coins`,
      rarity: 'rare',
    };
  }

  if (roll < 0.56) {
    const book = rollPassiveSkillBookDrop('miniBoss', profile);
    if (book && book.kind === 'skill_book') return book;
    const amount = miniBossExpPayout(lvl);
    return { kind: 'exp', amount, label: `${amount} bonus EXP`, rarity: 'rare' };
  }

  if (roll < 0.82) {
    // Epic gem chance inside the gear band. Mythic gems never drop here.
    if (Math.random() * 100 < EPIC_GEM_DROP_RATES.miniBattleChest) {
      const stat = GEM_STATS[Math.floor(Math.random() * GEM_STATS.length)];
      const key = gemKey('epic', stat);
      return {
        kind: 'gem',
        gemKey: key,
        rarity: 'epic',
        label: `Epic ${stat} gem`,
        gemName: gemDisplayName('epic', stat),
        emoji: gemEmoji(stat, 'epic'),
      };
    }

    const gear = pickChestGearInstance();
    if (gear) {
      return {
        kind: 'gear_instance',
        rarity: gear.rarity,
        label: `${gear.rarity} gear`,
      };
    }

    const amount = miniBossCoinPayout(lvl);
    return { kind: 'gold', amount, label: `${amount} coins`, rarity: 'common' };
  }

  return pickChestMonster(profile, lvl);
}

/** Coins when chest gear is already owned. */
export function mainBattleChestDuplicateGold(enemyLevel = 1) {
  const lvl = Math.max(1, Math.floor(enemyLevel || 1));
  const bossCoins = bossCoinsForEnemyLevel(lvl, 'miniBoss');
  return Math.max(18, Math.floor(bossCoins * 0.75));
}

export function chestDropTitle(drop) {
  if (!drop) return 'Chest reward';
  if (drop.kind === 'pet') return drop.label ?? `${drop.emoji ?? ''} ${drop.name ?? 'Pet'}`.trim();
  if (drop.kind === 'pet_exp_dust') return drop.label ?? `+${drop.amount} Pet EXP Dust`;
  if (drop.kind === 'skill_book') return `Passive Skill Book: ${drop.name ?? drop.skillId}`;
  if (drop.kind === 'gold') return `${drop.amount} coins`;
  if (drop.kind === 'exp') return `${drop.amount} bonus EXP`;
  if (drop.kind === 'gem') return drop.gemName ?? drop.label ?? 'Gem';
  if (drop.kind === 'gear' || drop.kind === 'gear_instance') {
    return drop.name ?? drop.gear?.name ?? 'Gear';
  }
  return drop.name ?? drop.label ?? 'Monster';
}

export function chestDropSubtitle(drop) {
  if (!drop) return '';
  if (drop.kind === 'pet') {
    if (drop.duplicate) {
      const dust = drop.petExpDust ?? 0;
      const shards = drop.monsterChestShards ?? 0;
      const parts = [
        dust ? `+${dust} pet EXP dust` : null,
        shards ? `+${shards} monster-chest shards` : null,
      ].filter(Boolean);
      return parts.length ? `Duplicate → ${parts.join(' · ')}` : 'Duplicate pet.';
    }
    return 'Mythic pet joined your collection!';
  }
  if (drop.kind === 'pet_exp_dust') return 'Spend on pets in Monster Gear → Pets';
  if (drop.kind === 'skill_book') return 'Passive Skill Book Acquired!';
  if (drop.kind === 'skill_book_duplicate') return 'You already know this passive — converted to bonus coins';
  if (drop.kind === 'gold') return 'Gold from the chest';
  if (drop.kind === 'exp') return 'Experience for your fighter';
  if (drop.kind === 'gem') return 'Added to your gems — upgrade in Inventory → Gems';
  if (drop.kind === 'gear' || drop.kind === 'gear_instance') {
    const lines = drop.statLines?.join(' · ') ?? (drop.gear?.stats || []).map((s) => `+${s.value} ${s.type}`).join(' · ');
    const sockets = drop.socketCount ?? drop.gear?.sockets?.length ?? 0;
    const parts = [lines, sockets ? `Sockets: ${sockets}` : null].filter(Boolean);
    return parts.length ? parts.join('\n') : 'Added to your gear inventory';
  }
  if (drop.duplicate) return 'Another copy joins your roster';
  return 'New monster added to your collection';
}
