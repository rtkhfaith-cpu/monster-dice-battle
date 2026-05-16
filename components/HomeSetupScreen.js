import React, { useMemo } from 'react';
import { StyleSheet, Text, TouchableOpacity, useWindowDimensions, View } from 'react-native';
import SaveSlotPanel from './SaveSlotPanel';
import GameSetupPanel from './GameSetupPanel';
import MonsterGridPanel from './MonsterGridPanel';
import { LOBBY } from '../utils/gameTheme';

/**
 * Handheld-style game lobby — 3-column layout on desktop, adaptive on tablet/mobile.
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
  onOnline,
  onOpenMonsterGearShop,
  onOpenMonsterMart,
  onSelectProfile,
  onCreateProfile,
  onUpdateProfileName,
  onResetSave,
  coins,
}) {
  const { width } = useWindowDimensions();
  const layout = width >= 960 ? 'wide' : width >= 640 ? 'mid' : 'narrow';

  const summary = useMemo(() => {
    const row = (ownedId, w) => {
      if (!ownedId || !w) return false;
      const om = w.ownedMonsters.find((x) => x.id === ownedId);
      return !!om;
    };
    return {
      p1: row(selectedP1Id, walletP1 || wallet),
      p2: gameMode === 'onePlayer' ? true : row(selectedP2Id, walletP2 || wallet),
    };
  }, [wallet, walletP1, walletP2, selectedP1Id, selectedP2Id, gameMode]);

  const canStart = summary.p1 && summary.p2;
  const missingMsg = useMemo(() => {
    if (!summary.p1) {
      return gameMode === 'onePlayer'
        ? 'Pick your monster on the right!'
        : 'Player 1 needs a monster — pick one on the right!';
    }
    if (gameMode === 'twoPlayer' && !summary.p2) return 'Player 2 needs a monster — pick one on the right!';
    return '';
  }, [summary, gameMode]);

  const saveProps = {
    profiles,
    activeProfileId,
    setupP1ProfileId,
    setupP2ProfileId,
    setupActiveSlot: activeSlot,
    gameMode,
    onSelectProfile,
    onCreateProfile,
    onUpdateName: onUpdateProfileName,
    compact: layout === 'narrow',
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
  };

  const gridProps = {
    wallet: gameMode === 'onePlayer' ? walletP1 || wallet : wallet,
    slotLabel: gameMode === 'onePlayer' ? slotProfileName : slotProfileName,
    gameMode,
    selectedP1Id,
    selectedP2Id: gameMode === 'onePlayer' ? null : selectedP2Id,
    onSelectMonster,
  };

  return (
    <View style={styles.root}>
      <View style={styles.topBar}>
        <Text style={styles.title} numberOfLines={1}>
          Monster Dice Battle
        </Text>
        <View style={styles.topActions}>
          <Text style={styles.coins}>
            🪙 <Text style={styles.coinsAmt}>{coins}</Text>
          </Text>
          <TouchableOpacity style={styles.menuChip} onPress={onOpenMonsterGearShop}>
            <Text style={styles.menuChipTxt}>Gear</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.menuChip} onPress={onOpenMonsterMart}>
            <Text style={styles.menuChipTxt}>Monsters</Text>
          </TouchableOpacity>
          {onResetSave ? (
            <TouchableOpacity style={styles.menuChipWarn} onPress={onResetSave}>
              <Text style={styles.menuChipTxt}>Reset</Text>
            </TouchableOpacity>
          ) : null}
          <TouchableOpacity style={styles.menuChipAlt} onPress={onOnline}>
            <Text style={styles.menuChipTxt}>Online</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.body}>
        {layout === 'wide' ? (
          <View style={styles.row3}>
            <View style={styles.colLeft}>
              <SaveSlotPanel {...saveProps} />
            </View>
            <View style={styles.colMid}>
              <GameSetupPanel {...setupProps} />
            </View>
            <View style={styles.colRight}>
              <MonsterGridPanel {...gridProps} />
            </View>
          </View>
        ) : null}

        {layout === 'mid' ? (
          <View style={styles.row2}>
            <View style={styles.colStack}>
              <SaveSlotPanel {...saveProps} />
              <View style={styles.setupGrow}>
                <GameSetupPanel {...setupProps} />
              </View>
            </View>
            <View style={styles.colMonsters}>
              <MonsterGridPanel {...gridProps} />
            </View>
          </View>
        ) : null}

        {layout === 'narrow' ? (
          <View style={styles.stack}>
            <View style={styles.saveSlotWrap}>
              <SaveSlotPanel {...saveProps} />
            </View>
            <GameSetupPanel {...setupProps} />
            <View style={styles.monstersGrow}>
              <MonsterGridPanel {...gridProps} />
            </View>
          </View>
        ) : null}
      </View>

      <View style={styles.bottom}>
        {missingMsg && !canStart ? <Text style={styles.missing}>{missingMsg}</Text> : null}
        <TouchableOpacity
          style={[styles.startBtn, !canStart && styles.startOff]}
          disabled={!canStart}
          onPress={onStartGame}
          activeOpacity={0.9}
        >
          <Text style={styles.startTxt}>⚔ START BATTLE</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    minHeight: 0,
  },
  topBar: {
    flexShrink: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 6,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: LOBBY.panelBorder,
    marginBottom: 6,
  },
  title: {
    fontWeight: '900',
    fontSize: 22,
    color: LOBBY.textStrong,
    flexShrink: 1,
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
  coinsAmt: { fontWeight: '900', color: LOBBY.coin },
  menuChip: {
    backgroundColor: LOBBY.chip,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: LOBBY.cardBorder,
  },
  menuChipAlt: {
    backgroundColor: LOBBY.chipAlt,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: LOBBY.cardBorder,
  },
  menuChipWarn: {
    backgroundColor: LOBBY.warn,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: LOBBY.cardBorder,
  },
  menuChipTxt: { fontWeight: '900', fontSize: 12, color: LOBBY.textStrong },
  body: {
    flex: 1,
    minHeight: 0,
  },
  row3: {
    flex: 1,
    flexDirection: 'row',
    gap: 6,
    minHeight: 0,
  },
  colLeft: { flex: 0.26, minWidth: 0, minHeight: 0 },
  colMid: { flex: 0.3, minWidth: 0, minHeight: 0 },
  colRight: { flex: 0.44, minWidth: 0, minHeight: 0 },
  row2: {
    flex: 1,
    flexDirection: 'row',
    gap: 6,
    minHeight: 0,
  },
  colStack: { flex: 0.42, minWidth: 0, minHeight: 0, gap: 6, flexDirection: 'column' },
  setupGrow: { flex: 1, minHeight: 0, minWidth: 0 },
  colMonsters: { flex: 0.58, minWidth: 0, minHeight: 0 },
  stack: {
    flex: 1,
    minHeight: 0,
    gap: 6,
  },
  saveSlotWrap: {
    flexShrink: 0,
    flexGrow: 0,
  },
  monstersGrow: { flex: 1, minHeight: 120 },
  bottom: {
    flexShrink: 0,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: LOBBY.panelBorder,
    marginTop: 4,
  },
  missing: {
    fontWeight: '800',
    fontSize: 13,
    color: '#b85450',
    textAlign: 'center',
    marginBottom: 6,
  },
  startBtn: {
    backgroundColor: LOBBY.start,
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: LOBBY.startBorder,
    alignItems: 'center',
    shadowColor: LOBBY.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 4,
  },
  startOff: { opacity: 0.45 },
  startTxt: {
    fontWeight: '900',
    fontSize: 20,
    color: '#fff',
    letterSpacing: 1,
  },
});
