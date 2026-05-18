import React, { useMemo, useState } from 'react';
import {
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from 'react-native';
import OnlineRoomBanner from './OnlineRoomBanner';
import { GAME_ASSETS } from '../utils/gameAssetPaths';
import { normalizePlayerKey, validatePlayerKeyPair } from '../utils/playerKey';
import { playUiSfx } from '../utils/sounds';

const ALIGN_DEBUG = typeof __DEV__ !== 'undefined' && __DEV__ && false;
const MAX_VISIBLE_PROFILES = 4;
const MAX_VISIBLE_CLOUD = 4;

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
  const { width } = useWindowDimensions();
  const isNarrow = width < 430;
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
  const selectedMonster =
    monsters.find((m) => m.id === selectedP1Id) ??
    monsters.find((m) => m.id === activeWallet?.selectedMonsterId) ??
    monsters[0] ??
    null;
  const canStart = !!selectedP1Id && monsters.some((m) => m.id === selectedP1Id);
  const profileLabel = activeProfile?.name || slotProfileName || 'Trainer';
  const monsterLabel = selectedMonster
    ? `${selectedMonster.nickname || selectedMonster.templateId || 'Monster'} · Lv ${selectedMonster.level ?? 1}`
    : 'Pick monster';

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

  function mapButton(label, style, onPress, disabled = false) {
    return (
      <Pressable
        key={label}
        accessibilityRole="button"
        accessibilityLabel={label}
        disabled={disabled || !onPress}
        onPress={pressWithSound(onPress)}
        style={({ pressed }) => [
          styles.hitZone,
          style,
          pressed && !disabled && styles.hitZonePressed,
          ALIGN_DEBUG && styles.alignDebug,
          disabled && styles.zoneDisabled,
        ]}
      >
        <View style={styles.zoneShine} pointerEvents="none" />
        <Text style={styles.zoneLabel} pointerEvents="none">{label}</Text>
      </Pressable>
    );
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
    <View style={[styles.root, Platform.OS === 'web' && styles.rootWeb]}>
      <View style={styles.overlay} pointerEvents="box-none">
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Open Gear Mart"
          onPress={pressWithSound(onOpenGearMart)}
          style={({ pressed }) => [styles.coinZone, pressed && styles.hitZonePressed, ALIGN_DEBUG && styles.alignDebug]}
        >
          <Text style={styles.coinText}>{coins ?? 0}</Text>
          <Text style={styles.coinMartText}>MART</Text>
        </Pressable>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Open trainer profile"
          onPress={pressWithSound(() => toggleTray('profile'))}
          style={({ pressed }) => [
            styles.profileZone,
            isNarrow && styles.profileZoneNarrow,
            pressed && styles.hitZonePressed,
            ALIGN_DEBUG && styles.alignDebug,
          ]}
        >
          <Text style={styles.profileName} numberOfLines={1}>{profileLabel}</Text>
          <Text style={styles.profileSub} numberOfLines={1}>{monsterLabel}</Text>
        </Pressable>

        {mapButton('Gear Mart', styles.gearMartZone, onOpenGearMart)}
        {mapButton('Equip Gear', styles.equipGearZone, onOpenMonsterGearShop || onOpenMonsterGear)}
        {mapButton('Monsters', styles.monstersZone, onOpenMonsterMart)}
        {mapButton('Audio', styles.audioZone, onOpenAudioSettings)}
        {mapButton('Monster Ladder', styles.ladderZone, onOpenMonsterLadder, !canStart)}
        {mapButton('Start Battle', styles.startZone, onStartGame, !canStart)}

        {mapButton('Cloud Saves', styles.cloudZone, () => toggleTray('cloud'))}
        {mapButton('Inventory', styles.inventoryZone, onOpenMonsterGearShop || onOpenMonsterGear)}
        {mapButton('Heroes and Monsters', styles.heroesZone, () => toggleTray('profile'))}
        {mapButton('Settings', styles.settingsZone, onResetSave || onOpenAudioSettings)}
        {onEnterMultiplayer ? mapButton('Multiplayer', styles.welcomeZone, onEnterMultiplayer) : null}

        {!canStart ? (
          <Pressable style={styles.pickHint} onPress={pressWithSound(() => toggleTray('profile'))}>
            <Text style={styles.pickHintText}>Pick a monster to start</Text>
          </Pressable>
        ) : null}

        {onlineBanner}
        {tray === 'profile' ? renderProfileTray() : null}
        {tray === 'cloud' ? renderCloudTray() : null}
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
    minHeight: 0,
    position: 'relative',
    overflow: 'hidden',
    backgroundColor: '#10243f',
  },
  rootWeb: {
    minHeight: '100dvh',
    backgroundImage: `url('${GAME_ASSETS.homeMainMenu}')`,
    backgroundSize: 'cover',
    backgroundPosition: 'center top',
    backgroundRepeat: 'no-repeat',
    paddingTop: 'env(safe-area-inset-top)',
    paddingBottom: 'env(safe-area-inset-bottom)',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    pointerEvents: 'none',
  },
  hitZone: {
    position: 'absolute',
    minHeight: 48,
    pointerEvents: 'auto',
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: 'rgba(255, 224, 143, 0.72)',
    borderBottomWidth: 5,
    borderBottomColor: 'rgba(77, 47, 20, 0.72)',
    backgroundColor: 'rgba(255, 239, 184, 0.16)',
    shadowColor: 'rgba(0,0,0,0.55)',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 8,
    ...(Platform.OS === 'web'
      ? {
          backgroundImage: 'linear-gradient(180deg, rgba(255,255,255,0.22), rgba(255,224,143,0.1) 45%, rgba(79,47,20,0.16))',
          boxShadow: 'inset 0 2px 0 rgba(255,255,255,0.35), inset 0 -5px 0 rgba(70,42,18,0.32), 0 5px 0 rgba(0,0,0,0.32), 0 0 16px rgba(255,224,143,0.18)',
          transitionProperty: 'transform, filter, box-shadow',
          transitionDuration: '110ms',
          cursor: 'pointer',
        }
      : {}),
  },
  hitZonePressed: {
    transform: [{ translateY: 4 }],
    borderBottomWidth: 2,
    opacity: 0.88,
  },
  zoneShine: {
    position: 'absolute',
    top: 3,
    left: 8,
    right: 8,
    height: '34%',
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.18)',
  },
  zoneLabel: {
    color: 'rgba(255, 248, 229, 0.72)',
    fontWeight: '900',
    fontSize: 12,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    textShadowColor: 'rgba(0,0,0,0.75)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  alignDebug: {
    borderWidth: 2,
    borderColor: 'rgba(255,0,0,0.8)',
    backgroundColor: 'rgba(255,0,0,0.08)',
  },
  zoneDisabled: {
    opacity: 0.55,
  },
  coinZone: {
    position: 'absolute',
    top: '4.1%',
    left: '4.4%',
    width: '18%',
    height: '5.2%',
    minHeight: 40,
    pointerEvents: 'auto',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 18,
    borderWidth: 2,
    borderColor: 'rgba(255, 224, 143, 0.8)',
    borderBottomWidth: 5,
    borderBottomColor: 'rgba(69, 38, 15, 0.75)',
    backgroundColor: 'rgba(72, 45, 30, 0.42)',
    shadowColor: 'rgba(0,0,0,0.55)',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 8,
    ...(Platform.OS === 'web'
      ? {
          boxShadow: 'inset 0 2px 0 rgba(255,255,255,0.24), inset 0 -4px 0 rgba(65,36,14,0.35), 0 4px 0 rgba(0,0,0,0.32), 0 0 14px rgba(255,224,143,0.18)',
          cursor: 'pointer',
        }
      : {}),
  },
  coinText: {
    marginLeft: 18,
    color: '#fff8e5',
    fontSize: 18,
    fontWeight: '900',
    textShadowColor: 'rgba(0,0,0,0.7)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 2,
  },
  coinMartText: {
    marginLeft: 18,
    marginTop: -2,
    color: 'rgba(255, 224, 143, 0.9)',
    fontSize: 8,
    fontWeight: '900',
    letterSpacing: 0.8,
  },
  profileZone: {
    position: 'absolute',
    top: '3.8%',
    right: '4.5%',
    width: '34%',
    minHeight: 48,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(255,224,143,0.72)',
    backgroundColor: 'rgba(31,25,36,0.45)',
    pointerEvents: 'auto',
    ...webShadow,
  },
  profileZoneNarrow: {
    width: '38%',
  },
  profileName: {
    color: '#fff8e5',
    fontWeight: '900',
    fontSize: 13,
    textAlign: 'right',
  },
  profileSub: {
    color: '#d9f7ff',
    fontWeight: '800',
    fontSize: 10,
    textAlign: 'right',
    marginTop: 1,
  },
  gearMartZone: { top: '38.2%', left: '26%', width: '48%', height: '6.2%' },
  equipGearZone: { top: '45.3%', left: '26%', width: '48%', height: '6.2%' },
  monstersZone: { top: '52.6%', left: '26%', width: '48%', height: '6.2%' },
  audioZone: { top: '59.8%', left: '26%', width: '48%', height: '6.2%' },
  ladderZone: { top: '68.8%', left: '26%', width: '48%', height: '6.1%' },
  startZone: { top: '75.9%', left: '26%', width: '48%', height: '6.1%' },
  cloudZone: { top: '88.2%', left: '62%', width: '12%', height: '7.2%' },
  inventoryZone: { top: '88.2%', left: '39%', width: '12%', height: '7.2%' },
  heroesZone: { top: '88.2%', left: '51%', width: '12%', height: '7.2%' },
  settingsZone: { top: '88.2%', left: '75%', width: '12%', height: '7.2%' },
  welcomeZone: { top: '96%', left: '33%', width: '34%', height: '3.6%', minHeight: 32 },
  pickHint: {
    position: 'absolute',
    left: '25%',
    right: '25%',
    top: '84.2%',
    minHeight: 32,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 16,
    backgroundColor: 'rgba(45,20,12,0.56)',
    borderWidth: 1,
    borderColor: 'rgba(255,224,143,0.7)',
    pointerEvents: 'auto',
  },
  pickHintText: {
    color: '#fff3c4',
    fontWeight: '900',
    fontSize: 12,
  },
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
