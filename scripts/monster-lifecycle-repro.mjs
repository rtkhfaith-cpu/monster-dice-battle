/**
 * Exercise buy -> register/normalize -> merge end to end against real gameStorage.
 * Run: npx tsx scripts/monster-lifecycle-repro.mjs
 */
async function main() {
  const gs = await import('../utils/gameStorage.js');
  const { MONSTER_CATALOG } = await import('../utils/monsterTemplates.js');
  const shop = await import('../src/gameBalance/shop.js');

  const fail = (m) => { console.error('FAIL:', m); process.exit(1); };

  // Find a normally purchasable monster.
  const buyable = MONSTER_CATALOG.find((m) => typeof shop.monsterShopPrice(m) === 'number');
  if (!buyable) fail('no purchasable monster found');
  const price = shop.monsterShopPrice(buyable);
  console.log('Buying:', buyable.id, '@', price);

  // Minimal game data with one player profile.
  let gd = gs.getDefaultGameData();
  gd.players = [{
    id: 'p1',
    name: 'Tester',
    coins: price * 10,
    ownedMonsters: [],
    gearInventory: [],
    gemInventory: [],
  }];
  gd.session = { activeProfileId: 'p1' };

  // --- Purchase #1 (new species) ---
  let res = gs.buyMonster(gd, 'p1', buyable.id);
  if (res.error) fail(`buy1 error: ${res.error}`);
  gd = res.gameData;
  console.log('after buy1:', { duplicate: res.duplicate, ownedCount: res.ownedCount, coins: gd.players[0].coins });
  if (res.duplicate !== false) fail('buy1 should not be a duplicate');
  if (gd.players[0].ownedMonsters.length !== 1) fail('buy1 should add 1 instance');

  // --- Purchase #2 (duplicate) ---
  res = gs.buyMonster(gd, 'p1', buyable.id);
  if (res.error) fail(`buy2 error: ${res.error}`);
  gd = res.gameData;
  console.log('after buy2:', { duplicate: res.duplicate, ownedCount: res.ownedCount });
  if (res.duplicate !== true) fail('buy2 should be a duplicate');
  if (gd.players[0].ownedMonsters.length !== 2) fail('buy2 should add a 2nd instance');

  // --- Simulate register/normalize via save/load round-trip ---
  const reloaded = JSON.parse(JSON.stringify(gd));
  if (typeof gs.repairPlayerProfileInventory === 'function') {
    gs.repairPlayerProfileInventory(reloaded.players[0]);
  }
  const countAfterReload = reloaded.players[0].ownedMonsters.length;
  console.log('owned after reload/normalize:', countAfterReload);
  if (countAfterReload !== 2) fail(`duplicate lost on normalize (have ${countAfterReload}, expected 2)`);

  // --- Merge (+1 needs 1 duplicate) ---
  const roster = reloaded.players[0].ownedMonsters;
  const primaryId = roster[0].id;
  const mres = gs.mergeOwnedMonsters(reloaded, 'p1', primaryId);
  if (mres.error) fail(`merge error: ${mres.error}`);
  console.log('merge result:', { mergeTier: mres.mergeTier, consumed: mres.consumed, survivorId: mres.survivorId, ownedCount: mres.ownedCount });
  const afterMerge = mres.gameData.players[0].ownedMonsters;
  if (afterMerge.length !== 1) fail(`merge should leave 1 instance (have ${afterMerge.length})`);
  const survivor = afterMerge.find((m) => m.id === mres.survivorId);
  if (!survivor) fail('survivor not found after merge');
  if ((survivor.mergeTier ?? 0) !== 1) fail(`survivor mergeTier should be 1 (got ${survivor.mergeTier})`);

  // --- Verify merge persists through another normalize ---
  const reloaded2 = JSON.parse(JSON.stringify(mres.gameData));
  if (typeof gs.repairPlayerProfileInventory === 'function') {
    gs.repairPlayerProfileInventory(reloaded2.players[0]);
  }
  const survivor2 = reloaded2.players[0].ownedMonsters.find((m) => m.id === mres.survivorId);
  if (!survivor2) fail('survivor lost after post-merge normalize');
  if ((survivor2.mergeTier ?? 0) !== 1) fail(`mergeTier not persisted (got ${survivor2.mergeTier})`);

  console.log('PASS: buy (x2 dup) -> normalize -> merge +1 -> persists');
}

main().catch((e) => { console.error('ERROR:', e?.stack || e); process.exit(1); });
