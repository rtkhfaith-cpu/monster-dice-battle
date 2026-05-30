/**
 * Replicates MonsterSelectorRow's merge-info computation against a roster with
 * same-species duplicates, using the real util functions. Confirms whether the
 * merge button condition (canMerge) becomes true.
 * Run: npx tsx scripts/monster-merge-ui-repro.mjs
 */
async function main() {
  const roster = await import('../utils/rosterInventory.js');
  const merge = await import('../utils/mergeSystem.js');
  const { getBattleRoster, rosterInstancesForTemplate } = roster;
  const { clampMergeTier, mergeCostForNextTier, MAX_MERGE_TIER, pickPrimaryInstance } = merge;

  const fail = (m) => { console.error('FAIL:', m); process.exit(1); };

  // Two copies of species A (tier 0) + one species B.
  const ownedMonsters = [
    { id: 'a1', templateId: 'bubble_tea_slime', level: 5, mergeTier: 0 },
    { id: 'a2', templateId: 'bubble_tea_slime', level: 3, mergeTier: 0 },
    { id: 'b1', templateId: 'cockroachsaurus', level: 7, mergeTier: 0 },
  ];

  const selectorMonsters = getBattleRoster({ ownedMonsters });
  console.log('chips (one per species):', selectorMonsters.map((m) => m.templateId));

  // Replicate mergeInfoBySpecies from MonsterSelectorRow.
  const mergeInfoBySpecies = new Map();
  for (const m of selectorMonsters) {
    const speciesInstances = rosterInstancesForTemplate(ownedMonsters, m.templateId);
    const primary = pickPrimaryInstance(speciesInstances) ?? m;
    const mergeTier = clampMergeTier(primary.mergeTier);
    const nextCost = mergeCostForNextTier(mergeTier);
    const extras = Math.max(0, speciesInstances.length - 1);
    mergeInfoBySpecies.set(m.templateId, {
      primaryId: primary.id,
      mergeTier,
      nextCost,
      extras,
      canMerge: nextCost != null && extras >= nextCost,
      isMax: mergeTier >= MAX_MERGE_TIER,
    });
  }

  for (const [tpl, info] of mergeInfoBySpecies) {
    console.log(`${tpl}: extras=${info.extras} nextCost=${info.nextCost} canMerge=${info.canMerge}`);
  }

  const a = mergeInfoBySpecies.get('bubble_tea_slime');
  if (!a) fail('no merge info for the duplicated species');
  if (!a.canMerge) fail('BUG: duplicated species should be mergeable (extras=1, cost=1)');
  console.log('PASS: duplicated species reports canMerge=true → merge button should show');
}

main().catch((e) => { console.error('ERROR:', e); process.exit(1); });
