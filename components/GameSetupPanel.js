import React, { useMemo } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import MonsterPreview from './MonsterPreview';
import { fighterFromOwned } from '../utils/fighterFromOwned';
import { getMonsterTemplate } from '../utils/monsterTemplates';
import { LOBBY, panelShadow } from '../utils/gameTheme';

function rosterLine(wallet, ownedId, profileName) {
  if (!ownedId || !wallet) {
    return { ok: false, title: profileName || '—', sub: 'Pick monster →' };
  }
  const om = wallet.ownedMonsters.find((x) => x.id === ownedId);
  if (!om) return { ok: false, title: profileName, sub: 'Pick monster →' };
  const f = fighterFromOwned(om);
  const t = getMonsterTemplate(om.templateId);
  const name = om.nickname || t?.name || 'Monster';
  return {
    ok: true,
    title: profileName || 'Player',
    sub: `${name} · Lv ${om.level}`,
    fighter: f,
  };
}

function RosterCard({
  slot,
  active,
  data,
  onSelect,
  onGear,
  compact,
}) {
  return (
    <TouchableOpacity
      style={[styles.rosterCard, compact && styles.rosterCompact, active && styles.rosterOn]}
      onPress={() => onSelect(slot)}
      activeOpacity={0.9}
    >
      <View style={styles.rosterTop}>
        {data.fighter ? (
          <MonsterPreview parts={data.fighter.monsterParts} size={compact ? 40 : 44} mood="happy" />
        ) : (
          <Text style={styles.fallbackEmoji}>{slot === 1 ? '🎮' : '🤖'}</Text>
        )}
        <View style={styles.rosterMeta}>
          <Text style={styles.rosterLbl}>{slot === 1 ? 'Player 1' : 'Player 2'}</Text>
          <Text style={styles.rosterName} numberOfLines={1}>
            {data.title}
          </Text>
          <Text style={styles.rosterSub} numberOfLines={1}>
            {data.sub}
          </Text>
        </View>
      </View>
      <View style={styles.rosterFoot}>
        <Text style={[styles.readyTag, data.ok && styles.readyOk]}>{data.ok ? 'READY' : 'PICK'}</Text>
        <TouchableOpacity style={styles.gearMini} onPress={() => onGear(slot)}>
          <Text style={styles.gearMiniTxt}>Gear</Text>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
}

/**
 * Middle lobby column — mode, P1/P2 slots, gear.
 */
export default function GameSetupPanel({
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
}) {
  const p1Name = profiles.find((p) => p.id === setupP1ProfileId)?.name ?? 'Player 1';
  const p2Name = profiles.find((p) => p.id === setupP2ProfileId)?.name ?? 'Player 2';

  const p1 = useMemo(() => rosterLine(walletP1, selectedP1Id, p1Name), [walletP1, selectedP1Id, p1Name]);
  const p2 = useMemo(
    () =>
      gameMode === 'onePlayer'
        ? { ok: true, title: 'CPU', sub: 'Auto match', fighter: null }
        : rosterLine(walletP2, selectedP2Id, p2Name),
    [gameMode, walletP2, selectedP2Id, p2Name],
  );

  const ready = p1.ok && p2.ok;

  return (
    <View style={styles.panel}>
      <Text style={styles.panelTitle}>Battle Setup</Text>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        nestedScrollEnabled
      >
        <View style={styles.modeRow}>
          <TouchableOpacity
            style={[styles.modeBtn, gameMode === 'onePlayer' && styles.modeOn]}
            onPress={() => onGameModeChange('onePlayer')}
          >
            <Text style={styles.modeTxt}>1P vs CPU</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.modeBtn, gameMode === 'twoPlayer' && styles.modeOn]}
            onPress={() => onGameModeChange('twoPlayer')}
          >
            <Text style={styles.modeTxt}>2 Players</Text>
          </TouchableOpacity>
        </View>

        {gameMode === 'twoPlayer' ? (
          <View style={styles.rosterRow}>
            <RosterCard
              slot={1}
              compact
              active={activeSlot === 1}
              data={p1}
              onSelect={onActiveSlotChange}
              onGear={onOpenMonsterGear}
            />
            <RosterCard
              slot={2}
              compact
              active={activeSlot === 2}
              data={p2}
              onSelect={onActiveSlotChange}
              onGear={onOpenMonsterGear}
            />
          </View>
        ) : (
          <>
            <RosterCard
              slot={1}
              active={activeSlot === 1}
              data={p1}
              onSelect={onActiveSlotChange}
              onGear={onOpenMonsterGear}
            />
            <View style={styles.cpuCard}>
              <Text style={styles.cpuEmoji}>🤖</Text>
              <Text style={styles.cpuLbl}>CPU Opponent</Text>
              <Text style={styles.cpuSub}>Generated when battle starts</Text>
              <Text style={[styles.readyTag, styles.readyOk]}>AUTO</Text>
            </View>
          </>
        )}

        <View style={[styles.statusBar, ready && styles.statusOk]}>
          <Text style={styles.statusTxt}>{ready ? 'All fighters ready!' : 'Choose monsters on the right'}</Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  panel: {
    flex: 1,
    minWidth: 0,
    minHeight: 0,
    backgroundColor: LOBBY.panel,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: LOBBY.panelBorder,
    padding: 8,
    ...panelShadow,
  },
  panelTitle: {
    fontWeight: '900',
    fontSize: 15,
    color: LOBBY.textStrong,
    textAlign: 'center',
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  scroll: { flex: 1, minHeight: 0 },
  scrollContent: { paddingBottom: 4 },
  modeRow: { flexDirection: 'row', gap: 6, marginBottom: 6 },
  modeBtn: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: LOBBY.cardBorder,
    backgroundColor: LOBBY.chip,
    alignItems: 'center',
  },
  modeOn: { backgroundColor: LOBBY.accent, borderColor: LOBBY.accentStrong },
  modeTxt: { fontWeight: '900', fontSize: 12, color: LOBBY.textStrong },
  rosterRow: { flexDirection: 'row', gap: 6, marginBottom: 4 },
  rosterCard: {
    backgroundColor: LOBBY.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: LOBBY.cardBorder,
    padding: 8,
    marginBottom: 6,
  },
  rosterCompact: {
    flex: 1,
    minWidth: 0,
    marginBottom: 0,
    padding: 6,
  },
  rosterOn: {
    borderColor: LOBBY.cardActiveBorder,
    backgroundColor: LOBBY.cardActive,
    borderWidth: 2,
  },
  rosterTop: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  rosterMeta: { flex: 1, minWidth: 0 },
  rosterLbl: { fontWeight: '800', fontSize: 11, color: LOBBY.textMuted },
  rosterName: { fontWeight: '900', fontSize: 13, color: LOBBY.textStrong },
  rosterSub: { fontWeight: '700', fontSize: 11, color: LOBBY.textMuted, marginTop: 1 },
  rosterFoot: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 6,
    gap: 4,
  },
  fallbackEmoji: { fontSize: 32, width: 40, textAlign: 'center' },
  cpuCard: {
    alignItems: 'center',
    backgroundColor: LOBBY.chipAlt,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: LOBBY.cardBorder,
    padding: 8,
    marginBottom: 6,
  },
  cpuEmoji: { fontSize: 28 },
  cpuLbl: { fontWeight: '900', fontSize: 13, color: LOBBY.textStrong, marginTop: 2 },
  cpuSub: { fontWeight: '700', fontSize: 11, color: LOBBY.textMuted },
  readyTag: {
    fontWeight: '900',
    fontSize: 10,
    color: '#b85450',
    backgroundColor: '#fde8e6',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    overflow: 'hidden',
  },
  readyOk: { color: '#3d8b5a', backgroundColor: '#e2f5e8' },
  gearMini: {
    backgroundColor: LOBBY.chip,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: LOBBY.cardBorder,
  },
  gearMiniTxt: { fontWeight: '900', fontSize: 11, color: LOBBY.text },
  statusBar: {
    padding: 6,
    borderRadius: 10,
    backgroundColor: '#fff5e0',
    borderWidth: 1,
    borderColor: '#f0d9a8',
  },
  statusOk: { backgroundColor: '#e8f8ee', borderColor: '#b8e0c8' },
  statusTxt: { fontWeight: '800', fontSize: 11, color: LOBBY.text, textAlign: 'center' },
});
