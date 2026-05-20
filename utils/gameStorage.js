import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import {
  EXP_UNDERDOG_BONUS,
  expToAdvanceFrom,
  addExperience,
  subtractExperience,
  expWinForEnemyLevel,
  expLossPenalty,
} from './expLevel';
import { coinWinForEnemyLevel, LOSER_COINS, DRAW_COINS_EACH } from './rewards';
import { compactGearIds, equipToFirstEmptySlot, getGear, setGearAtSlot } from './cosmetics';
import {
  DEFAULT_GEAR_SLOTS,
  getUnlockedSlotCount,
  nextSlotUnlockCost,
  normalizeEquippedSlots,
} from './gearSlots';
import { expMultiplierFromGear } from './gearStats';
import { evolutionStageFromLevel, visualFormTierFromLevel } from './evolution';
import { normalizeMonsterLadder } from './monsterLadder/ladderProgress';
import { applyStageClear, normalizeMonsterRescue } from './monsterRescue/progress';
import { computeStageRewardsFromLevel } from './monsterRescue/rewards';
import { awardRescueSubChest } from './monsterRescue/rescueChestRewards';
import { decodeRescueLevel } from './monsterRescue/stages';
import { sanitizePlayerProfile } from './profileIntegrity';
import { openMonsterLadderChest } from './monsterLadder/ladderRewards';
import { getLadderMonsterTemplate } from './monsterLadder/ladderMonsterCatalog';
import {
  migrateLadderMonsterTemplateIds,
  resolveLadderTemplateId,
} from './monsterLadder/ladderMonsterMigrate';
import {
  generateLadderOwnedMonster,
  getMonsterLadderState,
  mergeLadderMonsterParts,
  setMonsterLadderState,
} from './monsterLadder/ladderProfile';
import { clampMergeTier, mergeCostForNextTier, pickPrimaryInstance } from './mergeSystem';
import { assertShopGearPurchase, assertShopMonsterPurchase } from './shopGuards';
import { gearShopPrice, monsterShopPrice } from '../src/gameBalance/shop';
import { evolutionFormForMonster } from './monsterEvolutionForms';
import { applyMonsterTheme } from './monsterThemes';
import { getMonsterTemplate, rarityRank } from './monsterTemplates';
import { grantGearToProfile } from './gearDuplicateReward';
import {
  clearMainMiniBossSkipNext,
  normalizeMainBattleState,
  recordMainMiniBossSkipNext,
  rollMainBattleChestDrop,
} from './mainBattleChest';

export const SAVE_KEY = 'MONSTER_DICE_BATTLE_SAVE';
const LEGACY_KEY_V2 = 'monster_dice_battle_v2';

/** @typedef {{ id: string, templateId: string, nickname: string, level: number, exp: number, monsterParts: object, equippedGear?: (string|null)[], gearSlotCount?: number, unlockedVisualTags?: string[] }} OwnedMonster */

/** @typedef {{
 * id: string,
 * name: string,
 * pin?: string,
 * playerKeyHash?: string,
 * createdAt?: string,
 * updatedAt?: string,
 * coins: number,
 * ownedMonsters: OwnedMonster[],
 * cosmeticsOwned: string[],
 * cosmeticEquippedP1: string[],
 * cosmeticEquippedP2: string[],
 * selectedMonsterId?: string|null,
 * battleProgress?: { totalBattles: number, winStreak: number, lossStreak: number },
 * meta?: { difficultyMode: 'easy'|'normal'|'hard'|'boss', aiBias: number, consecutiveLosses: number, consecutiveEasyWins: number, lastAiPowerRatio: number|null },
 * }} PlayerProfile */

export const MAX_PLAYER_PROFILES = 1;

function defaultProfileMeta() {
  return {
    difficultyMode: /** @type {'normal'} */ ('normal'),
    aiBias: 0,
    consecutiveLosses: 0,
    consecutiveEasyWins: 0,
    lastAiPowerRatio: null,
  };
}

function defaultBattleProgress() {
  return { totalBattles: 0, winStreak: 0, lossStreak: 0 };
}

