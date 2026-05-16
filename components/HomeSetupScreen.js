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
  coins,
}) {
  const { width } = useWindowDimensions();
  const layoutTier = getLayoutTier(width);
  const isMobile = layoutTier === 'mobile';
  const isTablet = layoutTier === 'tablet';
  const usePageScroll = !isDesktopLayout(width);

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

  const shopButtons = (
    <View style={[styles.shopRow, isMobile && styles.shopRowMobile]}>
      <TouchableOpacity
        style={[styles.shopBtn, isMobile && styles.shopBtnFull, styles.shopBtnAlt]}
        onPress={onOpenGearMart}
        activeOpacity={0.88}
      >
        <Text style={styles.shopBtnTxt}>🛒 Gear Mart</Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={[styles.shopBtn, isMobile && styles.shopBtnFull]}
        onPress={onOpenMonsterGearShop}
        activeOpacity={0.88}
      >
        <Text style={styles.shopBtnTxt}>⚔ Equip Gear</Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={[styles.shopBtn, isMobile && styles.shopBtnFull]}
        onPress={onOpenMonsterMart}
        activeOpacity={0.88}
      >
        <Text style={styles.shopBtnTxt}>🥚 Monsters</Text>
      </TouchableOpacity>
      {onResetSave ? (
        <TouchableOpacity
          style={[styles.shopBtn, isMobile && styles.shopBtnFull, styles.shopBtnWarn]}
          onPress={onResetSave}
          activeOpacity={0.88}
        >
          <Text style={styles.shopBtnTxt}>Reset Save</Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );

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

  const scrollBody = (
    <>
      {section('save', <SaveSlotPanel {...saveProps} />)}
      {section('setup', <GameSetupPanel {...setupProps} />)}
      {section('monsters', <MonsterGridPanel {...gridProps} />)}
      {usePageScroll ? section('shop', shopButtons) : null}
    </>
  );

  const wideBody = (
    <View style={styles.body}>
      <View style={styles.row3}>
        <View style={styles.colLeft}>
          <SaveSlotPanel {...saveProps} compact={false} embedInScroll={false} />
        </View>
        <View style={styles.colMid}>
          <GameSetupPanel {...setupProps} embedInScroll={false} />
        </View>
        <View style={styles.colRight}>
          <MonsterGridPanel {...gridProps} embedInScroll={false} />
        </View>
      </View>
    </View>
  );

  if (usePageScroll) {
    return (
      <ScrollView
        style={[styles.pageScroll, Platform.OS === 'web' && styles.pageScrollWeb]}
        contentContainerStyle={[
          styles.pageScrollContent,
          isMobile && styles.pageScrollContentMobile,
        ]}
        keyboardShouldPersistTaps="always"
        showsVerticalScrollIndicator
        nestedScrollEnabled={false}
        scrollEnabled
        bounces
      >
        {isMobile ? topBarMobile : topBarDesktop}
        {onlineBanner ? <View style={styles.bannerWrap}>{onlineBanner}</View> : null}
        <View style={[styles.stack, isMobile && styles.stackMobile]}>{scrollBody}</View>
        {startSection}
      </ScrollView>
    );
  }

  return (
    <View style={styles.root}>
      {topBarDesktop}
      {onlineBanner}
      {wideBody}
      {startSection}
    </View>
  );
}

const styles = StyleSheet.create({
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
