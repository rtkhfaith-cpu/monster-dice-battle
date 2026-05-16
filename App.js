import { StatusBar } from 'expo-status-bar';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
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
import MonsterGearScreen from './components/MonsterGearScreen';
import GearMartModal from './components/GearMartModal';
import MonsterMarketModal from './components/MonsterMarketModal';
import HomeSetupScreen from './components/HomeSetupScreen';
import OnlineLobbyScreen from './components/OnlineLobbyScreen';
import OnlineRoomBanner from './components/OnlineRoomBanner';
import { loadOnlineSession } from './utils/onlineSession';
import {
  ensureOnlineSocket,
  emitBattleAction,
  leaveOnlineRoom,
  subscribeOnline,
  syncOnlineProfile,
} from './utils/onlineSocketManager';
import RewardScreen from './components/RewardScreen';
import { buildAiFighter, fighterFromOwned } from './utils/fighterFromOwned';
import { initGameSounds, playSfx } from './utils/gameSounds';
import { pickFunnyWinTitle, winTitleForRarity } from './utils/rewards';
import {
  activeWallet,
  awardBattleRewards,
  buyGearForMonster,
  buyGearItem,
  buyMonster as purchaseMonsterRow,
  createPlayerProfile,
  equipOwnedGear,
  loadGameData,
  mergeMonsterParts,
  resetGameData,
  saveGameData,
  setActiveProfile,
  setProfileSelectedMonster,
  unequipOwnedGear,
  unlockGearSlotForMonster,
  updatePlayer,
  walletForProfile,
} from './utils/gameStorage';
import { getMonsterTemplate, RARITY_UI, ROLE_LABELS } from './utils/monsterTemplates';
import { playSound } from './utils/sounds';

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
    setGameMode(mode);
    if (mode === 'onePlayer') {
      setSetupP2Id(null);
      setSetupActiveSlot(1);
    } else if (gameData && setupP1ProfileId) {
      const p2 = setupP2ProfileId ?? gameData.players?.[1]?.id ?? setupP1ProfileId;
      if (!setupP2ProfileId) setSetupP2ProfileId(p2);
      syncSetupMonstersFromProfiles(gameData, setupP1ProfileId, p2, 'twoPlayer');
    }
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
    if (!onlineRoom?.roomCode) return;
    const payload = buildOnlineProfilePayload();
    if (payload) syncOnlineProfile(payload);
  }, [onlineRoom?.roomCode, buildOnlineProfilePayload, setupP1Id, gameData]);

  function handleOnlineBattleStart(roomState) {
    const f1 = roomState?.players?.p1?.profile?.fighter;
    const f2 = roomState?.players?.p2?.profile?.fighter;
    if (!f1 || !f2) return;
    const slot = loadOnlineSession()?.playerSlot ?? onlineSlot;
    setOnlineSlot(slot);
    setGameMode('online');
    beginBattle(f1, f2);
  }

  useEffect(() => {
    if (onlineRoom?.status !== 'battle') return;
    const f1 = onlineRoom.players?.p1?.profile?.fighter;
    const f2 = onlineRoom.players?.p2?.profile?.fighter;
    if (!f1 || !f2) return;
    if (phase === 'battle') return;
    if (phase === 'menu' || phase === 'online') handleOnlineBattleStart(onlineRoom);
  }, [onlineRoom?.status, onlineRoom?.battle?.seq, phase]);

  useEffect(() => {
    if (Platform.OS !== 'web' || typeof document === 'undefined') return undefined;
    const html = document.documentElement;
    const body = document.body;
    const root = document.getElementById('root');
    const scrollableLobby = phase === 'menu' || phase === 'online' || phase === 'gameOver';
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
    void initGameSounds();
    loadGameData().then((gd) => {
      setGameData(gd);
      const p1 = gd.session?.activeProfileId ?? gd.players?.[0]?.id ?? null;
      const p2 = gd.players?.[1]?.id ?? p1;
      setSetupP1ProfileId(p1);
      setSetupP2ProfileId(p2);
      syncSetupMonstersFromProfiles(gd, p1, p2);
    });
  }, []);

  useEffect(() => {
    if (!gameData) return undefined;
    const t = setTimeout(() => {
      void saveGameData(gameData);
    }, 180);
    return () => clearTimeout(t);
  }, [gameData]);

  const activeProfileId = gameData?.session?.activeProfileId ?? null;
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

  function handleSelectProfile(profileId) {
    if (!gameData) return;
    setGameData((gd) => {
      const next = setActiveProfile(gd, profileId);
      if (setupActiveSlot === 1 || gameMode === 'onePlayer') {
        setSetupP1ProfileId(profileId);
        const w = walletForProfile(next, profileId);
        setSetupP1Id(w.selectedMonsterId || w.ownedMonsters?.[0]?.id || null);
      }
      if (setupActiveSlot === 2 && gameMode === 'twoPlayer') {
        setSetupP2ProfileId(profileId);
        const w = walletForProfile(next, profileId);
        setSetupP2Id(w.selectedMonsterId || w.ownedMonsters?.[0]?.id || null);
      }
      return next;
    });
  }

  function handleCreateProfile(name) {
    if (!gameData) return;
    const defaultName = `Player ${gameData.players.length + 1}`;
    const res = createPlayerProfile(gameData, name || defaultName);
    if (res.error) {
      Alert.alert('Player profiles', res.error);
      return;
    }
    const newId = res.playerId;
    setGameData(res.gameData);
    if (setupActiveSlot === 2 && gameMode === 'twoPlayer') {
      setSetupP2ProfileId(newId);
      syncSetupMonstersFromProfiles(res.gameData, setupP1ProfileId ?? newId, newId);
    } else {
      setSetupP1ProfileId(newId);
      const p2 = setupP2ProfileId ?? res.gameData.players.find((p) => p.id !== newId)?.id ?? newId;
      if (!setupP2ProfileId && gameMode === 'twoPlayer') setSetupP2ProfileId(p2);
      syncSetupMonstersFromProfiles(res.gameData, newId, p2);
    }
  }

  function handleUpdateProfileName(profileId, name) {
    if (!gameData) return;
    setGameData((gd) => updatePlayer(gd, profileId, { name: name.trim().slice(0, 24) || 'Player' }));
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
    setGameData(nextGd);
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
    setGameData(res.gameData);
  }

  function handleBuyGearMart(gearId) {
    if (!gameData) return;
    const profileId = activeProfileId || setupP1ProfileId || null;
    const res = buyGearItem(gameData, profileId, gearId);
    if (res.error) {
      Alert.alert('Gear Mart', res.error);
      return;
    }
    setGameData(res.gameData);
  }

  function handleEquipGear(gearId, slotIndex = null) {
    if (!gameData || !gearMonsterId) return;
    const res = equipOwnedGear(gameData, gearProfileId || null, gearMonsterId, gearId, slotIndex);
    if (res.error) {
      Alert.alert('Monster Gear', res.error);
      return;
    }
    setGameData(res.gameData);
  }

  function handleUnequipGear(gearId, slotIndex = null) {
    if (!gameData || !gearMonsterId) return;
    const res = unequipOwnedGear(gameData, gearProfileId || null, gearMonsterId, gearId, slotIndex);
    if (res.error) {
      Alert.alert('Monster Gear', res.error);
      return;
    }
    setGameData(res.gameData);
  }

  function handleUnlockGearSlot() {
    if (!gameData || !gearMonsterId) return;
    const res = unlockGearSlotForMonster(gameData, gearProfileId || null, gearMonsterId);
    if (res.error) {
      Alert.alert('Unlock slot', res.error);
      return;
    }
    setGameData(res.gameData);
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
    if (gameMode === 'twoPlayer' && setupP1ProfileId === setupP2ProfileId) {
      Alert.alert('Invalid matchup', 'Pick two different player profiles — you cannot battle yourself.');
      return;
    }
    if (gameMode === 'onePlayer') {
      const gdClone = JSON.parse(JSON.stringify(gameData));
      const ai = buildAiFighter(f1, gdClone, setupP1ProfileId);
      if (!ai) {
        Alert.alert('Player setup', 'Could not build CPU opponent. Try again.');
        return;
      }
      beginBattle(f1, ai);
      return;
    }
    if (!setupP2ProfileId) {
      Alert.alert('Player setup', 'Select a profile for Player 2.');
      return;
    }
    const f2 = fighterFromSetupId(setupP2Id, setupP2ProfileId);
    if (!f2) {
      Alert.alert('Player setup', 'Player 2 needs a monster.');
      return;
    }
    beginBattle(f1, f2);
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

    setGameData(nextGd);
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
    playSound('coin');
    if (outcome === 1) void playSfx('winP1');
    else if (outcome === 2) void playSfx('winP2');
    setPhase('gameOver');
  }

  const resetToMenu = useCallback(() => {
    setWinner(null);
    setPlayer1(null);
    setPlayer2(null);
    setRewardSummary(null);
    setBattleKey(0);
    setPhase('menu');
  }, []);

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
      {phase !== 'menu' && phase !== 'battle' && phase !== 'online' ? (
        <>
          <Text style={styles.gameTitle}>Monster Dice Battle</Text>
          <View style={styles.coinsRow}>
            <Text style={styles.coinsStripText}>
              Coins 🪙 <Text style={styles.coinsAmt}>{coins}</Text>
            </Text>
            <TouchableOpacity style={styles.miniShop} onPress={() => setGearMartOpen(true)} accessibilityLabel="Gear mart">
              <Text style={styles.miniShopTxt}>Gear Mart</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.miniShop} onPress={openMonsterGearForActiveSlot} accessibilityLabel="Monster gear">
              <Text style={styles.miniShopTxt}>Equip</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.miniShop} onPress={() => setMonsterMartOpen(true)} accessibilityLabel="Monster mart">
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
                if (setupP1ProfileId) {
                  setGameData((gd) => setProfileSelectedMonster(gd, setupP1ProfileId, ownedId));
                }
                return;
              }
              const profId = setupActiveSlot === 1 ? setupP1ProfileId : setupP2ProfileId;
              if (setupActiveSlot === 1) setSetupP1Id(ownedId);
              else setSetupP2Id(ownedId);
              if (profId) {
                setGameData((gd) => setProfileSelectedMonster(gd, profId, ownedId));
              }
            }}
            onSelectProfile={handleSelectProfile}
            onCreateProfile={handleCreateProfile}
            onUpdateProfileName={handleUpdateProfileName}
            onStartGame={startGameFromSetup}
            onOpenMonsterGear={openMonsterGear}
            onlineRoom={onlineRoom}
            onlineSlot={onlineSlot}
            onEnterMultiplayer={() => {
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
              if (onlineRoom?.status === 'battle') handleOnlineBattleStart(onlineRoom);
              else setPhase('online');
            }}
            onOpenMonsterGearShop={openMonsterGearForActiveSlot}
            onOpenGearMart={() => setGearMartOpen(true)}
            onOpenMonsterMart={() => setMonsterMartOpen(true)}
            onResetSave={handleResetSave}
          />
        )}

        {phase === 'battle' && player1 && player2 && (
          <BattleScreen
            key={battleKey}
            fighter1={player1}
            fighter2={player2}
            onFinish={handleBattleFinish}
            onExitBattle={resetToMenu}
            player1Name={
              gameMode === 'online'
                ? onlineRoom?.players?.p1?.profile?.name ?? 'Player 1'
                : gameData.players.find((p) => p.id === setupP1ProfileId)?.name ??
                  player1.displayName ??
                  'Player 1'
            }
            player2Name={
              gameMode === 'onePlayer'
                ? player2.displayName ?? 'CPU'
                : gameMode === 'online'
                  ? onlineRoom?.players?.p2?.profile?.name ?? 'Player 2'
                  : gameData.players.find((p) => p.id === setupP2ProfileId)?.name ??
                    player2.displayName ??
                    'Player 2'
            }
            opponentLabel={gameMode === 'onePlayer' ? 'CPU' : 'Player 2'}
            opponentIsAi={gameMode === 'onePlayer'}
            battleExtras={{ mode: gameMode }}
            onlineBattle={
              gameMode === 'online'
                ? {
                    mySlot: onlineSlot,
                    snapshot: onlineRoom?.battle ?? null,
                    activeTurn: onlineRoom?.activeTurn ?? null,
                    emitAction: (action, payload) => emitBattleAction(action, payload),
                  }
                : null
            }
          />
        )}

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
