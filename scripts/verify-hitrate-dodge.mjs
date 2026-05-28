import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import { dodgeChance } from '../src/gameBalance/combat.js';

/**
 * Active model:
 *   finalDodgeChance = clamp(defender.dodge - attacker.hitRate, 0, 60)
 *
 * Mini-boss note:
 *   existing mini-boss dodge multiplier is still applied (0.75),
 *   so with Dodge 35 vs HitRate 12:
 *   base = 23%, mini-boss expected = 17.25%.
 */

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const require = createRequire(import.meta.url);
const serverBattleDamage = require('../server/battleDamage.js');

function lcg(seed = 1337) {
  let s = seed >>> 0;
  return () => {
    s = (1664525 * s + 1013904223) >>> 0;
    return s / 0x100000000;
  };
}

function simulateChance(chancePct, trials = 100000, seed = 1337) {
  const rnd = lcg(seed);
  let hits = 0;
  for (let i = 0; i < trials; i += 1) {
    if (rnd() * 100 < chancePct) hits += 1;
  }
  return (hits / trials) * 100;
}

function pct(n) {
  return `${n.toFixed(3)}%`;
}

function check(cond, label) {
  if (!cond) {
    console.error(`FAIL: ${label}`);
    process.exitCode = 1;
    return false;
  }
  console.log(`PASS: ${label}`);
  return true;
}

function read(relPath) {
  return fs.readFileSync(path.join(rootDir, relPath), 'utf8');
}

const attacker = { stats: { hitRate: 12, agility: 10, speed: 10 } };
const defender = { stats: { dodge: 35, dodgePct: 35, agility: 10, speed: 10 } };

const expectedBase = 23;
const localBase = dodgeChance({
  attackerSpeed: attacker.stats.agility,
  defenderSpeed: defender.stats.agility,
  attackerHitRate: attacker.stats.hitRate,
  defenderDodge: defender.stats.dodge,
  magic: false,
  bossKind: null,
});
const localMiniBoss = dodgeChance({
  attackerSpeed: attacker.stats.agility,
  defenderSpeed: defender.stats.agility,
  attackerHitRate: attacker.stats.hitRate,
  defenderDodge: defender.stats.dodge,
  magic: false,
  bossKind: 'miniBoss',
});
const serverBase = serverBattleDamage._debugDodgeChancePct(attacker, defender, false);

console.log('\n=== Deterministic dodge-rate verification ===');
console.log('Attacker HitRate = 12, Defender Dodge = 35');
console.log(`Expected raw flat dodge chance: ${expectedBase}%`);

const modes = [
  { mode: '1vCPU / BattleScreen', chance: localBase },
  { mode: 'Monster Ladder', chance: localBase },
  { mode: 'Monster Rescue', chance: localBase },
  { mode: 'Monster Quest', chance: localBase },
  { mode: 'Mini-boss battle', chance: localMiniBoss },
  { mode: 'Multiplayer server battleDamage', chance: serverBase },
];

console.log('\nMode | Formula chance | Observed dodge rate (100k deterministic rolls)');
console.log('--- | --- | ---');
for (const row of modes) {
  const observed = simulateChance(row.chance, 100000, 1337);
  console.log(`${row.mode} | ${pct(row.chance)} | ${pct(observed)}`);
}

console.log('\n=== Logic invariants ===');
check(localBase === expectedBase, 'Flat formula gives 23% for 35 dodge vs 12 hitRate');
check(serverBase === expectedBase, 'Server dodge formula matches 23%');

const battleLogicText = read('utils/battleLogic.js');
const passiveResolverText = read('src/gameSystems/passiveResolver.js');
const serverDamageText = read('server/battleDamage.js');
check(!/hitRate[^;\n]*attackHitChance|attackHitChance[\s\S]*hitRate/.test(battleLogicText.match(/function attackHitChance[\s\S]*?\n\}/)?.[0] ?? ''), 'battleLogic attackHitChance does not use hitRate');
check(!/hitRate[^;\n]*attackHitChance|attackHitChance[\s\S]*hitRate/.test(passiveResolverText.match(/function attackHitChance[\s\S]*?\n\}/)?.[0] ?? ''), 'passiveResolver attackHitChance does not use hitRate');
check(!/hitRate[^;\n]*attackHitChance|attackHitChance[\s\S]*hitRate/.test(serverDamageText.match(/function attackHitChance[\s\S]*?\n\}/)?.[0] ?? ''), 'server attackHitChance does not use hitRate');

check(/defenderDodge - \(attackerHitRate \?\? 0\)/.test(read('src/gameBalance/combat.js')), 'Shared combat dodge uses defenderDodge - attackerHitRate');
check(/stats\.dodge\s*=/.test(read('src/gameSystems/gear/battleStatCalculator.js')) && /stats\.hitRate\s*=/.test(read('src/gameSystems/gear/battleStatCalculator.js')), 'Gear Dodge/HitRate are applied into final stats');
check(/applyPetStatBonuses/.test(read('src/gameSystems/gear/battleStatCalculator.js')), 'Pet stat bonuses are merged into final stats');
check(/petCombatModifiers/.test(read('components/gear/equipment/MonsterFinalStatsPanel.js')), 'Pet combat-only modifiers are shown separately in final stats panel');

const statsCalcText = read('utils/statsCalc.js');
check(/dodge:\s*dodgeVal/.test(statsCalcText), 'Normal fighter stats builder writes flat dodge stat');

const fallbackLegacy = dodgeChance({
  attackerSpeed: 10,
  defenderSpeed: 10,
  attackerHitRate: 12,
  defenderDodge: null,
});
check(fallbackLegacy === 3, 'Legacy 3–25 fallback only appears when flat dodge is missing');

console.log('\nDone.');
