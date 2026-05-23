/**
 * Map local player profile ↔ cloud DynamoDB document (profileID key).
 */
import { loadAudioSettings, applyAudioSettings } from '../../utils/audioSettings';
import { getPlayerProfile, cloneGameData, repairPlayerProfileInventory } from '../../utils/gameStorage';
import { DEFAULT_GEAR_SLOTS } from '../../utils/gearSlots';
import { normalizePlayerKey } from '../../utils/playerKey';
import { normalizeMonsterLadder } from '../../utils/monsterLadder/ladderProgress';
import { normalizeMonsterRescue } from '../../utils/monsterRescue/progress';
import { normalizeDailyLoginSpin } from '../../utils/dailyLoginSpin';
import { clampMergeTier } from '../../utils/mergeSystem';
import { peakMonsterLevelFromRoster } from '../../utils/trainerRankings';

/**
 * @param {object} gameData
 * @param {string} profileID
 */
export function toCloudProfile(gameData, profileID, sessionOverride = null) {
  const p = getPlayerProfile(gameData, profileID);
  if (!p) return null;

  normalizeDailyLoginSpin(p);
  repairPlayerProfileInventory(p);

  const monsters = (p.ownedMonsters || []).map((om) => ({
    id: om.id,
    templateId: om.templateId,
    nickname: om.nickname ?? '',
    level: om.level ?? 1,
    exp: om.exp ?? 0,
    mergeTier: clampMergeTier(om.mergeTier),
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

  const playerKey = normalizePlayerKey(p.pin || p.playerKey || '');
  const peak = peakMonsterLevelFromRoster(p.ownedMonsters);

  const row = {
    profileID: String(profileID),
    playerName: String(p.name || 'Player').slice(0, 24),
    coins: typeof p.coins === 'number' ? p.coins : 0,
    selectedMonsterId: p.selectedMonsterId ?? null,
    monsters,
    peakMonsterLevel: peak.level,
    peakMonsterTemplateId: peak.templateId,
    peakMonsterNickname: peak.nickname || '',
    gear: Array.isArray(p.cosmeticsOwned) ? p.cosmeticsOwned : [],
    equippedGear,
    unlockedGearSlots,
    audioSettings: loadAudioSettings(),
    battleProgress: p.battleProgress ?? { totalBattles: 0, winStreak: 0, lossStreak: 0 },
    monsterLadder: p.monsterLadder ?? null,
    monsterRescue: p.monsterRescue ? normalizeMonsterRescue(p.monsterRescue) : null,
    dailyLoginSpin: p.dailyLoginSpin ?? null,
    meta: p.meta ?? null,
    createdAt: p.createdAt ?? new Date().toISOString(),
    updatedAt: p.updatedAt ?? new Date().toISOString(),
  };

  if (playerKey.length === 4) {
    row.playerKey = playerKey;
  }

  const activeSession = sessionOverride || p.activeSession || null;
  if (activeSession?.sessionToken) {
    row.activeSession = {
      deviceId: activeSession.deviceId,
      sessionToken: activeSession.sessionToken,
      issuedAt: activeSession.issuedAt || new Date().toISOString(),
    };
    row.sessionToken = activeSession.sessionToken;
  }

  return row;
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
  const cloudPin = normalizePlayerKey(
    normalized.playerKey || cloud.playerKey || normalized.pin || cloud.pin || '',
  );
  if (cloudPin.length === 4) {
    p.pin = cloudPin;
    delete p.playerKeyHash;
  }
  if (normalized.createdAt) p.createdAt = normalized.createdAt;
  if (normalized.updatedAt) {
    p.updatedAt = normalized.updatedAt;
    p.lastCloudSyncedAt = normalized.updatedAt;
    p.lastKnownCloudUpdatedAt = normalized.updatedAt;
  }
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

  const cloudMonsters = normalized.monsters || normalized.ownedMonsters || [];
  p.ownedMonsters = cloudMonsters.map((om) => ({
    id: om.id,
    templateId: om.templateId,
    nickname: om.nickname ?? '',
    level: om.level ?? 1,
    exp: om.exp ?? 0,
    mergeTier: clampMergeTier(om.mergeTier),
    monsterParts: om.monsterParts ?? {},
    equippedGear: equippedMap[om.id] ?? om.equippedGear ?? [],
    gearSlotCount: slotsMap[om.id] ?? om.gearSlotCount ?? DEFAULT_GEAR_SLOTS,
    unlockedVisualTags: om.unlockedVisualTags ?? [],
  }));

  if (normalized.battleProgress) p.battleProgress = normalized.battleProgress;
  if (normalized.monsterLadder) p.monsterLadder = normalized.monsterLadder;
  else if (normalized.ladderProgress) {
    p.monsterLadder = normalizeMonsterLadder(null, normalized.ladderProgress);
  }
  if (normalized.monsterRescue) {
    p.monsterRescue = normalizeMonsterRescue(normalized.monsterRescue);
  }
  if (normalized.dailyLoginSpin && typeof normalized.dailyLoginSpin === 'object') {
    p.dailyLoginSpin = {
      rewardDayKey: normalized.dailyLoginSpin.rewardDayKey ?? null,
      claimedAt: normalized.dailyLoginSpin.claimedAt ?? null,
    };
  }
  normalizeDailyLoginSpin(p);
  if (normalized.meta) p.meta = normalized.meta;

  if (normalized.activeSession?.sessionToken) {
    p.activeSession = {
      deviceId: normalized.activeSession.deviceId,
      sessionToken: normalized.activeSession.sessionToken,
      issuedAt: normalized.activeSession.issuedAt,
    };
  }

  if (normalized.audioSettings && typeof normalized.audioSettings === 'object') {
    applyAudioSettings(normalized.audioSettings);
  }

  repairPlayerProfileInventory(p);

  return gd;
}
