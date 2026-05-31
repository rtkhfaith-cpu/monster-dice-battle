/**
 * Dungeon team EXP — proportional to boss HP vs a 1v CPU opponent at the same level.
 *
 * A CPU win grants `expWinForEnemyLevel(level)` to one monster (then scaled in wallet).
 * Dungeon total EXP matches that payout × (boss HP ÷ reference CPU HP), then each of the
 * three team monsters and their equipped pets receive an equal one-third share.
 */
import { scaleExpGain } from '../../src/gameBalance/rewards';
import { expWinForEnemyLevel } from '../expLevel';
import { computeBattleStats } from '../statsCalc';
import { MONSTER_CATALOG } from '../monsterTemplates';
import { getAllowedCpuRarities } from '../fighterFromOwned';

/** Same multiplier as buildAiFighter for normal CPU opponents. */
const CPU_STAT_MULT = 0.9;
const TEAM_SIZE = 3;
/** Tuning trim — HP-proportional pool was ~3× too generous in playtests. */
const DUNGEON_EXP_REWARD_SCALE = 1 / 3;

/** Median HP of level-appropriate catalog monsters at `level`, × CPU_STAT_MULT. */
export function referenceCpuHpAtLevel(level) {
  const lv = Math.max(1, Math.floor(level || 1));
  const allowed = new Set(getAllowedCpuRarities(lv));
  const pool = MONSTER_CATALOG.filter((m) => m?.id && allowed.has(m.rarity));
  if (!pool.length) return 100;

  const hps = pool
    .map((m) => computeBattleStats(m.id, lv)?.stats?.hp ?? 0)
    .filter((hp) => hp > 0)
    .sort((a, b) => a - b);
  if (!hps.length) return 100;

  const mid = hps[Math.floor(hps.length / 2)];
  return Math.max(1, Math.round(mid * CPU_STAT_MULT));
}

/**
 * @param {{ level?: number, stats?: { hp?: number } }} boss
 * @returns {{ totalExp: number, sharePerMember: number, cpuReferenceHp: number, bossHp: number, hpRatio: number }}
 */
export function computeDungeonTeamExp(boss) {
  const level = boss?.level ?? 60;
  const bossHp = Math.max(1, Math.floor(boss?.stats?.hp ?? 1));
  const cpuHp = referenceCpuHpAtLevel(level);
  const cpuWinExp = expWinForEnemyLevel(level);
  const hpRatio = bossHp / cpuHp;
  const scaledPool = Math.floor(cpuWinExp * hpRatio * DUNGEON_EXP_REWARD_SCALE);
  const totalExp = Math.max(cpuWinExp, scaledPool);
  const sharePerMember = Math.max(1, Math.floor(totalExp / TEAM_SIZE));

  return {
    totalExp,
    sharePerMember,
    cpuReferenceHp: cpuHp,
    bossHp,
    hpRatio,
  };
}

/** Pet share matches monster payout after the global EXP multiplier. */
export function dungeonPetExpForShare(sharePerMember) {
  return Math.max(1, scaleExpGain(Math.max(1, Math.floor(sharePerMember || 0))));
}