function uid(prefix) {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 9)}`;
}

/** Deep-ish clone for plain JSON data */
export function cloneGameData(src) {
  return JSON.parse(JSON.stringify(src));
}

export function getDefaultGameData() {
  return {
    version: 1,
    players: /** @type {PlayerProfile[]} */ ([]),
    session: {
      activeProfileId: null,
    },
    guest: {
      coins: 0,
      ownedMonsters: /** @type {OwnedMonster[]} */ ([]),
      cosmeticsOwned: /** @type {string[]} */ ([]),
      cosmeticEquippedP1: /** @type {string[]} */ ([]),
      cosmeticEquippedP2: /** @type {string[]} */ ([]),
    },
    settings: {
      soundEnabled: true,
      vibrationEnabled: true,
    },
    meta: {
      difficultyMode: /** @type {'easy'|'normal'|'hard'|'boss'} */ ('normal'),
      aiBias: 0,
      consecutiveLosses: 0,
      consecutiveEasyWins: 0,
      lastAiPowerRatio: null,
    },
    battleSummary: {
      totalBattles: 0,
      winStreakGuest: 0,
      lossStreakGuest: 0,
    },
  };
}

/** Wallet resolved from guest or active profile */
export function activeWallet(gameData) {
  return walletForProfile(gameData, gameData?.session?.activeProfileId ?? null);
}

/** Wallet for a specific saved profile (guest fallback when id is null). */
export function walletForProfile(gameData, profileId) {
  if (!profileId) return gameData.guest;
  const p = gameData.players.find((x) => x.id === profileId);
  return p ?? gameData.guest;
}

export function getPlayerProfile(gameData, profileId) {
  if (!profileId) return null;
  return gameData.players.find((x) => x.id === profileId) ?? null;
}

/** Meta used for 1P AI scaling — per profile when available. */
export function metaForProfile(gameData, profileId) {
  const p = profileId ? getPlayerProfile(gameData, profileId) : null;
  return p?.meta ?? gameData.meta;
}

export function mergeMonsterParts(templateId, overrides = {}) {
  const t = getMonsterTemplate(templateId);
  const base = t?.visualProfile?.defaultParts ? { ...t.visualProfile.defaultParts } : {};
  const merged = {
    templateId,
    species: 0,
    body: 0,
    head: 0,
    eyes: 0,
    mouth: 0,
    horn: 0,
    tail: 0,
    hands: 0,
    legs: 0,
    colorIdx: 0,
    cosmetics: [],
    ...base,
    ...overrides,
  };
  if (!Array.isArray(merged.cosmetics)) merged.cosmetics = [];
  return applyMonsterTheme(templateId, merged, t);
}

/** @param {string} templateId */
export function generateOwnedMonster(templateId, nickname = '') {
  const t = getMonsterTemplate(templateId);
  if (!t) throw new Error(`Unknown template ${templateId}`);
  return {
    id: uid('om'),
    templateId,
    nickname: nickname || t.name,
    level: 1,
    exp: 0,
    monsterParts: mergeMonsterParts(templateId),
    equippedGear: [],
    gearSlotCount: DEFAULT_GEAR_SLOTS,
    unlockedVisualTags: [],
    mergeTier: 0,
  };
}

function normalizeOwnedMonster(om) {
  if (typeof om.gearSlotCount !== 'number' || om.gearSlotCount < DEFAULT_GEAR_SLOTS) {
    om.gearSlotCount = DEFAULT_GEAR_SLOTS;
  }
  if (om.gearSlotCount > 6) om.gearSlotCount = 6;
  om.equippedGear = normalizeEquippedSlots(om.equippedGear, om.gearSlotCount);
  for (let i = 0; i < om.equippedGear.length; i += 1) {
    const id = om.equippedGear[i];
    if (id && !getGear(id)) om.equippedGear[i] = null;
  }
  if (!om.monsterParts) {
    om.monsterParts = getLadderMonsterTemplate(om.templateId)
      ? mergeLadderMonsterParts(om.templateId)
      : mergeMonsterParts(om.templateId);
  }
  om.mergeTier = clampMergeTier(om.mergeTier);
}

function migrateLegacyWalletGear(wallet) {
  if (!wallet.ownedMonsters?.length) return;
  const applyList = (list, index) => {
    if (!Array.isArray(list) || !list.length) return;
    const om = wallet.ownedMonsters[index];
    if (!om || (om.equippedGear && om.equippedGear.length > 0)) return;
    let eq = normalizeEquippedSlots([], om.gearSlotCount ?? DEFAULT_GEAR_SLOTS);
    for (const id of list) {
      if (getGear(id)) {
        const next = equipToFirstEmptySlot(eq, id, getUnlockedSlotCount(om));
        if (next) eq = next;
      }
    }
    om.equippedGear = eq;
    const owned = new Set(wallet.cosmeticsOwned || []);
    for (const id of list) if (getGear(id)) owned.add(id);
    wallet.cosmeticsOwned = [...owned];
  };
  applyList(wallet.cosmeticEquippedP1, 0);
  applyList(wallet.cosmeticEquippedP2, 1);
}

function normalizeWalletMonsters(wallet) {
  if (!wallet.ownedMonsters) wallet.ownedMonsters = [];
  wallet.ownedMonsters.forEach(normalizeOwnedMonster);
  migrateLegacyWalletGear(wallet);
}

/** Copy ladder-exclusive monsters into main inventory so they appear in the home roster. */
export function ensureLadderMonstersInMainInventory(profile) {
  return syncLadderRewardsToMainInventory(profile);
}

/** Normalize ladder + merge inventories after cloud load or local repair. */
export function repairPlayerProfileInventory(profile) {
  if (!profile) return false;
  profile.monsterLadder = normalizeMonsterLadder(profile.monsterLadder, profile.ladderProgress);
  return syncLadderRewardsToMainInventory(profile);
}

function syncLadderRewardsToMainInventory(profile) {
  let changed = migrateLadderMonsterTemplateIds(profile);
  const ml = getMonsterLadderState(profile);
  if (!ml) return changed;

  const ownedGear = new Set(profile.cosmeticsOwned || []);
  for (const gearId of ml.ownedGear || []) {
    if (getGear(gearId)) ownedGear.add(gearId);
  }
  const prevGear = profile.cosmeticsOwned || [];
  const nextGear = [...ownedGear];
  if (
    prevGear.length !== nextGear.length
    || nextGear.some((id, i) => prevGear[i] !== id)
  ) {
    profile.cosmeticsOwned = nextGear;
    changed = true;
  }

  if (!Array.isArray(profile.ownedMonsters)) {
    profile.ownedMonsters = [];
    changed = true;
  }
  const mainTemplateIds = new Set(
    profile.ownedMonsters.map((m) => resolveLadderTemplateId(m.templateId) ?? m.templateId),
  );

  // Ladder roster → main inventory (home Monsters tray).
  for (const lm of ml.ownedMonsters || []) {
    const canonical = resolveLadderTemplateId(lm.templateId);
    if (!canonical || mainTemplateIds.has(canonical)) continue;
    changed = true;
    const row = {
      ...lm,
      templateId: canonical,
      equippedGear: Array.isArray(lm.equippedGear) ? lm.equippedGear : [],
      unlockedVisualTags: Array.isArray(lm.unlockedVisualTags) ? lm.unlockedVisualTags : [],
    };
    delete row.equippedLadderGear;
    normalizeOwnedMonster(row);
    profile.ownedMonsters.push(row);
    mainTemplateIds.add(canonical);
  }

  // Main inventory → ladder roster (Collection / ladder battles) — repairs split saves.
  if (!Array.isArray(ml.ownedMonsters)) ml.ownedMonsters = [];
  const ladderTemplateIds = new Set(
    ml.ownedMonsters.map((m) => resolveLadderTemplateId(m.templateId) ?? m.templateId),
  );
  for (const om of profile.ownedMonsters || []) {
    const canonical = resolveLadderTemplateId(om.templateId);
    if (!canonical || ladderTemplateIds.has(canonical)) continue;
    changed = true;
    const row = generateLadderOwnedMonster(canonical, om.nickname || '');
    row.id = om.id;
    row.level = om.level ?? 1;
    row.exp = om.exp ?? 0;
    row.mergeTier = om.mergeTier ?? 0;
    row.monsterParts = om.monsterParts
      ? mergeLadderMonsterParts(canonical, om.monsterParts)
      : mergeLadderMonsterParts(canonical);
    ml.ownedMonsters.push(row);
    ladderTemplateIds.add(canonical);
    if (!ml.activeMonsterId) ml.activeMonsterId = row.id;
  }
  setMonsterLadderState(profile, ml);
  return changed;
}

function normalizePlayerProfile(p) {
  if (!p.name || typeof p.name !== 'string') p.name = 'Player';
  p.name = String(p.name).slice(0, 24);
  if (p.pin && typeof p.pin !== 'string') delete p.pin;
  if (typeof p.coins !== 'number') p.coins = 0;
  if (!Array.isArray(p.cosmeticsOwned)) p.cosmeticsOwned = [];
  if (!Array.isArray(p.cosmeticEquippedP1)) p.cosmeticEquippedP1 = [];
  if (!Array.isArray(p.cosmeticEquippedP2)) p.cosmeticEquippedP2 = [];
  normalizeWalletMonsters(p);
  if (p.selectedMonsterId && !p.ownedMonsters.some((om) => om.id === p.selectedMonsterId)) {
    p.selectedMonsterId = p.ownedMonsters[0]?.id ?? null;
  }
  if (!p.selectedMonsterId && p.ownedMonsters[0]) p.selectedMonsterId = p.ownedMonsters[0].id;
  if (!p.battleProgress) p.battleProgress = defaultBattleProgress();
  if (!p.meta) p.meta = defaultProfileMeta();
  normalizeMainBattleState(p);
  p.monsterLadder = normalizeMonsterLadder(p.monsterLadder, p.ladderProgress);
  p.monsterRescue = normalizeMonsterRescue(p.monsterRescue);
  syncLadderRewardsToMainInventory(p);
  delete p.ladderProgress;
  sanitizePlayerProfile(p);
}

/**
 * Apply Monster Rescue stage results (coins, EXP, progress).
 * @param {object} runSummary Phaser run summary (score, rescued, comboPeak, chests, …)
 */
export function applyMonsterRescueStageResult(gameData, profileId, stageId, runSummary, won) {
  const gd = cloneGameData(gameData);
  const profile = gd.players.find((p) => p.id === profileId);
  if (!profile) return { gameData: gd, rewards: null };

  const rewards = computeStageRewardsFromLevel(stageId, runSummary, won);
  const { subLevel } = decodeRescueLevel(stageId);

  if (won) {
    let next = applyStageClear(
      profile,
      stageId,
      runSummary?.bubblesCleared ?? 0,
      rewards.coins,
    );
    next.coins += rewards.coins;

    const chest = awardRescueSubChest(next, subLevel);
    let chestDrop = null;
    let outGd = gd;
    if (chest.chestAwarded) {
      const opened = openMonsterLadderChest(outGd, profileId, chest.chestAwarded);
      if (!opened.error && opened.drop) {
        chestDrop = opened.drop;
        outGd = opened.gameData;
        next = outGd.players.find((p) => p.id === profileId) ?? next;
      } else if (!opened.error) {
        outGd = opened.gameData;
        next = outGd.players.find((p) => p.id === profileId) ?? next;
      }
    }

    const ownedId = next.selectedMonsterId || next.ownedMonsters?.[0]?.id;
    const expPack = grantExpInWallet(next, ownedId, rewards.exp);
    const idx = outGd.players.findIndex((p) => p.id === profileId);
    outGd.players[idx] = next;
    return {
      gameData: outGd,
      rewards: {
        ...rewards,
        expPack,
        won: true,
        chestAwarded: chest.chestAwarded,
        chestBlocked: chest.chestBlocked,
        chestDrop,
      },
    };
  }

  profile.coins += rewards.coins;
  const ownedId = profile.selectedMonsterId || profile.ownedMonsters?.[0]?.id;
  const expPack = grantExpInWallet(profile, ownedId, rewards.exp);
  const idx = gd.players.findIndex((p) => p.id === profileId);
  if (idx >= 0) gd.players[idx] = profile;
  return {
    gameData: gd,
    rewards: {
      ...rewards,
      expPack,
      won: false,
    },
  };
}

function ensureStarterMonsters(wallet) {
  if (!wallet.ownedMonsters) wallet.ownedMonsters = [];
  if (wallet.ownedMonsters.length > 0) return;
  wallet.ownedMonsters.push(generateOwnedMonster('cockroachsaurus'));
  wallet.ownedMonsters.push(generateOwnedMonster('chickenzilla'));
}

function migrateLegacyV2Into(gameData, legacyParsed) {
  if (!legacyParsed || typeof legacyParsed !== 'object') return gameData;
  gameData.guest.coins += typeof legacyParsed.coins === 'number' ? legacyParsed.coins : 0;
  const owned = Array.isArray(legacyParsed.owned) ? legacyParsed.owned.filter((x) => typeof x === 'string') : [];
  gameData.guest.cosmeticsOwned = [...new Set([...(gameData.guest.cosmeticsOwned || []), ...owned])];
  const e1 = Array.isArray(legacyParsed.equippedP1) ? legacyParsed.equippedP1.filter((x) => typeof x === 'string') : [];
  const e2 = Array.isArray(legacyParsed.equippedP2) ? legacyParsed.equippedP2.filter((x) => typeof x === 'string') : [];
  if (e1.length) gameData.guest.cosmeticEquippedP1 = e1.slice(0, 8);
  if (e2.length) gameData.guest.cosmeticEquippedP2 = e2.slice(0, 8);
  ensureStarterMonsters(gameData.guest);
  return gameData;
}

function normalizeGameData(raw) {
  const d = getDefaultGameData();
  if (!raw || typeof raw !== 'object') return d;
  d.version = typeof raw.version === 'number' ? raw.version : 1;
  d.players = Array.isArray(raw.players) ? raw.players.filter((p) => p && p.id) : [];
  d.session = { activeProfileId: raw.session?.activeProfileId ?? null };
  if (raw.guest && typeof raw.guest === 'object') {
    d.guest.coins = typeof raw.guest.coins === 'number' ? Math.max(0, raw.guest.coins) : 0;
    d.guest.ownedMonsters = Array.isArray(raw.guest.ownedMonsters) ? raw.guest.ownedMonsters : [];
    d.guest.cosmeticsOwned = Array.isArray(raw.guest.cosmeticsOwned) ? raw.guest.cosmeticsOwned.filter((x) => typeof x === 'string') : [];
    d.guest.cosmeticEquippedP1 = Array.isArray(raw.guest.cosmeticEquippedP1) ? raw.guest.cosmeticEquippedP1 : [];
    d.guest.cosmeticEquippedP2 = Array.isArray(raw.guest.cosmeticEquippedP2) ? raw.guest.cosmeticEquippedP2 : [];
  }
  if (raw.settings && typeof raw.settings === 'object') {
    d.settings.soundEnabled = raw.settings.soundEnabled !== false;
    d.settings.vibrationEnabled = raw.settings.vibrationEnabled !== false;
  }
  if (raw.meta && typeof raw.meta === 'object') {
    const dm = raw.meta.difficultyMode;
    if (dm === 'easy' || dm === 'normal' || dm === 'hard' || dm === 'boss') d.meta.difficultyMode = dm;
    d.meta.aiBias = typeof raw.meta.aiBias === 'number' ? raw.meta.aiBias : 0;
    d.meta.consecutiveLosses = typeof raw.meta.consecutiveLosses === 'number' ? raw.meta.consecutiveLosses : 0;
    d.meta.consecutiveEasyWins = typeof raw.meta.consecutiveEasyWins === 'number' ? raw.meta.consecutiveEasyWins : 0;
  }
  if (raw.battleSummary && typeof raw.battleSummary === 'object') {
    d.battleSummary.totalBattles = typeof raw.battleSummary.totalBattles === 'number' ? raw.battleSummary.totalBattles : 0;
    d.battleSummary.winStreakGuest = typeof raw.battleSummary.winStreakGuest === 'number' ? raw.battleSummary.winStreakGuest : 0;
    d.battleSummary.lossStreakGuest = typeof raw.battleSummary.lossStreakGuest === 'number' ? raw.battleSummary.lossStreakGuest : 0;
  }
  ensureStarterMonsters(d.guest);
  normalizeWalletMonsters(d.guest);
  d.players.forEach((p) => normalizePlayerProfile(p));
  return ensureProfilesFromGuest(d);
}

async function readSaveRaw() {
  if (Platform.OS === 'web' && typeof localStorage !== 'undefined') {
    const web = localStorage.getItem(SAVE_KEY);
    if (web) return web;
  }
  return AsyncStorage.getItem(SAVE_KEY);
}

async function writeSaveRaw(json) {
  if (Platform.OS === 'web' && typeof localStorage !== 'undefined') {
    localStorage.setItem(SAVE_KEY, json);
  }
  await AsyncStorage.setItem(SAVE_KEY, json);
}

export async function loadGameData() {
  try {
    const rawNew = await readSaveRaw();
    if (rawNew) {
      const parsed = JSON.parse(rawNew);
      return normalizeGameData(parsed);
    }
    const gd = getDefaultGameData();
    const rawLegacy = await AsyncStorage.getItem(LEGACY_KEY_V2);
    if (rawLegacy) {
      try {
        migrateLegacyV2Into(gd, JSON.parse(rawLegacy));
      } catch {
        /* ignore */
      }
      ensureStarterMonsters(gd.guest);
      await saveGameData(gd);
      return gd;
    }
    ensureStarterMonsters(gd.guest);
    await saveGameData(gd);
    return gd;
  } catch {
    const gd = getDefaultGameData();
    ensureStarterMonsters(gd.guest);
    return gd;
  }
}

export async function saveGameData(gameData) {
  ensureStarterMonsters(gameData.guest);
  await writeSaveRaw(JSON.stringify(gameData));
}

export async function resetGameData() {
  const fresh = getDefaultGameData();
  ensureStarterMonsters(fresh.guest);
  await saveGameData(fresh);
  return fresh;
}

/** --- Profiles --- */

/** Create first profile from guest save or a blank starter when none exist. */
export function ensureProfilesFromGuest(gameData) {
  const gd = cloneGameData(gameData);
  if (gd.players.length > 0) {
    if (!gd.session.activeProfileId) gd.session.activeProfileId = gd.players[0].id;
    return gd;
  }
  const g = gd.guest;
  const hasGuest =
    (g.ownedMonsters?.length ?? 0) > 0 || g.coins > 0 || (g.cosmeticsOwned?.length ?? 0) > 0;
  const id = uid('pl');
  const profile = {
    id,
    name: 'Player 1',
    pin: '0000',
    coins: hasGuest ? g.coins : 0,
    ownedMonsters: hasGuest ? g.ownedMonsters : [],
    cosmeticsOwned: hasGuest ? [...(g.cosmeticsOwned || [])] : [],
    cosmeticEquippedP1: hasGuest ? [...(g.cosmeticEquippedP1 || [])] : [],
    cosmeticEquippedP2: hasGuest ? [...(g.cosmeticEquippedP2 || [])] : [],
    selectedMonsterId: null,
    battleProgress: {
      totalBattles: gd.battleSummary?.totalBattles ?? 0,
      winStreak: gd.battleSummary?.winStreakGuest ?? 0,
      lossStreak: gd.battleSummary?.lossStreakGuest ?? 0,
    },
    meta: {
      difficultyMode: gd.meta?.difficultyMode ?? 'normal',
      aiBias: gd.meta?.aiBias ?? 0,
      consecutiveLosses: gd.meta?.consecutiveLosses ?? 0,
      consecutiveEasyWins: gd.meta?.consecutiveEasyWins ?? 0,
      lastAiPowerRatio: gd.meta?.lastAiPowerRatio ?? null,
    },
  };
  ensureStarterMonsters(profile);
  normalizePlayerProfile(profile);
  gd.players.push(profile);
  gd.session.activeProfileId = id;
  return gd;
}

/** @returns {{ gameData: object, playerId?: string, error?: string }} */
export function createPlayerProfile(gameData, name, playerKey = '') {
  const gd = cloneGameData(gameData);
  if (gd.players.length >= MAX_PLAYER_PROFILES) {
    gd.players = [];
    gd.session = gd.session || {};
    gd.session.activeProfileId = null;
  }
  const id = uid('pl');
  const now = new Date().toISOString();
  const profile = {
    id,
    name: String(name || 'New Player').trim().slice(0, 24) || 'New Player',
    pin: String(playerKey || '').replace(/\D/g, '').slice(0, 4),
    coins: 0,
    ownedMonsters: [],
    cosmeticsOwned: [],
    cosmeticEquippedP1: [],
    cosmeticEquippedP2: [],
    selectedMonsterId: null,
    battleProgress: defaultBattleProgress(),
    meta: defaultProfileMeta(),
    createdAt: now,
    updatedAt: now,
  };
  ensureStarterMonsters(profile);
  normalizePlayerProfile(profile);
  gd.players.push(profile);
  gd.session.activeProfileId = id;
  return { gameData: gd, playerId: id };
}

/** Keep a single local profile row — the active cloud/local player. */
export function enforceSingleActiveProfile(gameData, activeProfileId) {
  const gd = cloneGameData(gameData);
  const id = activeProfileId ?? gd.session?.activeProfileId ?? null;
  const active = id ? gd.players.find((p) => p.id === id) : gd.players[0] ?? null;
  gd.players = active ? [active] : [];
  gd.session = gd.session || {};
  gd.session.activeProfileId = active?.id ?? null;
  return gd;
}

/** @returns {object} */
export function setPlayerKeyForProfile(gameData, profileId, playerKey) {
  const gd = cloneGameData(gameData);
  const p = gd.players.find((x) => x.id === profileId);
  if (!p) return gd;
  p.pin = String(playerKey || '').replace(/\D/g, '').slice(0, 4);
  delete p.playerKeyHash;
  p.updatedAt = new Date().toISOString();
  if (!p.createdAt) p.createdAt = p.updatedAt;
  return gd;
}

/** @deprecated use createPlayerProfile */
export function createPlayer(gameData, name, pin) {
  const res = createPlayerProfile(gameData, name);
  if (res.error) throw new Error(res.error);
  const gd = res.gameData;
  const p = gd.players.find((x) => x.id === res.playerId);
  if (p && pin) p.pin = String(pin || '0000').replace(/\D/g, '').slice(0, 4).padStart(4, '0');
  return gd;
}

export function setActiveProfile(gameData, profileId) {
  const gd = cloneGameData(gameData);
  if (!profileId) {
    gd.session.activeProfileId = null;
    return gd;
  }
  if (!gd.players.some((p) => p.id === profileId)) return gd;
  gd.session.activeProfileId = profileId;
  return gd;
}

export function setProfileSelectedMonster(gameData, profileId, ownedMonsterId) {
  const gd = cloneGameData(gameData);
  const p = gd.players.find((x) => x.id === profileId);
  if (!p) return gd;
  if (ownedMonsterId && !p.ownedMonsters.some((om) => om.id === ownedMonsterId)) return gd;
  p.selectedMonsterId = ownedMonsterId || null;
  return gd;
}

export function updatePlayer(gameData, playerId, updates) {
  const gd = cloneGameData(gameData);
  const i = gd.players.findIndex((p) => p.id === playerId);
  if (i < 0) return gd;
  gd.players[i] = { ...gd.players[i], ...updates };
  return gd;
}

export function deletePlayer(gameData, playerId) {
  const gd = cloneGameData(gameData);
  if (!playerId) return gd;
  gd.players = gd.players.filter((p) => p.id !== playerId);
  if (gd.session.activeProfileId === playerId) {
    gd.session.activeProfileId = gd.players[0]?.id ?? null;
  }
  return gd;
}

/** --- Monsters --- */

export function buyMonster(gameData, playerId, monsterTypeId) {
  const gd = cloneGameData(gameData);
  const wallet = playerId ? gd.players.find((p) => p.id === playerId) : gd.guest;
  if (!wallet) return { gameData: gd, error: 'No wallet' };
  const guard = assertShopMonsterPurchase(monsterTypeId);
  if (!guard.ok) return { gameData: gd, error: guard.error };
  const t = getMonsterTemplate(monsterTypeId);
  if (!t) return { gameData: gd, error: 'Unknown monster' };
  const price = monsterShopPrice(t);
  if (typeof price !== 'number') return { gameData: gd, error: 'This monster is not normally purchasable.' };
  if (wallet.coins < price) return { gameData: gd, error: 'Not enough coins' };
  wallet.coins -= price;
  const om = generateOwnedMonster(monsterTypeId);
  wallet.ownedMonsters.push(om);
  return { gameData: gd, ownedMonster: om };
}

/** Buy gear into profile inventory only (no equip). */
export function buyGearItem(gameData, playerId, gearId) {
  const gd = cloneGameData(gameData);
  const wallet = playerId ? gd.players.find((p) => p.id === playerId) : gd.guest;
  if (!wallet) return { gameData: gd, error: 'No wallet' };
  const guard = assertShopGearPurchase(gearId);
  if (!guard.ok) return { gameData: gd, error: guard.error };
  const item = getGear(gearId);
  if (!item) return { gameData: gd, error: 'Unknown gear' };
  if (wallet.cosmeticsOwned.includes(gearId)) return { gameData: gd, error: 'Already owned' };
  const price = gearShopPrice(item);
  if (wallet.coins < price) return { gameData: gd, error: 'Not enough coins' };
  wallet.coins -= price;
  wallet.cosmeticsOwned = [...new Set([...wallet.cosmeticsOwned, gearId])];
  return { gameData: gd };
}

/**
 * Buy gear, add to wallet owned list, equip on target monster (replaces same slot).
 */
export function buyGearForMonster(gameData, playerId, ownedMonsterId, gearId) {
  const gd = cloneGameData(gameData);
  const wallet = playerId ? gd.players.find((p) => p.id === playerId) : gd.guest;
  if (!wallet) return { gameData: gd, error: 'No wallet' };
  const guard = assertShopGearPurchase(gearId);
  if (!guard.ok) return { gameData: gd, error: guard.error };
  const item = getGear(gearId);
  if (!item) return { gameData: gd, error: 'Unknown gear' };
  if (wallet.cosmeticsOwned.includes(gearId)) return { gameData: gd, error: 'Already owned' };
  const price = gearShopPrice(item);
  if (wallet.coins < price) return { gameData: gd, error: 'Not enough coins' };
  const om = wallet.ownedMonsters.find((x) => x.id === ownedMonsterId);
  if (!om) return { gameData: gd, error: 'Monster not found' };

  wallet.coins -= price;
  wallet.cosmeticsOwned = [...new Set([...wallet.cosmeticsOwned, gearId])];
  const maxSlots = getUnlockedSlotCount(om);
  const next = equipToFirstEmptySlot(om.equippedGear || [], gearId, maxSlots);
  if (!next) return { gameData: gd, error: 'All gear slots full — remove an item first' };
  om.equippedGear = next;
  normalizeOwnedMonster(om);
  return { gameData: gd };
}

/** Equip owned gear onto monster (optional slot index). */
export function equipOwnedGear(gameData, playerId, ownedMonsterId, gearId, slotIndex = null) {
  const gd = cloneGameData(gameData);
  const wallet = playerId ? gd.players.find((p) => p.id === playerId) : gd.guest;
  if (!wallet) return { gameData: gd, error: 'No wallet' };
  if (!wallet.cosmeticsOwned.includes(gearId)) return { gameData: gd, error: 'Not owned yet' };
  const om = wallet.ownedMonsters.find((x) => x.id === ownedMonsterId);
  if (!om) return { gameData: gd, error: 'Monster not found' };
  const maxSlots = getUnlockedSlotCount(om);
  if (typeof slotIndex === 'number' && slotIndex >= 0 && slotIndex < maxSlots) {
    om.equippedGear = setGearAtSlot(om.equippedGear || [], gearId, slotIndex, maxSlots);
  } else {
    const next = equipToFirstEmptySlot(om.equippedGear || [], gearId, maxSlots);
    if (!next) return { gameData: gd, error: 'All gear slots full' };
    om.equippedGear = next;
  }
  normalizeOwnedMonster(om);
  return { gameData: gd };
}

export function unequipOwnedGear(gameData, playerId, ownedMonsterId, gearId, slotIndex = null) {
  const gd = cloneGameData(gameData);
  const wallet = playerId ? gd.players.find((p) => p.id === playerId) : gd.guest;
  if (!wallet) return { gameData: gd, error: 'No wallet' };
  const om = wallet.ownedMonsters.find((x) => x.id === ownedMonsterId);
  if (!om) return { gameData: gd, error: 'Monster not found' };
  const maxSlots = getUnlockedSlotCount(om);
  if (typeof slotIndex === 'number') {
    const slots = normalizeEquippedSlots(om.equippedGear, maxSlots);
    if (slotIndex >= 0 && slotIndex < maxSlots) slots[slotIndex] = null;
    om.equippedGear = slots;
  } else {
    om.equippedGear = (om.equippedGear || []).map((id) => (id === gearId ? null : id));
    normalizeOwnedMonster(om);
  }
  return { gameData: gd };
}

/** Unlock next gear slot for one owned monster (permanent, costs coins). */
export function unlockGearSlotForMonster(gameData, playerId, ownedMonsterId) {
  const gd = cloneGameData(gameData);
  const wallet = playerId ? gd.players.find((p) => p.id === playerId) : gd.guest;
  if (!wallet) return { gameData: gd, error: 'No wallet' };
  const om = wallet.ownedMonsters.find((x) => x.id === ownedMonsterId);
  if (!om) return { gameData: gd, error: 'Monster not found' };
  const cost = nextSlotUnlockCost(om);
  if (cost == null) return { gameData: gd, error: 'All slots unlocked' };
  if (wallet.coins < cost) return { gameData: gd, error: `Need ${cost} coins` };
  wallet.coins -= cost;
  om.gearSlotCount = getUnlockedSlotCount(om) + 1;
  om.equippedGear = normalizeEquippedSlots(om.equippedGear, om.gearSlotCount);
  return { gameData: gd, newSlotCount: om.gearSlotCount };
}

export function updateOwnedMonster(gameData, playerId, ownedMonsterId, updates) {
  const gd = cloneGameData(gameData);
  const wallet = playerId ? gd.players.find((p) => p.id === playerId) : gd.guest;
  if (!wallet) return gd;
  const om = wallet.ownedMonsters.find((x) => x.id === ownedMonsterId);
  if (!om) return gd;
  const u = { ...updates };
  if (u.monsterParts) {
    om.monsterParts = mergeMonsterParts(om.templateId, { ...om.monsterParts, ...u.monsterParts });
    delete u.monsterParts;
  }
  Object.assign(om, u);
  return gd;
}

/** Difficulty multiplier on AI target power */
export function difficultyPowerMultiplier(mode) {
  if (mode === 'easy') return 0.9;
  if (mode === 'hard') return 1.25;
  if (mode === 'boss') return 1.5;
  return 1.1; // normal default +10%
}

/**
 * Apply coins + EXP after a battle for guest wallet or profile wallet.
 * @param {*} gameData
 * @param {{
 *   outcome: 'draw'|1|2,
 *   mode: 'twoPlayer'|'onePlayer',
 *   p1OwnedId?: string|null,
 *   p2OwnedId?: string|null,
 *   p1TemplateId?: string|null,
 *   p2TemplateId?: string|null,
 *   winnerPerspective?: 1|2|null,
 * }} payload
 */
function grantExpInWallet(wallet, ownedId, amount) {
  if (!ownedId) {
    return {
      levelsGained: 0,
      evolved: false,
      prevStage: null,
      nextStage: null,
      level: 1,
      exp: 0,
      expToNext: expToAdvanceFrom(1),
      prevLevel: 1,
      expDelta: 0,
    };
  }
  const om = wallet.ownedMonsters.find((x) => x.id === ownedId);
  if (!om) {
    return {
      levelsGained: 0,
      evolved: false,
      prevStage: null,
      nextStage: null,
      level: 1,
      exp: 0,
      expToNext: expToAdvanceFrom(1),
      prevLevel: 1,
      expDelta: 0,
    };
  }
  const prevStage = evolutionStageFromLevel(om.level).key;
  const prevFormTier = visualFormTierFromLevel(om.level);
  const prevLvl = om.level;
  const mult = expMultiplierFromGear(om.equippedGear || []);
  const raw = Math.floor(amount * mult);
  let res;
  if (raw >= 0) {
    res = addExperience({ level: om.level, exp: om.exp }, raw);
  } else {
    res = subtractExperience({ level: om.level, exp: om.exp }, Math.abs(raw));
    res.levelsGained = 0;
  }
  om.level = res.level;
  om.exp = res.exp;
  const nextStage = evolutionStageFromLevel(om.level).key;
  const nextFormTier = visualFormTierFromLevel(om.level);
  const formEvolved = prevFormTier !== nextFormTier && res.levelsGained > 0;
  const evolved = (prevStage !== nextStage || formEvolved) && res.levelsGained > 0;
  const nextForm = evolutionFormForMonster(om.templateId, nextFormTier);
  return {
    levelsGained: res.levelsGained ?? 0,
    evolved,
    prevStage,
    nextStage,
    evolutionFormName: nextForm.name,
    prevFormTier,
    nextFormTier,
    level: om.level,
    exp: om.exp,
    expToNext: expToAdvanceFrom(om.level),
    prevLevel: prevLvl,
    expDelta: raw,
  };
}

function bumpProfileBattleProgress(profile, won, lost, drew) {
  if (!profile) return;
  if (!profile.battleProgress) profile.battleProgress = defaultBattleProgress();
  profile.battleProgress.totalBattles += 1;
  if (drew) return;
  if (won) {
    profile.battleProgress.winStreak += 1;
    profile.battleProgress.lossStreak = 0;
  } else if (lost) {
    profile.battleProgress.lossStreak += 1;
    profile.battleProgress.winStreak = 0;
  }
}

function tuneProfileAiMeta(profile, payload) {
  if (!profile?.meta) return;
  const meta = profile.meta;
  if (payload.outcome === 1) {
    meta.consecutiveLosses = 0;
    meta.consecutiveEasyWins = payload.lastAiWasMuchWeaker === true ? meta.consecutiveEasyWins + 1 : 0;
  } else if (payload.outcome === 2) {
    meta.consecutiveLosses += 1;
    meta.consecutiveEasyWins = 0;
  }
  const cap = 0.12;
  if (meta.consecutiveLosses >= 2) meta.aiBias = Math.max(-cap, meta.aiBias - 0.03);
  if (meta.consecutiveEasyWins >= 3) meta.aiBias = Math.min(cap, meta.aiBias + 0.02);
  if (payload.outcome === 1 || payload.outcome === 2) {
    meta.lastAiPowerRatio =
      typeof payload.aiPowerRatio === 'number' ? payload.aiPowerRatio : meta.lastAiPowerRatio;
  }
}

export function awardBattleRewards(gameData, payload) {
  const gd = cloneGameData(gameData);
  const p1ProfileId = payload.p1ProfileId ?? gd.session.activeProfileId ?? null;
  const p2ProfileId = payload.mode === 'twoPlayer' ? payload.p2ProfileId ?? null : null;
  const walletP1 = walletForProfile(gd, p1ProfileId);
  const walletP2 = p2ProfileId ? walletForProfile(gd, p2ProfileId) : null;
  const profileP1 = p1ProfileId ? getPlayerProfile(gd, p1ProfileId) : null;
  const profileP2 = p2ProfileId ? getPlayerProfile(gd, p2ProfileId) : null;

  const p1Level = payload.p1Level ?? 1;
  const p2Level = payload.p2Level ?? 1;
  const oppLevelForP1 = p2Level;
  const oppLevelForP2 = p1Level;

  let coinsAwarded = 0;
  let coinsP1 = 0;
  let coinsP2 = 0;
  let bonusUnderdog = false;
  let expP1 = 12;
  let expP2 = 12;

  if (payload.mode === 'onePlayer') {
    const p1Lvl = Math.max(1, Math.floor(p1Level || 1));
    const cpuLvl = Math.max(1, Math.floor(oppLevelForP1 || p1Lvl));

    if (payload.outcome === 1) {
      const winCoins = coinWinForEnemyLevel(cpuLvl);
      walletP1.coins += winCoins;
      coinsP1 = winCoins;
      coinsAwarded = winCoins;
      expP1 = expWinForEnemyLevel(cpuLvl);
      expP2 = 0;
    } else if (payload.outcome === 2) {
      expP1 = -expLossPenalty(p1Lvl);
      expP2 = 0;
    } else {
      const drawCoins = Math.max(1, Math.floor(coinWinForEnemyLevel(cpuLvl) * 0.4));
      walletP1.coins += drawCoins;
      coinsP1 = drawCoins;
      coinsAwarded = drawCoins;
      expP1 = Math.max(1, Math.floor(expWinForEnemyLevel(cpuLvl) * 0.5));
      expP2 = 0;
    }
  } else {
    if (payload.outcome !== 'draw' && payload.p1TemplateId && payload.p2TemplateId) {
      const winTid = payload.outcome === 1 ? payload.p1TemplateId : payload.p2TemplateId;
      const loseTid = payload.outcome === 1 ? payload.p2TemplateId : payload.p1TemplateId;
      const wt = getMonsterTemplate(winTid);
      const lt = getMonsterTemplate(loseTid);
      if (wt && lt && rarityRank(wt.rarity) < rarityRank(lt.rarity)) {
        bonusUnderdog = true;
      }
    }

    if (payload.outcome === 'draw') {
      walletP1.coins += DRAW_COINS_EACH;
      if (walletP2) walletP2.coins += DRAW_COINS_EACH;
      coinsP1 = DRAW_COINS_EACH;
      coinsP2 = walletP2 ? DRAW_COINS_EACH : 0;
      coinsAwarded = coinsP1;
    } else if (payload.outcome === 1) {
      const winCoins = coinWinForEnemyLevel(oppLevelForP1) + (bonusUnderdog ? 3 : 0);
      walletP1.coins += winCoins;
      if (walletP2) walletP2.coins += LOSER_COINS;
      coinsP1 = winCoins;
      coinsP2 = walletP2 ? LOSER_COINS : 0;
      coinsAwarded = coinsP1;
    } else if (payload.outcome === 2) {
      walletP1.coins += LOSER_COINS;
      const winCoins = coinWinForEnemyLevel(oppLevelForP2) + (bonusUnderdog ? 3 : 0);
      if (walletP2) walletP2.coins += winCoins;
      coinsP1 = LOSER_COINS;
      coinsP2 = walletP2 ? winCoins : 0;
      coinsAwarded = coinsP1;
    }

    if (payload.outcome === 'draw') {
      expP1 = 12;
      expP2 = 12;
    } else if (payload.outcome === 1) {
      expP1 = expWinForEnemyLevel(oppLevelForP1) + (bonusUnderdog ? EXP_UNDERDOG_BONUS : 0);
      expP2 = -expLossPenalty(p2Level);
    } else if (payload.outcome === 2) {
      expP1 = -expLossPenalty(p1Level);
      expP2 = expWinForEnemyLevel(oppLevelForP2) + (bonusUnderdog ? EXP_UNDERDOG_BONUS : 0);
    }
  }

  const r1 = grantExpInWallet(walletP1, payload.p1OwnedId, expP1);
  const r2 = walletP2
    ? grantExpInWallet(walletP2, payload.p2OwnedId, expP2)
    : grantExpInWallet(walletP1, payload.p2OwnedId, expP2);

  gd.battleSummary.totalBattles += 1;

  if (payload.mode === 'onePlayer' && profileP1) {
    bumpProfileBattleProgress(
      profileP1,
      payload.outcome === 1,
      payload.outcome === 2,
      payload.outcome === 'draw',
    );
    if (payload.wasMainMiniBoss) {
      if (payload.outcome === 2 || payload.fled) recordMainMiniBossSkipNext(profileP1);
      else if (payload.outcome === 1) clearMainMiniBossSkipNext(profileP1);
    }
    tuneProfileAiMeta(profileP1, payload);
    gd.battleSummary.winStreakGuest = profileP1.battleProgress.winStreak;
    gd.battleSummary.lossStreakGuest = profileP1.battleProgress.lossStreak;
    gd.meta.aiBias = profileP1.meta.aiBias;
    gd.meta.consecutiveLosses = profileP1.meta.consecutiveLosses;
    gd.meta.consecutiveEasyWins = profileP1.meta.consecutiveEasyWins;
    gd.meta.lastAiPowerRatio = profileP1.meta.lastAiPowerRatio;
  } else if (payload.mode === 'twoPlayer') {
    if (profileP1) {
      bumpProfileBattleProgress(
        profileP1,
        payload.outcome === 1,
        payload.outcome === 2,
        payload.outcome === 'draw',
      );
    }
    if (profileP2) {
      bumpProfileBattleProgress(
        profileP2,
        payload.outcome === 2,
        payload.outcome === 1,
        payload.outcome === 'draw',
      );
    }
  }

  let mainChestDrop = null;
  if (
    payload.mode === 'onePlayer'
    && payload.outcome === 1
    && payload.mainChestAlreadyClaimed
    && payload.mainChestDrop
  ) {
    mainChestDrop = payload.mainChestDrop;
  }

  return {
    gameData: gd,
    summary: {
      coinsAwarded,
      coinsP1,
      coinsP2,
      bonusUnderdog,
      expP1: r1,
      expP2: r2,
      mainChestDrop,
    },
  };
}

/**
 * Roll and apply a main-game mini boss chest reward (called from battle screen before results).
 * @param {object} gameData
 * @param {string|null} profileId
 * @param {{ p1OwnedId?: string|null, enemyLevel?: number }} payload
 */
export function claimMainBattleMiniBossChest(gameData, profileId, payload = {}) {
  const gd = cloneGameData(gameData);
  const profile = profileId ? getPlayerProfile(gd, profileId) : null;
  const wallet = walletForProfile(gd, profileId);
  if (!profile || !wallet) return { gameData: gd, drop: null, error: 'Profile not found.' };

  const drop = rollMainBattleChestDrop(profile, { enemyLevel: payload.enemyLevel ?? 1 });
  const applied = { ...drop };

  if (drop.kind === 'gold') {
    wallet.coins += drop.amount;
    applied.coinsTotal = wallet.coins;
  } else if (drop.kind === 'exp') {
    applied.expPack = grantExpInWallet(wallet, payload.p1OwnedId ?? null, drop.amount);
  } else if (drop.kind === 'gear') {
    const gearGrant = grantGearToProfile(profile, drop.id);
    applied.duplicate = gearGrant.duplicate;
    applied.shardsGained = gearGrant.shardsGained ?? 0;
    applied.exchangedForShards = !!gearGrant.exchangedForShards;
    applied.gearName = gearGrant.gearName;
    if (gearGrant.duplicate && gearGrant.exchangedForShards) {
      const ml = getMonsterLadderState(profile);
      applied.ladderShardsTotal = ml.ladderShards;
      applied.label = `+${gearGrant.shardsGained} ladder shards`;
    } else {
      applied.duplicate = false;
    }
  } else if (drop.kind === 'monster') {
    const om = generateOwnedMonster(drop.id);
    applied.duplicate = wallet.ownedMonsters.some((m) => m.templateId === drop.id);
    wallet.ownedMonsters.push(om);
    applied.ownedId = om.id;
  }

  return { gameData: gd, drop: applied };
}

/**
 * Merge duplicate monsters (main + ladder inventory) into one primary instance.
 * @param {object} gameData
 * @param {string|null} profileId
 * @param {string} primaryOwnedId
 */
export function mergeOwnedMonsters(gameData, profileId, primaryOwnedId) {
  const gd = cloneGameData(gameData);
  const profile = profileId ? getPlayerProfile(gd, profileId) : null;
  const wallet = walletForProfile(gd, profileId);
  if (!profile || !wallet) return { gameData: gd, error: 'Profile not found.' };

  const ml = getMonsterLadderState(profile);
  const refs = [];
  const seenIds = new Set();
  for (const m of wallet.ownedMonsters || []) {
    if (seenIds.has(m.id)) continue;
    seenIds.add(m.id);
    refs.push({ monster: m, list: 'main' });
  }
  for (const m of ml.ownedMonsters || []) {
    if (seenIds.has(m.id)) continue;
    seenIds.add(m.id);
    refs.push({ monster: m, list: 'ladder' });
  }

  const clickedRef = refs.find((r) => r.monster.id === primaryOwnedId);
  if (!clickedRef) return { gameData: gd, error: 'Monster not found.' };

  const templateId = clickedRef.monster.templateId;
  const sameTemplateRefs = refs.filter((r) => r.monster.templateId === templateId);
  const survivorMonster = pickPrimaryInstance(sameTemplateRefs.map((r) => r.monster));
  if (!survivorMonster) return { gameData: gd, error: 'Monster not found.' };

  const primaryRef = refs.find((r) => r.monster.id === survivorMonster.id);
  const tier = clampMergeTier(primaryRef.monster.mergeTier);
  const cost = mergeCostForNextTier(tier);
  if (cost == null) return { gameData: gd, error: 'Already at max merge level (+9).' };

  const others = sameTemplateRefs.filter((r) => r.monster.id !== survivorMonster.id);
  if (others.length < cost) {
    return {
      gameData: gd,
      error: `Need ${cost} extra cop${cost === 1 ? 'y' : 'ies'} for +${tier + 1} (have ${others.length}).`,
    };
  }

  const sorted = [...others].sort((a, b) => {
    const td = clampMergeTier(a.monster.mergeTier) - clampMergeTier(b.monster.mergeTier);
    if (td !== 0) return td;
    return (a.monster.level ?? 1) - (b.monster.level ?? 1);
  });
  const removeIds = new Set(sorted.slice(0, cost).map((r) => r.monster.id));
  const survivorId = survivorMonster.id;

  wallet.ownedMonsters = (wallet.ownedMonsters || []).filter((m) => {
    if (!removeIds.has(m.id)) return true;
    if (profile.selectedMonsterId === m.id) profile.selectedMonsterId = survivorId;
    return false;
  });

  if (removeIds.has(ml.activeMonsterId)) {
    const primaryOnLadder = (ml.ownedMonsters || []).some((m) => m.id === survivorId);
    ml.activeMonsterId = primaryOnLadder
      ? survivorId
      : (ml.ownedMonsters || []).find((m) => !removeIds.has(m.id))?.id ?? null;
  }
  ml.ownedMonsters = (ml.ownedMonsters || []).filter((m) => !removeIds.has(m.id));

  primaryRef.monster.mergeTier = tier + 1;
  setMonsterLadderState(profile, ml);

  return {
    gameData: gd,
    mergeTier: tier + 1,
    consumed: cost,
    templateId,
  };
}
