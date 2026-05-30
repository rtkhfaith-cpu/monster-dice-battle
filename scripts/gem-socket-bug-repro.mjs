/**
 * Repro for: gem consumed but not forged into the gear socket.
 * Run: npx tsx scripts/gem-socket-bug-repro.mjs
 */
async function main() {
  // Dynamic import resolves the whole module graph first (avoids ESM static-cycle issues under tsx).
  const gem = await import('../src/gameSystems/gems/gemInventory.js');
  const { grantGem, socketGemInGear, ensureGemInventory, normalizeSocketedGem, listSocketedGems } = gem;

  const fail = (m) => { console.error('FAIL:', m); process.exit(1); };

  const profile = {
    id: 'repro',
    coins: 999999,
    ownedMonsters: [],
    gemInventory: [],
    gearInventory: [
      {
        instanceId: 'gear_epic_1',
        gearId: 'epic_dragon_guard_helm', // real epic template (1 socket)
        rarity: 'epic',
        stats: [{ type: 'magicAttack', value: 10 }],
        sockets: [{ id: 'socket_1', gem: null }],
        equippedToMonsterId: null,
        acquiredAt: new Date().toISOString(),
      },
    ],
  };

  ensureGemInventory(profile);

  // Grant an epic magic gem, then socket it.
  if (!grantGem(profile, 'epic', 'magicAttack', 1).ok) fail('grant failed');
  const res = socketGemInGear(profile, 'gear_epic_1', 0, 'epic_magicAttack_gem');
  if (!res.ok) fail(`socket returned error: ${res.error}`);

  // The bug: gem removed from inventory, but the LIVE gear socket stays empty.
  const liveGear = profile.gearInventory.find((g) => g.instanceId === 'gear_epic_1');
  const liveSocketGem = normalizeSocketedGem(liveGear?.sockets?.[0]?.gem);
  const stillInStash = (profile.gemInventory || []).some((s) => s.key === 'epic_magicAttack_gem');

  console.log('live socket gem:', liveSocketGem?.key ?? null);
  console.log('still in stash :', stillInStash);
  console.log('listSocketedGems count:', listSocketedGems(profile).length);

  if (!liveSocketGem?.key) fail('BUG PRESENT: gem consumed but NOT in the live gear socket');
  if (stillInStash) fail('gem should have left the stash after socketing');
  if (listSocketedGems(profile).length !== 1) fail('expected exactly 1 socketed gem');

  console.log('PASS: gem is forged into the LIVE gear socket and removed from stash');

  // ---- upgradeGem (gem merge) live-reference check ----
  const { upgradeGem } = gem;
  const { getRequiredGemsForUpgrade } = await import('../src/gameSystems/gems/gemDefinitions.js');
  const prof2 = { id: 'up', coins: 0, ownedMonsters: [], gemInventory: [], gearInventory: [] };
  ensureGemInventory(prof2);
  const need = getRequiredGemsForUpgrade(1);
  grantGem(prof2, 'rare', 'attack', 1 + need); // 1 owned + `need` duplicates
  const up = upgradeGem(prof2, 'rare_attack_gem');
  if (!up.ok) fail(`upgrade returned error: ${up.error}`);
  const liveStack = prof2.gemInventory.find((s) => s.key === 'rare_attack_gem');
  console.log('upgraded stack level:', liveStack?.level, 'copies:', liveStack?.copies);
  if (liveStack?.level !== 2) fail('BUG PRESENT: upgrade did not persist to the LIVE gem stack');
  console.log('PASS: gem upgrade persists to the LIVE gem stack');

  // ---- upgrade an inventory gem while a same-type gem is socketed ----
  // Player keeps one rare magic gem forged into gear AND upgrades another of the
  // same rarity+stat sitting in inventory. The socketed gem must keep its own level.
  const prof3 = {
    id: 'multi',
    coins: 0,
    ownedMonsters: [],
    gemInventory: [],
    gearInventory: [
      {
        instanceId: 'gear_epic_2',
        gearId: 'epic_dragon_guard_helm',
        rarity: 'epic',
        stats: [{ type: 'magicAttack', value: 10 }],
        sockets: [{ id: 'socket_1', gem: null }],
        equippedToMonsterId: null,
        acquiredAt: new Date().toISOString(),
      },
    ],
  };
  ensureGemInventory(prof3);
  const need1 = getRequiredGemsForUpgrade(1);
  // Own 2 base gems + enough duplicates: one will be socketed, the other upgraded.
  grantGem(prof3, 'rare', 'magicAttack', 2 + need1);
  const socketRes = socketGemInGear(prof3, 'gear_epic_2', 0, 'rare_magicAttack_gem');
  if (!socketRes.ok) fail(`socket (multi) failed: ${socketRes.error}`);
  const socketedLevelBefore = normalizeSocketedGem(
    prof3.gearInventory[0].sockets[0].gem,
  )?.level;

  const upMulti = upgradeGem(prof3, 'rare_magicAttack_gem');
  if (!upMulti.ok) fail(`BUG PRESENT: upgrade blocked while same-type gem socketed: ${upMulti.error}`);

  const invStack = prof3.gemInventory.find((s) => s.key === 'rare_magicAttack_gem');
  const socketedLevelAfter = normalizeSocketedGem(
    prof3.gearInventory[0].sockets[0].gem,
  )?.level;
  console.log('multi: inv level', invStack?.level, '| socketed level', socketedLevelAfter);
  if (invStack?.level !== 2) fail('inventory gem should have upgraded to level 2');
  if (socketedLevelAfter !== socketedLevelBefore) fail('socketed gem level must NOT change on inventory upgrade');
  if (listSocketedGems(prof3).length !== 1) fail('socketed gem must remain forged in gear');
  console.log('PASS: upgraded an inventory gem while same-type gem stays forged in gear');
}

main().catch((e) => { console.error('ERROR:', e); process.exit(1); });
