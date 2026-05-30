/**
 * Smoke test gem buy + socket flow.
 * Run: npx tsx scripts/gem-socket-smoke.mjs
 *
 * Dynamic import resolves the whole module graph first (avoids ESM static-cycle
 * issues under tsx where named exports can appear missing).
 */
const gem = await import('../src/gameSystems/gems/gemInventory.js');
const {
  grantGem,
  listGemStacks,
  listSocketableGemStacks,
  listSocketedGems,
  ensureGemInventory,
  socketGemInGear,
} = gem;

function fail(msg) {
  console.error('FAIL:', msg);
  process.exit(1);
}

const profile = {
  id: 'smoke_profile',
  coins: 5000,
  ownedMonsters: [],
  gearInventory: [],
  gemInventory: [],
};

const gear = {
  instanceId: 'gear_smoke_epic_1',
  gearId: 'epic_dragon_guard_helm', // real epic template (1 socket)
  rarity: 'epic',
  stats: [{ type: 'magicAttack', value: 10 }],
  sockets: [{ id: 'socket_1', gem: null }],
  equippedToMonsterId: null,
  acquiredAt: new Date().toISOString(),
};
profile.gearInventory.push(gear);

const grant = grantGem(profile, 'rare', 'attack', 1);
if (!grant.ok) fail(`grant: ${grant.error}`);

if (listSocketableGemStacks(profile).length !== 1) fail('expected 1 socketable gem');

const sock = socketGemInGear(profile, gear.instanceId, 0, 'rare_attack_gem');
if (!sock.ok) fail(`socket: ${sock.error}`);

if (listGemStacks(profile).length !== 0) fail('gem should leave stash when socketed');
if (listSocketedGems(profile).length !== 1) fail('expected 1 socketed gem');
const socketed = profile.gearInventory.find((g) => g.instanceId === gear.instanceId)?.sockets?.[0]?.gem;
if (!socketed?.key) fail('socket gem missing on gear');

ensureGemInventory(profile);
const after = profile.gearInventory.find((g) => g.instanceId === gear.instanceId)?.sockets?.[0]?.gem;
if (!after?.key) fail('socket gem lost after ensureGemInventory');

console.log('PASS: gem buy, socket, persist on gear');
