/**
 * Print dungeon EXP per monster/pet for each boss.
 * Run: npx --yes tsx scripts/dungeon-exp-audit.mjs
 */
import { scaleExpGain } from '../src/gameBalance/rewards.js';
import { expWinForEnemyLevel } from '../utils/expLevel.js';
import { computeBattleStats } from '../utils/statsCalc.js';
import { MONSTER_CATALOG } from '../utils/monsterTemplates.js';
import { getAllowedCpuRarities } from '../utils/fighterFromOwned.js';

const CPU_STAT_MULT = 0.9;
const TEAM_SIZE = 3;
const DUNGEON_EXP_REWARD_SCALE = 1 / 3;

function referenceCpuHpAtLevel(level) {
  const lv = Math.max(1, Math.floor(level || 1));
  const allowed = new Set(getAllowedCpuRarities(lv));
  const pool = MONSTER_CATALOG.filter((m) => m?.id && allowed.has(m.rarity));
  const hps = pool
    .map((m) => computeBattleStats(m.id, lv)?.stats?.hp ?? 0)
    .filter((hp) => hp > 0)
    .sort((a, b) => a - b);
  const mid = hps[Math.floor(hps.length / 2)] ?? 100;
  return Math.max(1, Math.round(mid * CPU_STAT_MULT));
}

function computeDungeonTeamExp(boss) {
  const level = boss?.level ?? 60;
  const bossHp = Math.max(1, Math.floor(boss?.stats?.hp ?? 1));
  const cpuHp = referenceCpuHpAtLevel(level);
  const cpuWinExp = expWinForEnemyLevel(level);
  const hpRatio = bossHp / cpuHp;
  const scaledPool = Math.floor(cpuWinExp * hpRatio * DUNGEON_EXP_REWARD_SCALE);
  const totalExp = Math.max(cpuWinExp, scaledPool);
  const sharePerMember = Math.max(1, Math.floor(totalExp / TEAM_SIZE));
  return { totalExp, sharePerMember, cpuReferenceHp: cpuHp, bossHp, hpRatio };
}

const BOSSES = [
  { name: 'Death Knight', level: 60, stats: { hp: 144000 } },
  { name: 'Ice Queen', level: 80, stats: { hp: 176000 } },
  { name: 'Black Dragon', level: 100, stats: { hp: 186000 } },
];

console.log('Dungeon EXP — each of 3 team monsters (and each equipped pet)\n');

for (const boss of BOSSES) {
  const cpuWin = scaleExpGain(expWinForEnemyLevel(boss.level));
  const { totalExp, sharePerMember, cpuReferenceHp, hpRatio } = computeDungeonTeamExp(boss);
  const perMonster = scaleExpGain(sharePerMember);
  const perPet = scaleExpGain(sharePerMember);

  console.log(`${boss.name} (Lv ${boss.level})`);
  console.log(`  Reference CPU HP at this level: ${cpuReferenceHp.toLocaleString()}`);
  console.log(`  Boss HP: ${boss.stats.hp.toLocaleString()} (${hpRatio.toFixed(1)}× tougher than CPU)`);
  console.log(`  1v CPU win (single monster): ${cpuWin.toLocaleString()} EXP`);
  console.log(`  Each dungeon monster: ${perMonster.toLocaleString()} EXP`);
  console.log(`  Each equipped pet: ${perPet.toLocaleString()} EXP`);
  console.log(`  (Team total monster EXP: ${(perMonster * 3).toLocaleString()} · raw pool before ×3: ${totalExp.toLocaleString()})`);
  console.log('');
}
