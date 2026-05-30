import { StatusBar } from 'expo-status-bar';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Platform,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from 'react-native';
import { isMobileLayout as isLobbyMobileWidth } from './utils/responsive';
import BattleScreen, { AUTO_LEVEL_GRIND_MAX } from './components/BattleScreen';
import OnlineBattleScreen from './components/OnlineBattleScreen';
import MonsterGearScreen from './components/MonsterGearScreen';
import MonsterEquipmentScreen from './components/MonsterEquipmentScreen';
import PlayerInventoryScreen from './components/PlayerInventoryScreen';
import DungeonScreen from './components/DungeonScreen';
import GearMartModal from './components/GearMartModal';
import MonsterMarketModal from './components/MonsterMarketModal';
import HomeSetupScreen from './components/HomeSetupScreen';
import MonsterLadderHubScreen from './components/MonsterLadderHubScreen';
import QuestHubScreen from './components/QuestHubScreen';
import MonsterRescueHubScreen from './components/MonsterRescueHubScreen';
import MonsterRescueScreen from './components/MonsterRescueScreen';
import MonsterRescueRewardScreen from './components/MonsterRescueRewardScreen';
import MonsterRushScreen from './components/monsterRush/MonsterRushScreen';
import MonsterLadderCollectionScreen from './components/MonsterLadderCollectionScreen';
import MonsterLadderGearScreen from './components/MonsterLadderGearScreen';
import MonsterLadderChestRevealModal from './components/MonsterLadderChestRevealModal';
import DailyLuckySpinModal from './components/DailyLuckySpinModal';
import AudioSettingsScreen from './components/AudioSettingsScreen';
import PhaserBattleLabScreen from './components/PhaserBattleLabScreen';
import OnlineLobbyScreen from './components/OnlineLobbyScreen';
import OnlineRoomBanner from './components/OnlineRoomBanner';
import { loadOnlineSession } from './utils/onlineSession';
import {
  disconnectOnline,
  ensureOnlineSocket,
  emitBattleAction,
  resolveMyPlayerSlot,
  leaveOnlineRoom,
  subscribeOnline,
  syncOnlineProfile,
} from './utils/onlineSocketManager';
import RewardScreen from './components/RewardScreen';
import { buildAiFighter, fighterFromOwned } from './utils/fighterFromOwned';
import { mergeLadderMonsterParts } from './utils/monsterLadder/ladderProfile';
import {
  buildLadderEnemyFighter,
  fighterForLadderBattle,
  fighterFromActiveLadder,
} from './utils/monsterLadder/ladderFighters';
import {
  findOwnedMonsterForLadder,
  getActiveLadderBattler,
  getAllLadderSelectableMonsters,
} from './utils/monsterLadder/ladderProfile';
import {
  applyMonsterLadderBattleRewards,
  buyMonsterLadderChest,
  openMonsterLadderChest,
} from './utils/monsterLadder/ladderRewards';
import {
  getMonsterRescueState,
  isRescueStagePlayable,
} from './utils/monsterRescue/progress';
import { getMonsterRushState } from './utils/monsterRush/monsterRushProgress';
import { formatRescueWeeklyResetHint } from './utils/monsterRescue/rescueWeeklyReset';
import { getRescueStage, RESCUE_TOTAL_LEVELS } from './utils/monsterRescue/stages';
import {
  formatStageLabel,
  getCurrentStage,
  getMonsterLadderState,
  getStageKind,
  isLadderLevelLockedUntilReset,
  stageTypeBanner,
} from './utils/monsterLadder';
import { initAudio } from './utils/audioManager';
import { loadGameFonts } from './utils/gameFonts';
import { findTrainerNameConflict } from './utils/profileIntegrity';
import { pickFunnyWinTitle, winTitleForRarity } from './utils/rewards';
import {
  activeWallet,
  awardBattleRewards,
  applyMonsterRescueStageResult,
  applyMonsterRushRunForProfile,
  exchangeMonsterRushItemForProfile,
  claimMainBattleMiniBossChest,
  claimDungeonRewards,
  buyGearItem,
  sellGearItem,
  buyPassiveSkillBook,
  buyPetForProfile,
  buyGemForProfile,
  upgradeGemForProfile,
  socketGemInGearForProfile,
  unsocketGemFromGearForProfile,
  buyMonster as purchaseMonsterRow,
  equipPassiveSkillOnMonster,
  equipPetForMonster,
  spendPetExpDustForProfile,
  removePassiveFromMonster,
  unequipPetForMonster,
  cloneGameData,
  createPlayerProfile,
  enforceSingleActiveProfile,
  equipOwnedGear,
  getPlayerProfile,
  mergeMonsterParts,
  mergeOwnedMonsters,
  ensureLadderMonstersInMainInventory,
  repairPlayerProfileInventory,
  setActiveProfile,
  setPlayerKeyForProfile,
  setProfileSelectedMonster,
  unequipOwnedGear,
  updatePlayer,
  walletForProfile,
} from './utils/gameStorage';
import { normalizeProfileGear } from './utils/gearStorage';
import { loadGameSave, saveGameSave } from './src/services/saveService';
import { listCloudPlayers } from './src/services/cloudSaveService';
import {
  applyCloudSaveChoice,
  applyLocalSaveChoice,
  refreshProfileFromCloudIfBehind,
  resolveProfileLoginWithCloud,
} from './src/services/profileCloudMerge';
import { buildSaveConflictMessage, shouldApplyCloudOverLocal } from './src/services/saveConflict';
import {
  clearProfileSession,
  SESSION_SUPERSEDED_MESSAGE,
} from './utils/playerDeviceSession';
import { commitProfileDeleted, commitSave, setCloudSyncProfileID } from './src/services/syncCoordinator';
import { fetchLiveAppVersion, isAppVersionOutdated } from './src/services/appVersionCheck';
import { BAKED_APP_VERSION } from './utils/bakedAppVersion';
import { recordSyncClick } from './utils/syncActivityLevel';
import {
  defaultBattleMonsterId,
  getBattleRoster,
  getOwnedRoster,
  resolveBattleMonsterId,
} from './utils/rosterInventory';
import { emitSaveStatus, subscribeSaveStatus } from './src/services/saveStatusBus';
import ConfirmDialog from './components/ConfirmDialog';
import {
  normalizePlayerKey,
  profileNeedsPlayerKeyMigration,
  validatePlayerKeyPair,
  verifyPlayerKeyForProfile,
} from './utils/playerKey';
import PlayerKeyModal from './components/PlayerKeyModal';
import SaveConflictModal from './components/SaveConflictModal';
import { loadSaveApiConfig } from './utils/saveApiConfig';
import SyncStatusIndicator from './components/SyncStatusIndicator';
import { getMonsterTemplate, RARITY_UI, ROLE_LABELS } from './utils/monsterTemplates';
import { playSound } from './utils/sounds';
import { applyAudioSettings, loadAudioSettings } from './utils/audioSettings';
import { LADDER_CHEST_GOLD_COST, LADDER_CHEST_SHARD_COST } from './utils/monsterLadder/ladderConstants';
import { getLadderRewardDayKey } from './utils/monsterLadder/ladderDailyReset';
import {
  claimDailySpinPrize,
  isDailySpinEligible,
  rollDailySpinSegment,
} from './utils/dailyLoginSpin';
import {
  startBattleMusic,
  startLadderMusic,
  startMenuMusic,
  startRescueMusic,
  startRushMusic,
  stopMenuMusic,
  unlockAudio,
} from './utils/audioManager';
import { consumeMainMiniBossSkipNext } from './utils/mainBattleChest';

const LOBBY_PHASES = new Set(['menu', 'ladder', 'monsterRescueHub', 'monsterRush', 'online', 'gameOver', 'audioSettings']);
const RESCUE_PHASES = new Set(['monsterRescue', 'monsterRescueHub', 'monsterRescueReward']);

const BG = '#dceaf8';

function introLineFromFighter(f) {
  if (!f?.monsterTemplateId) return 'Silly monsters throw down!';
  const t = getMonsterTemplate(f.monsterTemplateId);
  if (!t) return 'Silly monsters throw down!';
  const ru = RARITY_UI[t.rarity];
  return `${ru.label} ${t.name} · ${ROLE_LABELS[t.role] ?? t.role}`;
}

function buildEncourageLines(gameData, winner, summary) {
  const lines = [];
  lines.push('One more battle?');
  const w = activeWallet(gameData);
  const ownedId = defaultBattleMonsterId(w);
  const owned = ownedId ? w.ownedMonsters?.find((m) => m.id === ownedId) : null;
  if (owned) {
    const t = getMonsterTemplate(owned.templateId);
    const need = summary?.expP1?.expToNext;
    if (typeof need === 'number' && need <= 120) lines.push(`Only ${need} EXP to the next level chunk!`);
    if (t) lines.push(`Your ${t.name} is getting stronger every fight.`);
  }
  return lines.slice(0, 4);
}

