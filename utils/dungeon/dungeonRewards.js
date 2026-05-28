/**
 * Dungeon reward drops — rolls each boss's reward table and grants real items
 * into the existing inventories (gear, skill books, monsters, pets, gems).
 *
 * Rarity gating for gems:
 *   - Death Knight / Ice Queen: Epic gems max (gemRarityCap = 'epic')
 *   - Black Dragon: Mythic gems allowed (gemRarityCap = 'mythic')
 * So Mythic gems can ONLY come from the Black Dragon boss.
 */
import { generateRandomGearInstance } from '../../src/gameSystems/gear/gearGenerator';
import { addGearToInventory } from '../../src/gameSystems/gear/inventoryGearUtils';
import { grantPassiveSkillBook } from '../../src/gameSystems/passiveInventory';
import { PASSIVE_SKILLS } from '../../src/gameSystems/passiveSkills';
import { grantChestMonsterToProfile } from '../chestMonsterGrant';
import { getChestMonstersByRarity } from '../chestMonsterPools';
import { grantPet } from '../../src/gameSystems/petInventory';
import { PET_CATALOG, MYTHIC_PET_IDS } from '../../src/gameSystems/pets';
import { grantGemByKey } from '../../src/gameSystems/gems/gemInventory';
import { gemKey, GEM_STATS, gemDisplayName, gemEmoji } from '../../src/gameSystems/gems/gemDefinitions';

const GEM_RARITY_ORDER = ['rare', 'epic', 'mythic'];

function pickRandom(arr) {
  return arr.length ? arr[Math.floor(Math.random() * arr.length)] : null;
}

function gearRarityFor(rarity) {
  if (rarity === 'mythic') return 'mythic';
  // gear only has rare/epic/mythic — legendary maps down to epic
  return 'epic';
}

function gemRarityFor(dropRarity, cap) {
  const want = dropRarity === 'mythic' ? 'mythic' : 'epic';
  const capIdx = GEM_RARITY_ORDER.indexOf(cap || 'epic');
  const wantIdx = GEM_RARITY_ORDER.indexOf(want);
  return GEM_RARITY_ORDER[Math.min(wantIdx, capIdx === -1 ? 1 : capIdx)];
}

function petIdsForRarity(rarity) {
  if (rarity === 'mythic') return MYTHIC_PET_IDS;
  const target = rarity === 'rare' ? 'rare' : 'epic';
  return Object.values(PET_CATALOG)
    .filter((p) => p.rarity === target)
    .map((p) => p.id);
}

function weightedCategory(pool, weights) {
  if (!weights) return pickRandom(pool);
  const entries = pool.map((c) => [c, weights[c] ?? 1]);
  const total = entries.reduce((s, [, w]) => s + w, 0);
  let roll = Math.random() * total;
  for (const [c, w] of entries) {
    if (roll < w) return c;
    roll -= w;
  }
  return pool[0];
}

function grantOneDrop(profile, rarity, boss) {
  const rewards = boss.rewards || {};
  const pool = rewards.dropCategoryPool || ['equipment'];
  let category = weightedCategory(pool, rarity === 'mythic' ? rewards.mythicDropWeights : null);

  // Resolve into a real grant; fall back to gem/gear if a pool is empty.
  const result = applyCategoryGrant(profile, category, rarity, boss);
  if (result) return result;
  return applyCategoryGrant(profile, 'gem', rarity, boss) || applyCategoryGrant(profile, 'equipment', rarity, boss);
}

function applyCategoryGrant(profile, category, rarity, boss) {
  if (category === 'equipment') {
    const gearRarity = gearRarityFor(rarity);
    const instance = generateRandomGearInstance(gearRarity);
    if (!instance) return null;
    addGearToInventory(profile, instance);
    return { category, rarity: gearRarity, name: instance.name, emoji: '⚔️', kind: 'equipment' };
  }
  if (category === 'skill') {
    const skillIds = Object.keys(PASSIVE_SKILLS);
    const skillId = pickRandom(skillIds);
    if (!skillId) return null;
    const grant = grantPassiveSkillBook(profile, skillId, rarity === 'legendary' ? 'legendary' : rarity, 'dungeon');
    if (!grant.ok) return null;
    return { category, rarity, name: `${grant.book.skillName} Book`, emoji: '📖', kind: 'skill' };
  }
  if (category === 'monster') {
    const monstersAtTier = getChestMonstersByRarity(rarity === 'legendary' ? 'legendary' : rarity);
    const pick = pickRandom(monstersAtTier);
    if (!pick) return null;
    const granted = grantChestMonsterToProfile(profile, pick);
    if (!granted) return null;
    return { category, rarity, name: pick.name, emoji: '🐲', kind: 'monster', duplicate: granted.duplicate };
  }
  if (category === 'pet') {
    const petId = pickRandom(petIdsForRarity(rarity));
    if (!petId) return null;
    const grant = grantPet(profile, petId, { source: 'dungeon' });
    if (!grant.ok) return null;
    return { category, rarity, name: grant.pet?.name ?? PET_CATALOG[petId]?.name ?? 'Pet', emoji: grant.pet?.emoji ?? '🐾', kind: 'pet', duplicate: grant.duplicate };
  }
  if (category === 'gem') {
    const gemRarity = gemRarityFor(rarity, boss.rewards?.gemRarityCap);
    const stat = pickRandom([...GEM_STATS]);
    const key = gemKey(gemRarity, stat);
    const grant = grantGemByKey(profile, key, 1);
    if (!grant.ok) return null;
    return { category, rarity: gemRarity, name: gemDisplayName(gemRarity, stat), emoji: gemEmoji(stat), kind: 'gem' };
  }
  return null;
}

/** Build the list of drop rarities for a boss. */
function rollDropRarities(boss) {
  const rewards = boss.rewards || {};
  if (Array.isArray(rewards.fixedDrop)) {
    const out = [];
    for (const fd of rewards.fixedDrop) {
      for (let i = 0; i < (fd.count ?? 1); i += 1) out.push(fd.rarity);
    }
    return out;
  }
  const count = rewards.dropCount ?? 3;
  const pool = rewards.dropRarityPool || ['epic'];
  return Array.from({ length: count }, () => pickRandom(pool));
}

/**
 * Grant all dungeon rewards into the profile (mutates). Returns display drops.
 * @param {object} profile already-cloned profile
 * @param {object} boss boss def from dungeonBosses
 */
export function grantDungeonRewards(profile, boss) {
  if (!profile || !boss) return { drops: [] };
  const rarities = rollDropRarities(boss);
  const drops = [];
  for (const rarity of rarities) {
    const drop = grantOneDrop(profile, rarity, boss);
    if (drop) drops.push(drop);
  }
  profile.updatedAt = new Date().toISOString();
  return { drops };
}
