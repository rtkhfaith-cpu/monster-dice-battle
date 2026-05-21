import { LADDER_BALANCE } from './ladder';

export const REWARD_BALANCE = {
  normalExpBase: 15,
  normalExpPerEnemyLevel: 3,
  miniBossExpMultiplier: 2,
  bigBossExpMultiplier: 4,
  ladderExpMultiplier: LADDER_BALANCE.expMultiplier,
  lossExpBase: 5,
  lossExpPerPlayerLevel: 1,
  coinsBase: 8,
  coinsPerEnemyLevel: 0.5,
  miniBossCoinMultiplier: 1.5,
  bigBossCoinMultiplier: 2,
  ladderCoinMultiplier: LADDER_BALANCE.coinMultiplier,
};

export function normalExpForEnemyLevel(enemyLevel) {
  const lv = Math.max(1, Math.floor(enemyLevel || 1));
  return REWARD_BALANCE.normalExpBase + lv * REWARD_BALANCE.normalExpPerEnemyLevel;
}

export function bossExpForEnemyLevel(enemyLevel, bossKind) {
  const base = normalExpForEnemyLevel(enemyLevel);
  if (bossKind === 'bigBoss') return Math.floor(base * REWARD_BALANCE.bigBossExpMultiplier);
  if (bossKind === 'miniBoss') return Math.floor(base * REWARD_BALANCE.miniBossExpMultiplier);
  return base;
}

export function ladderExpForEnemyLevel(enemyLevel) {
  return Math.floor(normalExpForEnemyLevel(enemyLevel) * REWARD_BALANCE.ladderExpMultiplier);
}

export function lossExpPenalty(playerLevel, currentExp = Infinity) {
  const lv = Math.max(1, Math.floor(playerLevel || 1));
  const penalty = REWARD_BALANCE.lossExpBase + lv * REWARD_BALANCE.lossExpPerPlayerLevel;
  return Math.min(Math.max(0, Math.floor(currentExp ?? 0)), penalty);
}

export function normalCoinsForEnemyLevel(enemyLevel) {
  const lv = Math.max(1, Math.floor(enemyLevel || 1));
  return Math.floor(REWARD_BALANCE.coinsBase + lv * REWARD_BALANCE.coinsPerEnemyLevel);
}

export function bossCoinsForEnemyLevel(enemyLevel, bossKind) {
  const base = normalCoinsForEnemyLevel(enemyLevel);
  if (bossKind === 'bigBoss') return Math.floor(base * REWARD_BALANCE.bigBossCoinMultiplier);
  if (bossKind === 'miniBoss') return Math.floor(base * REWARD_BALANCE.miniBossCoinMultiplier);
  return base;
}

export function ladderCoinsForEnemyLevel(enemyLevel, bossKind = null) {
  const base = bossCoinsForEnemyLevel(enemyLevel, bossKind);
  return Math.max(1, Math.floor(base * REWARD_BALANCE.ladderCoinMultiplier));
}
