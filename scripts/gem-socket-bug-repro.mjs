/**
 * Gem system regression: per-(type,level) inventory, forge-by-level, merge fuel,
 * and legacy save migration.
 * Run: npx tsx scripts/gem-socket-bug-repro.mjs
 */
async function main() {
  const gem = await import('../src/gameSystems/gems/gemInventory.js');
  const defs = await import('../src/gameSystems/gems/gemDefinitions.js');
  const {
    grantGem,
    socketGemInGear,
    ensureGemInventory,
    normalizeSocketedGem,
    listSocketedGems,
    listSocketableGemStacks,
    listGemStacks,
    upgradeGem,
  } = gem;
  const { gemStackId, getRequiredGemsForUpgrade } = defs;

  const fail = (m) => { console.error('FAIL:', m); process.exit(1); };
  const epicGear = (instanceId) => ({
    instanceId,
    gearId: 'epic_dragon_guard_helm', // real epic template (1 socket)
    rarity: 'epic',
    stats: [{ type: 'magicAttack', value: 10 }],
    sockets: [{ id: 'socket_1', gem: null }],
    equippedToMonsterId: null,
    acquiredAt: new Date().toISOString(),
  });
  const countAt = (profile, key, level) =>
    (profile.gemInventory || []).find((g) => g.key === key && g.level === level)?.count ?? 0;

  // ---- 1) Socket consumes the gem and lands in the LIVE socket ----
  const profile = { id: 'repro', coins: 999999, ownedMonsters: [], gemInventory: [], gearInventory: [epicGear('gear_epic_1')] };
  ensureGemInventory(profile);
  if (!grantGem(profile, 'epic', 'magicAttack', 1).ok) fail('grant failed');
  const res = socketGemInGear(profile, 'gear_epic_1', 0, gemStackId('epic', 'magicAttack', 1));
  if (!res.ok) fail(`socket returned error: ${res.error}`);
  const liveSocketGem = normalizeSocketedGem(profile.gearInventory[0]?.sockets?.[0]?.gem);
  if (!liveSocketGem?.key) fail('BUG: gem consumed but NOT in the live gear socket');
  if (countAt(profile, 'epic_magicAttack_gem', 1) !== 0) fail('gem should have left the stash after socketing');
  if (listSocketedGems(profile).length !== 1) fail('expected exactly 1 socketed gem');
  console.log('PASS: gem forged into the LIVE socket and removed from stash');

  // ---- 2) Upgrade ONE gem by (type,level); fuel consumed; result is one level higher ----
  const prof2 = { id: 'up', coins: 0, ownedMonsters: [], gemInventory: [], gearInventory: [] };
  ensureGemInventory(prof2);
  const need1 = getRequiredGemsForUpgrade(1); // base→Lv2 fuel
  grantGem(prof2, 'rare', 'attack', 1 + need1); // 1 base + need1 fuel, all Lv1
  const up = upgradeGem(prof2, gemStackId('rare', 'attack', 1));
  if (!up.ok) fail(`upgrade returned error: ${up.error}`);
  if (countAt(prof2, 'rare_attack_gem', 2) !== 1) fail('BUG: upgraded gem (Lv2) not present');
  if (countAt(prof2, 'rare_attack_gem', 1) !== 0) fail('BUG: base + fuel Lv1 gems not consumed');
  console.log('PASS: upgrade produces one Lv2 gem and consumes base + fuel');

  // ---- 3) FORGE-BY-LEVEL: own Lv1 and Lv5 of same type; forge each independently ----
  const prof3 = { id: 'pick', coins: 999999, ownedMonsters: [], gemInventory: [], gearInventory: [epicGear('gA'), epicGear('gB')] };
  // Seed inventory directly with two different levels of the same type.
  prof3.gemInventory = [
    { key: 'rare_magicAttack_gem', rarity: 'rare', stat: 'magicAttack', level: 1, count: 3 },
    { key: 'rare_magicAttack_gem', rarity: 'rare', stat: 'magicAttack', level: 5, count: 1 },
  ];
  ensureGemInventory(prof3);
  const ids = listSocketableGemStacks(prof3).map((g) => g.id).sort();
  console.log('forge list ids:', ids);
  if (!ids.includes(gemStackId('rare', 'magicAttack', 1)) || !ids.includes(gemStackId('rare', 'magicAttack', 5))) {
    fail('BUG: both Lv1 and Lv5 rows must be selectable in the forge list');
  }
  // Forge the Lv5 specifically; the Lv5 must be consumed and the Lv1 untouched.
  const forge5 = socketGemInGear(prof3, 'gA', 0, gemStackId('rare', 'magicAttack', 5));
  if (!forge5.ok) fail(`forge Lv5 failed: ${forge5.error}`);
  if (normalizeSocketedGem(prof3.gearInventory.find((g) => g.instanceId === 'gA').sockets[0].gem)?.level !== 5) {
    fail('BUG: Lv5 gem was not the one forged');
  }
  if (countAt(prof3, 'rare_magicAttack_gem', 5) !== 0) fail('Lv5 gem should be consumed');
  if (countAt(prof3, 'rare_magicAttack_gem', 1) !== 3) fail('Lv1 gems must be untouched when forging Lv5');
  console.log('PASS: player can select and forge a specific level (Lv5) while keeping Lv1s');

  // ---- 4) MERGE FUEL drawn from LOWEST level first (never burns high-level gems) ----
  const prof4 = { id: 'fuel', coins: 0, ownedMonsters: [], gemInventory: [], gearInventory: [] };
  // Upgrade a Lv2 gem (needs getRequiredGemsForUpgrade(2) fuel). Provide plenty of Lv1
  // plus a spare Lv3 that must NOT be consumed.
  const need2 = getRequiredGemsForUpgrade(2);
  prof4.gemInventory = [
    { key: 'epic_attack_gem', rarity: 'epic', stat: 'attack', level: 2, count: 1 },
    { key: 'epic_attack_gem', rarity: 'epic', stat: 'attack', level: 1, count: need2 + 2 },
    { key: 'epic_attack_gem', rarity: 'epic', stat: 'attack', level: 3, count: 1 },
  ];
  ensureGemInventory(prof4);
  const up2 = upgradeGem(prof4, gemStackId('epic', 'attack', 2));
  if (!up2.ok) fail(`fuel upgrade failed: ${up2.error}`);
  if (countAt(prof4, 'epic_attack_gem', 3) !== 2) fail('BUG: expected the new Lv3 plus the untouched spare Lv3');
  if (countAt(prof4, 'epic_attack_gem', 1) !== 2) fail(`BUG: fuel not drawn from Lv1 first (left ${countAt(prof4, 'epic_attack_gem', 1)})`);
  if (countAt(prof4, 'epic_attack_gem', 2) !== 0) fail('base Lv2 should be consumed');
  console.log('PASS: merge fuel is drawn lowest-level first and spares high-level gems');

  // ---- 5) LEGACY MIGRATION: old {level, copies} → leveled gem + Lv1 spares ----
  const prof5 = { id: 'legacy', coins: 0, ownedMonsters: [], gearInventory: [], gemInventory: [
    { key: 'rare_attack_gem', rarity: 'rare', stat: 'attack', level: 5, copies: 3 },
  ] };
  ensureGemInventory(prof5);
  if (countAt(prof5, 'rare_attack_gem', 5) !== 1) fail('BUG: legacy leveled gem lost on migration');
  if (countAt(prof5, 'rare_attack_gem', 1) !== 3) fail('BUG: legacy copies should become 3 Lv1 gems');
  console.log('PASS: legacy {level,copies} migrates to leveled gem + Lv1 spares (no loss)');

  console.log('\nALL GEM REGRESSION CHECKS PASSED');
}

main().catch((e) => { console.error('ERROR:', e); process.exit(1); });
