#!/usr/bin/env node
/**
 * CLI for dungeon boss balance testing.
 *
 * Usage:
 *   npm run sim:dungeons
 *   npm run sim:dungeons -- --runs=10
 *   npm run sim:dungeons -- --boss=ice_queen
 *   npm run sim:dungeons -- --json
 */
import { runDungeonSimulations } from './runSimulations.js';
import { ALL_BOSSES } from './config.js';

function parseArgs(argv) {
  const opts = { bosses: [...ALL_BOSSES], runsPerBoss: 5, json: false };
  for (const arg of argv) {
    if (arg === '--json') opts.json = true;
    else if (arg.startsWith('--runs=')) opts.runsPerBoss = Math.max(1, Number(arg.slice(7)) || 5);
    else if (arg.startsWith('--boss=')) {
      const id = arg.slice(7);
      if (!ALL_BOSSES.includes(id)) {
        console.error(`Unknown boss "${id}". Use: ${ALL_BOSSES.join(', ')}`);
        process.exit(1);
      }
      opts.bosses = [id];
    } else if (arg === '--help' || arg === '-h') {
      console.log(`Dungeon boss simulator

Options:
  --runs=N       Battles per boss (default 5)
  --boss=ID      death_knight | ice_queen | black_dragon (default: all)
  --json         Print machine-readable JSON
  --help         Show this help
`);
      process.exit(0);
    }
  }
  return opts;
}

function printHumanReport(report) {
  console.log('=== Dungeon battle simulation ===');
  console.log('Team: Lv100 mythics | Lv60 mythic pets | full epic gear | 3 epic passives each');
  for (const spec of report.teamSpec) {
    console.log(`  P${spec.position}: ${spec.templateId} + ${spec.setId} + ${spec.petId}`);
  }
  console.log(`  Roles: ${report.teamRoles.map((r) => `P${r.position}=${r.role}`).join(', ')}`);
  console.log(`  Team power: ${report.teamPower.toLocaleString()}`);
  console.log(`  ${report.note}\n`);

  for (const block of report.results) {
    console.log(`--- ${block.bossName} (recommended ${block.recommendedPower.toLocaleString()}) ---`);
    block.runs.forEach((r, i) => {
      const survivors = r.survivorHp.map((s) => `${s.name}:${s.hp}`).join(', ');
      console.log(
        `  Run ${i + 1}: ${r.result === 'win' ? 'WIN' : r.timedOut ? 'TIMEOUT' : 'LOSE'} | ${r.rounds} rounds | boss HP left ${r.bossHpPct}% | survivors ${r.survivors}${survivors ? ` (${survivors})` : ''}`,
      );
    });
    console.log(`  Summary: ${block.wins}W / ${block.losses}L | avg ${block.avgRounds} rounds\n`);
  }
}

const cliOpts = parseArgs(process.argv.slice(2));
const report = runDungeonSimulations({
  bosses: cliOpts.bosses,
  runsPerBoss: cliOpts.runsPerBoss,
});

if (cliOpts.json) {
  console.log(JSON.stringify(report, null, 2));
} else {
  printHumanReport(report);
}
