import { StatusBar } from 'expo-status-bar';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
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
import BattleScreen from './components/BattleScreen';
import OnlineBattleScreen from './components/OnlineBattleScreen';
import MonsterGearScreen from './components/MonsterGearScreen';
import GearMartModal from './components/GearMartModal';
import MonsterMarketModal from './components/MonsterMarketModal';
import HomeSetupScreen from './components/HomeSetupScreen';
import AudioSettingsScreen from './components/AudioSettingsScreen';
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
import { initGameSounds } from './utils/gameSounds';
import { pickFunnyWinTitle, winTitleForRarity } from './utils/rewards';
import {
  activeWallet,
  awardBattleRewards,
  buyGearForMonster,
  buyGearItem,
  buyMonster as purchaseMonsterRow,
  createPlayerProfile,
  enforceSingleActiveProfile,
  equipOwnedGear,
  getPlayerProfile,
  mergeMonsterParts,
  resetGameData,
  setActiveProfile,
  setPlayerKeyForProfile,
  setProfileSelectedMonster,
  unequipOwnedGear,
  unlockGearSlotForMonster,
  updatePlayer,
  walletForProfile,
} from './utils/gameStorage';
import { loadGameSave, saveGameSave } from './src/services/saveService';
import { listCloudPlayers, recallCloudProfile } from './src/services/cloudSaveService';
import { applyCloudProfile } from './src/services/cloudSaveMapper';
import { commitProfileDeleted, commitSave, setCloudSyncProfileID } from './src/services/syncCoordinator';
import { emitSaveStatus } from './src/services/saveStatusBus';
import ConfirmDialog from './components/ConfirmDialog';
import {
  normalizePlayerKey,
  profileNeedsPlayerKeyMigration,
  validatePlayerKeyPair,
  verifyPlayerKeyForProfile,
} from './utils/playerKey';
import PlayerKeyModal from './components/PlayerKeyModal';
import { loadSaveApiConfig } from './utils/saveApiConfig';
import SyncStatusIndicator from './components/SyncStatusIndicator';
import { getMonsterTemplate, RARITY_UI, ROLE_LABELS } from './utils/monsterTemplates';
import { playSound } from './utils/sounds';
import { applyAudioSettings, loadAudioSettings } from './utils/audioSettings';
import { startMenuMusic, stopMenuMusic } from './utils/audioManager';

