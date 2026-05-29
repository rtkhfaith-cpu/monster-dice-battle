/**
 * Smoke test gem buy + socket flow.
 * Run: npx tsx scripts/gem-socket-smoke.mjs
 */
import {
  grantGem,
  listGemStacks,
  listSocketableGemStacks,
  listSocketedGems,
  ensureGemInventory,
} from '../src/gameSystems/gems/gemInventory.js';
import {
  buyGemForProfile,
  createDefaultGameData,
  getPlayerProfile,
  socketGemInGearForProfile,
} from '../utils/gameStorage.js';

function fail(msg) {
  console.error('FAIL:', msg);
  process.exit(1);
}

const gd = createDefaultGameData();
const profileId = gd.players[0]?.id;
if (!profileId) fail('no profile');

let gameData = gd;
const profile = getPlayerProfile(gameData, profileId);
profile.coins = 5000;

const gear = {
  instanceId: 'gear_smoke_epic_1',
  gearId: 'epic_tank_head_1',
  name: 'Smoke Helm',
  rarity: 'epic',
  slot: 'head',
  setId: 'tank',
  setName: 'Tank',
  buildType: 'tank',
  stats: [{ type: 'hp', value: 50 }],
  sockets: [{ id: 'socket_1', gem: null }],
  equippedToMonsterId: null,
  acquiredAt: new Date().toISOString(),
};
profile.gearInventory.push(gear);

const buy = buyGemForProfile(gameData, profileId, 'rare_attack_gem');
if (buy.error) fail(`buy: ${buy.error}`);
gameData = buy.gameData;

const p1 = getPlayerProfile(gameData, profileId);
if (listSocketableGemStacks(p1).length !== 1) fail('expected 1 socketable gem');

const sock = socketGemInGearForProfile(gameData, profileId, gear.instanceId, 0, 'rare_attack_gem');
if (sock.error) fail(`socket: ${sock.error}`);
gameData = sock.gameData;

const p2 = getPlayerProfile(gameData, profileId);
if (listGemStacks(p2).length !== 0) fail('gem should leave stash when socketed');
if (listSocketedGems(p2).length !== 1) fail('expected 1 socketed gem');
const socketed = p2.gearInventory.find((g) => g.instanceId === gear.instanceId)?.sockets?.[0]?.gem;
if (!socketed?.key) fail('socket gem missing on gear');

ensureGemInventory(p2);
const after = p2.gearInventory.find((g) => g.instanceId === gear.instanceId)?.sockets?.[0]?.gem;
if (!after?.key) fail('socket gem lost after ensureGemInventory');

console.log('PASS: gem buy, socket, persist on gear');
