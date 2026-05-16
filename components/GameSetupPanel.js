import React, { useMemo } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import MonsterPreview from './MonsterPreview';
import { fighterFromOwned } from '../utils/fighterFromOwned';
import { getMonsterTemplate } from '../utils/monsterTemplates';
import { gamePanelStyle } from '../utils/artDirection';
import { LOBBY } from '../utils/gameTheme';

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
  isMobile,
  fullWidth,
}) {
  return (
    <TouchableOpacity
      style={[
        styles.rosterCard,
        compact && !isMobile && styles.rosterCompact,
        fullWidth && styles.rosterFull,
        active && styles.rosterOn,
      ]}
      onPress={() => onSelect(slot)}
      activeOpacity={0.9}
    >
      <View style={styles.rosterTop}>
        {data.fighter ? (
          <MonsterPreview parts={data.fighter.monsterParts} size={isMobile ? 44 : compact ? 40 : 44} mood="happy" />
        ) : (
          <Text style={styles.fallbackEmoji}>{slot === 1 ? '🎮' : '🤖'}</Text>
        )}
        <View style={styles.rosterMeta}>
          <Text style={[styles.rosterLbl, isMobile && styles.rosterLblMobile]}>
            {slot === 1 ? 'Player 1' : 'Player 2'}
          </Text>
          <Text style={[styles.rosterName, isMobile && styles.rosterNameMobile]} numberOfLines={1}>
            {data.title}
          </Text>
          <Text style={[styles.rosterSub, isMobile && styles.rosterSubMobile]} numberOfLines={1}>
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
 * Battle setup — mobile: vertical full-width controls; desktop: compact column.
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
  onEnterMultiplayer,
  embedInScroll = false,
  isMobile = false,
}) {
  const p1Name = profiles.find((p) => p.id === setupP1ProfileId)?.name ?? 'Player 1';

  const p1 = useMemo(() => rosterLine(walletP1, selectedP1Id, p1Name), [walletP1, selectedP1Id, p1Name]);

  const ready = p1.ok;

  const BodyWrap = embedInScroll ? View : ScrollView;
  const bodyProps = embedInScroll
    ? { style: styles.scrollContent }
    : {
        style: styles.scroll,
        contentContainerStyle: styles.scrollContent,
        showsVerticalScrollIndicator: false,
        nestedScrollEnabled: true,
        keyboardShouldPersistTaps: 'handled',
      };

  return (
    <View style={[styles.panel, embedInScroll && styles.panelEmbed, isMobile && styles.panelMobile]}>
      <Text style={[styles.panelTitle, isMobile && styles.panelTitleMobile]}>Battle Setup</Text>

      <BodyWrap {...bodyProps}>
        <View style={[styles.modeCol, isMobile && styles.modeColMobile]}>
          <View style={[styles.modeRow, isMobile && styles.modeRowMobile]}>
            <TouchableOpacity
              style={[
                styles.modeBtn,
                styles.modeBtnFlex,
                isMobile && styles.modeBtnMobile,
                (gameMode === 'onePlayer' || gameMode !== 'online') && styles.modeOn,
              ]}
              onPress={() => onGameModeChange('onePlayer')}
            >
              <Text style={[styles.modeTxt, isMobile && styles.modeTxtMobile]}>1P vs CPU</Text>
            </TouchableOpacity>
          </View>
          {onEnterMultiplayer ? (
            <TouchableOpacity
              style={[styles.modeBtnOnline, isMobile && styles.modeBtnMobile]}
              onPress={onEnterMultiplayer}
            >
              <Text style={[styles.modeTxtOnline, isMobile && styles.modeTxtMobile]}>🌐 Online Multiplayer</Text>
            </TouchableOpacity>
          ) : null}
          <Text style={[styles.modeHint, isMobile && styles.modeHintMobile]}>
            Fight the CPU solo, or use Online Multiplayer with a room code.
          </Text>
        </View>

        <>
          <RosterCard
            slot={1}
            fullWidth={isMobile}
            isMobile={isMobile}
            active={activeSlot === 1}
            data={p1}
            onSelect={onActiveSlotChange}
            onGear={onOpenMonsterGear}
          />
          <View style={[styles.cpuCard, isMobile && styles.cpuCardMobile]}>
            <Text style={styles.cpuEmoji}>🤖</Text>
            <Text style={styles.cpuLbl}>CPU Opponent</Text>
            <Text style={styles.cpuSub}>Generated when battle starts</Text>
            <Text style={[styles.readyTag, styles.readyOk]}>AUTO</Text>
          </View>
        </>

        <View style={[styles.statusBar, ready && styles.statusOk]}>
          <Text style={[styles.statusTxt, isMobile && styles.statusTxtMobile]}>
            {ready ? 'All fighters ready!' : 'Choose monsters below'}
          </Text>
        </View>
      </BodyWrap>
    </View>
  );
}