const LOBBY_PHASES = new Set(['menu', 'online', 'gameOver', 'audioSettings']);

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
  const owned = w.ownedMonsters?.[0];
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
  const [phase, setPhase] = useState('menu');
  const [gameMode, setGameMode] = useState(/** @type {'twoPlayer'|'onePlayer'|'online'} */ ('onePlayer'));
  const [onlineRoom, setOnlineRoom] = useState(null);
  const [onlineSlot, setOnlineSlot] = useState(() => loadOnlineSession()?.playerSlot ?? null);
  const [player1, setPlayer1] = useState(null);
  const [player2, setPlayer2] = useState(null);
  const [winner, setWinner] = useState(null);
  const [battleKey, setBattleKey] = useState(0);
  const [gearOpen, setGearOpen] = useState(false);
  const [gearMartOpen, setGearMartOpen] = useState(false);
  const [gearMonsterId, setGearMonsterId] = useState(null);
  const [monsterMartOpen, setMonsterMartOpen] = useState(false);
  const [rewardTitle, setRewardTitle] = useState('');
  const [rewardSummary, setRewardSummary] = useState(null);
  const [setupActiveSlot, setSetupActiveSlot] = useState(1);
  const [setupP1Id, setSetupP1Id] = useState(null);
  const [setupP2Id, setSetupP2Id] = useState(null);
  const [setupP1ProfileId, setSetupP1ProfileId] = useState(null);
  const [setupP2ProfileId, setSetupP2ProfileId] = useState(null);
  const unlockedProfileIdsRef = useRef(new Set());
  const dismissedOnlineBattleRef = useRef(false);
  const onlineFinishHandledRef = useRef(false);
  const [keyModal, setKeyModal] = useState(null);
  const [keyModalError, setKeyModalError] = useState('');
  const [keyModalBusy, setKeyModalBusy] = useState(false);
  const [deleteBusyProfileId, setDeleteBusyProfileId] = useState(null);
  const [cloudPlayers, setCloudPlayers] = useState([]);
  const [cloudFetchLoading, setCloudFetchLoading] = useState(false);
  const [cloudFetchError, setCloudFetchError] = useState(null);
  const [pendingDelete, setPendingDelete] = useState(null);

  function syncSetupMonstersFromProfiles(gd, p1ProfileId, p2ProfileId, mode = gameMode) {
    const w1 = walletForProfile(gd, p1ProfileId);
    const m1 = w1.selectedMonsterId || w1.ownedMonsters?.[0]?.id || null;
    setSetupP1Id(m1);
    if (mode === 'onePlayer') {
      setSetupP2Id(null);
      return;
    }
    const w2 = walletForProfile(gd, p2ProfileId);
    const m2 = w2.selectedMonsterId || w2.ownedMonsters?.[1]?.id || w2.ownedMonsters?.[0]?.id || null;
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
    setBattleKey((k) => k + 1);
    setPhase('battle');
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

    onlineFinishHandledRef.current = true;
    const myId = onlineSlot === 'p2' ? 2 : 1;
    const outcome =
      winner === 'draw' ? 'draw' : winner === myId ? myId : myId === 1 ? 2 : 1;

    setPlayer1(snap.p1 ?? null);
    setPlayer2(snap.p2 ?? null);
    setWinner(outcome);
    dismissedOnlineBattleRef.current = true;
    const iWon = outcome === myId;
    setRewardSummary({ coinsAwarded: 0, expP1: null, expP2: null, online: true, iWon });
    setRewardTitle(iWon ? 'Online Victory!' : outcome === 'draw' ? 'Online Draw' : 'Online Defeat');
    setPhase('gameOver');
  }, [gameMode, phase, onlineRoom?.battle?.winner, onlineRoom?.battle?.seq, onlineSlot]);

  useEffect(() => {
    if (Platform.OS !== 'web' || typeof document === 'undefined') return undefined;
    const html = document.documentElement;
    const body = document.body;
    const root = document.getElementById('root');
    const scrollableLobby = phase === 'menu' || phase === 'online' || phase === 'gameOver' || phase === 'audioSettings';
    if (scrollableLobby) {
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
    if (LOBBY_PHASES.has(phase)) {
      startMenuMusic();
    } else if (phase === 'battle') {
      stopMenuMusic();
    }
  }, [phase]);

  useEffect(() => {
    applyAudioSettings();
    void initGameSounds();
    void loadSaveApiConfig();
    loadGameSave().then((gd) => {
      const activeId = gd.session?.activeProfileId ?? gd.players?.[0]?.id ?? null;
      const normalized = activeId ? enforceSingleActiveProfile(gd, activeId) : gd;
      setGameData(normalized);
      setSetupP1ProfileId(activeId);
      setSetupP2ProfileId(null);
      syncSetupMonstersFromProfiles(normalized, activeId, null, 'onePlayer');
    });
  }, []);

  const activeProfileId = gameData?.session?.activeProfileId ?? null;

  useEffect(() => {
    setCloudSyncProfileID(activeProfileId);
  }, [activeProfileId]);

  useEffect(() => {
    void loadSaveApiConfig().then(() => handleFetchCloudPlayers());
  }, []);

  function persistSave(nextGd, reason, profileIDs) {
    setGameData(nextGd);
    void commitSave({
      reason,
      gameData: nextGd,
      profileIDs,
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
  const cosmeticsOwned = wallet?.cosmeticsOwned ?? [];
  const gearOwnedMonster = useMemo(
    () => wallet?.ownedMonsters?.find((x) => x.id === gearMonsterId) ?? null,
    [wallet, gearMonsterId],
  );
  const gearProfileId = useMemo(() => {
    if (!gearMonsterId || !gameData) return slotProfileId;
    if (setupP1Id === gearMonsterId) return setupP1ProfileId;
    if (setupP2Id === gearMonsterId) return setupP2ProfileId;
    return activeProfileId ?? slotProfileId;
  }, [gearMonsterId, gameData, setupP1Id, setupP2Id, setupP1ProfileId, setupP2ProfileId, activeProfileId, slotProfileId]);

  function markProfileUnlocked(profileId) {
    if (profileId) unlockedProfileIdsRef.current.add(profileId);
  }

  function isProfileUnlockedThisSession(profileId) {
    return unlockedProfileIdsRef.current.has(profileId);
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
    setSetupP1Id(w.selectedMonsterId || w.ownedMonsters?.[0]?.id || null);
    setGameData(next);
    persistSave(next, 'profile_selected', profileId);
  }

  function handleSelectProfile(profileId) {
    if (!gameData || !profileId) return;
    markProfileUnlocked(profileId);
    applyProfileSelection(profileId);
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

  async function handleFetchCloudPlayers() {
    setCloudFetchLoading(true);
    setCloudFetchError(null);
    await loadSaveApiConfig();
    const res = await listCloudPlayers();
    setCloudFetchLoading(false);
    if (!res.ok) {
      const msg = res.skipped ? 'Cloud save is not configured.' : res.error || 'Could not fetch cloud players.';
      setCloudFetchError(msg);
      if (!res.skipped) emitSaveStatus('cloud_list_failed');
      return;
    }
    setCloudPlayers(res.players || []);
  }

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
      const fromCloud = !!keyModal.fromCloud;
      const localProfile = gameData ? getPlayerProfile(gameData, profileId) : null;
      if (localProfile && !fromCloud) {
        if (!verifyPlayerKeyForProfile(localProfile, key)) {
          setKeyModalError('Incorrect key. Please try again.');
          return;
        }
        markProfileUnlocked(profileId);
        setKeyModal(null);
        setKeyModalError('');
        applyProfileSelection(profileId);
        return;
      }
      void finalizeCloudLogin(profileId, key);
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

  async function finalizeCloudLogin(profileId, playerKey, { requiresKey = true } = {}) {
    if (keyModalBusy) return;
    if (!playerKey || playerKey.length !== 4) {
      setKeyModalError('Enter your 4-digit Player Key.');
      return;
    }
    setKeyModalBusy(true);
    setKeyModalError('');

    try {
      const login = await recallCloudProfile(profileId, playerKey);
      if (!login.ok) {
        const msg =
          login.skipped
            ? 'Cloud save is not configured on this build.'
            : login.status === 401
              ? 'Incorrect key. Please try again.'
              : login.error || 'Could not load player from cloud.';

        setKeyModal({
          mode: 'login',
          profileId,
          playerName: keyModal?.playerName || 'Player',
          fromCloud: true,
          requiresKey: true,
        });
        setKeyModalError(msg);
        return;
      }

      const baseGd = gameData || (await loadGameSave());
      const pin = normalizePlayerKey(playerKey);
      const resolvedId = String(login.data?.profileID || login.data?.id || profileId).trim();
      let next = applyCloudProfile(baseGd, login.data);
      const applied = next.players?.find((p) => p.id === resolvedId || p.id === profileId);
      if (!applied) {
        setKeyModalError('Could not apply cloud save. Try again or redeploy the save API.');
        return;
      }
      const activeId = applied.id;
      if (requiresKey && pin.length === 4) next = setPlayerKeyForProfile(next, activeId, pin);
      next = enforceSingleActiveProfile(next, activeId);

      setGameData(next);
      markProfileUnlocked(activeId);
      setKeyModal(null);
      setKeyModalError('');

      await saveGameSave(next);
      persistSave(next, 'profile_loaded', activeId);
      emitSaveStatus('player_loaded');
      applyProfileSelection(activeId, next);
    } catch (err) {
      if (typeof __DEV__ !== 'undefined' && __DEV__) {
        console.warn('[cloud] finalizeCloudLogin failed', err);
      }
      setKeyModalError('Load failed. Check your connection and try again.');
    } finally {
      setKeyModalBusy(false);
    }
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

  function handleCreateProfile(name, playerKey, confirmKey) {
    if (!gameData) return;
    const trimmed = String(name || '').trim().slice(0, 24);
    if (!trimmed) {
      Alert.alert('Create Player', 'Player name cannot be empty.');
      return;
    }
    const keyErr = validatePlayerKeyPair(playerKey, confirmKey);
    if (keyErr) {
      Alert.alert('Create Player', keyErr);
      return;
    }

    const pin = normalizePlayerKey(playerKey);
    const res = createPlayerProfile(gameData, trimmed, pin);
    const newId = res.playerId;
    markProfileUnlocked(newId);
    const next = enforceSingleActiveProfile(res.gameData, newId);
    setSetupP1ProfileId(newId);
    setSetupP2ProfileId(null);
    syncSetupMonstersFromProfiles(next, newId, null, 'onePlayer');
    persistSave(next, 'profile_created', newId);
    applyProfileSelection(newId, next);
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
      Alert.alert('Monster Mart', res.error);
      return;
    }
    let nextGd = res.gameData;
    const newOm = res.ownedMonster;
    if (newOm?.id && slotProfileId) {
      nextGd = setProfileSelectedMonster(nextGd, slotProfileId, newOm.id);
      if (gameMode === 'onePlayer' || setupActiveSlot === 1) setSetupP1Id(newOm.id);
      else setSetupP2Id(newOm.id);
    } else if (newOm?.id && !setupP1Id) {
      setSetupP1Id(newOm.id);
    }
    persistSave(nextGd, 'coins_changed', slotProfileId);
    playSound('shop');
    Alert.alert('Monster Mart', `${getMonsterTemplate(templateId)?.name ?? 'Monster'} joined your team!`);
  }

  function fighterFromSetupId(ownedId, profileId) {
    const w = walletForProfile(gameData, profileId);
    const om = w.ownedMonsters.find((x) => x.id === ownedId);
    if (!om) return null;
    return fighterFromOwned(om);
  }

  function openMonsterGear(slot) {
    const id = slot === 1 ? setupP1Id : setupP2Id;
    if (!id) {
      Alert.alert('Monster Gear', `Pick a monster for Player ${slot} first.`);
      return;
    }
    setGearMonsterId(id);
    setGearOpen(true);
  }

  function openMonsterGearForActiveSlot() {
    openMonsterGear(setupActiveSlot);
  }

  function handleBuyGear(gearId) {
    if (!gameData || !gearMonsterId) return;
    const res = buyGearForMonster(gameData, gearProfileId || null, gearMonsterId, gearId);
    if (res.error) {
      Alert.alert('Monster Gear', res.error);
      return;
    }
    persistSave(res.gameData, 'gear_bought', gearProfileId || null);
    playSound('shop');
  }

  function handleBuyGearMart(gearId) {
    if (!gameData) return;
    const profileId = activeProfileId || setupP1ProfileId || null;
    const res = buyGearItem(gameData, profileId, gearId);
    if (res.error) {
      Alert.alert('Gear Mart', res.error);
      return;
    }
    persistSave(res.gameData, 'gear_bought', profileId);
    playSound('shop');
  }

  function handleEquipGear(gearId, slotIndex = null) {
    if (!gameData || !gearMonsterId) return;
    const res = equipOwnedGear(gameData, gearProfileId || null, gearMonsterId, gearId, slotIndex);
    if (res.error) {
      Alert.alert('Monster Gear', res.error);
      return;
    }
    persistSave(res.gameData, 'gear_equipped', gearProfileId || null);
  }

  function handleUnequipGear(gearId, slotIndex = null) {
    if (!gameData || !gearMonsterId) return;
    const res = unequipOwnedGear(gameData, gearProfileId || null, gearMonsterId, gearId, slotIndex);
    if (res.error) {
      Alert.alert('Monster Gear', res.error);
      return;
    }
    persistSave(res.gameData, 'gear_equipped', gearProfileId || null);
  }

  function handleUnlockGearSlot() {
    if (!gameData || !gearMonsterId) return;
    const res = unlockGearSlotForMonster(gameData, gearProfileId || null, gearMonsterId);
    if (res.error) {
      Alert.alert('Unlock slot', res.error);
      return;
    }
    persistSave(res.gameData, 'gear_slot_unlocked', gearProfileId || null);
    if (res.newSlotCount) {
      Alert.alert('Slot unlocked!', `This monster now has ${res.newSlotCount} gear slots.`);
    }
  }

  function startGameFromSetup() {
    if (!setupP1ProfileId) {
      Alert.alert('Player setup', 'Select or create a player profile first.');
      return;
    }
    const f1 = fighterFromSetupId(setupP1Id, setupP1ProfileId);
    if (!f1) {
      Alert.alert('Player setup', 'Player 1 needs a monster.');
      return;
    }
    const gdClone = JSON.parse(JSON.stringify(gameData));
    const ai = buildAiFighter(f1, gdClone, setupP1ProfileId);
    if (!ai) {
      Alert.alert('Player setup', 'Could not build CPU opponent. Try again.');
      return;
    }
    beginBattle(f1, ai);
  }

  function beginBattle(p1Fighter, p2Fighter) {
    const arm = (p) => {
      if (!p?.stats) return null;
      const monsterParts = mergeMonsterParts(p.monsterTemplateId, p.monsterParts || {});
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
      Alert.alert('Player setup', 'Could not start battle — missing fighter data.');
      return;
    }
    setPlayer1(arm(p1Fighter));
    setPlayer2(arm(p2Fighter));
    setWinner(null);
    setBattleKey((k) => k + 1);
    setPhase('battle');
    if (gameData) {
      const ids = [setupP1ProfileId, gameMode === 'twoPlayer' ? setupP2ProfileId : null].filter(Boolean);
      void commitSave({ reason: 'battle_start', gameData, profileIDs: ids });
    }
  }

  function handleBattleFinish({
    winner: outcome,
    player1Snapshot,
    player2Snapshot,
    battleExtras,
  }) {
    setPlayer1(player1Snapshot);
    setPlayer2(player2Snapshot);
    setWinner(outcome);

    if (!gameData) {
      setPhase('gameOver');
      return;
    }

    if (battleExtras?.online) {
      if (onlineFinishHandledRef.current) return;
      onlineFinishHandledRef.current = true;
      dismissedOnlineBattleRef.current = true;
      const myId = onlineSlot === 'p2' ? 2 : 1;
      const iWon = outcome === myId;
      setRewardSummary({ coinsAwarded: 0, expP1: null, expP2: null, online: true, iWon });
      setRewardTitle(iWon ? 'Online Victory!' : outcome === 'draw' ? 'Online Draw' : 'Online Defeat');
      setPhase('gameOver');
      return;
    }

    const lastAiWeak = battleExtras?.mode === 'onePlayer' && (player2Snapshot?.aiPowerRatio ?? 2) < 0.82;

    const { gameData: nextGd, summary } = awardBattleRewards(gameData, {
      outcome: outcome,
      mode: battleExtras?.mode ?? 'twoPlayer',
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
    });

    const profileIds = [setupP1ProfileId, setupP2ProfileId].filter(Boolean);
    persistSave(nextGd, 'battle_ended', profileIds);

    setRewardSummary(summary);

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
    setPhase('gameOver');
  }

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
    setBattleKey((k) => k + 1);
    setPhase('menu');
  }, [gameMode]);

  const handleResetSave = useCallback(() => {
    Alert.alert(
      'Reset all saves?',
      'This clears every player profile and all progress. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset',
          style: 'destructive',
          onPress: () => {
            void resetGameData().then((fresh) => {
              setGameData(fresh);
              const p1 = fresh.players[0]?.id ?? null;
              const p2 = fresh.players[1]?.id ?? p1;
              setSetupP1ProfileId(p1);
              setSetupP2ProfileId(p2);
              syncSetupMonstersFromProfiles(fresh, p1, p2);
              setSetupActiveSlot(1);
              setPhase('menu');
            });
          },
        },
      ],
    );
  }, []);

  const encourage = useMemo(() => {
    if (!gameData || !rewardSummary) return [];
    return buildEncourageLines(gameData, winner, rewardSummary);
  }, [gameData, rewardSummary, winner]);

  if (!gameData || !wallet) {
    return (
      <SafeAreaView style={[styles.safe, { justifyContent: 'center', alignItems: 'center' }]}>
        <Text style={styles.loading}>Loading save…</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView
      style={[
        styles.safe,
        phase === 'battle' ? styles.safeBattle : phase === 'menu' ? styles.safeMenu : null,
        phase === 'menu' && lobbyMobile && styles.safeMenuMobile,
      ]}
    >
      <StatusBar style="dark" />
      <SyncStatusIndicator />
      <PlayerKeyModal
        visible={!!keyModal}
        mode={keyModal?.mode ?? 'login'}
        playerName={keyModal?.playerName}
        error={keyModalError}
        busy={keyModalBusy}
        onCancel={closeKeyModal}
        onSubmit={handleKeyModalSubmit}
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
      {phase !== 'menu' && phase !== 'battle' && phase !== 'online' ? (
        <>
          <Text style={styles.gameTitle}>Monster Dice Battle</Text>
          <View style={styles.coinsRow}>
            <Text style={styles.coinsStripText}>
              Coins 🪙 <Text style={styles.coinsAmt}>{coins}</Text>
            </Text>
            <TouchableOpacity
              style={styles.miniShop}
              onPress={() => {
                playSound('shop');
                setGearMartOpen(true);
              }}
              accessibilityLabel="Gear mart"
            >
              <Text style={styles.miniShopTxt}>Gear Mart</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.miniShop} onPress={openMonsterGearForActiveSlot} accessibilityLabel="Monster gear">
              <Text style={styles.miniShopTxt}>Equip</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.miniShop}
              onPress={() => {
                playSound('shop');
                setMonsterMartOpen(true);
              }}
              accessibilityLabel="Monster mart"
            >
              <Text style={styles.miniShopTxt}>Monsters</Text>
            </TouchableOpacity>
          </View>
        </>
      ) : null}

      <View
        style={
          phase === 'battle'
            ? styles.cardShellBattle
            : phase === 'online'
              ? styles.cardShellOnline
            : phase === 'menu'
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
            onCreateProfile={handleCreateProfile}
            onRequestDeleteProfile={handleRequestDeleteProfile}
            onRequestDeleteCloudProfile={handleRequestDeleteCloudProfile}
            deleteBusyProfileId={deleteBusyProfileId}
            cloudPlayers={cloudPlayers}
            cloudFetchLoading={cloudFetchLoading}
            cloudFetchError={cloudFetchError}
            onFetchCloudPlayers={handleFetchCloudPlayers}
            onRequestSelectCloudProfile={handleRequestSelectCloudProfile}
            onUpdateProfileName={handleUpdateProfileName}
            onStartGame={startGameFromSetup}
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
            onOpenGearMart={() => {
              playSound('shop');
              setGearMartOpen(true);
            }}
            onOpenMonsterMart={() => {
              playSound('shop');
              setMonsterMartOpen(true);
            }}
            onResetSave={handleResetSave}
            onOpenAudioSettings={() => setPhase('audioSettings')}
          />
        )}

        {phase === 'audioSettings' ? (
          <AudioSettingsScreen
            activeProfileId={activeProfileId}
            onBack={() => setPhase('menu')}
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
            onExitBattle={resetToMenu}
            player1Name={
              gameData.players.find((p) => p.id === setupP1ProfileId)?.name ??
              player1.displayName ??
              'Player 1'
            }
            player2Name={
              gameMode === 'onePlayer'
                ? player2.displayName ?? 'CPU'
                : gameData.players.find((p) => p.id === setupP2ProfileId)?.name ??
                  player2.displayName ??
                  'Player 2'
            }
            opponentLabel={gameMode === 'onePlayer' ? 'CPU' : 'Player 2'}
            opponentIsAi={gameMode === 'onePlayer'}
            battleExtras={{ mode: gameMode }}
          />
        ) : null}

        {phase === 'gameOver' && (
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.endCard}>
            <RewardScreen
              winner={winner}
              coinsAwarded={rewardSummary?.coinsAwarded ?? 0}
              bonusUnderdog={!!rewardSummary?.bonusUnderdog}
              expP1={rewardSummary?.expP1}
              expP2={rewardSummary?.expP2}
              funnyTitle={rewardTitle}
              player1={player1}
              player2={player2}
              totalCoins={coins}
              encourageLines={encourage}
              onPlayAgain={resetToMenu}
              onOpenMonsterGear={() => {
                const id = setupP1Id || wallet.ownedMonsters?.[0]?.id;
                if (id) {
                  setGearMonsterId(id);
                  setGearOpen(true);
                }
              }}
              onOpenMonsterMart={() => setMonsterMartOpen(true)}
              onBackToHome={resetToMenu}
            />
          </ScrollView>
        )}

        {phase === 'online' && (
          <OnlineLobbyScreen
            onBackHome={() => setPhase('menu')}
            onBattleStart={handleOnlineBattleStart}
            buildProfilePayload={buildOnlineProfilePayload}
            mySlot={onlineSlot}
          />
        )}
      </View>

      <MonsterGearScreen
        visible={gearOpen}
        coins={coins}
        ownedGearIds={cosmeticsOwned}
        ownedMonster={gearOwnedMonster}
        onClose={() => setGearOpen(false)}
        onBuy={handleBuyGear}
        onEquip={handleEquipGear}
        onUnequip={handleUnequipGear}
        onUnlockSlot={handleUnlockGearSlot}
        onOpenGearMart={() => {
          playSound('shop');
          setGearOpen(false);
          setGearMartOpen(true);
        }}
      />

      <GearMartModal
        visible={gearMartOpen}
        coins={coins}
        ownedGearIds={cosmeticsOwned}
        onClose={() => setGearMartOpen(false)}
        onBuy={handleBuyGearMart}
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
  loading: { fontWeight: '900', fontSize: 18, color: '#273043' },
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
  endCard: {
    alignItems: 'stretch',
    paddingVertical: 12,
    paddingBottom: 24,
  },
});
