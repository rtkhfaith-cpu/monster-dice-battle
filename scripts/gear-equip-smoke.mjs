/**
 * Smoke test gear equip + fighter build (catches runtime throws).
 * Run: npx tsx scripts/gear-equip-smoke.mjs
 */
const gearEngine = await import('../utils/gearStorage.js');
const gameStorage = await import('../utils/gameStorage.js');
const { fighterFromOwned } = await import('../utils/fighterFromOwned.js');
const { generateGearInstance } = await import('../src/gameSystems/gear/gearGenerator.js');
const { GEAR_TEMPLATE_LIST } = await import('../src/gameSystems/gear/gearDefinitions.js');
const { previewSetBonusChange } = await import('../src/gameSystems/gear/gearSets.js');
const { listGearWithSockets } = await import('../src/gameSystems/gems/gemInventory.js');

const { buyGeneratedGear, equipGearInstance, normalizeProfileGear } = gearEngine;
const { createDefaultGameData, getPlayerProfile } = gameStorage;

function fail(msg) {
  console.error('FAIL:', msg);
  process.exit(1);
}

let gd = createDefaultGameData();
const profile = getPlayerProfile(gd, gd.players[0]?.id);
if (!profile) fail('no profile');
const monster = profile.ownedMonsters?.[0];
if (!monster) fail('no monster');

normalizeProfileGear(profile);

const headTpl = GEAR_TEMPLATE_LIST.find((t) => t.slot === 'head' && t.rarity === 'rare');
if (!headTpl) fail('no head template');

const bought = buyGeneratedGear(profile, headTpl.id, headTpl.rarity);
if (!bought.ok) fail(`buy: ${bought.error}`);

const gear = bought.gear;
const eq = equipGearInstance(profile, monster.id, gear.instanceId, gear.slot, 0);
if (!eq.ok) fail(`equip: ${eq.error}`);

let fighter;
try {
  fighter = fighterFromOwned(monster, profile);
} catch (e) {
  fail(`fighterFromOwned threw: ${e.message}\n${e.stack}`);
}
if (!fighter?.stats) fail('fighter missing stats');

const equipment = monster.equipment;
try {
  previewSetBonusChange(profile, equipment, gear.instanceId, gear.slot, 0);
} catch (e) {
  fail(`previewSetBonusChange threw: ${e.message}`);
}

try {
  listGearWithSockets(profile);
} catch (e) {
  fail(`listGearWithSockets threw: ${e.message}`);
}

// Epic with sockets path
const epicTpl = GEAR_TEMPLATE_LIST.find((t) => t.rarity === 'epic');
if (epicTpl) {
  const inst = generateGearInstance(epicTpl.id, { seed: 'smoke' });
  inst.sockets = [{ id: 'socket_1', gem: null }];
  profile.gearInventory.push(inst);
  listGearWithSockets(profile);
}

console.log('PASS: gear buy, equip, fighter build, set preview, gem sockets');