export default function App() {
  const { width } = useWindowDimensions();
  const lobbyMobile = isLobbyMobileWidth(width);
  const [gameData, setGameData] = useState(null);
  const gameDataRef = useRef(null);
  const [phase, setPhase] = useState('menu');
  const [isPhaserLab, setIsPhaserLab] = useState(() => (
    Platform.OS === 'web' && typeof window !== 'undefined' && window.location.hash === '#/phaser-lab'
  ));
  const [gameMode, setGameMode] = useState(/** @type {'twoPlayer'|'onePlayer'|'online'|'monsterLadder'} */ ('onePlayer'));
  const [ladderCollectionOpen, setLadderCollectionOpen] = useState(false);
  const [ladderGearOpen, setLadderGearOpen] = useState(false);
  const [ladderChestDrop, setLadderChestDrop] = useState(null);
  const [ladderChestAutoReveal, setLadderChestAutoReveal] = useState(false);
  const [ladderChestKicker, setLadderChestKicker] = useState('Monster Ladder Chest');
  const [onlineRoom, setOnlineRoom] = useState(null);
  const [onlineSlot, setOnlineSlot] = useState(() => loadOnlineSession()?.playerSlot ?? null);
  const [player1, setPlayer1] = useState(null);
  const [player2, setPlayer2] = useState(null);
  const [winner, setWinner] = useState(null);
  const [battleKey, setBattleKey] = useState(0);
  const [gearOpen, setGearOpen] = useState(false);
  const [inventoryOpen, setInventoryOpen] = useState(false);
  const [equipmentOpen, setEquipmentOpen] = useState(false);
  const [gearMartOpen, setGearMartOpen] = useState(false);
  const [gearMonsterId, setGearMonsterId] = useState(null);
  const [monsterMartOpen, setMonsterMartOpen] = useState(false);
  const [rewardTitle, setRewardTitle] = useState('');
  const [rewardSummary, setRewardSummary] = useState(null);
  const [autoLevelGrind, setAutoLevelGrind] = useState(false);
  const [currentBattleMode, setCurrentBattleMode] = useState(null);
  const [setupActiveSlot, setSetupActiveSlot] = useState(1);
  const [setupP1Id, setSetupP1Id] = useState(null);
  const [setupP2Id, setSetupP2Id] = useState(null);
  const [setupP1ProfileId, setSetupP1ProfileId] = useState(null);
  const [setupP2ProfileId, setSetupP2ProfileId] = useState(null);
  const unlockedProfileIdsRef = useRef(new Set());
  const dailySpinShownKeyRef = useRef(null);
  const dailySpinSkipSessionRef = useRef(null);
  const dailySpinProfileIdRef = useRef(null);
  const dailySpinPendingChestRef = useRef(null);
  const [dailySpinOpen, setDailySpinOpen] = useState(false);
  /** First main CPU battle after a full page load cannot roll a mini boss. */
  const skipMiniBossAfterReloadRef = useRef(true);
  const dismissedOnlineBattleRef = useRef(false);
  const onlineFinishHandledRef = useRef(false);
  const [keyModal, setKeyModal] = useState(null);
  const [keyModalError, setKeyModalError] = useState('');
  const [keyModalBusy, setKeyModalBusy] = useState(false);
  const [deleteBusyProfileId, setDeleteBusyProfileId] = useState(null);
  const [cloudPlayers, setCloudPlayers] = useState([]);
  const [cloudFetchLoading, setCloudFetchLoading] = useState(false);
  const [cloudFetchError, setCloudFetchError] = useState(null);
  const cloudFetchSeqRef = useRef(0);
  const [pendingDelete, setPendingDelete] = useState(null);
  const [noticeDialog, setNoticeDialog] = useState(null);
  const [rescueStageId, setRescueStageId] = useState(1);
  const [rescueRewardPayload, setRescueRewardPayload] = useState(null);
  const rescueFinishHandledRef = useRef(false);
  const [questHubOpen, setQuestHubOpen] = useState(false);
  const cloudMergeSessionRef = useRef(new Set());
  const [saveConflict, setSaveConflict] = useState(null);
  const [saveConflictBusy, setSaveConflictBusy] = useState(false);
  const cloudRefreshInFlightRef = useRef(false);
  const persistSaveSeqRef = useRef(0);
  /** Skip redundant cloud polls on the same device (e.g. mart sync then battle start). */
  const lastCloudFreshAtRef = useRef(new Map());
  const CLOUD_FRESH_COOLDOWN_MS = 30000;

  function markProfileCloudFresh(profileId) {
    if (profileId) lastCloudFreshAtRef.current.set(profileId, Date.now());
  }

  function shouldSkipCloudRefresh(profileId, { force = false } = {}) {
    if (force || !profileId) return false;
    const lastAt = lastCloudFreshAtRef.current.get(profileId);
    return lastAt != null && Date.now() - lastAt < CLOUD_FRESH_COOLDOWN_MS;
  }

  function markCloudFreshForSave(profileIDs) {
    const ids = Array.isArray(profileIDs) ? profileIDs : profileIDs ? [profileIDs] : [];
    for (const id of ids) {
      markProfileCloudFresh(id);
    }
  }
  const [appVersionState, setAppVersionState] = useState(Platform.OS === 'web' ? 'checking' : 'ok');
  const [liveAppVersion, setLiveAppVersion] = useState(null);
  const [cloudSyncDialog, setCloudSyncDialog] = useState(null);
  const CLOUD_SYNC_DONE_MESSAGE = 'Uploading successful, you may continue';

  const checkAppVersion = useCallback(async () => {
    if (Platform.OS !== 'web') {
      setAppVersionState('ok');
      return;
    }
    setAppVersionState('checking');
    const live = await fetchLiveAppVersion();
    if (!live) {
      setAppVersionState('ok');
      return;
    }
    if (isAppVersionOutdated(live, BAKED_APP_VERSION)) {
      setLiveAppVersion(live);
      setAppVersionState('stale');
      return;
    }
    setLiveAppVersion(live);
    setAppVersionState('ok');
  }, []);

  function handleAppVersionRefresh() {
    if (Platform.OS !== 'web' || typeof window === 'undefined') return;
    const base = window.location.pathname || '/';
    const hash = window.location.hash || '';
    window.location.replace(`${base}?v=${Date.now()}${hash}`);
  }

  function showNotice(title, message) {
    setNoticeDialog({ title, message });
  }

  const refreshCloudIfBehind = useCallback(async (gd, profileId, { quiet = true, force = false } = {}) => {
    if (!gd || !profileId) return { gameData: gd, refreshed: false };
    const profile = getPlayerProfile(gd, profileId);
    const pin = normalizePlayerKey(profile?.pin || profile?.playerKey);
    if (pin.length !== 4) return { gameData: gd, refreshed: false };
    if (shouldSkipCloudRefresh(profileId, { force })) {
      return { gameData: gd, refreshed: false };
    }
    if (cloudRefreshInFlightRef.current && !force) {
      return { gameData: gd, refreshed: false };
    }

    cloudRefreshInFlightRef.current = true;
    try {
      const res = await refreshProfileFromCloudIfBehind(gd, profileId, pin);
      const nextGd = res.gameData ?? gd;
      const refreshed = !!res.refreshed;
      if (nextGd !== gd || refreshed) {
        await saveGameSave(nextGd);
      }
      if (refreshed && nextGd && !quiet) {
        showNotice('Cloud sync', CLOUD_SYNC_DONE_MESSAGE);
      }
      markProfileCloudFresh(profileId);
      return { gameData: nextGd, refreshed };
    } finally {
      cloudRefreshInFlightRef.current = false;
    }
  }, []);

  const withCloudFreshProfile = useCallback(
    async (profileId, onFresh, options = {}) => {
      const { blockOnRefresh = false, forceCloudCheck = false } = options;
      const pid = profileId || setupP1ProfileId;
      if (!pid || !gameData) return null;
      const profile = getPlayerProfile(gameData, pid);
      const pin = normalizePlayerKey(profile?.pin || profile?.playerKey);
      if (pin.length !== 4) return onFresh(gameData);

      try {
        const result = await refreshCloudIfBehind(gameData, pid, {
          quiet: true,
          force: forceCloudCheck,
        });
        const refreshed = !!result.refreshed;
        const freshGd = result.gameData;
        if (freshGd !== gameData) {
          setGameData(freshGd);
          syncSetupMonstersFromProfiles(freshGd, pid, null, gameMode);
        }
        if (refreshed && blockOnRefresh) {
          setCloudSyncDialog({ phase: 'done', message: CLOUD_SYNC_DONE_MESSAGE });
          return null;
        }
        setCloudSyncDialog(null);
        return onFresh(freshGd);
      } catch {
        setCloudSyncDialog(null);
        return null;
      }
    },
    [gameData, setupP1ProfileId, gameMode, refreshCloudIfBehind],
  );

  function shopProfileId() {
    if (gameMode === 'onePlayer') return setupP1ProfileId || slotProfileId || activeProfileId || null;
    return slotProfileId || setupP1ProfileId || activeProfileId || null;
  }

  async function openMonsterMart() {
    if (!gameData) return;
    const pid = shopProfileId();
    const fresh = await withCloudFreshProfile(pid, (gd) => gd, {
      blockOnRefresh: true,
      forceCloudCheck: true,
    });
    if (!fresh) return;
    playSound('shop');
    setMonsterMartOpen(true);
  }

  async function openGearMart() {
    if (!gameData) return;
    const pid = shopProfileId();
    const fresh = await withCloudFreshProfile(pid, (gd) => gd, {
      blockOnRefresh: true,
      forceCloudCheck: true,
    });
    if (!fresh) return;
    playSound('shop');
    setGearMartOpen(true);
  }

  async function applyCloudBlockPayload(payload, gd = gameData) {
    const profileID = payload?.profileID;
    const cloudData = payload?.cloudData;
    if (!gd || !profileID || !cloudData) return;

    const profile = getPlayerProfile(gd, profileID);
    const pin = normalizePlayerKey(profile?.pin || profile?.playerKey);
    const comparison = payload?.comparison;
    if (shouldApplyCloudOverLocal(comparison, profile, cloudData)) {
      const res = applyCloudSaveChoice(gd, profileID, cloudData, pin);
      if (res.ok) {
        setGameData(res.gameData);
        await saveGameSave(res.gameData);
      }
      return;
    }

    setSaveConflict({
      profileId: profileID,
      playerKey: pin,
      cloudData,
      message: buildSaveConflictMessage(comparison, profile?.name || 'Player'),
    });
  }

  function syncSetupMonstersFromProfiles(gd, p1ProfileId, p2ProfileId, mode = gameMode) {
    const w1 = walletForProfile(gd, p1ProfileId);
    setSetupP1Id(defaultBattleMonsterId(w1));
    if (mode === 'onePlayer') {
      setSetupP2Id(null);
      return;
    }
    const w2 = walletForProfile(gd, p2ProfileId);
    const battle2 = getBattleRoster(w2);
    let m2 = w2.selectedMonsterId
      ? resolveBattleMonsterId(w2.ownedMonsters ?? [], w2.selectedMonsterId)
      : null;
    if (!m2 && battle2.length > 1) m2 = battle2[1].id;
    else if (!m2) m2 = battle2[0]?.id ?? null;
    setSetupP2Id(m2);
  }

  function handleGameModeChange(mode) {
    if (mode === 'twoPlayer') return;
    setGameMode(mode === 'online' ? 'online' : 'onePlayer');
    setSetupP2Id(null);
    setSetupP2ProfileId(null);
    setSetupActiveSlot(1);
  }

  const buildOnlineProfilePayload = useCallback(() => {
    if (!gameData || !setupP1ProfileId) return null;
    const prof = gameData.players.find((p) => p.id === setupP1ProfileId);
    const f = setupP1Id ? fighterFromSetupId(setupP1Id, setupP1ProfileId) : null;
    return {
      name: prof?.name ?? 'Player',
      profileId: setupP1ProfileId,
      ownedMonsterId: setupP1Id,
      monsterName: f?.displayName ?? 'Monster',
      fighter: f,
    };
  }, [gameData, setupP1ProfileId, setupP1Id]);

  useEffect(() => {
    void ensureOnlineSocket();
    const session = loadOnlineSession();
    if (session?.playerSlot) setOnlineSlot(session.playerSlot);
    return subscribeOnline((st) => {
      setOnlineRoom(st);
      if (st?.roomCode && loadOnlineSession()?.playerSlot) {
        setOnlineSlot(loadOnlineSession().playerSlot);
      }
    });
  }, []);

  useEffect(() => {
    if (!onlineRoom?.roomCode || phase === 'battle') return;
    const payload = buildOnlineProfilePayload();
    if (payload) syncOnlineProfile(payload);
  }, [onlineRoom?.roomCode, buildOnlineProfilePayload, setupP1Id, gameData, phase]);

  function handleOnlineBattleStart(roomState) {
    if (dismissedOnlineBattleRef.current) return;
    if (!roomState?.battle?.p1 || !roomState?.battle?.p2) return;
    if (roomState?.battle?.winner || roomState?.status === 'finished') return;
    const slot = loadOnlineSession()?.playerSlot ?? onlineSlot;
    setOnlineSlot(slot);
    setGameMode('online');
    setWinner(null);
    onlineFinishHandledRef.current = false;
    unlockAudio();
    startBattleMusic();
    setBattleKey((k) => k + 1);
    setPhase('battle');
  }

  function finalizeOnlineBattleResult(snap, serverWinner) {
    if (!snap || onlineFinishHandledRef.current) return;
    onlineFinishHandledRef.current = true;
    dismissedOnlineBattleRef.current = true;

    const myId = onlineSlot === 'p2' ? 2 : 1;
    const localPlayer = myId === 2 ? snap.p2 : snap.p1;
    const opponent = myId === 2 ? snap.p1 : snap.p2;
    const localWinner =
      serverWinner === 'draw' ? 'draw' : serverWinner === myId ? 1 : 2;
    const iWon = localWinner === 1;

    setPlayer1(localPlayer ?? null);
    setPlayer2(opponent ?? null);
    setWinner(localWinner);
    setRewardSummary({ coinsAwarded: 0, expP1: null, expP2: null, online: true, iWon });
    setRewardTitle(iWon ? 'Online Victory!' : localWinner === 'draw' ? 'Online Draw' : 'Online Defeat');
    leaveOnlineRoom();
    disconnectOnline();
    setOnlineRoom(null);
    setOnlineSlot(null);
    setGameMode('onePlayer');
    setPhase('gameOver');
  }

  const exitOnlineAndHome = useCallback(() => {
    dismissedOnlineBattleRef.current = true;
    onlineFinishHandledRef.current = true;
    leaveOnlineRoom();
    disconnectOnline();
    setOnlineRoom(null);
    setOnlineSlot(null);
    setGameMode('onePlayer');
    setWinner(null);
    setPlayer1(null);
    setPlayer2(null);
    setRewardSummary(null);
    setBattleKey((k) => k + 1);
    setPhase('menu');
  }, []);

  useEffect(() => {
    if (onlineRoom?.status !== 'battle') return;
    if (onlineRoom?.battle?.winner || dismissedOnlineBattleRef.current) return;
    const playerCount =
      typeof onlineRoom.playerCount === 'number'
        ? onlineRoom.playerCount
        : (onlineRoom.players?.p1?.connected ? 1 : 0) + (onlineRoom.players?.p2?.connected ? 1 : 0);
    if (playerCount < 2) return;
    if (!onlineRoom.battle?.p1 || !onlineRoom.battle?.p2) return;
    if (phase === 'battle' || phase === 'gameOver') return;
    if (phase === 'online') handleOnlineBattleStart(onlineRoom);
  }, [onlineRoom?.status, onlineRoom?.battle?.seq, onlineRoom?.battle?.winner, onlineRoom?.playerCount, phase]);

  useEffect(() => {
    if (gameMode !== 'online' || phase !== 'battle') return;
    const snap = onlineRoom?.battle;
    const winner = snap?.winner;
    if (!winner || onlineFinishHandledRef.current) return;
    finalizeOnlineBattleResult(snap, winner);
  }, [gameMode, phase, onlineRoom?.battle?.winner, onlineRoom?.battle?.seq, onlineSlot]);

  useEffect(() => {
    if (Platform.OS !== 'web' || typeof window === 'undefined') return undefined;
    const syncHashRoute = () => setIsPhaserLab(window.location.hash === '#/phaser-lab');
    syncHashRoute();
    window.addEventListener('hashchange', syncHashRoute);
    return () => window.removeEventListener('hashchange', syncHashRoute);
  }, []);

  useEffect(() => {
    if (Platform.OS !== 'web' || typeof document === 'undefined') return undefined;
    const html = document.documentElement;
    const body = document.body;
    const root = document.getElementById('root');
    const scrollableLobby = phase === 'menu' || phase === 'online' || phase === 'audioSettings' || phase === 'monsterRescueHub';
    const monsterRushShell = phase === 'monsterRush';
    if (monsterRushShell) {
      html.style.overflow = 'hidden';
      html.style.height = '100%';
      html.style.minHeight = '100%';
      body.style.overflow = 'hidden';
      body.style.height = '100%';
      body.style.minHeight = '100%';
      body.style.touchAction = 'manipulation';
      if (root) {
        root.style.overflow = 'hidden';
        root.style.height = '100%';
        root.style.minHeight = '100%';
        root.style.display = 'flex';
        root.style.flexDirection = 'column';
      }
    } else if (scrollableLobby) {
      // Lobby scrolls inside the app (ScrollView), not the document — fixed viewport + inner overflow.
      html.style.overflow = 'hidden';
      html.style.height = '100%';
      html.style.minHeight = '100%';
      body.style.overflow = 'hidden';
      body.style.height = '100%';
      body.style.minHeight = '100%';
      body.style.touchAction = 'manipulation';
      if (root) {
        root.style.overflow = 'hidden';
        root.style.height = '100%';
        root.style.minHeight = '100%';
        root.style.display = 'flex';
        root.style.flexDirection = 'column';
      }
      let tag = document.getElementById('mdb-lobby-scroll');
      if (!tag) {
        tag = document.createElement('style');
        tag.id = 'mdb-lobby-scroll';
        tag.textContent = `
          html, body { margin: 0; height: 100%; overflow: hidden; }
          #root { height: 100%; overflow: hidden; display: flex; flex-direction: column; }
          #root > div { flex: 1; min-height: 0; display: flex; flex-direction: column; }
          @supports (padding: env(safe-area-inset-bottom)) {
            #root > div { padding-bottom: env(safe-area-inset-bottom); }
          }
        `;
        document.head.appendChild(tag);
      }
    } else if (phase === 'battle') {
      html.style.overflow = 'hidden';
      html.style.height = '100%';
      body.style.overflow = 'hidden';
      body.style.height = '100%';
      body.style.touchAction = 'none';
      if (root) {
        root.style.overflow = 'hidden';
        root.style.height = '100%';
      }
    }
    return undefined;
  }, [phase]);

  useEffect(() => {
    if (loadAudioSettings().muted) {
      stopMenuMusic();
      return;
    }
    if (phase === 'ladder' || phase === 'dungeons') {
      startLadderMusic();
    } else if (phase === 'monsterRescue' || phase === 'monsterRescueHub' || phase === 'monsterRescueReward') {
      startRescueMusic();
    } else if (phase === 'monsterRush') {
      startRushMusic();
    } else if (LOBBY_PHASES.has(phase)) {
      startMenuMusic();
    } else if (phase === 'battle') {
      stopMenuMusic();
    }
  }, [phase]);

  useEffect(() => {
    void checkAppVersion();
  }, [checkAppVersion]);

  useEffect(() => {
    if (Platform.OS !== 'web' || typeof document === 'undefined') return undefined;
    const onVisible = () => {
      if (document.visibilityState !== 'visible') return;
      void checkAppVersion();
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, [checkAppVersion]);

  useEffect(() => {
    loadGameFonts();
    applyAudioSettings();
    initAudio();
    void loadSaveApiConfig();
    loadGameSave()
      .then(async (gd) => {
        const activeId = gd.session?.activeProfileId ?? gd.players?.[0]?.id ?? null;
        let normalized = activeId ? enforceSingleActiveProfile(gd, activeId) : gd;
        if (activeId) {
          try {
            const profile = getPlayerProfile(normalized, activeId);
            if (profile) repairPlayerProfileInventory(profile);
          } catch (err) {
            console.warn('[boot] repairPlayerProfileInventory failed', err);
          }
          try {
            normalized = (await refreshCloudIfBehind(normalized, activeId, { quiet: true })).gameData;
          } catch (err) {
            console.warn('[boot] refreshCloudIfBehind failed', err);
          }
        }
        setGameData(normalized);
        setSetupP1ProfileId(activeId);
        setSetupP2ProfileId(null);
        try {
          syncSetupMonstersFromProfiles(normalized, activeId, null, 'onePlayer');
        } catch (err) {
          console.warn('[boot] syncSetupMonstersFromProfiles failed', err);
        }
      })
      .catch((err) => {
        console.warn('[boot] loadGameSave failed', err);
        // Fall back to an empty game state so the UI does not hang on a blank screen.
        try {
          const fallback = { players: [], guest: null, session: {}, meta: {} };
          setGameData(fallback);
        } catch (e2) {
          console.warn('[boot] could not set fallback gameData', e2);
        }
      });
  }, []);

  const activeProfileId = gameData?.session?.activeProfileId ?? null;

  useEffect(() => {
    setCloudSyncProfileID(activeProfileId);
  }, [activeProfileId]);

  useEffect(() => {
    const profileId = activeProfileId || setupP1ProfileId;
    if (!profileId) return undefined;
    const onPointer = () => recordSyncClick(profileId);
    if (Platform.OS === 'web' && typeof document !== 'undefined') {
      document.addEventListener('click', onPointer, { capture: true });
      return () => document.removeEventListener('click', onPointer, { capture: true });
    }
    return undefined;
  }, [activeProfileId, setupP1ProfileId]);

  useEffect(() => {
    if (Platform.OS !== 'web' || typeof document === 'undefined') return undefined;
    const refreshActiveProfile = () => {
      const pid = setupP1ProfileId || gameData?.session?.activeProfileId;
      if (!pid || !gameData) return;
      void refreshCloudIfBehind(gameData, pid, { quiet: true, force: true }).then(({ gameData: next }) => {
        if (next && next !== gameData) setGameData(next);
      });
    };
    const onVisible = () => {
      if (document.visibilityState !== 'visible') return;
      refreshActiveProfile();
    };
    const onPageShow = (event) => {
      if (event?.persisted) refreshActiveProfile();
    };
    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('pageshow', onPageShow);
    return () => {
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('pageshow', onPageShow);
    };
  }, [gameData, setupP1ProfileId, refreshCloudIfBehind]);

  useEffect(() => {
    gameDataRef.current = gameData;
  }, [gameData]);

  useEffect(() => {
    if (phase !== 'menu' || !gameDataRef.current) return;
    const profileId = activeProfileId || setupP1ProfileId;
    if (!profileId) return;
    const gd = gameDataRef.current;
    void refreshCloudIfBehind(gd, profileId, { quiet: true }).then(({ gameData: next, refreshed }) => {
      if (next && next !== gd) {
        setGameData(next);
        syncSetupMonstersFromProfiles(next, profileId, null, gameMode);
      }
      if (!refreshed) {
        tryOfferDailySpin(profileId, 'menu');
      }
    });
  }, [phase, activeProfileId, setupP1ProfileId, refreshCloudIfBehind, gameMode]);

  function persistSave(nextGd, reason, profileIDs, opts = {}) {
    const saveSeq = persistSaveSeqRef.current + 1;
    persistSaveSeqRef.current = saveSeq;
    markCloudFreshForSave(profileIDs);
    setGameData(nextGd);
    void commitSave({
      reason,
      gameData: nextGd,
      profileIDs,
      forceCloud: !!opts.forceCloud,
    }).then(async (res) => {
      // Ignore stale async save completions so older commits cannot overwrite newer state.
      if (saveSeq !== persistSaveSeqRef.current) return;
      if (res?.gameData) setGameData(res.gameData);
      if (res?.cloudSynced) markCloudFreshForSave(profileIDs);
      if (res?.cloudBlocked && res.cloudBlockPayload) {
        await applyCloudBlockPayload(res.cloudBlockPayload, res.gameData || nextGd);
      }
    });
  }
  const slotProfileId =
    (setupActiveSlot === 1 ? setupP1ProfileId : setupP2ProfileId) ?? gameData?.players?.[0]?.id ?? null;
  const walletP1 = useMemo(
    () => (gameData ? walletForProfile(gameData, setupP1ProfileId) : null),
    [gameData, setupP1ProfileId],
  );
  const walletP2 = useMemo(
    () => (gameData ? walletForProfile(gameData, setupP2ProfileId) : null),
    [gameData, setupP2ProfileId],
  );
  const slotWallet = useMemo(() => {
    if (!gameData) return null;
    if (gameMode === 'onePlayer') {
      return walletForProfile(gameData, setupP1ProfileId);
    }
    return walletForProfile(gameData, slotProfileId);
  }, [gameData, gameMode, setupP1ProfileId, slotProfileId]);
  const wallet = slotWallet;
  const coins = wallet?.coins ?? 0;
  const gearInventory = wallet?.gearInventory ?? [];
  const gearProfileId = useMemo(() => {
    if (!gearMonsterId || !gameData) return slotProfileId;
    if (setupP1Id === gearMonsterId) return setupP1ProfileId;
    if (setupP2Id === gearMonsterId) return setupP2ProfileId;
    const roster = wallet?.ownedMonsters ?? [];
    if (roster.some((m) => m.id === gearMonsterId)) return slotProfileId;
    for (const p of gameData.players || []) {
      if ((p.ownedMonsters || []).some((m) => m.id === gearMonsterId)) return p.id;
    }
    return activeProfileId ?? slotProfileId;
  }, [gearMonsterId, gameData, setupP1Id, setupP2Id, setupP1ProfileId, setupP2ProfileId, activeProfileId, slotProfileId, wallet]);
  const gearProfile = useMemo(
    () => (gearProfileId && gameData ? getPlayerProfile(gameData, gearProfileId) : null),
    [gameData, gearProfileId],
  );
  const gearWallet = useMemo(
    () => (gearProfileId && gameData ? walletForProfile(gameData, gearProfileId) : wallet),
    [gameData, gearProfileId, wallet],
  );
  const gearOwnedMonsters = useMemo(() => getOwnedRoster(gearWallet), [gearWallet]);
  const gearOwnedMonster = useMemo(() => {
    const roster = gearWallet?.ownedMonsters;
    if (!gearMonsterId || !roster?.length) return null;
    return (
      roster.find((x) => x.id === gearMonsterId)
      ?? roster.find((x) => x.id === resolveBattleMonsterId(roster, gearMonsterId))
      ?? null
    );
  }, [gearWallet, gearMonsterId]);
  const gearBattleMonsterId = useMemo(() => {
    if (!gearProfile?.selectedMonsterId || !gearWallet?.ownedMonsters?.length) return null;
    return resolveBattleMonsterId(gearWallet.ownedMonsters, gearProfile.selectedMonsterId);
  }, [gearProfile, gearWallet]);
  const inventoryProfileId = useMemo(() => {
    if (gameMode === 'onePlayer') return setupP1ProfileId || slotProfileId;
    return slotProfileId || setupP1ProfileId || activeProfileId;
  }, [gameMode, setupP1ProfileId, slotProfileId, activeProfileId]);
  const inventoryProfile = useMemo(
    () =>
      inventoryProfileId && gameData
        ? getPlayerProfile(gameData, inventoryProfileId) ??
          walletForProfile(gameData, inventoryProfileId)
        : null,
    [gameData, inventoryProfileId],
  );
  const ladderAvailable = useMemo(() => {
    if (!gameData || !setupP1ProfileId) return false;
    const profile = getPlayerProfile(gameData, setupP1ProfileId);
    if (!profile) return false;
    return !isLadderLevelLockedUntilReset(getMonsterLadderState(profile));
  }, [gameData, setupP1ProfileId]);

  /** Dungeons — Death Knight always available; Ice Queen / Black Dragon on rotation. */
  const dungeonsAvailable = useMemo(() => {
    if (!gameData || !setupP1ProfileId) return false;
    const profile = getPlayerProfile(gameData, setupP1ProfileId);
    return !!profile;
  }, [gameData, setupP1ProfileId]);

  /** Beta: unlock all dungeon bosses on schedule bypass (Charming test profile). */
  const unlockAllDungeonBosses = useMemo(() => {
    if (!gameData || !setupP1ProfileId) return false;
    const profile = getPlayerProfile(gameData, setupP1ProfileId);
    if (!profile) return false;
    return String(profile.name ?? '').trim().toLowerCase() === 'charming';
  }, [gameData, setupP1ProfileId]);

  function markProfileUnlocked(profileId) {
    if (profileId) unlockedProfileIdsRef.current.add(profileId);
  }

  function isProfileUnlockedThisSession(profileId) {
    return unlockedProfileIdsRef.current.has(profileId);
  }

  function closeDailySpin() {
    setDailySpinOpen(false);
    dailySpinProfileIdRef.current = null;
    dailySpinPendingChestRef.current = null;
  }

  function handleDailySpinCollect() {
    const pending = dailySpinPendingChestRef.current;
    dailySpinPendingChestRef.current = null;
    closeDailySpin();
    if (pending?.drop) {
      setLadderChestDrop(pending.drop);
      setLadderChestKicker('Royal Crown Wheel');
      setLadderChestAutoReveal(true);
    }
  }

  function tryOfferDailySpin(profileId, source = 'menu') {
    if (!gameData || !profileId) return;
    const profile = getPlayerProfile(gameData, profileId);
    if (!isDailySpinEligible(profile)) return;

    const key = `${profileId}:${getLadderRewardDayKey()}`;
    if (dailySpinShownKeyRef.current === key) return;
    if (source === 'menu' && dailySpinSkipSessionRef.current === key) return;

    if (source === 'login') {
      dailySpinSkipSessionRef.current = null;
    }

    dailySpinShownKeyRef.current = key;
    dailySpinProfileIdRef.current = profileId;
    setDailySpinOpen(true);
  }

  function handleDailySpinLater() {
    const pid = dailySpinProfileIdRef.current;
    if (pid) {
      dailySpinSkipSessionRef.current = `${pid}:${getLadderRewardDayKey()}`;
    }
    closeDailySpin();
  }

  function handleDailySpinPrepare() {
    const seg = rollDailySpinSegment();
    return { segmentId: seg.id };
  }

  async function handleDailySpinClaim(segmentId) {
    const profileId = dailySpinProfileIdRef.current;
    if (!gameData || !profileId || !segmentId) return null;

    const res = claimDailySpinPrize(gameData, profileId, segmentId);
    if (res.error) {
      showNotice('Daily spin', res.error);
      return null;
    }

    const applied = getPlayerProfile(res.gameData, profileId);
    if (applied) repairPlayerProfileInventory(applied);

    persistSave(res.gameData, 'daily_login_spin', profileId);

    if (res.grant?.chestDrop) {
      dailySpinPendingChestRef.current = { drop: res.grant.chestDrop };
    } else if (res.grant?.message) {
      const extra = res.grant.ladderShardsTotal != null ? ` Shards: ${res.grant.ladderShardsTotal}.` : '';
      const inv = res.grant.chestInventory;
      const invLine = inv
        ? ` Stored chests — Gear x${inv.gear ?? 0}, Monster x${inv.monster ?? 0}.`
        : '';
      showNotice(
        'Daily spin saved',
        `${res.grant.message}.${extra}${invLine} Coins: ${getPlayerProfile(res.gameData, profileId)?.coins ?? '?'}.`,
      );
    }

    return { segment: res.segment, grant: res.grant };
  }

  function applyProfileSelection(profileId, gd = gameData) {
    if (!gd || !profileId) return;
    let next = setActiveProfile(gd, profileId);
    next = enforceSingleActiveProfile(next, profileId);
    setSetupP1ProfileId(profileId);
    setSetupP2ProfileId(null);
    setSetupP2Id(null);
    setSetupActiveSlot(1);
    const w = walletForProfile(next, profileId);
    setSetupP1Id(defaultBattleMonsterId(w));
    setGameData(next);
    persistSave(next, 'profile_selected', profileId);
    tryOfferDailySpin(profileId, 'login');
  }

  async function completeProfileEntry(profileId, playerKey, { fromCloudList = false } = {}) {
    if (!gameData || !profileId) return { ok: false };
    const res = await resolveProfileLoginWithCloud(gameData, profileId, playerKey);
    if (!res.ok) {
      if (res.saveConflict) {
        setSaveConflict({
          profileId: res.profileId,
          playerKey,
          cloudData: res.cloudData,
          message: res.error,
        });
        return { ok: false, saveConflict: true };
      }
      return { ok: false, error: res.error };
    }

    setGameData(res.gameData);
    markProfileUnlocked(res.profileId);
    cloudMergeSessionRef.current.add(res.profileId);
    setKeyModal(null);
    setKeyModalError('');
    await saveGameSave(res.gameData);
    persistSave(res.gameData, fromCloudList ? 'profile_loaded_cloud' : 'profile_loaded', res.profileId);
    emitSaveStatus('player_loaded');
    applyProfileSelection(res.profileId, res.gameData);
    return { ok: true, profileId: res.profileId };
  }

  function handleSelectProfile(profileId) {
    if (!gameData || !profileId) return;
    const profile = getPlayerProfile(gameData, profileId);
    if (!profile) return;
    const pin = normalizePlayerKey(profile.pin);
    if (pin.length !== 4) {
      markProfileUnlocked(profileId);
      applyProfileSelection(profileId);
      return;
    }
    setKeyModalBusy(true);
    void completeProfileEntry(profileId, pin).finally(() => setKeyModalBusy(false));
  }

  function handleRequestSelectProfile(profileId) {
    if (!gameData || !profileId) return;
    const profile = getPlayerProfile(gameData, profileId);
    if (!profile) return;

    if (profileNeedsPlayerKeyMigration(profile)) {
      setKeyModalError('');
      setKeyModal({ mode: 'migrate', profileId, playerName: profile.name });
      return;
    }

    if (isProfileUnlockedThisSession(profileId)) {
      handleSelectProfile(profileId);
      return;
    }

    setKeyModalError('');
    setKeyModal({ mode: 'login', profileId, playerName: profile.name });
  }

  function handleRequestSelectCloudProfile(cloudItem) {
    if (!cloudItem?.profileID) return;
    setKeyModalError('');
    setKeyModal({
      mode: 'login',
      profileId: cloudItem.profileID,
      playerName: cloudItem.playerName || 'Player',
      fromCloud: true,
      requiresKey: true,
    });
  }

  const handleFetchCloudPlayers = useCallback(async () => {
    const seq = cloudFetchSeqRef.current + 1;
    cloudFetchSeqRef.current = seq;
    setCloudFetchLoading(true);
    setCloudFetchError(null);
    await loadSaveApiConfig();
    const res = await listCloudPlayers();
    if (cloudFetchSeqRef.current !== seq) return;
    setCloudFetchLoading(false);
    if (!res.ok) {
      const msg = res.skipped
        ? 'Cloud save is not configured.'
        : 'Could not fetch cloud players. Please try again.';
      setCloudFetchError(msg);
      if (!res.skipped) emitSaveStatus('cloud_list_failed');
      return;
    }
    setCloudPlayers(res.players || []);
  }, []);

  useEffect(() => {
    void loadSaveApiConfig().then(() => handleFetchCloudPlayers());
  }, [handleFetchCloudPlayers]);

  const forceLogoutActiveProfile = useCallback(async () => {
    const profileId = setupP1ProfileId || activeProfileId;
    if (profileId) {
      unlockedProfileIdsRef.current.delete(profileId);
      await clearProfileSession(profileId);
    }
    setKeyModal(null);
    setKeyModalError('');
    setSetupP1ProfileId(null);
    setSetupP2ProfileId(null);
    setSetupP2Id(null);
    setQuestHubOpen(false);
    if (gameData) {
      const gd = cloneGameData(gameData);
      gd.session = gd.session || {};
      gd.session.activeProfileId = null;
      setGameData(gd);
    }
    setPhase('menu');
    showNotice('Signed out', SESSION_SUPERSEDED_MESSAGE);
  }, [setupP1ProfileId, activeProfileId, gameData]);

  useEffect(() => {
    return subscribeSaveStatus((status) => {
      if (status === 'cloud_synced') void handleFetchCloudPlayers();
      if (status === 'session_superseded') void forceLogoutActiveProfile();
    });
  }, [handleFetchCloudPlayers, forceLogoutActiveProfile]);

  function closeKeyModal() {
    if (keyModalBusy) return;
    setKeyModal(null);
    setKeyModalError('');
  }

  function handleKeyModalSubmit({ key, confirmKey }) {
    if (!keyModal?.profileId) return;
    const { mode, profileId } = keyModal;

    if (mode === 'migrate') {
      if (!gameData) return;
      const profile = getPlayerProfile(gameData, profileId);
      if (!profile) return;
      const pairErr = validatePlayerKeyPair(key, confirmKey ?? '');
      if (pairErr) {
        setKeyModalError(pairErr);
        return;
      }
      const pin = normalizePlayerKey(key);
      const next = setPlayerKeyForProfile(gameData, profileId, pin);
      markProfileUnlocked(profileId);
      persistSave(next, 'player_key_migrated', profileId);
      setKeyModal(null);
      setKeyModalError('');
      applyProfileSelection(profileId, next);
      return;
    }

    if (mode === 'login') {
      if (!key || key.length !== 4) {
        setKeyModalError('Enter your 4-digit Player Key.');
        return;
      }
      const localProfile = gameData ? getPlayerProfile(gameData, profileId) : null;
      if (localProfile && !verifyPlayerKeyForProfile(localProfile, key)) {
        setKeyModalError('Incorrect key. Please try again.');
        return;
      }
      setKeyModalBusy(true);
      void completeProfileEntry(profileId, key, { fromCloudList: !!keyModal.fromCloud })
        .then((res) => {
          if (!res.ok) {
            setKeyModalError(
              res.error || 'Could not load save. Check your connection.',
            );
          }
        })
        .finally(() => setKeyModalBusy(false));
      return;
    }

    if (mode === 'delete') {
      if (!key || key.length !== 4) {
        setKeyModalError('Enter your 4-digit Player Key.');
        return;
      }
      void finalizeProfileDelete(profileId, key, { requiresKey: true });
    }
  }

  async function finalizeCloudLogin(profileId, playerKey, { showModalOnFail = true } = {}) {
    if (keyModalBusy) return { ok: false, error: 'Login already in progress.' };
    if (!playerKey || playerKey.length !== 4) {
      setKeyModalError('Enter your 4-digit Player Key.');
      return { ok: false, error: 'Enter your 4-digit Player Key.' };
    }
    setKeyModalError('');
    const res = await completeProfileEntry(profileId, playerKey, { fromCloudList: true });
    if (!res.ok && !res.needsConflict) {
      const msg = res.error || 'Could not load player from cloud.';
      if (showModalOnFail) {
        setKeyModal({
          mode: 'login',
          profileId,
          playerName: keyModal?.playerName || 'Player',
          fromCloud: true,
          requiresKey: true,
        });
      }
      setKeyModalError(msg);
    }
    return res;
  }

  async function finalizeProfileDelete(profileId, playerKey, { requiresKey = true } = {}) {
    if (deleteBusyProfileId) return;
    setKeyModalBusy(true);
    setDeleteBusyProfileId(profileId);
    setKeyModalError('');

    try {
      const gd = gameData || (await loadGameSave());
      const res = await commitProfileDeleted(profileId, playerKey, gd, { requiresKey });
      if (!res.ok) {
        setKeyModalError(res.error || 'Delete failed.');
        return;
      }

      const next = res.gameData;
      unlockedProfileIdsRef.current.delete(profileId);
      setCloudPlayers((list) => list.filter((p) => p.profileID !== profileId));

      const remaining = next.players.map((p) => p.id);
      const fallback = next.session?.activeProfileId ?? remaining[0] ?? null;
      let nextP1 = setupP1ProfileId;
      let nextP2 = setupP2ProfileId;
      if (nextP1 === profileId) nextP1 = fallback;
      if (nextP2 === profileId) {
        nextP2 = remaining.find((id) => id !== nextP1) ?? fallback;
      }
      setSetupP1ProfileId(nextP1);
      setSetupP2ProfileId(nextP2);
      syncSetupMonstersFromProfiles(next, nextP1, nextP2);
      setGameData(next);
      setKeyModal(null);
    } finally {
      setKeyModalBusy(false);
      setDeleteBusyProfileId(null);
    }
  }

  function handleRequestDeleteProfile(profileId, meta = {}) {
    if (deleteBusyProfileId) return;
    const profile = gameData ? getPlayerProfile(gameData, profileId) : null;
    const name = profile?.name ?? meta.playerName ?? 'Player';
    setPendingDelete({ profileId, playerName: name, requiresKey: true, isCloud: false });
  }

  function handleRequestDeleteCloudProfile(cloudItem) {
    if (!cloudItem?.profileID || deleteBusyProfileId) return;
    setPendingDelete({
      profileId: cloudItem.profileID,
      playerName: cloudItem.playerName || 'Player',
      requiresKey: true,
      isCloud: true,
    });
  }

  async function handleMainMenuLogin(profileId, playerKey) {
    const id = String(profileId || '').trim();
    const pin = normalizePlayerKey(playerKey);
    if (!id || pin.length !== 4) return { ok: false, error: 'Enter ID and 4-digit PIN.' };
    const query = id.toLowerCase();
    const localProfile = gameData?.players?.find((p) => (
      String(p.id || '').toLowerCase() === query ||
      String(p.name || '').toLowerCase() === query
    )) ?? null;
    if (localProfile) {
      const localId = localProfile.id;
      if (profileNeedsPlayerKeyMigration(localProfile)) {
        const next = setPlayerKeyForProfile(gameData, localId, pin);
        markProfileUnlocked(localId);
        persistSave(next, 'player_key_migrated', localId);
        applyProfileSelection(localId, next);
        return { ok: true, profileId: localId };
      }
      if (!verifyPlayerKeyForProfile(localProfile, pin)) {
        return { ok: false, error: 'Incorrect PIN.' };
      }
      return completeProfileEntry(localId, pin);
    }
    const cloudProfile = cloudPlayers.find((p) => (
      String(p.profileID || '').toLowerCase() === query ||
      String(p.playerName || '').toLowerCase() === query
    ));
    return finalizeCloudLogin(cloudProfile?.profileID || id, pin, { showModalOnFail: false });
  }

  async function handleMainMenuCreate(name, playerKey) {
    if (!gameData) return { ok: false, error: 'Save is still loading.' };
    const trimmed = String(name || '').trim().slice(0, 24);
    const pin = normalizePlayerKey(playerKey);
    if (!trimmed || pin.length !== 4) return { ok: false, error: 'Enter name/ID and 4-digit PIN.' };

    const nameConflict = findTrainerNameConflict(trimmed, { gameData, cloudPlayers });
    if (nameConflict) {
      return {
        ok: false,
        error:
          nameConflict.source === 'cloud'
            ? `Trainer name "${trimmed}" is already taken. Log in or pick a different name.`
            : `Trainer name "${trimmed}" is already on this device. Log in instead.`,
      };
    }

    const res = createPlayerProfile(gameData, trimmed, pin);
    const newId = res.playerId;
    markProfileUnlocked(newId);
    const next = enforceSingleActiveProfile(res.gameData, newId);
    setSetupP1ProfileId(newId);
    setSetupP2ProfileId(null);
    syncSetupMonstersFromProfiles(next, newId, null, 'onePlayer');
    persistSave(next, 'profile_created', newId);
    applyProfileSelection(newId, next);
    return { ok: true, profileId: newId };
  }

  function handleUpdateProfileName(profileId, name) {
    if (!gameData) return;
    const next = updatePlayer(gameData, profileId, { name: name.trim().slice(0, 24) || 'Player' });
    persistSave(next, 'profile_renamed', profileId);
  }

  function tryBuyMonster(templateId, price) {
    if (!gameData) return;
    const res = purchaseMonsterRow(gameData, slotProfileId || null, templateId);
    if (res.error) {
      showNotice('Monster Mart', res.error);
      return;
    }
    let nextGd = res.gameData;
    const newOm = res.ownedMonster;
    const buyWallet = slotProfileId
      ? getPlayerProfile(nextGd, slotProfileId)
      : nextGd.guest;
    const battleId =
      newOm?.id && buyWallet?.ownedMonsters
        ? resolveBattleMonsterId(buyWallet.ownedMonsters, newOm.id)
        : null;
    if (battleId && slotProfileId) {
      nextGd = setProfileSelectedMonster(nextGd, slotProfileId, battleId);
      if (gameMode === 'onePlayer' || setupActiveSlot === 1) setSetupP1Id(battleId);
      else setSetupP2Id(battleId);
    } else if (battleId && !setupP1Id) {
      setSetupP1Id(battleId);
    }
    persistSave(nextGd, 'coins_changed', slotProfileId);
    playSound('shop');
    const monsterName = getMonsterTemplate(templateId)?.name ?? 'Monster';
    if (res.duplicate) {
      showNotice(
        'Monster Mart',
        `Duplicate ${monsterName} added — you now own ×${res.ownedCount ?? 2}.\n`
          + 'Duplicates stack for merging: open the Monster page and tap Merge for stronger stats.',
      );
    } else {
      showNotice('Monster Mart', `${monsterName} joined your team!`);
    }
  }

  function fighterFromSetupId(ownedId, profileId) {
    const w = walletForProfile(gameData, profileId);
    const roster = w.ownedMonsters ?? [];
    const battleId = resolveBattleMonsterId(roster, ownedId);
    const om = roster.find((x) => x.id === battleId);
    if (!om) return null;
    const prof = getPlayerProfile(gameData, profileId);
    return fighterFromOwned(om, prof);
  }

  function handleGearSelectMonster(id) {
    setGearMonsterId(id);
    if (!gameData) return;
    const profId =
      gameData.players?.find((p) => (p.ownedMonsters || []).some((m) => m.id === id))?.id
      ?? gearProfileId
      ?? null;
    if (!profId) return;
    const prof = getPlayerProfile(gameData, profId);
    const roster = getOwnedRoster(prof);
    const battleId = resolveBattleMonsterId(roster, id) ?? id;
    const nextGd = setProfileSelectedMonster(gameData, profId, battleId);
    persistSave(nextGd, 'monster_selected', profId);
    if (profId === setupP1ProfileId) setSetupP1Id(battleId);
    if (profId === setupP2ProfileId) setSetupP2Id(battleId);
  }

  function openMonsterGear(slot) {
    const id = slot === 1 ? setupP1Id : setupP2Id;
    if (!id) {
      showNotice('Monster Gear', `Pick a monster for Player ${slot} first.`);
      return;
    }
    const profileId = slot === 1 ? setupP1ProfileId : setupP2ProfileId;
    if (gameData && profileId) {
      const gd = cloneGameData(gameData);
      const profile = getPlayerProfile(gd, profileId) ?? walletForProfile(gd, profileId);
      if (profile) normalizeProfileGear(profile);
      setGameData(gd);
    }
    setGearMonsterId(id);
    setGearOpen(true);
  }

  function openMonsterGearForActiveSlot() {
    openMonsterGear(setupActiveSlot);
  }

  function openInventory() {
    if (!inventoryProfileId) {
      showNotice('Inventory', 'Select a player profile first.');
      return;
    }
    setInventoryOpen(true);
  }

  function openDungeons() {
    if (!setupP1ProfileId) {
      showNotice('Dungeons', 'Select or create a player profile first.');
      return;
    }
    if (!dungeonsAvailable) return;
    unlockAudio();
    setQuestHubOpen(false);
    setPhase('dungeons');
  }

  /** Grant a dungeon boss's rewards, persist, and return the drop list for display. */
  function handleClaimDungeonRewards(bossId) {
    if (!gameData || !setupP1ProfileId) return [];
    const res = claimDungeonRewards(gameData, setupP1ProfileId, bossId);
    if (res.error) {
      showNotice('Dungeon', res.error);
      return [];
    }
    persistSave(res.gameData, 'dungeon_cleared', setupP1ProfileId);
    return res.drops ?? [];
  }

  function openEquipFromInventory() {
    setInventoryOpen(false);
    openMonsterGearForActiveSlot();
  }

  function handleSellInventoryGear(instanceId) {
    if (!gameData || !inventoryProfileId) return;
    const res = sellGearItem(gameData, inventoryProfileId, instanceId);
    if (res.error) {
      showNotice('Sell gear', res.error);
      return;
    }
    persistSave(res.gameData, 'gear_sold', inventoryProfileId);
    showNotice('Gear sold', `+${res.coins} coins`);
  }

  function handleBuyGem(gemKeyId) {
    if (!gameData) return;
    const profileId = inventoryProfileId || shopProfileId();
    if (!profileId) {
      showNotice('Gem Shop', 'No player profile loaded.');
      return;
    }
    const res = buyGemForProfile(gameData, profileId, gemKeyId);
    if (res.error) {
      showNotice('Gem Shop', res.error);
      return;
    }
    persistSave(res.gameData, 'gem_bought', profileId);
    playSound('shop');
    showNotice('Gem acquired', 'Added to Inventory → Gems tab.');
  }

  function handleUpgradeGem(gemKeyId) {
    const profileId = inventoryProfileId || gearProfileId;
    if (!gameData || !profileId) {
      showNotice('Gem Upgrade', 'No player profile loaded.');
      return;
    }
    const res = upgradeGemForProfile(gameData, profileId, gemKeyId);
    if (res.error) {
      showNotice('Gem Upgrade', res.error);
      return;
    }
    persistSave(res.gameData, 'gem_upgraded', profileId);
    showNotice('Gem merged', `Now level ${res.level} · 🪙 ${res.coinCost}`);
  }

  function resolveProfileIdForGearInstance(gearInstanceId) {
    if (!gameData || !gearInstanceId) return inventoryProfileId || gearProfileId || shopProfileId();
    const candidateProfileIds = [
      inventoryProfileId,
      gearProfileId,
      setupP1ProfileId,
      setupP2ProfileId,
      activeProfileId,
      null,
      ...(gameData.players || []).map((p) => p.id),
    ];
    const seenProfileIds = new Set();
    return candidateProfileIds.find((profileId) => {
      const key = profileId ?? '__guest__';
      if (seenProfileIds.has(key)) return false;
      seenProfileIds.add(key);
      return walletForProfile(gameData, profileId)?.gearInventory?.some((g) => g.instanceId === gearInstanceId);
    }) ?? inventoryProfileId ?? gearProfileId ?? shopProfileId();
  }

  function handleSocketGem(gearInstanceId, socketIndex, gemKeyId) {
    const profileId = resolveProfileIdForGearInstance(gearInstanceId);
    if (!gameData || !profileId) {
      showNotice('Socket Gem', 'No player profile loaded.');
      return;
    }
    const res = socketGemInGearForProfile(
      gameData,
      profileId,
      gearInstanceId,
      socketIndex,
      gemKeyId,
    );
    if (res.error) {
      showNotice('Socket Gem', res.error);
      return;
    }
    persistSave(res.gameData, 'gem_socketed', profileId);
    const gemLabel = res.gem
      ? `${(res.gem.rarity ?? '').toUpperCase()} ${res.gem.stat ?? 'gem'}`.trim()
      : 'Gem';
    const gearName = res.gear?.name ?? 'gear';
    showNotice('Gem socketed', `${gemLabel} forged into ${gearName} · 🪙 ${res.price} paid`);
  }

  function handleUnsocketGem(gearInstanceId, socketIndex) {
    const profileId = resolveProfileIdForGearInstance(gearInstanceId);
    if (!gameData || !profileId) {
      showNotice('Remove Gem', 'No player profile loaded.');
      return;
    }
    const res = unsocketGemFromGearForProfile(
      gameData,
      profileId,
      gearInstanceId,
      socketIndex,
    );
    if (res.error) {
      showNotice('Remove Gem', res.error);
      return;
    }
    persistSave(res.gameData, 'gem_unsocketed', profileId);
    showNotice('Gem removed', `Returned to inventory · 🪙 ${res.price} paid`);
  }

  function handleBuyGearMart(gearId, rarity = 'rare', price = null, seed = null) {
    if (!gameData) return;
    const profileId = shopProfileId();
    const opts = {};
    if (seed) opts.seed = seed;
    if (typeof price === 'number') opts.price = price;
    const res = buyGearItem(gameData, profileId, gearId, rarity, opts);
    if (res.error) {
      showNotice('Gear & Skill Shop', res.error);
      return;
    }
    persistSave(res.gameData, 'gear_bought', profileId);
    playSound('shop');
    const g = res.gear;
    showNotice(
      'Gear acquired!',
      g ? `${g.rarity} ${g.name} added to inventory.` : 'New gear added to inventory.',
    );
  }

  function handleBuyPassiveSkillBook(skillId, rarity) {
    if (!gameData) return;
    const profileId = shopProfileId();
    const res = buyPassiveSkillBook(gameData, profileId, skillId, rarity);
    if (res.error) {
      showNotice('Passive Skill Book', res.error);
      return;
    }
    persistSave(res.gameData, 'passive_book_bought', profileId);
    playSound('shop');
    showNotice('Passive Skill Book Acquired!', `${res.book?.skillName ?? skillId} (${rarity}) added to inventory.`);
  }

  function handleEquipPassiveBook(bookInstanceId) {
    if (!gameData || !gearMonsterId) return;
    const res = equipPassiveSkillOnMonster(gameData, gearProfileId || null, gearMonsterId, bookInstanceId);
    if (res.error) {
      showNotice('Passive Skill', res.error);
      return;
    }
    persistSave(res.gameData, 'passive_equipped', gearProfileId || null);
    showNotice('Passive equipped', 'Skill book consumed — passive is now permanent on this monster.');
  }

  function handleRemovePassive(skillId) {
    if (!gameData || !gearMonsterId) return;
    const res = removePassiveFromMonster(gameData, gearProfileId || null, gearMonsterId, skillId);
    if (res.error) {
      showNotice('Passive Skill', res.error);
      return;
    }
    persistSave(res.gameData, 'passive_removed', gearProfileId || null);
    showNotice('Passive removed', 'The skill was deleted (book is not returned).');
  }

  function handleBuyPet(petId) {
    if (!gameData) return;
    const profileId = activeProfileId || setupP1ProfileId || null;
    const res = buyPetForProfile(gameData, profileId, petId);
    if (res.error) {
      showNotice('Pet Shop', res.error);
      return;
    }
    persistSave(res.gameData, 'pet_bought', profileId);
    playSound('shop');
    if (res.duplicate) {
      const dust = res.petExpDust ?? 0;
      const shards = res.monsterChestShards ?? 0;
      const parts = [
        dust ? `+${dust} pet EXP dust` : null,
        shards ? `+${shards} monster-chest shards` : null,
      ].filter(Boolean);
      showNotice(
        'Duplicate pet',
        parts.length ? parts.join(' · ') : 'Already owned.',
      );
    } else {
      showNotice('Pet acquired!', `${res.pet?.name ?? petId} added to your collection.`);
    }
  }

  function handleEquipPet(petInstanceId) {
    if (!gameData || !gearMonsterId) return;
    const res = equipPetForMonster(gameData, gearProfileId || null, gearMonsterId, petInstanceId);
    if (res.error) {
      showNotice('Pet', res.error);
      return;
    }
    persistSave(res.gameData, 'pet_equipped', gearProfileId || null);
    showNotice('Pet equipped', `${res.pet?.emoji ?? ''} ${res.pet?.name ?? 'Pet'} is now with this monster.`);
  }

  function handleUnequipPet() {
    if (!gameData || !gearMonsterId) return;
    const res = unequipPetForMonster(gameData, gearProfileId || null, gearMonsterId);
    if (res.error) {
      showNotice('Pet', res.error);
      return;
    }
    persistSave(res.gameData, 'pet_unequipped', gearProfileId || null);
    showNotice('Pet unequipped', 'Pet removed from this monster.');
  }

  function handleSpendPetDust(petInstanceId, dustAmount = 50) {
    if (!gameData || !gearProfileId) return;
    const res = spendPetExpDustForProfile(
      gameData,
      gearProfileId,
      petInstanceId,
      dustAmount,
    );
    if (res.error) {
      showNotice('Pet EXP', res.error);
      return;
    }
    persistSave(res.gameData, 'pet_exp_dust', gearProfileId);
    const msg = res.leveledUp
      ? `${res.pet?.name} leveled up to Lv ${res.pet?.level}!`
      : `+${res.expGained} pet EXP applied.`;
    showNotice('Pet EXP dust', msg);
  }

  function handleEquipGear(instanceId, slot, slotIndex = 0) {
    if (!gameData || !gearMonsterId) return;
    const res = equipOwnedGear(gameData, gearProfileId || null, gearMonsterId, instanceId, slot, slotIndex);
    if (res.error) {
      showNotice('Equipment', res.error);
      return;
    }
    persistSave(res.gameData, 'gear_equipped', gearProfileId || null);
  }

  function handleUnequipGear(slot, slotIndex = 0) {
    if (!gameData || !gearMonsterId) return;
    const res = unequipOwnedGear(gameData, gearProfileId || null, gearMonsterId, slot, slotIndex);
    if (res.error) {
      showNotice('Equipment', res.error);
      return;
    }
    persistSave(res.gameData, 'gear_equipped', gearProfileId || null);
  }

  function handleSellGear(instanceId) {
    if (!gameData || !gearProfileId) return;
    const res = sellGearItem(gameData, gearProfileId, instanceId);
    if (res.error) {
      showNotice('Sell gear', res.error);
      return;
    }
    persistSave(res.gameData, 'gear_sold', gearProfileId);
    showNotice('Gear sold', `+${res.coins} coins`);
  }

  function handleUnlockGearSlot() {
    if (!gameData || !gearMonsterId) return;
    const res = { error: 'All equipment slots are always available.' };
    if (res.error) {
      showNotice('Unlock slot', res.error);
      return;
    }
    persistSave(res.gameData, 'gear_slot_unlocked', gearProfileId || null);
    if (res.newSlotCount) {
      showNotice('Slot unlocked!', `This monster now has ${res.newSlotCount} gear slots.`);
    }
  }

  function handleMergeMonster(primaryOwnedId) {
    if (!gameData || !primaryOwnedId) return;
    const candidateProfileIds = [
      gearProfileId,
      activeProfileId,
      setupP1ProfileId,
      setupP2ProfileId,
      null,
      ...(gameData.players || []).map((p) => p.id),
    ];
    const seenProfileIds = new Set();
    const mergeProfileId = candidateProfileIds.find((profileId) => {
      const key = profileId ?? '__guest__';
      if (seenProfileIds.has(key)) return false;
      seenProfileIds.add(key);
      return walletForProfile(gameData, profileId)?.ownedMonsters?.some((m) => m.id === primaryOwnedId);
    }) ?? null;
    const res = mergeOwnedMonsters(gameData, mergeProfileId, primaryOwnedId);
    if (res.error) {
      showNotice('Merge monsters', res.error);
      return;
    }
    if (res.survivorId) setGearMonsterId(res.survivorId);
    persistSave(res.gameData, 'monster_merged', mergeProfileId);
    playSound('levelUp');
    showNotice('Merge complete', `Now +${res.mergeTier} merge (used ${res.consumed} duplicate${res.consumed === 1 ? '' : 's'}).`);
  }

  function handleEnsureLadderMonstersSync() {
    if (!gameData || !setupP1ProfileId) return;
    const gd = cloneGameData(gameData);
    const profile = getPlayerProfile(gd, setupP1ProfileId);
    if (!profile) return;
    const changed = repairPlayerProfileInventory(profile);
    setGameData(gd);
    if (changed) {
      void commitSave({
        reason: 'ladder_main_sync',
        gameData: gd,
        profileIDs: setupP1ProfileId,
        skipCloud: true,
      });
    }
  }

  function handleClaimMainMiniBossChest(payload) {
    if (!gameData || !setupP1ProfileId) return Promise.resolve(null);
    const res = claimMainBattleMiniBossChest(gameData, setupP1ProfileId, payload);
    if (res.error || !res.drop) return Promise.resolve(null);
    persistSave(res.gameData, 'main_mini_boss_chest', [setupP1ProfileId]);
    return Promise.resolve({ drop: res.drop, gameData: res.gameData });
  }

  function startGameFromSetup(options = {}) {
    if (!setupP1ProfileId) {
      showNotice('Player setup', 'Select or create a player profile first.');
      return;
    }
    const f1 = fighterFromSetupId(setupP1Id, setupP1ProfileId);
    if (!f1) {
      showNotice('Player setup', 'Player 1 needs a monster.');
      return;
    }
    const gdClone = JSON.parse(JSON.stringify(gameData));
    const profile = getPlayerProfile(gdClone, setupP1ProfileId);
    const consumedSkip = profile ? consumeMainMiniBossSkipNext(profile) : false;
    const skipAfterReload = skipMiniBossAfterReloadRef.current;
    if (skipAfterReload) skipMiniBossAfterReloadRef.current = false;
    const skipMiniBoss = !!options.skipMiniBoss || skipAfterReload || consumedSkip;
    const ai = buildAiFighter(f1, gdClone, setupP1ProfileId, { skipMiniBoss });
    if (!ai) {
      showNotice('Player setup', 'Could not build CPU opponent. Try again.');
      return;
    }
    if (consumedSkip) {
      setGameData(gdClone);
      void persistSave(gdClone, 'mini_boss_skip_consumed', [setupP1ProfileId]);
    }
    setGameMode('onePlayer');
    beginBattle(f1, ai, 'onePlayer');
  }

  function openQuests() {
    if (!setupP1ProfileId) {
      showNotice('Quests', 'Select or create a player profile first.');
      return;
    }
    unlockAudio();
    startMenuMusic();
    setQuestHubOpen(true);
  }

  function openMonsterLadder() {
    if (!setupP1ProfileId) {
      showNotice('Monster Ladder', 'Select or create a player profile first.');
      return;
    }
    unlockAudio();
    setQuestHubOpen(false);
    startLadderMusic();
    setPhase('ladder');
  }

  function openMonsterRescueHub() {
    if (!setupP1ProfileId) {
      showNotice('Monster Rescue', 'Select or create a player profile first.');
      return;
    }
    unlockAudio();
    setQuestHubOpen(false);
    startRescueMusic();
    setPhase('monsterRescueHub');
  }

  function openMonsterRush() {
    if (!setupP1ProfileId) {
      showNotice('Monster Rush', 'Select or create a player profile first.');
      return;
    }
    unlockAudio();
    setQuestHubOpen(false);
    startRushMusic();
    setPhase('monsterRush');
  }

  function handleMonsterRushRunComplete(summary) {
    if (!gameData || !setupP1ProfileId) return {};
    const res = applyMonsterRushRunForProfile(gameData, setupP1ProfileId, summary);
    if (res.error) {
      showNotice('Monster Rush', res.error);
      return {};
    }
    persistSave(res.gameData, 'monster_rush_run', setupP1ProfileId);
    playSound('lose');
    return {
      totalRushPoints: res.totalRushPoints,
      newBestDistance: res.newBestDistance,
      rushPointsEarned: res.rushPointsEarned,
    };
  }

  function handleMonsterRushExchange(itemId) {
    if (!gameData || !setupP1ProfileId) return;
    const res = exchangeMonsterRushItemForProfile(gameData, setupP1ProfileId, itemId);
    if (res.error) {
      showNotice('Rush Exchange', res.error);
      return;
    }
    persistSave(res.gameData, 'monster_rush_exchange', setupP1ProfileId);
    playSound('shop');
    showNotice('Rush Exchange', res.message);
  }

  function returnToQuestPicker() {
    setPhase('menu');
    setQuestHubOpen(true);
  }

  function startMonsterRescueStage(stageId) {
    if (!gameData || !setupP1ProfileId) return;
    const profile = getPlayerProfile(gameData, setupP1ProfileId);
    const rescue = getMonsterRescueState(profile);
    if (!isRescueStagePlayable(rescue, stageId)) {
      showNotice(
        'Monster Rescue',
        'This stage is closed for this week. Chest stages stay locked after the reward; other cleared stages cannot be replayed. A new run starts Sunday 6:00 PM (Singapore).',
      );
      return;
    }
    unlockAudio();
    startRescueMusic();
    setRescueStageId(stageId);
    setRescueRewardPayload(null);
    rescueFinishHandledRef.current = false;
    setPhase('monsterRescue');
  }

  async function handleMonsterRescueFinish(payload) {
    if (rescueFinishHandledRef.current) return;
    rescueFinishHandledRef.current = true;

    if (!gameData || !setupP1ProfileId) {
      showNotice('Monster Rescue', 'Could not save results — please select a player profile first.');
      setPhase('monsterRescueHub');
      return;
    }

    const won = !!payload?.won;
    const stageId = payload?.stageId ?? rescueStageId;
    let gd = gameData;
    let rewards = null;

    try {
      const applied = applyMonsterRescueStageResult(
        gameData,
        setupP1ProfileId,
        stageId,
        payload?.summary ?? {},
        won,
      );
      gd = applied.gameData;
      rewards = applied.rewards;
      setGameData(gd);
    } catch (err) {
      console.error('Monster Rescue reward apply failed', err);
      showNotice('Monster Rescue', 'Could not apply stage rewards. Returning to stage list.');
      setPhase('monsterRescueHub');
      return;
    }

    setRescueRewardPayload({
      won,
      timeUp: !!payload?.timeUp,
      stageId,
      rewards,
      summary: payload?.summary,
      saveMessage: 'Saving progress…',
    });
    setPhase('monsterRescueReward');

    if (rewards?.chestDrop) {
      setLadderChestDrop(rewards.chestDrop);
      setLadderChestKicker('Monster Rescue Chest');
      setLadderChestAutoReveal(true);
    }
    if (rewards?.expPack?.levelsGained > 0) playSound('levelUp');

    let saveMessage = 'Progress saved on this device.';
    try {
      const saveRes = await commitSave({
        reason: 'monster_rescue_stage',
        gameData: gd,
        profileIDs: setupP1ProfileId,
      });
      if (saveRes?.cloudSynced) {
        saveMessage = 'Progress saved and synced to cloud automatically.';
      } else if (saveRes?.cloudNeedsKey) {
        saveMessage =
          'Progress saved on this device. Set a 4-digit Player Key on the home screen for automatic cloud backup.';
      } else if (saveRes?.cloudFailed) {
        saveMessage = 'Saved on this device. Cloud sync failed — your next cleared stage will try again.';
      }
    } catch (err) {
      console.error('Monster Rescue save failed', err);
      saveMessage = 'Rewards applied locally. Cloud save failed — try again from the home screen.';
    }

    setRescueRewardPayload((prev) => (prev ? { ...prev, saveMessage } : prev));
  }

  function exitMonsterRescueToHub() {
    setRescueRewardPayload(null);
    rescueFinishHandledRef.current = false;
    setPhase('monsterRescueHub');
  }

  function continueMonsterRescueAfterWin(stageId) {
    const id = Math.floor(stageId || 1);
    if (id >= RESCUE_TOTAL_LEVELS) {
      showNotice('Monster Rescue', 'You cleared every stage this week! Great run.');
      exitMonsterRescueToHub();
      return;
    }
    const nextId = id + 1;
    const profile = getPlayerProfile(gameData, setupP1ProfileId);
    const rescue = getMonsterRescueState(profile);
    if (isRescueStagePlayable(rescue, nextId)) {
      startMonsterRescueStage(nextId);
      return;
    }
    showNotice(
      'Monster Rescue',
      'The next stage is not available yet. Check the stage list for what you can play this week.',
    );
    exitMonsterRescueToHub();
  }

  function returnToLadder() {
    setWinner(null);
    setPlayer1(null);
    setPlayer2(null);
    setRewardSummary(null);
    setLadderChestDrop(null);
    setLadderChestAutoReveal(false);
    setBattleKey((k) => k + 1);
    startLadderMusic();
    setPhase('ladder');
  }

  function playAgainFromReward() {
    const wasOnline = !!rewardSummary?.online;
    const skipMiniBoss = !!rewardSummary?.mainMiniBossLost;
    setWinner(null);
    setPlayer1(null);
    setPlayer2(null);
    const wasLadder = !!rewardSummary?.monsterLadder;
    setRewardSummary(null);
    setLadderChestDrop(null);
    setLadderChestAutoReveal(false);
    if (wasOnline) {
      setPhase('menu');
    } else if (wasLadder) {
      startMonsterLadderBattle();
    } else {
      startGameFromSetup({ skipMiniBoss });
    }
  }

  function clearLadderBattlerPin() {
    if (!gameData || !setupP1ProfileId) return;
    const gd = cloneGameData(gameData);
    const profile = getPlayerProfile(gd, setupP1ProfileId);
    if (!profile) return;
    const ml = getMonsterLadderState(profile);
    ml.activeBattlerPinned = false;
    profile.monsterLadder = ml;
    persistSave(gd, 'ladder_active_monster', setupP1ProfileId);
    setGameData(gd);
  }

  function setActiveLadderMonster(ownedId) {
    if (!gameData || !setupP1ProfileId) return;
    const gd = cloneGameData(gameData);
    const profile = getPlayerProfile(gd, setupP1ProfileId);
    if (!profile) return;
    const ml = getMonsterLadderState(profile);
    if (!findOwnedMonsterForLadder(profile, ownedId)) return;
    ml.activeMonsterId = ownedId;
    ml.activeBattlerPinned = true;
    profile.monsterLadder = ml;
    persistSave(gd, 'ladder_active_monster', setupP1ProfileId);
    setGameData(gd);
  }

  function equipLadderGear(monsterId, gearId) {
    if (!gameData || !setupP1ProfileId) return;
    const gd = cloneGameData(gameData);
    const profile = getPlayerProfile(gd, setupP1ProfileId);
    if (!profile) return;
    const ml = getMonsterLadderState(profile);
    const monster = profile.ownedMonsters.find((m) => m.id === monsterId);
    if (!monster) return;
    if (!ml.ownedGear.includes(gearId)) {
      showNotice('Ladder Gear', 'This ladder gear is not owned.');
      return;
    }
    if (!Array.isArray(monster.equippedLadderGear)) monster.equippedLadderGear = [];
    if (monster.equippedLadderGear.includes(gearId)) return;
    const maxSlots = Math.max(1, Math.min(6, monster.gearSlotCount ?? 4));
    if (monster.equippedLadderGear.length >= maxSlots) {
      showNotice('Ladder Gear', 'All ladder gear slots are full.');
      return;
    }
    monster.equippedLadderGear.push(gearId);
    profile.monsterLadder = ml;
    persistSave(gd, 'ladder_gear_equipped', setupP1ProfileId);
    setGameData(gd);
    playSound('shop');
  }

  function unequipLadderGear(monsterId, gearId) {
    if (!gameData || !setupP1ProfileId) return;
    const gd = cloneGameData(gameData);
    const profile = getPlayerProfile(gd, setupP1ProfileId);
    if (!profile) return;
    const ml = getMonsterLadderState(profile);
    const monster = profile.ownedMonsters.find((m) => m.id === monsterId);
    if (!monster || !Array.isArray(monster.equippedLadderGear)) return;
    monster.equippedLadderGear = monster.equippedLadderGear.filter((id) => id !== gearId);
    profile.monsterLadder = ml;
    persistSave(gd, 'ladder_gear_unequipped', setupP1ProfileId);
    setGameData(gd);
  }

  function handleBuyLadderChest(type) {
    if (!gameData || !setupP1ProfileId) return;
    const res = buyMonsterLadderChest(gameData, setupP1ProfileId, type);
    if (res.error) {
      showNotice('Monster Ladder', res.error);
      return;
    }
    persistSave(res.gameData, 'ladder_chest_bought', setupP1ProfileId);
    playSound('shop');
  }

  function handleOpenLadderChest(type) {
    if (!gameData || !setupP1ProfileId) return;
    const res = openMonsterLadderChest(gameData, setupP1ProfileId, type);
    if (res.error) {
      showNotice('Monster Ladder', res.error);
      return;
    }
    persistSave(res.gameData, 'ladder_chest_opened', setupP1ProfileId);
    setLadderChestDrop(res.drop);
    playSound('reward');
    if (res.drop?.exchangedForShards && res.drop.shardsGained > 0) {
      showNotice(
        'Duplicate gear',
        `${res.drop.name ?? 'Gear'} → +${res.drop.shardsGained} ladder shards (${getMonsterLadderState(getPlayerProfile(res.gameData, setupP1ProfileId))?.ladderShards ?? 0} total)`,
      );
    }
  }

  function openLadderMonsterGear() {
    if (!gameData || !setupP1ProfileId) return;
    const profile = getPlayerProfile(gameData, setupP1ProfileId);
    const battler = getActiveLadderBattler(profile, setupP1Id);
    if (!battler?.id) {
      showNotice('Monster Gear', 'Pick a ladder monster first.');
      return;
    }
    setGearMonsterId(battler.id);
    setGearOpen(true);
  }

  function startMonsterLadderBattle() {
    if (!setupP1ProfileId || !gameData) {
      showNotice('Monster Ladder', 'Select a player profile first.');
      return;
    }
    const profile = getPlayerProfile(gameData, setupP1ProfileId);
    const ml = getMonsterLadderState(profile);
    if (isLadderLevelLockedUntilReset(ml)) {
      showNotice('Monster Ladder', "You cleared today's ladder level. The next level unlocks at 6PM Singapore time.");
      setPhase('ladder');
      return;
    }
    const owned = getActiveLadderBattler(profile, setupP1Id);
    if (!owned) {
      showNotice('Monster Ladder', 'Own at least one monster on the home screen or in Collection.');
      return;
    }
    const f1 = fighterFromActiveLadder(profile, setupP1Id);
    if (!f1) {
      showNotice('Monster Ladder', 'Could not build your ladder fighter.');
      return;
    }
    const stage = getCurrentStage(ml);
    const enemy = buildLadderEnemyFighter(stage.stageIndex, f1);
    if (!enemy) {
      showNotice('Monster Ladder', 'Could not build stage enemy.');
      return;
    }
    setGameMode('monsterLadder');
    beginBattle(f1, enemy, 'monsterLadder');
  }

  async function beginBattle(p1Fighter, p2Fighter, modeOverride = gameMode) {
    const profileId = setupP1ProfileId || gameData?.session?.activeProfileId;
    const fresh = await withCloudFreshProfile(profileId, (gd) => gd);
    if (!fresh) return;

    const arm = (p) => {
      if (!p?.stats) return null;
      const monsterParts = p.isLadderMonster || p.isLadderEnemy
        ? {
            ...mergeLadderMonsterParts(p.monsterTemplateId, p.monsterParts || {}),
            cosmetics: Array.isArray(p.monsterParts?.cosmetics) ? [...p.monsterParts.cosmetics] : [],
          }
        : mergeMonsterParts(p.monsterTemplateId, p.monsterParts || {});
      return {
        ...p,
        monsterParts: {
          ...monsterParts,
          cosmetics: Array.isArray(p.monsterParts?.cosmetics)
            ? [...p.monsterParts.cosmetics]
            : Array.isArray(monsterParts.cosmetics)
              ? [...monsterParts.cosmetics]
              : [],
        },
        hp: p.stats.hp,
        maxHp: p.stats.hp,
        mp: p.stats.mp,
        maxMp: p.stats.mp,
        combo: 0,
      };
    };
    if (!arm(p1Fighter) || !arm(p2Fighter)) {
      showNotice('Player setup', 'Could not start battle — missing fighter data.');
      return;
    }
    unlockAudio();
    startBattleMusic({
      kind: p2Fighter?.ladderStageKind,
      mainMiniBoss: !!p2Fighter?.isMainMiniBoss,
    });
    setPlayer1(arm(p1Fighter));
    setPlayer2(arm(p2Fighter));
    setWinner(null);
    setCurrentBattleMode(modeOverride);
    setBattleKey((k) => k + 1);
    setPhase('battle');
    if (fresh) {
      const ids = [setupP1ProfileId, modeOverride === 'twoPlayer' ? setupP2ProfileId : null].filter(Boolean);
      // Battle start is only a local checkpoint; cloud sync here can race with
      // the post-battle reward save and overwrite newly earned coins.
      void commitSave({ reason: 'battle_start', gameData: fresh, profileIDs: ids, skipCloud: true });
    }
  }

  function handleBattleFinish({
    winner: outcome,
    player1Snapshot,
    player2Snapshot,
    battleExtras,
  }) {
    if (battleExtras?.online) {
      finalizeOnlineBattleResult(
        { p1: player1Snapshot, p2: player2Snapshot },
        battleExtras.serverWinner ?? outcome,
      );
      return;
    }

    setPlayer1(player1Snapshot);
    setPlayer2(player2Snapshot);
    setWinner(outcome);

    if (!gameData && !battleExtras?.gameDataAfterChest) {
      setPhase('gameOver');
      return;
    }

    const baseGameData = battleExtras?.gameDataAfterChest ?? gameData;

    const resolvedBattleMode = battleExtras?.mode ?? currentBattleMode ?? gameMode;
    const ladderMode = resolvedBattleMode === 'monsterLadder' || gameMode === 'monsterLadder';
    if (ladderMode) {
      let rewardedGd = baseGameData;
      let summary = null;
      try {
        const res = applyMonsterLadderBattleRewards(baseGameData, setupP1ProfileId, {
          outcome,
          enemyLevel: player2Snapshot?.level ?? 1,
          ownedMonsterId: player1Snapshot?.ownedMonsterId ?? null,
        });
        rewardedGd = res.gameData;
        summary = res.summary;
      } catch (err) {
        console.error('Monster Ladder rewards failed', err);
        showNotice('Monster Ladder', 'Could not apply battle rewards. Returning to the ladder map.');
        returnToLadder();
        return;
      }

      persistSave(rewardedGd, 'monster_ladder_battle_ended', [setupP1ProfileId]);
      setGameData(rewardedGd);

      const iWon = outcome === 1;
      setRewardSummary({
        monsterLadder: true,
        won: iWon,
        stage: summary?.stage,
        expPack: summary?.expPack,
        ladderGoldGain: summary?.ladderGoldGain ?? 0,
        ladderGoldTotal: summary?.ladderGoldTotal ?? 0,
        chestDrop: summary?.chestDrop,
        chestAwarded: summary?.chestAwarded,
        chestBlocked: summary?.chestBlocked,
        shardsGained: summary?.shardsGained ?? 0,
        ladderShardsTotal: summary?.ladderShardsTotal ?? 0,
        coinsAwarded: summary?.ladderGoldGain ?? 0,
        expP1: summary?.expPack,
      });
      if (summary?.chestDrop) {
        setLadderChestDrop(summary.chestDrop);
        setLadderChestKicker(
          summary.chestDrop.kind === 'pet'
            ? 'Mythic Pet Drop'
            : summary.chestDrop.kind === 'pet_exp_dust'
              ? 'Pet EXP Dust'
              : summary.chestDrop.kind === 'gear'
                ? 'Mini Boss Gear Chest'
                : 'Boss Monster Chest',
        );
        setLadderChestAutoReveal(true);
        playSound('reward');
      } else if (iWon && summary?.chestBlocked) {
        showNotice('Monster Ladder', 'Daily chest already claimed today. Resets at 6:00 PM (Singapore time).');
      } else if (iWon && summary?.chestAwarded && !summary?.chestDrop) {
        showNotice(
          'Monster Ladder',
          summary?.chestBlocked
            ? 'Daily chest already claimed today. Resets at 6:00 PM (Singapore time).'
            : 'Boss chest could not be opened. Your progress was saved — try Chest Exchange on the ladder map.',
        );
      }
      const st = summary?.stage;
      const stKind = st ? getStageKind(st.subLevel) : 'normal';
      const stLabel = st ? `Level ${formatStageLabel(st.mainLevel, st.subLevel)}` : '';
      const stBanner = stageTypeBanner(stKind);
      setRewardTitle(
        outcome === 'draw'
          ? `${stLabel || 'Stage'} — stalemate`
          : iWon
            ? `${stLabel || 'Stage'} cleared${stBanner ? ` · ${stBanner}` : ''}!`
            : `${stLabel || 'Stage'} — try again`,
      );
      playSound(iWon ? 'win' : outcome === 2 ? 'lose' : 'shop');
      if (summary?.expPack?.levelsGained > 0) playSound('levelUp');
      setPhase('gameOver');
      return;
    }

    const lastAiWeak = resolvedBattleMode === 'onePlayer' && (player2Snapshot?.aiPowerRatio ?? 2) < 0.82;
    const wasMainMiniBoss =
      resolvedBattleMode === 'onePlayer' && !!battleExtras?.mainMiniBoss;
    const mainMiniBossLost =
      wasMainMiniBoss && (outcome === 2 || !!battleExtras?.fled);

    const { gameData: nextGd, summary } = awardBattleRewards(baseGameData, {
      outcome: outcome,
      mode: resolvedBattleMode === 'onePlayer' ? 'onePlayer' : 'twoPlayer',
      wasMainMiniBoss,
      fled: !!battleExtras?.fled,
      p1ProfileId: setupP1ProfileId,
      p2ProfileId: setupP2ProfileId,
      p1OwnedId: player1Snapshot?.ownedMonsterId ?? null,
      p2OwnedId: player2Snapshot?.ownedMonsterId ?? null,
      p1TemplateId: player1Snapshot?.monsterTemplateId ?? null,
      p2TemplateId: player2Snapshot?.monsterTemplateId ?? null,
      p1Level: player1Snapshot?.level ?? 1,
      p2Level: player2Snapshot?.level ?? 1,
      lastAiWasMuchWeaker: lastAiWeak,
      aiPowerRatio: player2Snapshot?.aiPowerRatio ?? null,
      mainChestAlreadyClaimed: !!battleExtras?.mainChestClaimed,
      mainChestDrop: battleExtras?.mainChestDrop ?? null,
    });

    const profileIds = [setupP1ProfileId, setupP2ProfileId].filter(Boolean);
    persistSave(nextGd, 'battle_ended', profileIds);
    setGameData(nextGd);

    setRewardSummary({
      ...summary,
      mainMiniBossLost,
    });

    const winTpl =
      outcome === 1
        ? getMonsterTemplate(player1Snapshot?.monsterTemplateId)
        : outcome === 2
          ? getMonsterTemplate(player2Snapshot?.monsterTemplateId)
          : null;
    const title =
      outcome === 'draw' ? 'Peace Treaty Signed' : winTpl ? winTitleForRarity(winTpl.rarity) : pickFunnyWinTitle();
    setRewardTitle(title);
    playSound('shop');
    if (summary?.expP1?.levelsGained > 0 || summary?.expP2?.levelsGained > 0) {
      playSound('levelUp');
    }
    const levelAfter = summary?.expP1?.level ?? 1;
    if (autoLevelGrind || battleExtras?.autoLevelGrind) {
      if (levelAfter >= AUTO_LEVEL_GRIND_MAX) {
        setAutoLevelGrind(false);
        showNotice('Auto Level', `Reached level ${AUTO_LEVEL_GRIND_MAX}! Auto Level stopped.`);
      }
    }
    setPhase('gameOver');
  }

  useEffect(() => {
    if (phase !== 'gameOver' || !autoLevelGrind || !rewardSummary) return;
    if (rewardSummary.monsterLadder || rewardSummary.online) return;
    if (gameMode !== 'onePlayer') return;
    const level = rewardSummary?.expP1?.level ?? 1;
    if (level >= AUTO_LEVEL_GRIND_MAX) return;
    const t = setTimeout(() => playAgainFromReward(), 900);
    return () => clearTimeout(t);
  }, [phase, autoLevelGrind, rewardSummary?.expP1?.level, gameMode, rewardSummary?.monsterLadder, rewardSummary?.online]);

  const resetToMenu = useCallback(() => {
    if (gameMode === 'online') {
      leaveOnlineRoom();
      disconnectOnline();
      setOnlineRoom(null);
      setOnlineSlot(null);
      setGameMode('onePlayer');
    }
    dismissedOnlineBattleRef.current = true;
    onlineFinishHandledRef.current = true;
    setWinner(null);
    setPlayer1(null);
    setPlayer2(null);
    setRewardSummary(null);
    setAutoLevelGrind(false);
    setCurrentBattleMode(null);
    if (gameMode === 'monsterLadder') setGameMode('onePlayer');
    setBattleKey((k) => k + 1);
    setQuestHubOpen(false);
    setPhase('menu');
  }, [gameMode]);

  const encourage = useMemo(() => {
    if (!gameData || !rewardSummary) return [];
    if (rewardSummary.online) {
      if (winner === 'draw') return ['Great match. Run it back from the room lobby.'];
      return rewardSummary.iWon
        ? ['Your monster owned the arena. Invite the rematch.']
        : ['Your rival took this round. Rematch from the room lobby.'];
    }
    return buildEncourageLines(gameData, winner, rewardSummary);
  }, [gameData, rewardSummary, winner]);

  if (!gameData || !wallet) {
    return (
      <SafeAreaView style={[styles.safe, { justifyContent: 'center', alignItems: 'center' }]}>
        <Text style={styles.loading}>Loading save…</Text>
      </SafeAreaView>
    );
  }

  async function handleSaveConflictUseCloud() {
    if (!saveConflict || saveConflictBusy || !gameData) return;
    setSaveConflictBusy(true);
    try {
      const res = applyCloudSaveChoice(
        gameData,
        saveConflict.profileId,
        saveConflict.cloudData,
        saveConflict.playerKey
      );
      if (!res.ok) {
        showNotice('Cloud save', res.error || 'Could not load cloud save.');
        return;
      }
      setGameData(res.gameData);
      await saveGameSave(res.gameData);
      persistSave(res.gameData, 'conflict_cloud', res.profileId, { forceCloud: true });
      applyProfileSelection(res.profileId, res.gameData);
      setSaveConflict(null);
    } finally {
      setSaveConflictBusy(false);
    }
  }

  async function handleSaveConflictUseDevice() {
    if (!saveConflict || saveConflictBusy || !gameData) return;
    setSaveConflictBusy(true);
    try {
      const res = applyLocalSaveChoice(gameData, saveConflict.profileId, saveConflict.playerKey);
      if (!res.ok) {
        showNotice('Device save', res.error || 'Could not keep device save.');
        return;
      }
      setGameData(res.gameData);
      await saveGameSave(res.gameData);
      persistSave(res.gameData, 'conflict_local', res.profileId, { forceCloud: true });
      applyProfileSelection(res.profileId, res.gameData);
      setSaveConflict(null);
    } finally {
      setSaveConflictBusy(false);
    }
  }

  if (Platform.OS === 'web' && appVersionState === 'checking') {
    return (
      <SafeAreaView style={styles.safe}>
        <StatusBar style="dark" />
        <View style={styles.versionGate}>
          <Text style={styles.versionGateTitle}>Checking for updates…</Text>
          <Text style={styles.versionGateHint}>Please wait before playing.</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (Platform.OS === 'web' && appVersionState === 'stale') {
    return (
      <SafeAreaView style={styles.safe}>
        <StatusBar style="dark" />
        <ConfirmDialog
          visible
          title="Update required"
          message={
            `This device is on build ${BAKED_APP_VERSION.build} but the game is now on build ${liveAppVersion?.build ?? '?'}. ` +
            'Refresh to load the latest version before playing.'
          }
          confirmLabel="Refresh now"
          cancelLabel={null}
          onConfirm={handleAppVersionRefresh}
          onCancel={handleAppVersionRefresh}
        />
      </SafeAreaView>
    );
  }

  if (isPhaserLab) {
    return (
      <SafeAreaView style={styles.safe}>
        <StatusBar style="light" />
        <PhaserBattleLabScreen
          onBack={() => {
            if (Platform.OS === 'web' && typeof window !== 'undefined') {
              window.location.hash = '';
            }
            setIsPhaserLab(false);
            setPhase('menu');
          }}
        />
      </SafeAreaView>
    );
  }

  if (!gameData) {
    return (
      <SafeAreaView style={styles.safe}>
        <StatusBar style="dark" />
        <View style={styles.versionGate}>
          <Text style={styles.versionGateTitle}>Loading your save…</Text>
          <Text style={styles.versionGateHint}>Please wait a moment.</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView
      style={[
        styles.safe,
        phase === 'battle' ? styles.safeBattle : phase === 'menu' ? styles.safeMenu : null,
        phase === 'monsterRush' ? styles.safeMonsterRush : null,
        phase === 'menu' && lobbyMobile && styles.safeMenuMobile,
      ]}
    >
      <StatusBar style="dark" />
      {phase !== 'monsterRush' ? (
        <SyncStatusIndicator suppressRoutine={phase === 'battle' || phase === 'gameOver' || phase === 'ladder'} />
      ) : null}
      <PlayerKeyModal
        visible={!!keyModal}
        mode={keyModal?.mode ?? 'login'}
        playerName={keyModal?.playerName}
        error={keyModalError}
        busy={keyModalBusy}
        onCancel={closeKeyModal}
        onSubmit={handleKeyModalSubmit}
      />
      <SaveConflictModal
        visible={!!saveConflict}
        message={saveConflict?.message}
        busy={saveConflictBusy}
        onCancel={() => !saveConflictBusy && setSaveConflict(null)}
        onUseCloud={handleSaveConflictUseCloud}
        onUseDevice={handleSaveConflictUseDevice}
      />
      <ConfirmDialog
        visible={!!pendingDelete}
        title={pendingDelete ? `Delete ${pendingDelete.playerName}?` : ''}
        message="This cannot be undone."
        confirmLabel="Continue"
        destructive
        onCancel={() => setPendingDelete(null)}
        onConfirm={() => {
          const pd = pendingDelete;
          setPendingDelete(null);
          if (!pd) return;
          setKeyModalError('');
          setKeyModal({
            mode: 'delete',
            profileId: pd.profileId,
            playerName: pd.playerName,
            requiresKey: true,
          });
        }}
      />
      <ConfirmDialog
        visible={cloudSyncDialog?.phase === 'done'}
        title="Cloud sync"
        message={cloudSyncDialog?.message ?? CLOUD_SYNC_DONE_MESSAGE}
        confirmLabel="Continue"
        cancelLabel={null}
        onCancel={() => setCloudSyncDialog(null)}
        onConfirm={() => setCloudSyncDialog(null)}
      />
      <ConfirmDialog
        visible={!!noticeDialog}
        title={noticeDialog?.title ?? ''}
        message={noticeDialog?.message ?? ''}
        confirmLabel="Close"
        cancelLabel={null}
        onCancel={() => setNoticeDialog(null)}
        onConfirm={() => setNoticeDialog(null)}
      />
      {phase !== 'menu' && phase !== 'ladder' && phase !== 'battle' && phase !== 'online' && phase !== 'dungeons' && phase !== 'monsterRush' ? (
        <>
          <Text style={styles.gameTitle}>
            {phase === 'monsterRush'
              ? 'Monster Rush'
              : RESCUE_PHASES.has(phase)
                ? 'Monster Rescue'
                : 'Monster Battle'}
          </Text>
          <View style={styles.coinsRow}>
            <Text style={styles.coinsStripText}>
              Coins 🪙 <Text style={styles.coinsAmt}>{coins}</Text>
            </Text>
            {!RESCUE_PHASES.has(phase) ? (
              <>
                <TouchableOpacity
                  style={styles.miniShop}
                  onPress={() => void openGearMart()}
                  accessibilityLabel="Gear mart"
                >
                  <Text style={styles.miniShopTxt}>Shop</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.miniShop} onPress={openMonsterGearForActiveSlot} accessibilityLabel="Monster gear">
                  <Text style={styles.miniShopTxt}>Equip</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.miniShop}
                  onPress={() => void openMonsterMart()}
                  accessibilityLabel="Monster mart"
                >
                  <Text style={styles.miniShopTxt}>Monsters</Text>
                </TouchableOpacity>
              </>
            ) : null}
          </View>
        </>
      ) : null}

      <View
        style={
          phase === 'battle'
            ? styles.cardShellBattle
            : phase === 'online'
              ? styles.cardShellOnline
            : phase === 'gameOver'
              ? styles.cardShellReward
            : phase === 'monsterRescue' || phase === 'monsterRescueHub' || phase === 'monsterRescueReward'
              ? [styles.cardShellRescue, lobbyMobile && styles.cardShellRescueMobile]
            : phase === 'monsterRush'
              ? styles.cardShellMonsterRush
            : phase === 'menu' || phase === 'ladder' || phase === 'dungeons'
              ? [styles.cardShellMenu, lobbyMobile && styles.cardShellMenuMobile]
              : styles.cardShell
        }
      >
        {phase === 'menu' && (
          <HomeSetupScreen
            profiles={gameData.players}
            activeProfileId={activeProfileId}
            setupP1ProfileId={setupP1ProfileId}
            setupP2ProfileId={setupP2ProfileId}
            wallet={wallet}
            walletP1={walletP1}
            walletP2={walletP2}
            slotProfileName={gameData.players.find((p) => p.id === slotProfileId)?.name}
            coins={coins}
            gameMode={gameMode}
            onGameModeChange={handleGameModeChange}
            activeSlot={setupActiveSlot}
            onActiveSlotChange={setSetupActiveSlot}
            selectedP1Id={setupP1Id}
            selectedP2Id={setupP2Id}
            onSelectMonster={(ownedId) => {
              if (gameMode === 'onePlayer') {
                setSetupP1Id(ownedId);
                clearLadderBattlerPin();
                if (setupP1ProfileId && gameData) {
                  persistSave(
                    setProfileSelectedMonster(gameData, setupP1ProfileId, ownedId),
                    'monster_selected',
                    setupP1ProfileId,
                  );
                }
                return;
              }
              const profId = setupActiveSlot === 1 ? setupP1ProfileId : setupP2ProfileId;
              if (setupActiveSlot === 1) setSetupP1Id(ownedId);
              else setSetupP2Id(ownedId);
              if (profId && gameData) {
                persistSave(setProfileSelectedMonster(gameData, profId, ownedId), 'monster_selected', profId);
              }
            }}
            onSelectProfile={handleRequestSelectProfile}
            onRequestDeleteProfile={handleRequestDeleteProfile}
            onRequestDeleteCloudProfile={handleRequestDeleteCloudProfile}
            deleteBusyProfileId={deleteBusyProfileId}
            cloudPlayers={cloudPlayers}
            cloudFetchLoading={cloudFetchLoading}
            cloudFetchError={cloudFetchError}
            onFetchCloudPlayers={handleFetchCloudPlayers}
            onRequestSelectCloudProfile={handleRequestSelectCloudProfile}
            onUpdateProfileName={handleUpdateProfileName}
            onLoginWithId={handleMainMenuLogin}
            onCreateWithId={handleMainMenuCreate}
            onStartGame={startGameFromSetup}
            onOpenQuests={openQuests}
            onOpenMonsterLadder={openMonsterLadder}
            onOpenDungeons={openDungeons}
            dungeonsAvailable={dungeonsAvailable}
            ladderAvailable={ladderAvailable}
            onOpenMonsterGear={openMonsterGear}
            onlineRoom={onlineRoom}
            onlineSlot={onlineSlot}
            onEnterMultiplayer={() => {
              dismissedOnlineBattleRef.current = false;
              const payload = buildOnlineProfilePayload();
              if (payload) syncOnlineProfile(payload);
              setPhase('online');
            }}
            onLeaveOnlineRoom={() => {
              leaveOnlineRoom();
              setOnlineRoom(null);
              setOnlineSlot(null);
            }}
            onOpenOnlineLobby={() => {
              const activeBattle =
                onlineRoom?.status === 'battle' &&
                onlineRoom?.battle?.p1 &&
                onlineRoom?.battle?.p2 &&
                !onlineRoom?.battle?.winner;
              if (activeBattle) {
                dismissedOnlineBattleRef.current = false;
                handleOnlineBattleStart(onlineRoom);
              } else {
                dismissedOnlineBattleRef.current = false;
                setPhase('online');
              }
            }}
            onOpenMonsterGearShop={openMonsterGearForActiveSlot}
            onOpenInventory={openInventory}
            onOpenGearMart={() => void openGearMart()}
            onOpenMonsterMart={() => void openMonsterMart()}
            onOpenAudioSettings={() => setPhase('audioSettings')}
            onMergeMonster={handleMergeMonster}
            onEnsureLadderMonstersSync={handleEnsureLadderMonstersSync}
          />
        )}

        {phase === 'menu' && questHubOpen ? (
          <QuestHubScreen
            visible
            profileName={gameData.players.find((p) => p.id === setupP1ProfileId)?.name ?? 'Handler'}
            rescueHighest={getMonsterRescueState(getPlayerProfile(gameData, setupP1ProfileId)).highestCleared}
            rushBestDistance={getMonsterRushState(getPlayerProfile(gameData, setupP1ProfileId)).bestDistance}
            onClose={() => setQuestHubOpen(false)}
            onOpenMonsterLadder={openMonsterLadder}
            onOpenMonsterRescue={openMonsterRescueHub}
            onOpenMonsterRush={openMonsterRush}
          />
        ) : null}

        {phase === 'audioSettings' ? (
          <AudioSettingsScreen
            activeProfileId={activeProfileId}
            onBack={() => setPhase('menu')}
          />
        ) : null}

        {phase === 'monsterRescueHub' ? (
          <MonsterRescueHubScreen
            profileName={gameData.players.find((p) => p.id === setupP1ProfileId)?.name ?? 'Handler'}
            rescueState={getMonsterRescueState(getPlayerProfile(gameData, setupP1ProfileId))}
            weeklyResetHint={formatRescueWeeklyResetHint()}
            hasPlayerKey={
              normalizePlayerKey(
                getPlayerProfile(gameData, setupP1ProfileId)?.pin || '',
              ).length === 4
            }
            onBack={returnToQuestPicker}
            onStartStage={startMonsterRescueStage}
          />
        ) : null}

        {phase === 'monsterRush' ? (
          <MonsterRushScreen
            profile={setupP1ProfileId ? getPlayerProfile(gameData, setupP1ProfileId) : null}
            onBack={returnToQuestPicker}
            onRunComplete={handleMonsterRushRunComplete}
            onExchange={handleMonsterRushExchange}
          />
        ) : null}

        {phase === 'dungeons' && dungeonsAvailable ? (
          <DungeonScreen
            profile={setupP1ProfileId ? getPlayerProfile(gameData, setupP1ProfileId) : null}
            onExit={() => setPhase('menu')}
            onClaimRewards={handleClaimDungeonRewards}
            unlockAllBosses={unlockAllDungeonBosses}
          />
        ) : null}

        {phase === 'monsterRescue' ? (
          <MonsterRescueScreen
            stageId={rescueStageId}
            stageLabel={getRescueStage(rescueStageId).label}
            shooterMonsterTemplateId={
              fighterFromSetupId(setupP1Id, setupP1ProfileId)?.monsterTemplateId ?? 'cockroachsaurus'
            }
            onBack={() => setPhase('monsterRescueHub')}
            onFinish={handleMonsterRescueFinish}
          />
        ) : null}

        {phase === 'monsterRescueReward' && rescueRewardPayload ? (
          <MonsterRescueRewardScreen
            won={rescueRewardPayload.won}
            timeUp={rescueRewardPayload.timeUp}
            stageLabel={getRescueStage(rescueRewardPayload.stageId).label}
            rewards={rescueRewardPayload.rewards}
            saveMessage={rescueRewardPayload.saveMessage}
            continueLabel={
              rescueRewardPayload.won && rescueRewardPayload.stageId < RESCUE_TOTAL_LEVELS
                ? `Next Stage · ${getRescueStage(rescueRewardPayload.stageId + 1).label}`
                : 'Continue'
            }
            onContinue={() => {
              if (rescueRewardPayload.won) {
                continueMonsterRescueAfterWin(rescueRewardPayload.stageId);
              } else {
                exitMonsterRescueToHub();
              }
            }}
            onRetry={() => {
              if (isRescueStagePlayable(
                getMonsterRescueState(getPlayerProfile(gameData, setupP1ProfileId)),
                rescueRewardPayload.stageId,
              )) {
                startMonsterRescueStage(rescueRewardPayload.stageId);
              } else {
                exitMonsterRescueToHub();
              }
            }}
            onExit={exitMonsterRescueToHub}
          />
        ) : null}

        {phase === 'ladder' ? (
          <MonsterLadderHubScreen
            profileName={gameData.players.find((p) => p.id === setupP1ProfileId)?.name ?? 'Handler'}
            monsterLadder={getMonsterLadderState(getPlayerProfile(gameData, setupP1ProfileId))}
            activeFighter={
              setupP1ProfileId
                ? fighterFromActiveLadder(getPlayerProfile(gameData, setupP1ProfileId), setupP1Id)
                : null
            }
            onBack={returnToQuestPicker}
            onStartBattle={startMonsterLadderBattle}
            onOpenCollection={() => setLadderCollectionOpen(true)}
            onOpenGear={openLadderMonsterGear}
            chestGoldCost={LADDER_CHEST_GOLD_COST.gear}
            chestShardCost={LADDER_CHEST_SHARD_COST.monster}
            onBuyChest={handleBuyLadderChest}
            onOpenChest={handleOpenLadderChest}
          />
        ) : null}

        {phase === 'battle' && gameMode === 'online' && onlineRoom?.battle ? (
          <OnlineBattleScreen
            key={battleKey}
            mySlot={onlineSlot ?? resolveMyPlayerSlot(setupP1ProfileId)}
            snapshot={onlineRoom.battle}
            activeTurn={onlineRoom.activeTurn ?? null}
            emitAction={(action, payload) => emitBattleAction(action, payload)}
            player1Name={onlineRoom?.players?.p1?.profile?.name ?? 'Player 1'}
            player2Name={onlineRoom?.players?.p2?.profile?.name ?? 'Player 2'}
            onFinish={handleBattleFinish}
            onFlee={exitOnlineAndHome}
          />
        ) : null}

        {phase === 'battle' && gameMode !== 'online' && player1 && player2 ? (
          <BattleScreen
            key={battleKey}
            fighter1={player1}
            fighter2={player2}
            onFinish={handleBattleFinish}
            autoLevelGrind={autoLevelGrind}
            onAutoLevelGrindChange={setAutoLevelGrind}
            onClaimMainMiniBossChest={currentBattleMode === 'onePlayer' ? handleClaimMainMiniBossChest : undefined}
            player1Name={
              gameData.players.find((p) => p.id === setupP1ProfileId)?.name ??
              player1.displayName ??
              'Player 1'
            }
            player2Name={
              gameMode === 'onePlayer' || gameMode === 'monsterLadder'
                ? player2.displayName ?? player2.ladderBossName ?? 'CPU'
                : gameData.players.find((p) => p.id === setupP2ProfileId)?.name ??
                  player2.displayName ??
                  'Player 2'
            }
            opponentLabel={gameMode === 'monsterLadder' ? 'Boss' : gameMode === 'onePlayer' ? 'CPU' : 'Player 2'}
            opponentIsAi={gameMode === 'onePlayer' || gameMode === 'monsterLadder'}
            battleExtras={{
              mode: currentBattleMode ?? gameMode,
              mainMiniBoss: !!player2?.isMainMiniBoss,
              ladderFloor: player2?.ladderStageIndex,
              ladderStageKind: player2?.ladderStageKind,
              ladderStageLabel:
                player2?.ladderMainLevel && player2?.ladderSubLevel
                  ? `Level ${formatStageLabel(player2.ladderMainLevel, player2.ladderSubLevel)}`
                  : '',
              ladderRegionName: player2?.ladderThemeName,
              ladderBossName: player2?.ladderBossName,
            }}
          />
        ) : null}

        {phase === 'gameOver' && (
          <View style={styles.endCardShell}>
            <RewardScreen
              winner={winner}
              coinsAwarded={rewardSummary?.coinsAwarded ?? 0}
              bonusUnderdog={!!rewardSummary?.bonusUnderdog}
              ladderBonusCoins={rewardSummary?.ladderGoldGain ?? 0}
              ladderFirstClear={!!rewardSummary?.chestDrop && !rewardSummary?.chestDrop?.duplicate}
              ladderFloor={rewardSummary?.stage ? rewardSummary.stage.mainLevel : undefined}
              ladderRegionName={
                rewardSummary?.stage
                  ? `${stageTypeBanner(getStageKind(rewardSummary.stage.subLevel)) || `Stage ${formatStageLabel(rewardSummary.stage.mainLevel, rewardSummary.stage.subLevel)}`} · Shards ${rewardSummary?.ladderShardsTotal ?? 0}`
                  : undefined
              }
              monsterLadder={!!rewardSummary?.monsterLadder}
              chestDrop={rewardSummary?.chestDrop}
              mainChestDrop={rewardSummary?.mainChestDrop}
              chestBlocked={!!rewardSummary?.chestBlocked}
              ladderGoldTotal={rewardSummary?.ladderGoldTotal}
              ladderShardsTotal={rewardSummary?.ladderShardsTotal}
              onlineResult={!!rewardSummary?.online}
              onlineWon={!!rewardSummary?.iWon}
              expP1={rewardSummary?.expP1}
              expP2={rewardSummary?.expP2}
              funnyTitle={rewardTitle}
              player1={player1}
              player2={player2}
              totalCoins={rewardSummary?.monsterLadder ? rewardSummary?.ladderGoldTotal : coins}
              encourageLines={encourage}
              playAgainLabel={
                rewardSummary?.online
                  ? 'Back to Home'
                  : rewardSummary?.monsterLadder
                    ? 'Next Ladder Battle'
                    : rewardSummary?.mainMiniBossLost
                      ? 'Next Battle'
                      : 'Play Again'
              }
              hideShopButtons={!!rewardSummary?.monsterLadder || !!rewardSummary?.online}
              onPlayAgain={playAgainFromReward}
              onOpenMonsterGear={
                rewardSummary?.monsterLadder
                  ? openLadderMonsterGear
                  : () => {
                      const id = setupP1Id || defaultBattleMonsterId(wallet);
                      if (id) {
                        setGearMonsterId(resolveBattleMonsterId(wallet?.ownedMonsters ?? [], id) ?? id);
                        setGearOpen(true);
                      }
                    }
              }
              onOpenMonsterMart={rewardSummary?.monsterLadder ? undefined : () => void openMonsterMart()}
              onBackToHome={rewardSummary?.online ? undefined : rewardSummary?.monsterLadder ? returnToLadder : resetToMenu}
              backToHomeLabel={rewardSummary?.monsterLadder ? 'Monster Ladder map' : 'Back to Home'}
            />
          </View>
        )}

        {phase === 'online' && (
          <OnlineLobbyScreen
            onBackHome={() => setPhase('menu')}
            onBattleStart={handleOnlineBattleStart}
            buildProfilePayload={buildOnlineProfilePayload}
            mySlot={onlineSlot}
            onNotice={showNotice}
          />
        )}
      </View>

      <DailyLuckySpinModal
        visible={dailySpinOpen}
        playerName={
          dailySpinProfileIdRef.current
            ? gameData?.players?.find((p) => p.id === dailySpinProfileIdRef.current)?.name
            : null
        }
        onPrepareSpin={handleDailySpinPrepare}
        onClaimSpin={handleDailySpinClaim}
        onLater={handleDailySpinLater}
        onCollect={handleDailySpinCollect}
      />

      <MonsterLadderCollectionScreen
        visible={ladderCollectionOpen}
        profile={setupP1ProfileId ? getPlayerProfile(gameData, setupP1ProfileId) : null}
        ownedMonsters={
          setupP1ProfileId
            ? getAllLadderSelectableMonsters(getPlayerProfile(gameData, setupP1ProfileId))
            : []
        }
        activeMonsterId={
          getMonsterLadderState(getPlayerProfile(gameData, setupP1ProfileId))?.activeMonsterId
        }
        onClose={() => setLadderCollectionOpen(false)}
        onSelectActive={(id) => {
          setActiveLadderMonster(id);
          setLadderCollectionOpen(false);
        }}
        onMergeMonster={(id) => {
          handleMergeMonster(id);
        }}
      />
      <MonsterLadderGearScreen
        visible={ladderGearOpen}
        profile={setupP1ProfileId ? getPlayerProfile(gameData, setupP1ProfileId) : null}
        monsterLadder={getMonsterLadderState(getPlayerProfile(gameData, setupP1ProfileId))}
        onClose={() => setLadderGearOpen(false)}
        onEquip={equipLadderGear}
        onUnequip={unequipLadderGear}
      />
      <MonsterLadderChestRevealModal
        visible={!!ladderChestDrop}
        drop={ladderChestDrop}
        autoReveal={ladderChestAutoReveal}
        kicker={ladderChestKicker}
        onClose={() => {
          setLadderChestDrop(null);
          setLadderChestAutoReveal(false);
          setLadderChestKicker('Monster Ladder Chest');
        }}
      />

      <PlayerInventoryScreen
        visible={inventoryOpen}
        profile={inventoryProfile}
        coins={
          inventoryProfileId && gameData
            ? walletForProfile(gameData, inventoryProfileId)?.coins
            : coins
        }
        onClose={() => setInventoryOpen(false)}
        onSell={handleSellInventoryGear}
        onOpenEquip={openEquipFromInventory}
        onUpgradeGem={handleUpgradeGem}
        onSocketGem={handleSocketGem}
        onUnsocketGem={handleUnsocketGem}
      />

      <MonsterGearScreen
        visible={gearOpen}
        coins={coins}
        ownedGearIds={[]}
        ownedMonster={gearOwnedMonster}
        profile={gearProfile ?? gearWallet}
        onClose={() => setGearOpen(false)}
        onEquip={handleEquipGear}
        onUnequip={handleUnequipGear}
        onUnlockSlot={handleUnlockGearSlot}
        onEquipPassiveBook={handleEquipPassiveBook}
        onRemovePassive={handleRemovePassive}
        onEquipPet={handleEquipPet}
        onUnequipPet={handleUnequipPet}
        onSpendPetDust={handleSpendPetDust}
        ownedMonsters={gearOwnedMonsters}
        battleMonsterId={gearBattleMonsterId}
        onSelectMonster={handleGearSelectMonster}
        onSellGear={handleSellGear}
        onOpenGearMart={() => {
          setGearOpen(false);
          void openGearMart();
        }}
        onMergeMonster={handleMergeMonster}
      />

      <MonsterEquipmentScreen
        visible={equipmentOpen}
        ownedMonster={gearOwnedMonster}
        profile={gearProfile}
        coins={coins}
        ownedMonsters={gearOwnedMonsters}
        battleMonsterId={gearBattleMonsterId}
        onSelectMonster={handleGearSelectMonster}
        onClose={() => setEquipmentOpen(false)}
        onEquip={handleEquipGear}
        onUnequip={handleUnequipGear}
        onEquipPet={handleEquipPet}
        onUnequipPet={handleUnequipPet}
        onEquipPassiveBook={handleEquipPassiveBook}
        onRemovePassive={handleRemovePassive}
        onMergeMonster={handleMergeMonster}
      />

      <GearMartModal
        visible={gearMartOpen}
        coins={coins}
        profileId={inventoryProfileId || shopProfileId() || ''}
        profile={inventoryProfile}
        onClose={() => setGearMartOpen(false)}
        onBuy={handleBuyGearMart}
        onBuyPassiveBook={handleBuyPassiveSkillBook}
        onBuyPet={handleBuyPet}
        onBuyGem={handleBuyGem}
      />

      <MonsterMarketModal
        visible={monsterMartOpen}
        coins={coins}
        wallet={wallet}
        onClose={() => setMonsterMartOpen(false)}
        onBuy={(tplId, price) => tryBuyMonster(tplId, price)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: BG,
    paddingHorizontal: 12,
    paddingTop: 6,
    paddingBottom: 8,
  },
  safeMenu: {
    flex: 1,
    minHeight: 0,
    overflow: 'hidden',
  },
  safeMenuMobile: {
    paddingHorizontal: 4,
    paddingTop: 4,
    paddingBottom: 0,
  },
  safeBattle: {
    paddingHorizontal: 6,
    paddingTop: 4,
    paddingBottom: 4,
    flex: 1,
    minHeight: 0,
    maxHeight: '100vh',
    overflow: 'hidden',
  },
  safeMonsterRush: {
    flex: 1,
    minHeight: 0,
    paddingHorizontal: 0,
    paddingTop: 0,
    paddingBottom: 0,
    overflow: 'hidden',
    backgroundColor: '#0c1224',
    ...(Platform.OS === 'web'
      ? {
          maxHeight: '100dvh',
          height: '100%',
        }
      : {}),
  },
  loading: { fontWeight: '900', fontSize: 18, color: '#273043' },
  versionGate: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    gap: 10,
  },
  versionGateTitle: {
    fontWeight: '900',
    fontSize: 20,
    color: '#1c2b4a',
    textAlign: 'center',
  },
  versionGateHint: {
    fontWeight: '600',
    fontSize: 15,
    color: '#5a6478',
    textAlign: 'center',
  },
  gameTitle: {
    fontSize: 28,
    fontWeight: '900',
    textAlign: 'center',
    color: '#1c2b4a',
    marginBottom: 4,
    textShadowColor: 'rgba(255,255,255,0.75)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 0,
  },
  coinsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    flexWrap: 'wrap',
    marginBottom: 6,
    gap: 6,
  },
  coinsStripText: {
    fontWeight: '800',
    fontSize: 14,
    color: '#273043',
  },
  coinsAmt: { color: '#d35400', fontWeight: '900', fontSize: 18 },
  miniShop: {
    backgroundColor: '#ffeaa7',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#2d2d44',
    marginHorizontal: 4,
  },
  miniShopTxt: {
    fontWeight: '900',
    fontSize: 13,
    color: '#2d3436',
  },
  cardShell: {
    flex: 1,
    backgroundColor: '#fff9ed',
    borderRadius: 20,
    borderWidth: 4,
    borderColor: '#ff6b35',
    paddingHorizontal: 10,
    paddingTop: 10,
    paddingBottom: 6,
    shadowColor: '#143050',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.22,
    shadowRadius: 0,
    elevation: 4,
  },
  cardShellMenu: {
    flex: 1,
    minHeight: 0,
    backgroundColor: '#c9dff5',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#8eb8dc',
    padding: 6,
    overflow: 'hidden',
    position: 'relative',
    ...(Platform.OS === 'web'
      ? {
          display: 'flex',
          flexDirection: 'column',
        }
      : {}),
  },
  cardShellMenuMobile: {
    borderRadius: 12,
    padding: 0,
    borderWidth: 0,
    backgroundColor: 'transparent',
  },
  cardShellOnline: {
    flex: 1,
    minHeight: 0,
    overflow: 'hidden',
    backgroundColor: 'transparent',
    borderWidth: 0,
    padding: 0,
    borderRadius: 0,
  },
  cardShellBattle: {
    flex: 1,
    minHeight: 0,
    maxHeight: '100vh',
    backgroundColor: '#1a1a2e',
    borderRadius: 16,
    borderWidth: 4,
    borderColor: '#2d2d44',
    paddingHorizontal: 4,
    paddingTop: 4,
    paddingBottom: 4,
    overflow: 'hidden',
  },
  cardShellMonsterRush: {
    flex: 1,
    minHeight: 0,
    overflow: 'hidden',
    backgroundColor: '#0c1224',
    borderWidth: 0,
    borderRadius: 0,
    padding: 0,
    ...(Platform.OS === 'web'
      ? {
          display: 'flex',
          flexDirection: 'column',
          width: '100%',
          height: '100%',
          maxHeight: '100dvh',
          maxWidth: '100dvw',
        }
      : {}),
  },
  cardShellRescue: {
    flex: 1,
    minHeight: 0,
    overflow: 'hidden',
    backgroundColor: '#09051a',
    borderRadius: 16,
    borderWidth: 2,
    borderColor: 'rgba(244,114,182,0.45)',
    padding: 0,
    ...(Platform.OS === 'web'
      ? {
          display: 'flex',
          flexDirection: 'column',
        }
      : {}),
  },
  cardShellRescueMobile: {
    borderRadius: 12,
    borderWidth: 0,
    backgroundColor: 'transparent',
  },
  cardShellReward: {
    flex: 1,
    minHeight: 0,
    backgroundColor: '#081324',
    borderRadius: 20,
    borderWidth: 2,
    borderColor: '#b9843b',
    paddingHorizontal: 8,
    paddingTop: 8,
    paddingBottom: 6,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 14,
    elevation: 10,
  },
  menuPad: { paddingBottom: 24 },
  menuHead: {
    fontSize: 22,
    fontWeight: '900',
    textAlign: 'center',
    color: '#273043',
    marginBottom: 14,
  },
  heroMenu: {
    backgroundColor: '#8ac926',
    paddingVertical: 16,
    borderRadius: 16,
    borderWidth: 4,
    borderColor: '#2d2d44',
    alignItems: 'center',
    marginBottom: 12,
  },
  heroMenuAlt: {
    backgroundColor: '#48cae4',
    paddingVertical: 16,
    borderRadius: 16,
    borderWidth: 4,
    borderColor: '#2d2d44',
    alignItems: 'center',
    marginBottom: 12,
  },
  heroMenuGhost: {
    backgroundColor: '#dfe6e9',
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 3,
    borderColor: '#2d2d44',
    alignItems: 'center',
    marginBottom: 12,
  },
  heroMenuTxt: { fontWeight: '900', fontSize: 18, color: '#1b1b2f' },
  menuHint: {
    textAlign: 'center',
    marginTop: 8,
    fontWeight: '700',
    fontSize: 13,
    color: '#566573',
    lineHeight: 18,
  },
  screenTitle: {
    fontSize: 22,
    fontWeight: '900',
    textAlign: 'center',
    color: '#273043',
    marginBottom: 12,
  },
  pickRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 8,
    marginBottom: 8,
    borderRadius: 14,
    borderWidth: 3,
    borderColor: '#ffeaa7',
    backgroundColor: 'rgba(255,255,255,0.85)',
  },
  pickName: { fontWeight: '900', fontSize: 17, color: '#2d3436' },
  pickSub: { fontWeight: '700', fontSize: 13, color: '#636e72', marginTop: 4 },
  linkMuted: { alignSelf: 'center', marginTop: 12 },
  linkMutedTxt: { fontWeight: '800', fontSize: 14, color: '#0984e3', textDecorationLine: 'underline' },
  shopLink: {
    alignSelf: 'center',
    marginTop: 8,
    marginBottom: 4,
    backgroundColor: '#ff9f1c',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 14,
    borderWidth: 3,
    borderColor: '#2d2d44',
  },
  shopLinkTxt: {
    fontWeight: '900',
    fontSize: 15,
    color: '#1b1b2f',
    textAlign: 'center',
  },
  endCardShell: {
    flex: 1,
    minHeight: 0,
    width: '100%',
  },
});
