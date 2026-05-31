/**
 * Verify every gem stat uses linear scaling (base × level) everywhere.
 * Run: npx tsx scripts/gem-scaling-audit.mjs
 */
async function main() {
  const defs = await import('../src/gameSystems/gems/gemDefinitions.js');
  const gem = await import('../src/gameSystems/gems/gemInventory.js');
  const {
    GEM_STATS,
    GEM_RARITIES,
    GEM_MAX_LEVEL,
    gemBaseValue,
    gemStatValue,
  } = defs;
  const { listGemStacks, sumGearSocketGemStats, ensureGemInventory } = gem;

  const fail = (m) => { console.error('FAIL:', m); process.exit(1); };

  /** Old HP compound curve — should NOT match anymore for level > 1. */
  const oldCompound = (base, level) =>
    Math.round(base * Math.pow(1.1, Math.max(1, Math.floor(level)) - 1));

  let checked = 0;

  for (const rarity of GEM_RARITIES) {
    for (const stat of GEM_STATS) {
      const base = gemBaseValue(rarity, stat);
      for (let level = 1; level <= GEM_MAX_LEVEL; level++) {
        checked += 1;
        const expected = base * level;
        const actual = gemStatValue(rarity, stat, level);

        if (actual !== expected) {
          fail(`${rarity} ${stat} L${level}: got ${actual}, expected linear ${expected}`);
        }

        if (level > 1 && stat === 'hp' && actual === oldCompound(base, level)) {
          fail(`${rarity} hp L${level}: still using old 10% compound (${actual})`);
        }

        if (level > 1) {
          const prev = gemStatValue(rarity, stat, level - 1);
          const step = actual - prev;
          if (step !== base) {
            fail(`${rarity} ${stat} L${level}: step ${step} ≠ base ${base} (not linear per level)`);
          }
        }
      }
    }
  }

  // Merge UI path (listGemStacks) must match gemStatValue
  const profile = { id: 'audit', coins: 0, ownedMonsters: [], gearInventory: [], gemInventory: [] };
  for (const stat of GEM_STATS) {
    profile.gemInventory.push({
      key: `${'rare'}_${stat}_gem`,
      rarity: 'rare',
      stat,
      level: 3,
      count: 1,
    });
  }
  ensureGemInventory(profile);
  for (const row of listGemStacks(profile)) {
    const want = gemStatValue(row.rarity, row.stat, row.level);
    const wantNext = gemStatValue(row.rarity, row.stat, row.level + 1);
    if (row.currentValue !== want) {
      fail(`listGemStacks currentValue mismatch for ${row.stat}: ${row.currentValue} vs ${want}`);
    }
    if (row.nextValue !== wantNext) {
      fail(`listGemStacks nextValue mismatch for ${row.stat}: ${row.nextValue} vs ${wantNext}`);
    }
  }

  // Battle aggregation path
  const gear = {
    instanceId: 'g1',
    name: 'Test Helm',
    sockets: GEM_STATS.map((stat, i) => ({
      id: `s${i}`,
      gem: { key: `mythic_${stat}_gem`, rarity: 'mythic', stat, level: 5 },
    })),
  };
  const flat = sumGearSocketGemStats([gear]);
  for (const stat of GEM_STATS) {
    const want = gemStatValue('mythic', stat, 5);
    if (flat[stat] !== want) {
      fail(`sumGearSocketGemStats ${stat}: ${flat[stat]} vs ${want}`);
    }
  }

  console.log(`PASS: ${checked} gem level checks — all ${GEM_STATS.length} stats × ${GEM_RARITIES.length} rarities × L1–L${GEM_MAX_LEVEL} use linear base×level`);
  console.log('PASS: listGemStacks merge preview matches gemStatValue');
  console.log('PASS: sumGearSocketGemStats battle path matches gemStatValue');
  console.log('\nGEM SCALING AUDIT PASSED');
}

main().catch((e) => { console.error('ERROR:', e); process.exit(1); });