const styles = StyleSheet.create({
  panel: {
    flex: 1,
    minWidth: 0,
    minHeight: 0,
    padding: 10,
    ...gamePanelStyle(LOBBY.panelBorder),
  },
  panelMobile: {
    flex: 0,
    flexGrow: 0,
    padding: 14,
    borderRadius: 16,
  },
  panelEmbed: {
    flex: 0,
    flexGrow: 0,
    minHeight: 0,
  },
  panelTitle: {
    fontWeight: '900',
    fontSize: 15,
    color: LOBBY.textStrong,
    textAlign: 'center',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  panelTitleMobile: {
    fontSize: 14,
    marginBottom: 10,
  },
  scroll: { flex: 1, minHeight: 0 },
  scrollContent: { paddingBottom: 4 },
  modeCol: { gap: 8, marginBottom: 10 },
  modeColMobile: { gap: 10, marginBottom: 12 },
  modeRow: { flexDirection: 'row', gap: 8 },
  modeRowMobile: { flexDirection: 'column', gap: 10 },
  modeBtnFlex: { flex: 1, minWidth: 0 },
  modeBtn: {
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: LOBBY.cardBorder,
    backgroundColor: LOBBY.chip,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
  },
  modeBtnMobile: {
    width: '100%',
    minHeight: 52,
    paddingVertical: 14,
  },
  modeBtnOnline: {
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#0984e3',
    backgroundColor: '#74b9ff',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
  },
  modeOn: { backgroundColor: LOBBY.accent, borderColor: LOBBY.accentStrong },
  modeTxt: { fontWeight: '900', fontSize: 13, color: LOBBY.textStrong },
  modeTxtMobile: { fontSize: 15 },
  modeHint: {
    fontWeight: '700',
    fontSize: 11,
    color: LOBBY.textMuted,
    textAlign: 'center',
    marginTop: 4,
    paddingHorizontal: 4,
    lineHeight: 16,
  },
  modeHintMobile: { fontSize: 12, lineHeight: 18, marginTop: 6 },
  modeTxtOnline: { fontWeight: '900', fontSize: 13, color: '#1b1b2f' },
  rosterRow: { flexDirection: 'row', gap: 8, marginBottom: 6 },
  rosterRowMobile: { flexDirection: 'column', gap: 10, marginBottom: 8 },
  rosterCard: {
    backgroundColor: LOBBY.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: LOBBY.cardBorder,
    padding: 10,
    marginBottom: 8,
  },
  rosterCompact: {
    flex: 1,
    minWidth: 0,
    marginBottom: 0,
    padding: 8,
  },
  rosterFull: {
    width: '100%',
    marginBottom: 0,
  },
  rosterOn: {
    borderColor: LOBBY.cardActiveBorder,
    backgroundColor: LOBBY.cardActive,
    borderWidth: 2,
  },
  rosterTop: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  rosterMeta: { flex: 1, minWidth: 0 },
  rosterLbl: { fontWeight: '800', fontSize: 11, color: LOBBY.textMuted },
  rosterLblMobile: { fontSize: 12 },
  rosterName: { fontWeight: '900', fontSize: 14, color: LOBBY.textStrong },
  rosterNameMobile: { fontSize: 15 },
  rosterSub: { fontWeight: '700', fontSize: 12, color: LOBBY.textMuted, marginTop: 2 },
  rosterSubMobile: { fontSize: 12 },
  rosterFoot: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 8,
    gap: 8,
  },
  fallbackEmoji: { fontSize: 32, width: 44, textAlign: 'center' },
  cpuCard: {
    alignItems: 'center',
    backgroundColor: LOBBY.chipAlt,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: LOBBY.cardBorder,
    padding: 12,
    marginBottom: 8,
  },
  cpuCardMobile: {
    width: '100%',
    paddingVertical: 14,
  },
  cpuEmoji: { fontSize: 28 },
  cpuLbl: { fontWeight: '900', fontSize: 14, color: LOBBY.textStrong, marginTop: 4 },
  cpuSub: { fontWeight: '700', fontSize: 12, color: LOBBY.textMuted, marginTop: 2 },
  readyTag: {
    fontWeight: '900',
    fontSize: 10,
    color: '#b85450',
    backgroundColor: '#fde8e6',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    overflow: 'hidden',
  },
  readyOk: { color: '#3d8b5a', backgroundColor: '#e2f5e8' },
  gearMini: {
    backgroundColor: LOBBY.chip,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: LOBBY.cardBorder,
    minHeight: 36,
    justifyContent: 'center',
  },
  gearMiniTxt: { fontWeight: '900', fontSize: 12, color: LOBBY.text },
  statusBar: {
    padding: 10,
    borderRadius: 10,
    backgroundColor: '#fff5e0',
    borderWidth: 1,
    borderColor: '#f0d9a8',
    marginTop: 4,
  },
  statusOk: { backgroundColor: '#e8f8ee', borderColor: '#b8e0c8' },
  statusTxt: { fontWeight: '800', fontSize: 12, color: LOBBY.text, textAlign: 'center' },
  statusTxtMobile: { fontSize: 13 },
});
