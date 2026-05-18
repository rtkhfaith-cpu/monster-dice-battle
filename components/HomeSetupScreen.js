import React, { useMemo } from 'react';
import {
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from 'react-native';
import SaveSlotPanel from './SaveSlotPanel';
import GameSetupPanel from './GameSetupPanel';
import MonsterGridPanel from './MonsterGridPanel';
import OnlineRoomBanner from './OnlineRoomBanner';
import { LOBBY } from '../utils/gameTheme';
import { GAME_ASSETS } from '../utils/gameAssetPaths';
import {
  getLayoutTier,
  isDesktopLayout,
  MOBILE_GAP,
  MOBILE_PAD,
  MOBILE_SECTION_GAP,
  scrollBottomInset,
} from '../utils/responsive';

/**
 * Lobby — desktop: 3 columns · tablet/mobile: vertical scroll stack (no overlap).
 */
export default function HomeSetupScreen({
  profiles,
  activeProfileId,
  setupP1ProfileId,
  setupP2ProfileId,
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
  cloudPlayers,
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
  const layoutTier = getLayoutTier(width);
  const isMobile = layoutTier === 'mobile';
  const isTablet = layoutTier === 'tablet';
  const usePageScroll = !isDesktopLayout(width);
  const activeProfile = profiles.find((p) => p.id === activeProfileId) ?? null;

  const summary = useMemo(() => {
    const row = (ownedId, w) => {
      if (!ownedId || !w) return false;
      const om = w.ownedMonsters.find((x) => x.id === ownedId);
      return !!om;
    };
    return {
      p1: row(selectedP1Id, walletP1 || wallet),
    };
  }, [wallet, walletP1, selectedP1Id]);

  const canStart = summary.p1;
  const missingMsg = useMemo(() => {
    if (!summary.p1) return 'Pick your monster below!';
    return '';
  }, [summary]);

  const panelLayout = { layoutTier, isMobile, isTablet };
  const activeWallet = walletP1 || wallet;
  const selectedMonster =
    activeWallet?.ownedMonsters?.find((m) => m.id === selectedP1Id) ??
    activeWallet?.ownedMonsters?.find((m) => m.id === activeWallet?.selectedMonsterId) ??
    activeWallet?.ownedMonsters?.[0] ??
    null;

  const saveProps = {
    profiles,
    activeProfileId,
    setupP1ProfileId,
    setupP2ProfileId,
    setupActiveSlot: activeSlot,
    gameMode,
    onSelectProfile,
    onCreateProfile,
    onRequestDeleteProfile,
    onRequestDeleteCloudProfile,
    deleteBusyProfileId,
    cloudPlayers,
    cloudFetchLoading,
    cloudFetchError,
    onFetchCloudPlayers,
    onRequestSelectCloudProfile,
    onUpdateName: onUpdateProfileName,
    compact: usePageScroll,
    embedInScroll: usePageScroll,
    ...panelLayout,
  };

  const setupProps = {
    gameMode,
    onGameModeChange,
    activeSlot,
    onActiveSlotChange,
    walletP1,
    walletP2,
    setupP1ProfileId,
    setupP2ProfileId,
    profiles,
    selectedP1Id,
    selectedP2Id,
    onOpenMonsterGear,
    onEnterMultiplayer,
    onOpenMonsterLadder,
    embedInScroll: usePageScroll,
    ...panelLayout,
  };

  const gridProps = {
    wallet: gameMode === 'onePlayer' ? walletP1 || wallet : wallet,
    slotLabel: slotProfileName,
    gameMode,
    selectedP1Id,
    selectedP2Id: gameMode === 'onePlayer' ? null : selectedP2Id,
    onSelectMonster,
    embedInScroll: usePageScroll,
    ...panelLayout,
  };

  const menuButton = (key, label, icon, onPress, tone = 'secondary', disabled = false) => (
    <TouchableOpacity
      key={key}
      style={[
        styles.fantasyBtn,
        tone === 'ladder' && styles.fantasyBtnLadder,
        tone === 'start' && styles.fantasyBtnStart,
        disabled && styles.startOff,
      ]}
      disabled={disabled}
      onPress={onPress}
      activeOpacity={0.86}
    >
      <Text style={styles.fantasyBtnIcon}>{icon}</Text>
      <Text style={[styles.fantasyBtnTxt, tone !== 'secondary' && styles.fantasyBtnTxtStrong]}>{label}</Text>
    </TouchableOpacity>
  );

  const mainMenuButtons = [
    menuButton('gearMart', 'Gear Mart', '🛒', onOpenGearMart),
    menuButton('equipGear', 'Equip Gear', '⚔', onOpenMonsterGearShop),
    menuButton('monsters', 'Monsters', '🥚', onOpenMonsterMart),
    onOpenAudioSettings ? menuButton('audio', 'Audio', '🔊', onOpenAudioSettings) : null,
    menuButton('ladder', 'Monster Ladder', '🪜', onOpenMonsterLadder, 'ladder', !canStart),
    menuButton('start', 'Start Battle', '⚔', onStartGame, 'start', !canStart),
  ].filter(Boolean);

  const topBarDesktop = (
    <View style={styles.topBar}>
      <Text style={styles.title} numberOfLines={1}>
        Monster Dice Battle
      </Text>
      <View style={styles.topActions}>
        <Text style={styles.coins}>
          🪙 <Text style={styles.coinsAmt}>{coins}</Text>
        </Text>
        <TouchableOpacity style={styles.menuChipAlt} onPress={onOpenGearMart}>
          <Text style={styles.menuChipTxt}>Gear Mart</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.menuChip} onPress={onOpenMonsterGearShop}>
          <Text style={styles.menuChipTxt}>Equip</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.menuChip} onPress={onOpenMonsterMart}>
          <Text style={styles.menuChipTxt}>Monsters</Text>
        </TouchableOpacity>
        {onOpenAudioSettings ? (
          <TouchableOpacity style={styles.menuChipAlt} onPress={onOpenAudioSettings}>
            <Text style={styles.menuChipTxt}>Audio</Text>
          </TouchableOpacity>
        ) : null}
        {onResetSave ? (
          <TouchableOpacity style={styles.menuChipWarn} onPress={onResetSave}>
            <Text style={styles.menuChipTxt}>Reset</Text>
          </TouchableOpacity>
        ) : null}
      </View>
    </View>
  );

  const topBarMobile = (
    <View style={styles.topBarMobile}>
      <Text style={styles.titleMobile} numberOfLines={2}>
        Monster Dice Battle
      </Text>
      <View style={styles.coinsPill}>
        <Text style={styles.coinsMobile}>
          🪙 <Text style={styles.coinsAmt}>{coins}</Text>
        </Text>
      </View>
    </View>
  );

  const onlineBanner =
    onlineRoom?.roomCode ? (
      <OnlineRoomBanner
        roomState={onlineRoom}
        mySlot={onlineSlot}
        onOpenLobby={onOpenOnlineLobby || onEnterMultiplayer}
        onLeaveRoom={onLeaveOnlineRoom}
      />
    ) : null;

  const startSection = (
    <View style={[styles.bottom, isMobile && styles.bottomMobile]}>
      {missingMsg && !canStart ? <Text style={styles.missing}>{missingMsg}</Text> : null}
      {onOpenMonsterLadder ? (
        <TouchableOpacity
          style={[styles.ladderBtn, isMobile && styles.ladderBtnMobile, !canStart && styles.startOff]}
          disabled={!canStart}
          onPress={onOpenMonsterLadder}
          activeOpacity={0.9}
        >
          <Text style={[styles.ladderTxt, isMobile && styles.startTxtMobile]}>🪜 MONSTER LADDER</Text>
        </TouchableOpacity>
      ) : null}
      <TouchableOpacity
        style={[styles.startBtn, isMobile && styles.startBtnMobile, !canStart && styles.startOff]}
        disabled={!canStart}
        onPress={onStartGame}
        activeOpacity={0.9}
      >
        <Text style={[styles.startTxt, isMobile && styles.startTxtMobile]}>⚔ START BATTLE</Text>
      </TouchableOpacity>
    </View>
  );

  const section = (key, child) => (
    <View key={key} style={[styles.section, isMobile && styles.sectionMobile]}>
      {child}
    </View>
  );

  return (
    <View style={[styles.fantasyRoot, Platform.OS === 'web' && styles.fantasyRootWeb]}>
      <View style={styles.fantasyShade} pointerEvents="none" />
      <ScrollView
        style={[styles.pageScroll, Platform.OS === 'web' && styles.pageScrollWeb]}
        contentContainerStyle={[styles.fantasyContent, isMobile && styles.fantasyContentMobile]}
        keyboardShouldPersistTaps="always"
        showsVerticalScrollIndicator={false}
        nestedScrollEnabled={false}
      >
        <View style={styles.fantasyHud}>
          <View style={styles.coinBadge}>
            <Text style={styles.coinBadgeTxt}>🪙 {coins}</Text>
          </View>
          <View style={styles.profileBadge}>
            <Text style={styles.profileBadgeName} numberOfLines={1}>
              {activeProfile?.name || 'Welcome, Trainer!'}
            </Text>
            <Text style={styles.profileBadgeSub} numberOfLines={1}>
              {selectedMonster ? `${selectedMonster.nickname || 'Active Monster'} · Lv ${selectedMonster.level}` : 'Pick your first monster'}
            </Text>
          </View>
        </View>

        <View style={styles.logoBlock} pointerEvents="none">
          <Text style={[styles.logoTop, isMobile && styles.logoTopMobile]}>Monster</Text>
          <Text style={[styles.logoBottom, isMobile && styles.logoBottomMobile]}>Dice Battle</Text>
        </View>

        {onlineBanner ? <View style={styles.bannerWrap}>{onlineBanner}</View> : null}

        <View style={[styles.fantasyMenuCard, isMobile && styles.fantasyMenuCardMobile]}>
          <Text style={styles.menuCardTitle}>Main Menu</Text>
          <View style={styles.fantasyBtnStack}>{mainMenuButtons}</View>
          {missingMsg && !canStart ? <Text style={styles.missing}>{missingMsg}</Text> : null}
        </View>

        <View style={[styles.homeUtilityGrid, isMobile && styles.homeUtilityGridMobile]}>
          <View style={styles.homeUtilityPanel}>
            <SaveSlotPanel {...saveProps} compact embedInScroll />
          </View>
          <View style={styles.homeUtilityPanel}>
            <MonsterGridPanel {...gridProps} embedInScroll isMobile={isMobile} />
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  fantasyRoot: {
    flex: 1,
    width: '100%',
    minHeight: 0,
    backgroundColor: '#10243f',
  },
  fantasyRootWeb: {
    minHeight: '100dvh',
    backgroundImage: `url('${GAME_ASSETS.homeMainMenu}')`,
    backgroundSize: 'cover',
    backgroundPosition: 'center top',
    backgroundRepeat: 'no-repeat',
  },
  fantasyShade: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(5, 12, 28, 0.2)',
  },
  fantasyContent: {
    flexGrow: 1,
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingTop: 'max(12px, env(safe-area-inset-top))',
    paddingBottom: scrollBottomInset(28),
    gap: 10,
  },
  fantasyContentMobile: {
    paddingHorizontal: 12,
    paddingTop: 'max(10px, env(safe-area-inset-top))',
    paddingBottom: 'max(18px, env(safe-area-inset-bottom))',
    gap: 10,
  },
  fantasyHud: {
    width: '100%',
    maxWidth: 760,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  coinBadge: {
    minHeight: 40,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 18,
    borderWidth: 2,
    borderColor: '#f6c45f',
    backgroundColor: 'rgba(11, 22, 47, 0.88)',
    shadowColor: 'rgba(72, 190, 255, 0.28)',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 4,
  },
  coinBadgeTxt: { fontWeight: '900', fontSize: 16, color: '#ffe9a6' },
  profileBadge: {
    flex: 1,
    minHeight: 44,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 18,
    borderWidth: 2,
    borderColor: 'rgba(246, 196, 95, 0.88)',
    backgroundColor: 'rgba(9, 22, 49, 0.86)',
  },
  profileBadgeName: { fontWeight: '900', fontSize: 14, color: '#f8e7b5', textAlign: 'right' },
  profileBadgeSub: { fontWeight: '800', fontSize: 11, color: '#8ee7ff', textAlign: 'right', marginTop: 1 },
  logoBlock: {
    alignItems: 'center',
    marginTop: 0,
    marginBottom: -2,
    shadowColor: 'rgba(0,0,0,0.5)',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 0,
  },
  logoTop: {
    fontWeight: '900',
    fontSize: 44,
    lineHeight: 48,
    color: '#ffcf55',
    textTransform: 'uppercase',
    letterSpacing: 1,
    textShadowColor: '#45220f',
    textShadowOffset: { width: 3, height: 4 },
    textShadowRadius: 0,
  },
  logoTopMobile: { fontSize: 32, lineHeight: 35 },
  logoBottom: {
    marginTop: -4,
    fontWeight: '900',
    fontSize: 38,
    lineHeight: 42,
    color: '#dff4ff',
    textTransform: 'uppercase',
    letterSpacing: 1,
    textShadowColor: '#10243f',
    textShadowOffset: { width: 3, height: 4 },
    textShadowRadius: 0,
  },
  logoBottomMobile: { fontSize: 28, lineHeight: 31 },
  fantasyMenuCard: {
    width: '100%',
    maxWidth: 430,
    padding: 14,
    borderRadius: 24,
    borderWidth: 3,
    borderColor: '#d6a94c',
    backgroundColor: 'rgba(8, 18, 42, 0.9)',
    shadowColor: 'rgba(0,0,0,0.7)',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 10,
    ...(Platform.OS === 'web'
      ? {
          boxShadow: '0 0 0 2px rgba(255,224,143,0.18), 0 18px 40px rgba(0,0,0,0.48), inset 0 1px 0 rgba(255,255,255,0.18)',
          backdropFilter: 'blur(2px)',
        }
      : {}),
  },
  fantasyMenuCardMobile: {
    maxWidth: 360,
    padding: 12,
    borderRadius: 18,
  },
  menuCardTitle: {
    fontWeight: '900',
    fontSize: 16,
    letterSpacing: 1.6,
    textAlign: 'center',
    color: '#f8e7b5',
    textTransform: 'uppercase',
    marginBottom: 10,
  },
  fantasyBtnStack: { gap: 8 },
  fantasyBtn: {
    minHeight: 50,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#d6a94c',
    backgroundColor: '#142a58',
    paddingHorizontal: 16,
    shadowColor: 'rgba(0,0,0,0.48)',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 4,
    ...(Platform.OS === 'web'
      ? {
          backgroundImage: 'linear-gradient(180deg, rgba(36,76,139,0.96), rgba(11,30,70,0.96))',
          boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.22), 0 4px 0 rgba(0,0,0,0.32), 0 0 14px rgba(63,188,255,0.12)',
          transitionProperty: 'transform, filter',
          transitionDuration: '120ms',
          cursor: 'pointer',
        }
      : {}),
  },
  fantasyBtnLadder: {
    borderColor: '#d8b4fe',
    backgroundColor: '#6d28d9',
    ...(Platform.OS === 'web'
      ? {
          backgroundImage: 'linear-gradient(180deg, #8b5cf6, #4c1d95)',
          boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.28), 0 4px 0 rgba(34,13,84,0.85), 0 0 20px rgba(168,85,247,0.55)',
        }
      : {}),
  },
  fantasyBtnStart: {
    borderColor: '#f8d36d',
    backgroundColor: '#16a34a',
    ...(Platform.OS === 'web'
      ? {
          backgroundImage: 'linear-gradient(180deg, #5ee37b, #15803d)',
          boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.3), 0 4px 0 rgba(20,83,45,0.9), 0 0 22px rgba(74,222,128,0.5)',
        }
      : {}),
  },
  fantasyBtnIcon: {
    width: 44,
    fontSize: 24,
    textAlign: 'center',
  },
  fantasyBtnTxt: {
    flex: 1,
    fontWeight: '900',
    fontSize: 18,
    color: '#f7e9bd',
    textShadowColor: 'rgba(0,0,0,0.55)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 0,
  },
  fantasyBtnTxtStrong: {
    color: '#fff',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  homeUtilityGrid: {
    width: '100%',
    maxWidth: 930,
    flexDirection: 'row',
    gap: 12,
    alignItems: 'stretch',
    paddingBottom: 8,
  },
  homeUtilityGridMobile: {
    maxWidth: 380,
    flexDirection: 'column',
    gap: 10,
  },
  homeUtilityPanel: {
    flex: 1,
    minWidth: 0,
    ...(Platform.OS === 'web' ? { backdropFilter: 'blur(2px)' } : {}),
  },
  root: {
    flex: 1,
    minHeight: 0,
  },
  pageScroll: {
    flex: 1,
    minHeight: 0,
    width: '100%',
  },
  pageScrollWeb: {
    overflowY: 'auto',
    overflowX: 'hidden',
    WebkitOverflowScrolling: 'touch',
    touchAction: 'pan-y',
    overscrollBehavior: 'contain',
  },
  pageScrollContent: {
    paddingBottom: scrollBottomInset(32),
    paddingTop: 4,
    flexGrow: 1,
  },
  pageScrollContentMobile: {
    paddingHorizontal: MOBILE_PAD,
    paddingTop: 8,
    paddingBottom: scrollBottomInset(40),
  },
  topBar: {
    flexShrink: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 8,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: LOBBY.panelBorder,
    marginBottom: 8,
  },
  topBarMobile: {
    flexShrink: 0,
    gap: 10,
    marginBottom: MOBILE_SECTION_GAP,
  },
  title: {
    fontWeight: '900',
    fontSize: 22,
    color: LOBBY.textStrong,
    flexShrink: 1,
  },
  titleMobile: {
    fontWeight: '900',
    fontSize: 20,
    lineHeight: 24,
    color: LOBBY.textStrong,
  },
  topActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 6,
    justifyContent: 'flex-end',
    flex: 1,
  },
  coins: { fontWeight: '800', fontSize: 15, color: LOBBY.textStrong },
  coinsPill: {
    alignSelf: 'flex-start',
    backgroundColor: LOBBY.chip,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: LOBBY.cardBorder,
  },
  coinsMobile: { fontWeight: '800', fontSize: 15, color: LOBBY.textStrong },
  coinsAmt: { fontWeight: '900', color: LOBBY.coin },
  menuChip: {
    backgroundColor: LOBBY.chip,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: LOBBY.cardBorder,
    minHeight: 40,
    justifyContent: 'center',
  },
  menuChipAlt: {
    backgroundColor: LOBBY.chipAlt,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: LOBBY.cardBorder,
    minHeight: 40,
    justifyContent: 'center',
  },
  menuChipWarn: {
    backgroundColor: LOBBY.warn,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: LOBBY.cardBorder,
    minHeight: 40,
    justifyContent: 'center',
  },
  menuChipTxt: { fontWeight: '900', fontSize: 12, color: LOBBY.textStrong },
  body: {
    flex: 1,
    minHeight: 0,
  },
  row3: {
    flex: 1,
    flexDirection: 'row',
    gap: 8,
    minHeight: 0,
  },
  colLeft: { flex: 0.26, minWidth: 0, minHeight: 0 },
  colMid: { flex: 0.3, minWidth: 0, minHeight: 0 },
  colRight: { flex: 0.44, minWidth: 0, minHeight: 0 },
  stack: {
    gap: 10,
    flexGrow: 0,
  },
  stackMobile: {
    gap: MOBILE_SECTION_GAP,
  },
  section: {
    width: '100%',
    flexShrink: 0,
  },
  sectionMobile: {
    marginBottom: 0,
  },
  bannerWrap: {
    marginBottom: MOBILE_GAP,
  },
  shopRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  shopRowMobile: {
    flexDirection: 'column',
    gap: 10,
  },
  shopBtn: {
    flexGrow: 1,
    flexBasis: '30%',
    minWidth: 100,
    minHeight: 48,
    backgroundColor: LOBBY.chip,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: LOBBY.cardBorder,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  shopBtnAlt: {
    backgroundColor: LOBBY.chipAlt,
  },
  shopBtnWarn: {
    backgroundColor: LOBBY.warn,
  },
  shopBtnFull: {
    width: '100%',
    flexBasis: 'auto',
    minWidth: 0,
  },
  shopBtnTxt: {
    fontWeight: '900',
    fontSize: 14,
    color: LOBBY.textStrong,
    textAlign: 'center',
  },
  bottom: {
    flexShrink: 0,
    paddingTop: 14,
    marginTop: 10,
    borderTopWidth: 1,
    borderTopColor: LOBBY.panelBorder,
  },
  bottomMobile: {
    paddingTop: 16,
    marginTop: MOBILE_SECTION_GAP,
  },
  missing: {
    fontWeight: '800',
    fontSize: 13,
    color: '#b85450',
    textAlign: 'center',
    marginBottom: 10,
  },
  ladderBtn: {
    backgroundColor: '#6c5ce7',
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: '#4834d4',
    alignItems: 'center',
    minHeight: 48,
    justifyContent: 'center',
    marginBottom: 10,
  },
  ladderBtnMobile: {
    width: '100%',
    minHeight: 52,
    paddingVertical: 14,
  },
  ladderTxt: {
    fontWeight: '900',
    fontSize: 17,
    color: '#fff',
    letterSpacing: 0.5,
  },
  startBtn: {
    backgroundColor: LOBBY.start,
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: LOBBY.startBorder,
    alignItems: 'center',
    minHeight: 52,
    justifyContent: 'center',
    shadowColor: LOBBY.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 4,
  },
  startBtnMobile: {
    width: '100%',
    minHeight: 56,
    paddingVertical: 16,
  },
  startOff: { opacity: 0.45 },
  startTxt: {
    fontWeight: '900',
    fontSize: 20,
    color: '#fff',
    letterSpacing: 1,
  },
  startTxtMobile: {
    fontSize: 18,
    letterSpacing: 0.5,
  },
});
