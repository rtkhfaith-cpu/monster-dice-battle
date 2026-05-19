import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  ImageBackground,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import MonsterPreview from './MonsterPreview';
import OnlineRoomBanner from './OnlineRoomBanner';
import { GAME_ASSETS } from '../utils/gameAssetPaths';
import { normalizePlayerKey, validatePlayerKeyPair } from '../utils/playerKey';
import { playUiSfx } from '../utils/sounds';
import { groupOwnedMonsters, MAX_MERGE_TIER, pickPrimaryInstance } from '../utils/mergeSystem';

const MAX_VISIBLE_PROFILES = 4;

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

function BottomNavButton({ label, icon, badge, style, onPress, highlight }) {
  const pulse = useRef(new Animated.Value(0.35)).current;
  useEffect(() => {
    if (!highlight) {
      pulse.setValue(0.35);
      return undefined;
    }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 0.92, duration: 620, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0.35, duration: 620, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [highlight, pulse]);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={({ pressed }) => [
        styles.bottomNavButton,
        highlight && styles.bottomNavButtonHighlight,
        style,
        pressed && styles.realButtonPressed,
      ]}
    >
      {highlight ? <Animated.View pointerEvents="none" style={[styles.bottomPulse, { opacity: pulse }]} /> : null}
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
  onLoginWithId,
  onCreateWithId,
  ladderAvailable,
  coins,
  ladderOwnedMonsters = [],
  onMergeMonster,
}) {
  const [tray, setTray] = useState(null);
  const [loginOpen, setLoginOpen] = useState(false);
  const [nameDraft, setNameDraft] = useState('');
  const [createOpen, setCreateOpen] = useState(false);
  const [createName, setCreateName] = useState('');
  const [createKey, setCreateKey] = useState('');
  const [createConfirm, setCreateConfirm] = useState('');
  const [createError, setCreateError] = useState('');
  const [loginId, setLoginId] = useState('');
  const [loginPin, setLoginPin] = useState('');
  const [loginMsg, setLoginMsg] = useState('');

  const activeProfile = profiles.find((p) => p.id === activeProfileId) ?? null;
  const activeWallet = walletP1 || wallet;
  const monsters = activeWallet?.ownedMonsters ?? [];
  const monsterGroups = useMemo(() => {
    return groupOwnedMonsters(monsters, ladderOwnedMonsters)
      .map((group) => {
        const mainInstances = group.instances.filter((i) => i._source === 'main');
        const battlePrimary = pickPrimaryInstance(mainInstances);
        return {
          ...group,
          battlePrimary,
          mainCount: mainInstances.length,
        };
      })
      .filter((g) => g.mainCount > 0);
  }, [monsters, ladderOwnedMonsters]);
  const canStart = !!selectedP1Id && monsters.some((m) => m.id === selectedP1Id);
  const multiplayerHandler = onEnterMultiplayer || onOpenOnlineLobby;
  const playerName = activeProfile?.name || slotProfileName || 'Trainer';

  const cloudActive = useMemo(
    () => cloudPlayers.find((cp) => cp.profileID === activeProfileId) ?? null,
    [activeProfileId, cloudPlayers],
  );

  useEffect(() => {
    if (tray === 'cloud') onFetchCloudPlayers?.();
  }, [tray, onFetchCloudPlayers]);

  function closeLoginModal() {
    setLoginOpen(false);
    setCreateError('');
    setCreateOpen(false);
  }

  function openLoginModal() {
    setTray(null);
    setLoginOpen(true);
    setNameDraft(activeProfile?.name ?? '');
    setLoginMsg('');
  }

  function toggleTray(next) {
    setLoginOpen(false);
    setTray((current) => (current === next ? null : next));
    setCreateError('');
    setCreateOpen(false);
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

  async function handleInlineLogin() {
    const id = loginId.trim();
    const pin = normalizePlayerKey(loginPin);
    if (!id || pin.length !== 4) {
      setLoginMsg('Enter ID and 4-digit PIN.');
      return;
    }
    const res = await onLoginWithId?.(id, pin);
    setLoginMsg(res?.error || (res?.ok ? 'Logged in.' : 'Login unavailable.'));
    if (res?.ok) {
      setLoginId('');
      setLoginPin('');
    }
  }

  async function handleInlineCreate() {
    const id = loginId.trim();
    const pin = normalizePlayerKey(loginPin);
    if (!id || pin.length !== 4) {
      setLoginMsg('Enter name/ID and 4-digit PIN.');
      return;
    }
    const res = await onCreateWithId?.(id, pin);
    setLoginMsg(res?.error || (res?.ok ? `Created. ID: ${res.profileId}` : 'Create unavailable.'));
    if (res?.ok) {
      setLoginPin('');
    }
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
            <View style={styles.topPlayerNameWrap} pointerEvents="none">
              <Text style={styles.topPlayerName} numberOfLines={1}>{playerName}</Text>
            </View>

            <View style={styles.menuLayer} pointerEvents="box-none">
              <FantasyButton
                label="Start Battle"
                icon="▶"
                variant="primary"
                style={styles.menuButtonOne}
                disabled={!canStart}
                onPress={pressWithSound(onStartGame)}
              />
              <FantasyButton
                label="Multiplayer"
                icon="⚔"
                variant="legendary"
                style={styles.menuButtonTwo}
                disabled={!multiplayerHandler}
                onPress={pressWithSound(multiplayerHandler)}
              />
              <FantasyButton label="Monster Mart" icon="●" style={styles.menuButtonThree} onPress={pressWithSound(onOpenMonsterMart)} />
              <FantasyButton label="Gear Mart" icon="◆" style={styles.menuButtonFour} onPress={pressWithSound(onOpenGearMart)} />
              <FantasyButton label="Equip Gear" icon="▣" style={styles.menuButtonFive} onPress={pressWithSound(onOpenMonsterGearShop || onOpenMonsterGear)} />
              <FantasyButton label="Login" icon="🔑" style={styles.menuButtonSix} onPress={pressWithSound(openLoginModal)} />
            </View>

            <BottomNavButton
              label="Quests"
              icon="★"
              style={styles.bottomQuest}
              highlight={ladderAvailable}
              onPress={pressWithSound(onOpenMonsterLadder)}
            />
            <BottomNavButton label="Inventory" icon="▤" style={styles.bottomInventory} onPress={pressWithSound(onOpenMonsterGearShop || onOpenMonsterGear)} />
            <BottomNavButton label="Monsters" icon="♜" style={styles.bottomMonsters} onPress={pressWithSound(() => toggleTray('monsters'))} />
            <BottomNavButton label="Settings" icon="⚙" style={styles.bottomSettings} onPress={pressWithSound(onResetSave || onOpenAudioSettings)} />

            {onlineBanner}
            {loginOpen ? renderLoginModal() : null}
            {tray === 'monsters' ? renderMonsterTray() : null}
            {tray === 'cloud' ? renderCloudTray() : null}
          </View>
        </ImageBackground>
      </View>
    </View>
  );

  function renderLoginModal() {
    return (
      <View style={styles.loginModalBackdrop} pointerEvents="box-none">
        <Pressable style={styles.loginModalScrim} onPress={pressWithSound(closeLoginModal)} />
        <View style={styles.loginModalCard}>
          <View style={styles.loginModalHeader}>
            <View>
              <Text style={styles.loginModalTitle}>Login & Players</Text>
              <Text style={styles.loginModalSub}>Sign in · create · delete</Text>
            </View>
            <Pressable onPress={pressWithSound(closeLoginModal)} style={styles.loginModalClose}>
              <Text style={styles.loginModalCloseTxt}>×</Text>
            </Pressable>
          </View>

          <ScrollView
            style={styles.loginModalScroll}
            contentContainerStyle={styles.loginModalScrollContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <Text style={styles.loginSectionLbl}>Quick sign-in</Text>
            <View style={styles.loginRow}>
              <TextInput
                value={loginId}
                onChangeText={(v) => setLoginId(String(v || '').slice(0, 10))}
                placeholder="Player ID"
                placeholderTextColor="rgba(255,255,255,0.58)"
                style={[styles.loginInput, styles.loginIdInputModal]}
                maxLength={10}
                autoCapitalize="none"
              />
              <TextInput
                value={loginPin}
                onChangeText={(v) => setLoginPin(normalizePlayerKey(v))}
                placeholder="PIN"
                placeholderTextColor="rgba(255,255,255,0.58)"
                style={[styles.loginInput, styles.loginPinInputModal]}
                maxLength={4}
                keyboardType="number-pad"
                secureTextEntry
              />
            </View>
            <View style={styles.loginRow}>
              <Pressable style={[styles.loginModalBtn, styles.loginModalBtnPrimary]} onPress={pressWithSound(handleInlineLogin)}>
                <Text style={styles.loginModalBtnTxt}>Login</Text>
              </Pressable>
              <Pressable style={[styles.loginModalBtn, styles.loginModalBtnAlt]} onPress={pressWithSound(handleInlineCreate)}>
                <Text style={styles.loginModalBtnTxt}>Create ID</Text>
              </Pressable>
            </View>
            {loginMsg ? <Text style={styles.loginMsg}>{loginMsg}</Text> : null}

            <Text style={styles.loginSectionLbl}>Save slots</Text>
            {profiles.slice(0, MAX_VISIBLE_PROFILES).map((profile) => {
              const active = profile.id === activeProfileId;
              return (
                <View key={profile.id} style={[styles.compactRow, styles.loginModalCompactRow, active && styles.compactRowActive]}>
                  <Pressable style={[styles.rowMain, styles.loginModalRowMain]} onPress={pressWithSound(() => onSelectProfile?.(profile.id))}>
                    <Text style={[styles.rowTitle, styles.loginModalRowTitle]} numberOfLines={1}>{profile.name || 'Player'}</Text>
                    <Text style={[styles.rowSub, styles.loginModalRowSub]}>{active ? 'Active' : 'Switch'}</Text>
                  </Pressable>
                  {onRequestDeleteProfile ? (
                    <Pressable
                      disabled={deleteBusyProfileId === profile.id}
                      onPress={pressWithSound(() => onRequestDeleteProfile(profile.id))}
                      style={[styles.rowMiniBtn, styles.rowMiniBtnDanger, styles.loginModalRowMiniBtn]}
                    >
                      <Text style={[styles.rowMiniText, styles.loginModalRowMiniText]}>Del</Text>
                    </Pressable>
                  ) : null}
                </View>
              );
            })}

            {activeProfile ? (
              <View style={[styles.inputRow, styles.loginModalInputRow]}>
                <TextInput
                  value={nameDraft}
                  onChangeText={setNameDraft}
                  placeholder="Name"
                  placeholderTextColor="rgba(255,255,255,0.58)"
                  style={[styles.textInput, styles.loginModalTextInput]}
                  maxLength={24}
                />
                <Pressable onPress={pressWithSound(handleSaveName)} style={[styles.smallGoldBtn, styles.loginModalSmallBtn]}>
                  <Text style={[styles.smallGoldText, styles.loginModalSmallGoldText]}>Save</Text>
                </Pressable>
              </View>
            ) : null}

            {createOpen ? (
              <View style={[styles.createBox, styles.loginModalCreateBox]}>
                <TextInput
                  value={createName}
                  onChangeText={setCreateName}
                  placeholder="Name"
                  placeholderTextColor="rgba(255,255,255,0.58)"
                  style={[styles.textInput, styles.loginModalTextInput]}
                  maxLength={24}
                />
                <View style={[styles.keyRow, styles.loginModalKeyRow]}>
                  <TextInput
                    value={createKey}
                    onChangeText={setCreateKey}
                    placeholder="PIN"
                    placeholderTextColor="rgba(255,255,255,0.58)"
                    style={[styles.textInput, styles.keyInput, styles.loginModalTextInput]}
                    maxLength={4}
                    keyboardType="number-pad"
                    secureTextEntry
                  />
                  <TextInput
                    value={createConfirm}
                    onChangeText={setCreateConfirm}
                    placeholder="OK"
                    placeholderTextColor="rgba(255,255,255,0.58)"
                    style={[styles.textInput, styles.keyInput, styles.loginModalTextInput]}
                    maxLength={4}
                    keyboardType="number-pad"
                    secureTextEntry
                  />
                </View>
                {createError ? <Text style={[styles.errorText, styles.loginModalErrorText]}>{createError}</Text> : null}
                <Pressable onPress={pressWithSound(handleCreateProfile)} style={[styles.smallGoldBtn, styles.loginModalSmallBtn]}>
                  <Text style={[styles.smallGoldText, styles.loginModalSmallGoldText]}>Create</Text>
                </Pressable>
              </View>
            ) : (
              <Pressable
                onPress={pressWithSound(() => {
                  setCreateOpen(true);
                  setCreateName(`Player ${profiles.length + 1}`);
                })}
                style={[styles.smallGoldBtn, styles.loginModalSmallBtn]}
              >
                <Text style={[styles.smallGoldText, styles.loginModalSmallGoldText]}>New save</Text>
              </Pressable>
            )}

            <Pressable
              onPress={pressWithSound(() => {
                closeLoginModal();
                setTray('cloud');
              })}
              style={[styles.smallGoldBtn, styles.loginModalSmallBtn]}
            >
              <Text style={[styles.smallGoldText, styles.loginModalSmallGoldText]}>Cloud</Text>
            </Pressable>

            {gameMode && onGameModeChange ? (
              <View style={[styles.modeRow, styles.loginModalModeRow]}>
                <Pressable
                  onPress={pressWithSound(() => onGameModeChange('onePlayer'))}
                  style={[styles.modeBtn, styles.loginModalModeBtn, gameMode === 'onePlayer' && styles.modeBtnActive]}
                >
                  <Text style={[styles.modeText, styles.loginModalModeText]}>1P</Text>
                </Pressable>
                <Pressable
                  onPress={pressWithSound(() => onGameModeChange('twoPlayer'))}
                  style={[styles.modeBtn, styles.loginModalModeBtn, gameMode !== 'onePlayer' && styles.modeBtnActive]}
                >
                  <Text style={[styles.modeText, styles.loginModalModeText]}>2P</Text>
                </Pressable>
                {onActiveSlotChange ? (
                  <Pressable
                    onPress={pressWithSound(() => onActiveSlotChange(activeSlot === 2 ? 1 : 2))}
                    style={[styles.modeBtn, styles.loginModalModeBtn]}
                  >
                    <Text style={[styles.modeText, styles.loginModalModeText]}>S{activeSlot || 1}</Text>
                  </Pressable>
                ) : null}
              </View>
            ) : null}
          </ScrollView>
        </View>
      </View>
    );
  }

  function renderMonsterTray() {
    return (
      <View style={styles.tray} pointerEvents="box-none">
        <View style={styles.trayHeader}>
          <View>
            <Text style={styles.trayTitle}>Monsters</Text>
            <Text style={styles.traySub}>Your collection · tap to equip · merge duplicates</Text>
          </View>
          <Pressable onPress={pressWithSound(() => setTray(null))} style={styles.trayClose}>
            <Text style={styles.trayCloseText}>Close</Text>
          </Pressable>
        </View>
        <ScrollView
          style={styles.trayScroll}
          contentContainerStyle={styles.monsterPickStrip}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator
          nestedScrollEnabled
        >
          {monsterGroups.map((group) => {
            const primary = group.battlePrimary ?? group.primary;
            if (!primary) return null;
            const picked = primary.id === selectedP1Id;
            const countLabel = group.count > 1 ? ` ×${group.count}` : '';
            const mergeLabel = group.mergeTier > 0 ? ` · +${group.mergeTier}` : '';
            const mergeTargetId = group.primary?.id ?? primary.id;
            return (
              <View key={group.templateId} style={[styles.monsterSelectRow, picked && styles.monsterChipActive]}>
                <Pressable
                  style={styles.monsterSelectMain}
                  onPress={pressWithSound(() => onSelectMonster?.(primary.id))}
                >
                  <View style={styles.monsterSelectPortrait}>
                    <MonsterPreview parts={primary.monsterParts} size={46} mood={picked ? 'happy' : 'neutral'} />
                  </View>
                  <View style={styles.monsterSelectMeta}>
                    <Text style={styles.monsterChipText} numberOfLines={1}>
                      {group.displayName}{countLabel}
                    </Text>
                    <Text style={styles.monsterChipSub}>
                      Lv {primary.level ?? 1}{mergeLabel}{picked ? ' · Selected' : ''}
                    </Text>
                  </View>
                </Pressable>
                {group.canMerge && onMergeMonster ? (
                  <Pressable
                    style={styles.mergeBtn}
                    onPress={pressWithSound(() => onMergeMonster(mergeTargetId))}
                  >
                    <Text style={styles.mergeBtnTxt}>Merge</Text>
                    <Text style={styles.mergeBtnSub}>+{group.mergeTier + 1}</Text>
                  </Pressable>
                ) : group.mergeTier >= MAX_MERGE_TIER ? (
                  <View style={styles.mergeMaxBadge}>
                    <Text style={styles.mergeMaxTxt}>MAX</Text>
                  </View>
                ) : null}
              </View>
            );
          })}
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
        <ScrollView
          style={styles.trayScroll}
          contentContainerStyle={styles.trayScrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator
          nestedScrollEnabled
        >
          <Pressable onPress={pressWithSound(onFetchCloudPlayers)} style={styles.smallGoldBtn}>
            <Text style={styles.smallGoldText}>{cloudFetchLoading ? 'Loading...' : 'Refresh Cloud'}</Text>
          </Pressable>
          {cloudFetchError ? <Text style={styles.errorText}>{cloudFetchError}</Text> : null}
          {cloudPlayers.map((cp) => {
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
  topPlayerNameWrap: {
    position: 'absolute',
    top: '4.8%',
    right: '5%',
    maxWidth: '34%',
    minHeight: 28,
    justifyContent: 'center',
    alignItems: 'flex-end',
    paddingHorizontal: 6,
  },
  topPlayerName: {
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
  menuButtonOne: { top: '42%' },
  menuButtonTwo: { top: '50%' },
  menuButtonThree: { top: '58%' },
  menuButtonFour: { top: '66%' },
  menuButtonFive: { top: '74%' },
  menuButtonSix: { top: '82%' },
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
  bottomNavButtonHighlight: {
    borderColor: '#fde68a',
    borderBottomColor: '#b45309',
    backgroundColor: 'rgba(146, 96, 20, 0.98)',
    shadowColor: '#facc15',
    shadowOpacity: 0.78,
    shadowRadius: 12,
    elevation: 12,
  },
  bottomPulse: {
    position: 'absolute',
    left: -8,
    right: -8,
    top: -8,
    bottom: -8,
    borderRadius: 18,
    backgroundColor: 'rgba(250, 204, 21, 0.36)',
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
  bottomMonsters: { left: '52%' },
  bottomSettings: { left: '73%' },
  onlineBanner: {
    position: 'absolute',
    left: '5%',
    right: '5%',
    top: '11%',
    pointerEvents: 'auto',
  },
  loginModalBackdrop: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 40,
    pointerEvents: 'box-none',
  },
  loginModalScrim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(4, 8, 18, 0.72)',
    ...(Platform.OS === 'web' ? { cursor: 'pointer' } : {}),
  },
  loginModalCard: {
    width: '46%',
    maxWidth: 210,
    maxHeight: '40%',
    minHeight: 150,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,224,143,0.9)',
    backgroundColor: 'rgba(15, 22, 42, 0.96)',
    padding: 8,
    zIndex: 41,
    pointerEvents: 'auto',
    ...webShadow,
  },
  loginModalHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 6,
    gap: 4,
  },
  loginModalTitle: {
    color: '#ffe6a3',
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 0.3,
    textTransform: 'uppercase',
  },
  loginModalSub: {
    color: '#bfdbfe',
    fontSize: 8,
    fontWeight: '800',
    marginTop: 1,
    maxWidth: 140,
  },
  loginModalClose: {
    width: 24,
    height: 24,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.1)',
    ...(Platform.OS === 'web' ? { cursor: 'pointer' } : {}),
  },
  loginModalCloseTxt: {
    color: '#e0f2fe',
    fontSize: 16,
    fontWeight: '900',
    lineHeight: 18,
  },
  loginModalScroll: {
    flexGrow: 0,
    maxHeight: 260,
  },
  loginModalScrollContent: {
    paddingBottom: 6,
    gap: 2,
  },
  loginSectionLbl: {
    color: '#fde68a',
    fontSize: 8,
    fontWeight: '900',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    marginTop: 4,
    marginBottom: 3,
  },
  loginModalCompactRow: {
    minHeight: 34,
    gap: 4,
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 4,
    marginBottom: 4,
  },
  loginModalRowMain: {
    minHeight: 28,
  },
  loginModalRowTitle: {
    fontSize: 10,
  },
  loginModalRowSub: {
    fontSize: 8,
  },
  loginModalRowMiniBtn: {
    minHeight: 26,
    paddingHorizontal: 6,
    borderRadius: 8,
    minWidth: 44,
  },
  loginModalRowMiniText: {
    fontSize: 8,
  },
  loginModalInputRow: {
    gap: 4,
    marginBottom: 4,
  },
  loginModalTextInput: {
    minHeight: 30,
    borderRadius: 9,
    paddingHorizontal: 8,
    fontSize: 10,
  },
  loginModalSmallBtn: {
    minHeight: 30,
    borderRadius: 9,
    paddingHorizontal: 8,
    marginBottom: 4,
  },
  loginModalSmallGoldText: {
    fontSize: 9,
  },
  loginModalCreateBox: {
    gap: 4,
    marginBottom: 4,
  },
  loginModalKeyRow: {
    gap: 4,
  },
  loginModalModeRow: {
    marginTop: 2,
    marginBottom: 2,
  },
  loginModalModeBtn: {
    minHeight: 28,
    paddingHorizontal: 8,
    borderRadius: 9,
  },
  loginModalModeText: {
    fontSize: 9,
  },
  loginModalErrorText: {
    fontSize: 8,
    marginBottom: 2,
  },
  loginRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    width: '100%',
  },
  loginInput: {
    height: 28,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.16)',
    backgroundColor: 'rgba(0,0,0,0.28)',
    color: '#fff8e5',
    fontSize: 10,
    fontWeight: '800',
    paddingHorizontal: 6,
    paddingVertical: 0,
  },
  loginIdInputModal: {
    flex: 1,
    minWidth: 0,
  },
  loginPinInputModal: {
    width: 52,
    flexGrow: 0,
    flexShrink: 0,
    textAlign: 'center',
    letterSpacing: 1.5,
  },
  loginModalBtn: {
    flex: 1,
    minHeight: 28,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    ...(Platform.OS === 'web' ? { cursor: 'pointer' } : {}),
  },
  loginModalBtnPrimary: {
    borderColor: '#ffe08a',
    backgroundColor: 'rgba(117, 76, 24, 0.92)',
  },
  loginModalBtnAlt: {
    borderColor: '#93c5fd',
    backgroundColor: 'rgba(30, 64, 175, 0.72)',
  },
  loginModalBtnTxt: {
    color: '#fff4c7',
    fontSize: 9,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  loginMsg: {
    color: '#bfdbfe',
    fontSize: 8,
    fontWeight: '800',
    textAlign: 'center',
    marginTop: 3,
    marginBottom: 2,
  },
  rowMiniBtnDanger: {
    backgroundColor: 'rgba(185,28,28,0.88)',
    minWidth: 64,
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
  traySub: {
    color: '#bfdbfe',
    fontSize: 10,
    fontWeight: '800',
    marginTop: 1,
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
  trayScrollContent: {
    paddingBottom: 10,
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
  monsterSelectRow: {
    flexGrow: 1,
    flexBasis: '47%',
    minHeight: 68,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.16)',
    backgroundColor: 'rgba(255,255,255,0.08)',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
  monsterSelectPortrait: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: 'rgba(0,0,0,0.22)',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  monsterSelectMain: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    minWidth: 0,
  },
  monsterSelectMeta: {
    flex: 1,
    minWidth: 0,
  },
  mergeBtn: {
    minWidth: 52,
    minHeight: 44,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#c4b5fd',
    backgroundColor: 'rgba(88, 28, 135, 0.88)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  mergeBtnTxt: {
    color: '#f5f3ff',
    fontWeight: '900',
    fontSize: 10,
    textTransform: 'uppercase',
  },
  mergeBtnSub: {
    color: '#e9d5ff',
    fontWeight: '800',
    fontSize: 8,
    marginTop: 1,
  },
  mergeMaxBadge: {
    minWidth: 40,
    paddingHorizontal: 6,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: 'rgba(250, 204, 21, 0.22)',
    borderWidth: 1,
    borderColor: 'rgba(250, 204, 21, 0.55)',
  },
  mergeMaxTxt: {
    color: '#fde68a',
    fontWeight: '900',
    fontSize: 9,
    textAlign: 'center',
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
