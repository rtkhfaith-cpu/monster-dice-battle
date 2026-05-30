/** Edge cases for buy/register/merge. Run with the rn-stub loader. */
async function main() {
  const gs = await import('../utils/gameStorage.js');
  const { MONSTER_CATALOG } = await import('../utils/monsterTemplates.js');
  const shop = await import('../src/gameBalance/shop.js');
  const integrity = await import('../utils/profileIntegrity.js');
  const { MERGE_COST_TO_NEXT } = await import('../utils/mergeSystem.js');

  let failures = 0;
  const check = (cond, msg) => { if (!cond) { console.error('  FAIL:', msg); failures++; } else { console.log('  ok:', msg); } };

  const buyable = MONSTER_CATALOG.find((m) => typeof shop.monsterShopPrice(m) === 'number');
  const price = shop.monsterShopPrice(buyable);

  function freshGd(coins) {
    const gd = gs.getDefaultGameData();
    gd.players = [{ id: 'p1', name: 'T', coins, ownedMonsters: [], gearInventory: [], gemInventory: [] }];
    gd.session = { activeProfileId: 'p1' };
    return gd;
  }

  // ---- Edge 1: buy at the monster cap ----
  console.log('\n[Edge 1] Buy at PROFILE_MONSTER_CAP');
  {
    let gd = freshGd(price * 200);
    const cap = integrity.PROFILE_MONSTER_CAP;
    // Fill to cap with distinct-ish instances of the buyable species.
    for (let i = 0; i < cap; i++) {
      const r = gs.buyMonster(gd, 'p1', buyable.id);
      gd = r.gameData;
    }
    check(gd.players[0].ownedMonsters.length === cap, `filled to cap ${cap}`);
    const coinsBefore = gd.players[0].coins;
    const r = gs.buyMonster(gd, 'p1', buyable.id);
    console.log(`  buy-at-cap error=${JSON.stringify(r.error)} coinsBefore=${coinsBefore} coinsAfter=${r.gameData.players[0].coins} owned=${r.gameData.players[0].ownedMonsters.length}`);
    check(!!r.error, 'buying at cap should return an error');
    check(r.gameData.players[0].coins === coinsBefore, 'buying at cap should NOT deduct coins');
    check(r.gameData.players[0].ownedMonsters.length === cap, 'buying at cap should NOT add a monster');
  }

  // ---- Edge 2: higher-tier merges (need 2 for +2) ----
  console.log('\n[Edge 2] Merge to +2 (needs 1 then 2 copies)');
  {
    let gd = freshGd(price * 50);
    // +1 needs MERGE_COST_TO_NEXT[0]=1, +2 needs MERGE_COST_TO_NEXT[1]=2 => total instances to reach +2 = 1 + 1 + 2 = 4
    const total = 1 + MERGE_COST_TO_NEXT[0] + MERGE_COST_TO_NEXT[1];
    for (let i = 0; i < total; i++) gd = gs.buyMonster(gd, 'p1', buyable.id).gameData;
    check(gd.players[0].ownedMonsters.length === total, `bought ${total} copies`);
    let primaryId = gd.players[0].ownedMonsters[0].id;
    let m = gs.mergeOwnedMonsters(gd, 'p1', primaryId);
    check(!m.error && m.mergeTier === 1, `first merge -> +1 (err=${m.error})`);
    gd = m.gameData;
    primaryId = m.survivorId;
    m = gs.mergeOwnedMonsters(gd, 'p1', primaryId);
    check(!m.error && m.mergeTier === 2, `second merge -> +2 (err=${m.error})`);
    gd = m.gameData;
    check(gd.players[0].ownedMonsters.length === 1, 'one survivor remains at +2');
  }

  // ---- Edge 3: merge consumes the currently-selected monster ----
  console.log('\n[Edge 3] Merge updates selectedMonsterId to survivor');
  {
    let gd = freshGd(price * 10);
    gd = gs.buyMonster(gd, 'p1', buyable.id).gameData;
    gd = gs.buyMonster(gd, 'p1', buyable.id).gameData;
    const roster = gd.players[0].ownedMonsters;
    // Select the weaker duplicate (the one likely consumed).
    gd.players[0].selectedMonsterId = roster[1].id;
    const m = gs.mergeOwnedMonsters(gd, 'p1', roster[0].id);
    check(!m.error, `merge ok (err=${m.error})`);
    const sel = m.gameData.players[0].selectedMonsterId;
    const exists = m.gameData.players[0].ownedMonsters.some((x) => x.id === sel);
    check(exists, `selectedMonsterId points to an existing monster (${sel})`);
  }

  // ---- Edge 4: merge with not enough copies errors cleanly ----
  console.log('\n[Edge 4] Merge with no duplicates errors, no mutation');
  {
    let gd = freshGd(price * 10);
    gd = gs.buyMonster(gd, 'p1', buyable.id).gameData;
    const id = gd.players[0].ownedMonsters[0].id;
    const m = gs.mergeOwnedMonsters(gd, 'p1', id);
    check(!!m.error, `errored as expected: ${m.error}`);
    check(m.gameData.players[0].ownedMonsters.length === 1, 'roster unchanged');
    check((m.gameData.players[0].ownedMonsters[0].mergeTier ?? 0) === 0, 'tier unchanged');
  }

  console.log(failures === 0 ? '\nALL EDGE CASES PASS' : `\n${failures} EDGE CASE FAILURE(S)`);
  process.exit(failures === 0 ? 0 : 1);
}
main().catch((e) => { console.error('ERROR:', e?.stack || e); process.exit(1); });
