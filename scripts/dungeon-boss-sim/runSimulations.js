/**
 * Run dungeon boss battle simulations against the pure battle engine.
 */
import { createDungeonBattle, advanceDungeonStep } from '../../utils/dungeon/dungeonBattleEngine.js';
import { getDungeonBoss } from '../../utils/dungeon/dungeonBosses.js';
import { powerScoreFromBundle } from '../../utils/statsCalc.js';
import { buildTestProfile } from './buildTestProfile.js';
import { simFighterFromOwned, dungeonRoleForOwned } from './simFighter.js';
import { ALL_BOSSES, DEFAULT_OPTIONS, DEFAULT_TEAM } from './config.js';

function buildTeamEntries(profile, teamSpec) {
  return teamSpec.map((spec) => {
    const owned = profile.ownedMonsters.find((m) => m.id === spec.id);
    if (!owned) throw new Error(`Missing monster ${spec.id}`);
    return {
      owned,
      fighter: simFighterFromOwned(owned, profile),
      role: dungeonRoleForOwned(owned),
      position: spec.position,
    };
  });
}

function estimateTeamPower(profile, teamSpec) {
  return teamSpec.reduce((sum, spec) => {
    const owned = profile.ownedMonsters.find((m) => m.id === spec.id);
    const fighter = simFighterFromOwned(owned, profile);
    return sum + Math.round(powerScoreFromBundle(fighter?.stats));
  }, 0);
}

function runSingleBattle(bossId, profile, teamSpec, maxSteps) {
  const boss = getDungeonBoss(bossId);
  if (!boss) throw new Error(`Unknown boss ${bossId}`);
  const team = buildTeamEntries(profile, teamSpec);
  const state = createDungeonBattle({ boss, team });

  let guard = maxSteps;
  while (state.phase === 'active' && guard-- > 0) {
    advanceDungeonStep(state);
  }

  const alive = state.monsters.filter((m) => m.alive && m.hp > 0);
  return {
    bossId,
    bossName: boss.name,
    result: state.phase,
    rounds: state.turn,
    bossHpPct: Math.round((state.boss.hp / state.boss.maxHp) * 100),
    survivors: alive.length,
    survivorHp: alive.map((m) => ({ name: m.name, hp: Math.round(m.hp), maxHp: m.maxHp })),
    timedOut: guard <= 0 && state.phase === 'active',
  };
}

/**
 * @param {object} [opts]
 * @param {string[]} [opts.bosses]
 * @param {number} [opts.runsPerBoss]
 * @param {number} [opts.maxSteps]
 * @param {typeof DEFAULT_TEAM} [opts.team]
 * @param {object} [opts.profileOpts] - passed to buildTestProfile
 */
export function runDungeonSimulations(opts = {}) {
  const bosses = opts.bosses ?? ALL_BOSSES;
  const runsPerBoss = opts.runsPerBoss ?? DEFAULT_OPTIONS.runsPerBoss;
  const maxSteps = opts.maxSteps ?? DEFAULT_OPTIONS.maxSteps;
  const teamSpec = opts.team ?? DEFAULT_TEAM;

  const profile = buildTestProfile(opts.profileOpts ?? {});
  const teamPower = estimateTeamPower(profile, teamSpec);
  const teamRoles = teamSpec.map((spec) => {
    const owned = profile.ownedMonsters.find((m) => m.id === spec.id);
    return { position: spec.position, role: dungeonRoleForOwned(owned), templateId: spec.templateId };
  });

  const results = [];
  for (const bossId of bosses) {
    const boss = getDungeonBoss(bossId);
    const runs = [];
    for (let i = 0; i < runsPerBoss; i += 1) {
      runs.push(runSingleBattle(bossId, profile, teamSpec, maxSteps));
    }
    const wins = runs.filter((r) => r.result === 'win').length;
    const losses = runs.filter((r) => r.result === 'lose').length;
    const avgRounds = runs.reduce((s, r) => s + r.rounds, 0) / runs.length;
    results.push({
      bossId,
      bossName: boss?.name ?? bossId,
      recommendedPower: boss?.recommendedPower ?? 0,
      wins,
      losses,
      avgRounds: Math.round(avgRounds * 10) / 10,
      runs,
    });
  }

  return {
    teamSpec,
    teamRoles,
    teamPower,
    runsPerBoss,
    note: 'Passive skill books are equipped on monsters but the dungeon engine does not resolve them yet.',
    results,
  };
}
