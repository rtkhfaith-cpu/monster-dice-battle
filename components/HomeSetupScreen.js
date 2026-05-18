import React, { useMemo, useState } from 'react';
import {
  ImageBackground,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import OnlineRoomBanner from './OnlineRoomBanner';
import { GAME_ASSETS } from '../utils/gameAssetPaths';
import { normalizePlayerKey, validatePlayerKeyPair } from '../utils/playerKey';
import { playUiSfx } from '../utils/sounds';

const MAX_VISIBLE_PROFILES = 4;
const MAX_VISIBLE_CLOUD = 4;

function FantasyButton({ label, icon, variant = 'default', style, disabled, onPress }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      disabled={disabled || !onPress}
      onPress={onPress}
      style={({ pressed }) => [
        styles.fantasyButton,
        variant === 'primary' && styles.fantasyButtonPrimary,
        variant === 'legendary' && styles.fantasyButtonLegendary,
        style,
        pressed && !disabled && styles.realButtonPressed,
        disabled && styles.realButtonDisabled,
      ]}
    >
      <View style={styles.realButtonShine} pointerEvents="none" />
      <Text style={[styles.realButtonIcon, variant !== 'default' && styles.realButtonIconLight]}>{icon}</Text>
      <Text style={[styles.realButtonText, variant !== 'default' && styles.realButtonTextLight]}>{label}</Text>
    </Pressable>
  );
}

function BottomNavButton({ label, icon, badge, style, onPress }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={({ pressed }) => [styles.bottomNavButton, style, pressed && styles.realButtonPressed]}
    >
      <View style={styles.bottomNavShine} pointerEvents="none" />
      <Text style={styles.bottomNavIcon}>{icon}</Text>
      <Text style={styles.bottomNavText}>{label}</Text>
      {badge ? (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{badge}</Text>
        </View>
      ) : null}
    </Pressable>
  );
}

