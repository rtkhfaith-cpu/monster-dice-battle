/**
 * Map local player profile ↔ cloud DynamoDB document (profileID key).
 */
import { loadAudioSettings, saveAudioSettings } from '../../utils/audioSettings';
import { getPlayerProfile, cloneGameData } from '../../utils/gameStorage';
import { DEFAULT_GEAR_SLOTS } from '../../utils/gearSlots';
import { hashPlayerKey } from '../../utils/playerKey';

/**
 * @param {object} gameData
 * @param {string} profileID
 */
export function toCloudProfile(gameData, profileID) {
  const p = getPlayerProfile(gameData, profileID);
  if (!p) return null;

  const monsters = (p.ownedMonsters || []).map((om) => ({
    id: om.id,
    templateId: om.templateId,
    nickname: om.nickname ?? '',
    level: om.level ?? 1,
    exp: om.exp ?? 0,
    monsterParts: om.monsterParts ?? {},
    equippedGear: Array.isArray(om.equippedGear) ? om.equippedGear : [],
    gearSlotCount: om.gearSlotCount ?? DEFAULT_GEAR_SLOTS,
    unlockedVisualTags: Array.isArray(om.unlockedVisualTags) ? om.unlockedVisualTags : [],
  }));

  const equippedGear = {};
  const unlockedGearSlots = {};
  for (const om of p.ownedMonsters || []) {
    equippedGear[om.id] = Array.isArray(om.equippedGear) ? om.equippedGear : [];
    unlockedGearSlots[om.id] = om.gearSlotCount ?? DEFAULT_GEAR_SLOTS;
  }

  const keyHash =
    p.playerKeyHash ||
    (p.pin ? hashPlayerKey(p.pin) : '');

  return {
    profileID: String(profileID),
    playerName: String(p.name || 'Player').slice(0, 24),
    playerKeyHash: keyHash,
    pinHash: keyHash,
    coins: typeof p.coins === 'number' ? p.coins : 0,
    selectedMonsterId: p.selectedMonsterId ?? null,
    monsters,
    gear: Array.isArray(p.cosmeticsOwned) ? p.cosmeticsOwned : [],
    equippedGear,
    unlockedGearSlots,
    audioSettings: loadAudioSettings(),
    battleProgress: p.battleProgress ?? { totalBattles: 0, winStreak: 0, lossStreak: 0 },
    meta: p.meta ?? null,
    createdAt: p.createdAt ?? new Date().toISOString(),
    updatedAt: p.updatedAt ?? new Date().toISOString(),
  };
}

/**
 * @param {object|null|undefined} cloud
 * @returns {object|null}
 */
export function normalizeCloudRecord(cloud) {
  if (!cloud || typeof cloud !== 'object') return null;
  const profileID = String(cloud.profileID || cloud.id || '').trim();
  if (!profileID) return null;
  return { ...cloud, profileID };
}

/**
 * @param {object} gameData
 * @param {object} cloud
 * @returns {object}
 */
export function applyCloudProfile(gameData, cloud) {
  const normalized = normalizeCloudRecord(cloud);
  if (!normalized) return gameData;
  const gd = cloneGameData(gameData);
  const profileID = String(normalized.profileID);
  let p = gd.players.find((x) => x.id === profileID);
  if (!p) {
    p = {
      id: profileID,
      name: 'Player',
      coins: 0,
      ownedMonsters: [],
      cosmeticsOwned: [],
      cosmeticEquippedP1: [],
      cosmeticEquippedP2: [],
      selectedMonsterId: null,
    };
    gd.players.push(p);
  }

  p.name = String(normalized.playerName || cloud.playerName || p.name).slice(0, 24);
  const cloudKey = normalized.playerKeyHash || normalized.pinHash || cloud.playerKeyHash || cloud.pinHash;
  if (typeof cloudKey === 'string' && cloudKey) {
    if (String(cloudKey).startsWith('pk_')) {
      p.playerKeyHash = cloudKey;
      delete p.pin;
    } else {
      p.pin = cloudKey;
    }
  }
  if (normalized.createdAt) p.createdAt = normalized.createdAt;
  if (normalized.updatedAt) p.updatedAt = normalized.updatedAt;
  p.coins = typeof normalized.coins === 'number' ? normalized.coins : p.coins;
  p.selectedMonsterId = normalized.selectedMonsterId ?? p.selectedMonsterId;

  p.cosmeticsOwned = Array.isArray(normalized.gear) ? [...normalized.gear] : p.cosmeticsOwned;

  const equippedMap =
    normalized.equippedGear && typeof normalized.equippedGear === 'object'
      ? normalized.equippedGear
      : {};
  const slotsMap =
    normalized.unlockedGearSlots && typeof normalized.unlockedGearSlots === 'object'
      ? normalized.unlockedGearSlots
      : {};

  p.ownedMonsters = (normalized.monsters || []).map((om) => ({
    id: om.id,
    templateId: om.templateId,
    nickname: om.nickname ?? '',
    level: om.level ?? 1,
    exp: om.exp ?? 0,
    monsterParts: om.monsterParts ?? {},
    equippedGear: equippedMap[om.id] ?? om.equippedGear ?? [],
    gearSlotCount: slotsMap[om.id] ?? om.gearSlotCount ?? DEFAULT_GEAR_SLOTS,
    unlockedVisualTags: om.unlockedVisualTags ?? [],
  }));

  if (normalized.battleProgress) p.battleProgress = normalized.battleProgress;
  if (normalized.meta) p.meta = normalized.meta;

  if (normalized.audioSettings && typeof normalized.audioSettings === 'object') {
    saveAudioSettings(normalized.audioSettings);
  }

  return gd;
}
