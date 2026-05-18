import React, { useMemo, useState } from 'react';
import {
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from 'react-native';
import OnlineRoomBanner from './OnlineRoomBanner';
import { GAME_ASSETS } from '../utils/gameAssetPaths';
import { normalizePlayerKey, validatePlayerKeyPair } from '../utils/playerKey';

const ALIGN_DEBUG = typeof __DEV__ !== 'undefined' && __DEV__ && false;
const MAX_VISIBLE_PROFILES = 4;
const MAX_VISIBLE_MONSTERS = 4;
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

  function mapButton(label, style, onPress, disabled = false) {
    return (
      <TouchableOpacity
        key={label}
        accessibilityRole="button"
        accessibilityLabel={label}
        activeOpacity={0.78}
        disabled={disabled || !onPress}
        onPress={onPress}
        style={[styles.hitZone, style, ALIGN_DEBUG && styles.alignDebug, disabled && styles.zoneDisabled]}
      />
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
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel="Open cloud saves"
          activeOpacity={0.8}
          onPress={() => toggleTray('cloud')}
          style={[styles.coinZone, ALIGN_DEBUG && styles.alignDebug]}
        >
          <Text style={styles.coinText}>{coins ?? 0}</Text>
        </TouchableOpacity>

        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel="Open trainer profile"
          activeOpacity={0.82}
          onPress={() => toggleTray('profile')}
          style={[styles.profileZone, isNarrow && styles.profileZoneNarrow, ALIGN_DEBUG && styles.alignDebug]}
        >
          <Text style={styles.profileName} numberOfLines={1}>{profileLabel}</Text>
          <Text style={styles.profileSub} numberOfLines={1}>{monsterLabel}</Text>
        </TouchableOpacity>

        {mapButton('Gear Mart', styles.gearMartZone, onOpenGearMart)}
        {mapButton('Equip Gear', styles.equipGearZone, onOpenMonsterGearShop || onOpenMonsterGear)}
        {mapButton('Monsters', styles.monstersZone, onOpenMonsterMart)}
        {mapButton('Audio', styles.audioZone, onOpenAudioSettings)}
        {mapButton('Monster Ladder', styles.ladderZone, onOpenMonsterLadder, !canStart)}
        {mapButton('Start Battle', styles.startZone, onStartGame, !canStart)}

        {mapButton('Cloud Saves', styles.questZone, () => toggleTray('cloud'))}
        {mapButton('Inventory', styles.inventoryZone, onOpenMonsterGearShop || onOpenMonsterGear)}
        {mapButton('Heroes and Monsters', styles.heroesZone, () => toggleTray('profile'))}
        {mapButton('Settings', styles.settingsZone, onResetSave || onOpenAudioSettings)}
        {onEnterMultiplayer ? mapButton('Multiplayer', styles.welcomeZone, onEnterMultiplayer) : null}

        {!canStart ? (
          <Pressable style={styles.pickHint} onPress={() => toggleTray('profile')}>
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
          <TouchableOpacity onPress={() => setTray(null)} style={styles.trayClose}>
            <Text style={styles.trayCloseText}>Close</Text>
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.trayScroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          {profiles.slice(0, MAX_VISIBLE_PROFILES).map((profile) => {
            const active = profile.id === activeProfileId;
            return (
              <View key={profile.id} style={[styles.compactRow, active && styles.compactRowActive]}>
                <TouchableOpacity style={styles.rowMain} onPress={() => onSelectProfile?.(profile.id)}>
                  <Text style={styles.rowTitle} numberOfLines={1}>{profile.name || 'Player'}</Text>
                  <Text style={styles.rowSub}>{active ? 'Active save slot' : 'Tap to select'}</Text>
                </TouchableOpacity>
                {onRequestDeleteProfile ? (
                  <TouchableOpacity
                    disabled={deleteBusyProfileId === profile.id}
                    onPress={() => onRequestDeleteProfile(profile.id)}
                    style={styles.rowMiniBtn}
                  >
                    <Text style={styles.rowMiniText}>Del</Text>
                  </TouchableOpacity>
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
              <TouchableOpacity onPress={handleSaveName} style={styles.smallGoldBtn}>
                <Text style={styles.smallGoldText}>Save</Text>
              </TouchableOpacity>
            </View>
          ) : null}

          <View style={styles.monsterPickStrip}>
            {monsters.slice(0, MAX_VISIBLE_MONSTERS).map((monster) => {
              const picked = monster.id === selectedP1Id;
              return (
                <TouchableOpacity
                  key={monster.id}
                  onPress={() => onSelectMonster?.(monster.id)}
                  style={[styles.monsterChip, picked && styles.monsterChipActive]}
                >
                  <Text style={styles.monsterChipText} numberOfLines={1}>
                    {monster.nickname || monster.templateId || 'Monster'}
                  </Text>
                  <Text style={styles.monsterChipSub}>Lv {monster.level ?? 1}</Text>
                </TouchableOpacity>
              );
            })}
          </View>

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
              <TouchableOpacity onPress={handleCreateProfile} style={styles.smallGoldBtn}>
                <Text style={styles.smallGoldText}>Create Player</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity
              onPress={() => {
                setCreateOpen(true);
                setCreateName(`Player ${profiles.length + 1}`);
              }}
              style={styles.smallGoldBtn}
            >
              <Text style={styles.smallGoldText}>New Player</Text>
            </TouchableOpacity>
          )}

          {gameMode && onGameModeChange ? (
            <View style={styles.modeRow}>
              <TouchableOpacity
                onPress={() => onGameModeChange('onePlayer')}
                style={[styles.modeBtn, gameMode === 'onePlayer' && styles.modeBtnActive]}
              >
                <Text style={styles.modeText}>1P</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => onGameModeChange('twoPlayer')}
                style={[styles.modeBtn, gameMode !== 'onePlayer' && styles.modeBtnActive]}
              >
                <Text style={styles.modeText}>2P</Text>
              </TouchableOpacity>
              {onActiveSlotChange ? (
                <TouchableOpacity
                  onPress={() => onActiveSlotChange(activeSlot === 2 ? 1 : 2)}
                  style={styles.modeBtn}
                >
                  <Text style={styles.modeText}>Slot {activeSlot || 1}</Text>
                </TouchableOpacity>
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
          <TouchableOpacity onPress={() => setTray(null)} style={styles.trayClose}>
            <Text style={styles.trayCloseText}>Close</Text>
          </TouchableOpacity>
        </View>
        <ScrollView style={styles.trayScroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          <TouchableOpacity onPress={onFetchCloudPlayers} style={styles.smallGoldBtn}>
            <Text style={styles.smallGoldText}>{cloudFetchLoading ? 'Loading...' : 'Refresh Cloud'}</Text>
          </TouchableOpacity>
          {cloudFetchError ? <Text style={styles.errorText}>{cloudFetchError}</Text> : null}
          {cloudPlayers.slice(0, MAX_VISIBLE_CLOUD).map((cp) => {
            const selected = cp.profileID === activeProfileId;
            return (
              <View key={cp.profileID} style={[styles.compactRow, selected && styles.compactRowActive]}>
                <TouchableOpacity style={styles.rowMain} onPress={() => onRequestSelectCloudProfile?.(cp)}>
                  <Text style={styles.rowTitle} numberOfLines={1}>{cp.playerName || 'Cloud Player'}</Text>
                  <Text style={styles.rowSub}>Coins {cp.coins ?? 0} · Lv {cp.level ?? 1}</Text>
                </TouchableOpacity>
                {onRequestDeleteCloudProfile ? (
                  <TouchableOpacity
                    disabled={deleteBusyProfileId === cp.profileID}
                    onPress={() => onRequestDeleteCloudProfile(cp)}
                    style={styles.rowMiniBtn}
                  >
                    <Text style={styles.rowMiniText}>Del</Text>
                  </TouchableOpacity>
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
    backgroundColor: 'rgba(255,255,255,0.01)',
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
    width: '15%',
    height: '4.8%',
    minHeight: 40,
    pointerEvents: 'auto',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 18,
  },
  coinText: {
    marginLeft: 20,
    color: '#fff8e5',
    fontSize: 20,
    fontWeight: '900',
    textShadowColor: 'rgba(0,0,0,0.7)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 2,
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
  gearMartZone: { top: '39.2%', left: '26%', width: '48%', height: '6.2%' },
  equipGearZone: { top: '46.5%', left: '26%', width: '48%', height: '6.2%' },
  monstersZone: { top: '53.8%', left: '26%', width: '48%', height: '6.2%' },
  audioZone: { top: '61.1%', left: '26%', width: '48%', height: '6.2%' },
  ladderZone: { top: '70.2%', left: '26%', width: '48%', height: '6.1%' },
  startZone: { top: '77.3%', left: '26%', width: '48%', height: '6.1%' },
  questZone: { top: '88.2%', left: '24%', width: '12%', height: '7.2%' },
  inventoryZone: { top: '88.2%', left: '39%', width: '12%', height: '7.2%' },
  heroesZone: { top: '88.2%', left: '54%', width: '12%', height: '7.2%' },
  settingsZone: { top: '88.2%', left: '68%', width: '12%', height: '7.2%' },
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