export default function HomeSetupScreen({
  profiles,
  activeProfileId,
  wallet,
  walletP1,
  walletP2,
  slotProfileName,
  gameMode,
  onGameModeChange,
  activeSlot,
  onActiveSlotChange,
  selectedP1Id,
  selectedP2Id,
  onSelectMonster,
  onStartGame,
  onOpenMonsterLadder,
  onOpenMonsterGear,
  onEnterMultiplayer,
  onlineRoom,
  onlineSlot,
  onLeaveOnlineRoom,
  onOpenOnlineLobby,
  onOpenMonsterGearShop,
  onOpenGearMart,
  onOpenMonsterMart,
  onSelectProfile,
  onCreateProfile,
  onRequestDeleteProfile,
  onRequestDeleteCloudProfile,
  deleteBusyProfileId,
  cloudPlayers = [],
  cloudFetchLoading,
  cloudFetchError,
  onFetchCloudPlayers,
  onRequestSelectCloudProfile,
  onUpdateProfileName,
  onResetSave,
  onOpenAudioSettings,
  coins,
}) {
  const [tray, setTray] = useState(null);
  const [nameDraft, setNameDraft] = useState('');
  const [createOpen, setCreateOpen] = useState(false);
  const [createName, setCreateName] = useState('');
  const [createKey, setCreateKey] = useState('');
  const [createConfirm, setCreateConfirm] = useState('');
  const [createError, setCreateError] = useState('');

  const activeProfile = profiles.find((p) => p.id === activeProfileId) ?? null;
  const activeWallet = walletP1 || wallet;
  const monsters = activeWallet?.ownedMonsters ?? [];
  const canStart = !!selectedP1Id && monsters.some((m) => m.id === selectedP1Id);
  const multiplayerHandler = onEnterMultiplayer || onOpenOnlineLobby;
  const playerName = activeProfile?.name || slotProfileName || 'Trainer';

  const cloudActive = useMemo(
    () => cloudPlayers.find((cp) => cp.profileID === activeProfileId) ?? null,
    [activeProfileId, cloudPlayers],
  );

  function toggleTray(next) {
    setTray((current) => (current === next ? null : next));
    setCreateError('');
    setCreateOpen(false);
    if (next === 'profile') setNameDraft(activeProfile?.name ?? '');
    if (next === 'cloud') onFetchCloudPlayers?.();
  }

  function handleSaveName() {
    const trimmed = nameDraft.trim().slice(0, 24);
    if (activeProfile && trimmed && trimmed !== activeProfile.name) {
      onUpdateProfileName?.(activeProfile.id, trimmed);
    }
  }

  function handleCreateProfile() {
    const trimmed = createName.trim().slice(0, 24);
    if (!trimmed) {
      setCreateError('Player name cannot be empty.');
      return;
    }
    const keyError = validatePlayerKeyPair(createKey, createConfirm);
    if (keyError) {
      setCreateError(keyError);
      return;
    }
    onCreateProfile?.(trimmed, normalizePlayerKey(createKey), normalizePlayerKey(createConfirm));
    setCreateOpen(false);
    setCreateName('');
    setCreateKey('');
    setCreateConfirm('');
    setCreateError('');
  }

  function pressWithSound(onPress) {
    if (!onPress) return undefined;
    return (...args) => {
      playUiSfx();
      onPress(...args);
    };
  }

  const onlineBanner =
    onlineRoom?.roomCode ? (
      <View style={styles.onlineBanner}>
        <OnlineRoomBanner
          roomState={onlineRoom}
          mySlot={onlineSlot}
          onOpenLobby={onOpenOnlineLobby || onEnterMultiplayer}
          onLeaveRoom={onLeaveOnlineRoom}
        />
      </View>
    ) : null;

  return (
    <View style={styles.root}>
      <View style={styles.gameFrame}>
        <ImageBackground
          source={{ uri: GAME_ASSETS.homeMainMenu }}
          resizeMode="cover"
          style={styles.backgroundLayer}
          imageStyle={styles.backgroundImage}
        >
          <View style={styles.uiLayer} pointerEvents="box-none">
            <View style={styles.topCoinDisplay} pointerEvents="none">
              <Text style={styles.topCoinIcon}>◈</Text>
              <Text style={styles.topCoinText}>{coins ?? 0}</Text>
            </View>
            <Text style={styles.topPlayerName} numberOfLines={1} pointerEvents="none">
              {playerName}
            </Text>

            <View style={styles.menuLayer} pointerEvents="box-none">
              <FantasyButton label="Gear Mart" icon="◆" style={styles.menuButtonOne} onPress={pressWithSound(onOpenGearMart)} />
              <FantasyButton label="Equip Gear" icon="▣" style={styles.menuButtonTwo} onPress={pressWithSound(onOpenMonsterGearShop || onOpenMonsterGear)} />
              <FantasyButton label="Monsters" icon="●" style={styles.menuButtonThree} onPress={pressWithSound(onOpenMonsterMart)} />
              <FantasyButton
                label="Multiplayer"
                icon="⚔"
                variant="legendary"
                style={styles.menuButtonFour}
                disabled={!multiplayerHandler}
                onPress={pressWithSound(multiplayerHandler)}
              />
              <FantasyButton
                label="Start Battle"
                icon="▶"
                variant="primary"
                style={styles.menuButtonFive}
                disabled={!canStart}
                onPress={pressWithSound(onStartGame)}
              />
            </View>

            <BottomNavButton label="Quests" icon="!" badge="!" style={styles.bottomQuest} onPress={pressWithSound(onOpenMonsterLadder)} />
            <BottomNavButton label="Inventory" icon="▤" style={styles.bottomInventory} onPress={pressWithSound(onOpenMonsterGearShop || onOpenMonsterGear)} />
            <BottomNavButton label="Heroes" icon="♜" style={styles.bottomHeroes} onPress={pressWithSound(() => toggleTray('profile'))} />
            <BottomNavButton label="Settings" icon="⚙" style={styles.bottomSettings} onPress={pressWithSound(onResetSave || onOpenAudioSettings)} />

            {onlineBanner}
            {tray === 'profile' ? renderProfileTray() : null}
            {tray === 'cloud' ? renderCloudTray() : null}
          </View>
        </ImageBackground>
      </View>
    </View>
  );

  function renderProfileTray() {
    return (
      <View style={styles.tray} pointerEvents="box-none">
        <View style={styles.trayHeader}>
          <Text style={styles.trayTitle}>Trainer</Text>
          <Pressable onPress={pressWithSound(() => setTray(null))} style={styles.trayClose}>
            <Text style={styles.trayCloseText}>Close</Text>
          </Pressable>
        </View>

        <ScrollView style={styles.trayScroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          {profiles.slice(0, MAX_VISIBLE_PROFILES).map((profile) => {
            const active = profile.id === activeProfileId;
            return (
              <View key={profile.id} style={[styles.compactRow, active && styles.compactRowActive]}>
                <Pressable style={styles.rowMain} onPress={pressWithSound(() => onSelectProfile?.(profile.id))}>
                  <Text style={styles.rowTitle} numberOfLines={1}>{profile.name || 'Player'}</Text>
                  <Text style={styles.rowSub}>{active ? 'Active save slot' : 'Tap to select'}</Text>
                </Pressable>
                {onRequestDeleteProfile ? (
                  <Pressable
                    disabled={deleteBusyProfileId === profile.id}
                    onPress={pressWithSound(() => onRequestDeleteProfile(profile.id))}
                    style={styles.rowMiniBtn}
                  >
                    <Text style={styles.rowMiniText}>Del</Text>
                  </Pressable>
                ) : null}
              </View>
            );
          })}

          {activeProfile ? (
            <View style={styles.inputRow}>
              <TextInput
                value={nameDraft}
                onChangeText={setNameDraft}
                placeholder="Trainer name"
                placeholderTextColor="rgba(255,255,255,0.58)"
                style={styles.textInput}
                maxLength={24}
              />
              <Pressable onPress={pressWithSound(handleSaveName)} style={styles.smallGoldBtn}>
                <Text style={styles.smallGoldText}>Save</Text>
              </Pressable>
            </View>
          ) : null}

          <ScrollView
            style={styles.monsterPickScroll}
            contentContainerStyle={styles.monsterPickStrip}
            nestedScrollEnabled
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator
          >
            {monsters.map((monster) => {
              const picked = monster.id === selectedP1Id;
              return (
                <Pressable
                  key={monster.id}
                  onPress={pressWithSound(() => onSelectMonster?.(monster.id))}
                  style={[styles.monsterChip, picked && styles.monsterChipActive]}
                >
                  <Text style={styles.monsterChipText} numberOfLines={1}>
                    {monster.nickname || monster.templateId || 'Monster'}
                  </Text>
                  <Text style={styles.monsterChipSub}>Lv {monster.level ?? 1}</Text>
                </Pressable>
              );
            })}
          </ScrollView>

          {createOpen ? (
            <View style={styles.createBox}>
              <TextInput
                value={createName}
                onChangeText={setCreateName}
                placeholder="New player name"
                placeholderTextColor="rgba(255,255,255,0.58)"
                style={styles.textInput}
                maxLength={24}
              />
              <View style={styles.keyRow}>
                <TextInput
                  value={createKey}
                  onChangeText={setCreateKey}
                  placeholder="4-digit key"
                  placeholderTextColor="rgba(255,255,255,0.58)"
                  style={[styles.textInput, styles.keyInput]}
                  maxLength={4}
                  keyboardType="number-pad"
                  secureTextEntry
                />
                <TextInput
                  value={createConfirm}
                  onChangeText={setCreateConfirm}
                  placeholder="Confirm"
                  placeholderTextColor="rgba(255,255,255,0.58)"
                  style={[styles.textInput, styles.keyInput]}
                  maxLength={4}
                  keyboardType="number-pad"
                  secureTextEntry
                />
              </View>
              {createError ? <Text style={styles.errorText}>{createError}</Text> : null}
              <Pressable onPress={pressWithSound(handleCreateProfile)} style={styles.smallGoldBtn}>
                <Text style={styles.smallGoldText}>Create Player</Text>
              </Pressable>
            </View>
          ) : (
            <Pressable
              onPress={pressWithSound(() => {
                setCreateOpen(true);
                setCreateName(`Player ${profiles.length + 1}`);
              })}
              style={styles.smallGoldBtn}
            >
              <Text style={styles.smallGoldText}>New Player</Text>
            </Pressable>
          )}

          <Pressable onPress={pressWithSound(() => toggleTray('cloud'))} style={styles.smallGoldBtn}>
            <Text style={styles.smallGoldText}>Cloud Archive</Text>
          </Pressable>

          {gameMode && onGameModeChange ? (
            <View style={styles.modeRow}>
              <Pressable
                onPress={pressWithSound(() => onGameModeChange('onePlayer'))}
                style={[styles.modeBtn, gameMode === 'onePlayer' && styles.modeBtnActive]}
              >
                <Text style={styles.modeText}>1P</Text>
              </Pressable>
              <Pressable
                onPress={pressWithSound(() => onGameModeChange('twoPlayer'))}
                style={[styles.modeBtn, gameMode !== 'onePlayer' && styles.modeBtnActive]}
              >
                <Text style={styles.modeText}>2P</Text>
              </Pressable>
              {onActiveSlotChange ? (
                <Pressable
                  onPress={pressWithSound(() => onActiveSlotChange(activeSlot === 2 ? 1 : 2))}
                  style={styles.modeBtn}
                >
                  <Text style={styles.modeText}>Slot {activeSlot || 1}</Text>
                </Pressable>
              ) : null}
            </View>
          ) : null}
        </ScrollView>
      </View>
    );
  }

  function renderCloudTray() {
    return (
      <View style={styles.tray} pointerEvents="box-none">
        <View style={styles.trayHeader}>
          <Text style={styles.trayTitle}>Cloud Archive</Text>
          <Pressable onPress={pressWithSound(() => setTray(null))} style={styles.trayClose}>
            <Text style={styles.trayCloseText}>Close</Text>
          </Pressable>
        </View>
        <ScrollView style={styles.trayScroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          <Pressable onPress={pressWithSound(onFetchCloudPlayers)} style={styles.smallGoldBtn}>
            <Text style={styles.smallGoldText}>{cloudFetchLoading ? 'Loading...' : 'Refresh Cloud'}</Text>
          </Pressable>
          {cloudFetchError ? <Text style={styles.errorText}>{cloudFetchError}</Text> : null}
          {cloudPlayers.slice(0, MAX_VISIBLE_CLOUD).map((cp) => {
            const selected = cp.profileID === activeProfileId;
            return (
              <View key={cp.profileID} style={[styles.compactRow, selected && styles.compactRowActive]}>
                <Pressable style={styles.rowMain} onPress={pressWithSound(() => onRequestSelectCloudProfile?.(cp))}>
                  <Text style={styles.rowTitle} numberOfLines={1}>{cp.playerName || 'Cloud Player'}</Text>
                  <Text style={styles.rowSub}>Coins {cp.coins ?? 0} · Lv {cp.level ?? 1}</Text>
                </Pressable>
                {onRequestDeleteCloudProfile ? (
                  <Pressable
                    disabled={deleteBusyProfileId === cp.profileID}
                    onPress={pressWithSound(() => onRequestDeleteCloudProfile(cp))}
                    style={styles.rowMiniBtn}
                  >
                    <Text style={styles.rowMiniText}>Del</Text>
                  </Pressable>
                ) : null}
              </View>
            );
          })}
          {cloudActive ? (
            <Text style={styles.archiveHint}>Linked: {cloudActive.playerName || 'Cloud player'}</Text>
          ) : null}
        </ScrollView>
      </View>
    );
  }
}

const webShadow = Platform.OS === 'web'
  ? {
      boxShadow: '0 6px 16px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.2)',
      cursor: 'pointer',
    }
  : {};

const styles = StyleSheet.create({
  root: {
    flex: 1,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0a1424',
    ...(Platform.OS === 'web'
      ? {
          minHeight: '100dvh',
          paddingTop: 'env(safe-area-inset-top)',
          paddingBottom: 'env(safe-area-inset-bottom)',
        }
      : {}),
  },
  gameFrame: {
    position: 'relative',
    overflow: 'hidden',
    backgroundColor: '#12233d',
    ...(Platform.OS === 'web'
      ? {
          width: 'min(100vw, calc(100dvh * 0.5996))',
          height: 'min(100dvh, calc(100vw * 1.667))',
          boxShadow: '0 18px 50px rgba(0,0,0,0.36)',
        }
      : {
          width: '100%',
          aspectRatio: 614 / 1024,
        }),
  },
  backgroundLayer: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  backgroundImage: {
    width: '100%',
    height: '100%',
  },
  uiLayer: {
    ...StyleSheet.absoluteFillObject,
  },
  topCoinDisplay: {
    position: 'absolute',
    top: '4.8%',
    left: '5.5%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  topCoinIcon: {
    color: '#f8d56d',
    fontSize: 18,
    fontWeight: '900',
    textShadowColor: 'rgba(0,0,0,0.68)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 2,
  },
  topCoinText: {
    color: '#fff8df',
    fontSize: 15,
    fontWeight: '900',
    textShadowColor: 'rgba(0,0,0,0.68)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 2,
  },
  topPlayerName: {
    position: 'absolute',
    top: '4.8%',
    right: '5%',
    maxWidth: '34%',
    color: '#fff8df',
    fontSize: 14,
    fontWeight: '900',
    textAlign: 'right',
    textShadowColor: 'rgba(0,0,0,0.68)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 2,
  },
  menuLayer: {
    ...StyleSheet.absoluteFillObject,
  },
  fantasyButton: {
    position: 'absolute',
    left: '26.25%',
    width: '47.5%',
    height: '4.5%',
    minHeight: 38,
    borderRadius: 15,
    borderWidth: 2,
    borderColor: '#b9843b',
    borderBottomWidth: 5,
    borderBottomColor: '#68401f',
    backgroundColor: 'rgba(237, 210, 155, 0.94)',
    overflow: 'hidden',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.34,
    shadowRadius: 7,
    elevation: 10,
    ...(Platform.OS === 'web'
      ? {
          cursor: 'pointer',
          transitionProperty: 'transform, filter, box-shadow',
          transitionDuration: '120ms',
        }
      : {}),
  },
  fantasyButtonPrimary: {
    borderColor: '#efd17a',
    borderBottomColor: '#31551f',
    backgroundColor: 'rgba(48, 129, 66, 0.96)',
  },
  fantasyButtonLegendary: {
    borderColor: '#d9b8ff',
    borderBottomColor: '#4c2878',
    backgroundColor: 'rgba(92, 57, 143, 0.96)',
  },
  realButtonShine: {
    position: 'absolute',
    top: 1,
    left: 8,
    right: 8,
    height: '34%',
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.24)',
  },
  realButtonIcon: {
    color: '#6a421d',
    fontSize: 14,
    fontWeight: '900',
    textShadowColor: 'rgba(255,255,255,0.45)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 1,
  },
  realButtonText: {
    color: '#5c3618',
    fontSize: 14,
    fontWeight: '900',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
    textShadowColor: 'rgba(255,255,255,0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 1,
  },
  realButtonIconLight: {
    color: '#fff6d6',
    textShadowColor: 'rgba(0,0,0,0.45)',
  },
  realButtonTextLight: {
    color: '#fff6d6',
    textShadowColor: 'rgba(0,0,0,0.45)',
  },
  realButtonPressed: {
    transform: [{ scale: 0.97 }, { translateY: 2 }],
    shadowOpacity: 0.18,
  },
  realButtonDisabled: {
    opacity: 0.48,
  },
  menuButtonOne: { top: '42.4%' },
  menuButtonTwo: { top: '48.7%' },
  menuButtonThree: { top: '55%' },
  menuButtonFour: { top: '61.3%' },
  menuButtonFive: { top: '67.6%' },
  bottomNavButton: {
    position: 'absolute',
    top: '90%',
    width: '17%',
    height: '6.4%',
    minHeight: 48,
    borderRadius: 15,
    borderWidth: 2,
    borderColor: '#9a6b32',
    borderBottomWidth: 5,
    borderBottomColor: '#4b321c',
    backgroundColor: 'rgba(45, 57, 72, 0.94)',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.34,
    shadowRadius: 6,
    elevation: 8,
    ...(Platform.OS === 'web' ? { cursor: 'pointer' } : {}),
  },
  bottomNavShine: {
    position: 'absolute',
    top: 2,
    left: 5,
    right: 5,
    height: '32%',
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.18)',
  },
  bottomNavIcon: {
    color: '#e9d4a4',
    fontSize: 19,
    fontWeight: '900',
  },
  bottomNavText: {
    color: '#f4e3bd',
    fontSize: 8,
    fontWeight: '900',
    marginTop: 1,
    textTransform: 'uppercase',
  },
  badge: {
    position: 'absolute',
    top: -5,
    right: 2,
    width: 15,
    height: 15,
    borderRadius: 8,
    backgroundColor: '#c7352d',
    borderWidth: 1,
    borderColor: '#ffe6a3',
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: {
    color: '#fff',
    fontSize: 9,
    fontWeight: '900',
  },
  bottomQuest: { left: '10%' },
  bottomInventory: { left: '31%' },
  bottomHeroes: { left: '52%' },
  bottomSettings: { left: '73%' },
  onlineBanner: {
    position: 'absolute',
    left: '5%',
    right: '5%',
    top: '11%',
    pointerEvents: 'auto',
  },
  tray: {
    position: 'absolute',
    left: '7%',
    right: '7%',
    bottom: Platform.OS === 'web' ? 'calc(env(safe-area-inset-bottom) + 74px)' : 74,
    maxHeight: '36%',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,224,143,0.86)',
    backgroundColor: 'rgba(15, 22, 42, 0.82)',
    padding: 10,
    pointerEvents: 'auto',
    ...webShadow,
  },
  trayHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  trayTitle: {
    color: '#ffe6a3',
    fontSize: 14,
    fontWeight: '900',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  trayClose: {
    minHeight: 32,
    justifyContent: 'center',
    paddingHorizontal: 10,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  trayCloseText: {
    color: '#e0f2fe',
    fontSize: 12,
    fontWeight: '900',
  },
  trayScroll: {
    maxHeight: 260,
  },
  compactRow: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.14)',
    backgroundColor: 'rgba(255,255,255,0.08)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginBottom: 7,
  },
  compactRowActive: {
    borderColor: '#ffe08a',
    backgroundColor: 'rgba(39, 120, 84, 0.48)',
  },
  rowMain: {
    flex: 1,
    minHeight: 40,
    justifyContent: 'center',
  },
  rowTitle: {
    color: '#fff8e5',
    fontWeight: '900',
    fontSize: 13,
  },
  rowSub: {
    color: '#bfdbfe',
    fontWeight: '800',
    fontSize: 10,
    marginTop: 1,
  },
  rowMiniBtn: {
    minHeight: 36,
    paddingHorizontal: 10,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(185,28,28,0.72)',
  },
  rowMiniText: {
    color: '#fff',
    fontWeight: '900',
    fontSize: 11,
  },
  inputRow: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
    marginBottom: 8,
  },
  textInput: {
    flex: 1,
    minHeight: 44,
    color: '#fff8e5',
    fontWeight: '800',
    borderRadius: 13,
    borderWidth: 1,
    borderColor: 'rgba(255,224,143,0.55)',
    backgroundColor: 'rgba(0,0,0,0.26)',
    paddingHorizontal: 12,
  },
  smallGoldBtn: {
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#ffe08a',
    backgroundColor: 'rgba(117, 76, 24, 0.72)',
    paddingHorizontal: 12,
    marginBottom: 8,
  },
  smallGoldText: {
    color: '#fff4c7',
    fontWeight: '900',
    fontSize: 12,
  },
  monsterPickStrip: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 7,
    paddingBottom: 6,
    marginBottom: 8,
  },
  monsterPickScroll: {
    maxHeight: 118,
    marginBottom: 8,
  },
  monsterChip: {
    flexGrow: 1,
    flexBasis: '47%',
    minHeight: 48,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.16)',
    backgroundColor: 'rgba(255,255,255,0.08)',
    justifyContent: 'center',
    paddingHorizontal: 10,
  },
  monsterChipActive: {
    borderColor: '#86efac',
    backgroundColor: 'rgba(22, 163, 74, 0.45)',
  },
  monsterChipText: {
    color: '#fff8e5',
    fontWeight: '900',
    fontSize: 12,
  },
  monsterChipSub: {
    color: '#d9f7ff',
    fontWeight: '800',
    fontSize: 10,
  },
  createBox: {
    gap: 7,
    marginBottom: 8,
  },
  keyRow: {
    flexDirection: 'row',
    gap: 8,
  },
  keyInput: {
    minWidth: 0,
  },
  errorText: {
    color: '#fecaca',
    fontWeight: '800',
    fontSize: 11,
    marginBottom: 7,
  },
  modeRow: {
    flexDirection: 'row',
    gap: 7,
    marginBottom: 8,
  },
  modeBtn: {
    minHeight: 40,
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 13,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.16)',
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  modeBtnActive: {
    borderColor: '#ffe08a',
    backgroundColor: 'rgba(117, 76, 24, 0.65)',
  },
  modeText: {
    color: '#fff8e5',
    fontWeight: '900',
    fontSize: 12,
  },
  archiveHint: {
    color: '#bfdbfe',
    fontSize: 11,
    fontWeight: '800',
    textAlign: 'center',
    marginTop: 2,
    marginBottom: 4,
  },
});
