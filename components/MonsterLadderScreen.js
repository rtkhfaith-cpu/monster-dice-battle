import React, { useMemo } from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { ART, gamePanelStyle } from '../utils/artDirection';
import { LOBBY } from '../utils/gameTheme';
import { LADDER_FLOOR_COUNT, LADDER_REGIONS } from '../utils/ladderRegions';
import {
  getLadderProgress,
  isFloorCleared,
  isFloorUnlocked,
  ladderClearedAll,
  nextChallengeFloor,
} from '../utils/ladderProgress';

function FloorRow({ region, progress, onChallenge, disabled }) {
  const floor = region.floor;
  const cleared = isFloorCleared(progress, floor);
  const unlocked = isFloorUnlocked(progress, floor);
  const current = nextChallengeFloor(progress) === floor && !cleared;
  const locked = !unlocked;

  return (
    <View
      style={[
        styles.floorRow,
        cleared && styles.floorCleared,
        current && styles.floorCurrent,
        locked && styles.floorLocked,
      ]}
    >
      <View style={styles.floorNum}>
        <Text style={styles.floorNumTxt}>{floor}</Text>
      </View>
      <View style={styles.floorBody}>
        <Text style={styles.floorName} numberOfLines={1}>
          {region.name}
        </Text>
        <Text style={styles.floorBoss} numberOfLines={1}>
          Boss: {region.boss}
        </Text>
        <Text style={styles.floorTag} numberOfLines={2}>
          {region.tagline}
        </Text>
        {cleared ? (
          <Text style={styles.clearedBadge}>✓ Cleared · +{region.coinReward} coins</Text>
        ) : current ? (
          <Text style={styles.currentBadge}>▶ Current floor</Text>
        ) : locked ? (
          <Text style={styles.lockedBadge}>🔒 Clear floor {floor - 1} first</Text>
        ) : null}
      </View>
      {unlocked && !cleared ? (
        <TouchableOpacity
          style={[styles.challengeBtn, disabled && styles.challengeOff]}
          disabled={disabled}
          onPress={() => onChallenge(floor)}
        >
          <Text style={styles.challengeTxt}>Fight</Text>
        </TouchableOpacity>
      ) : cleared ? (
        <Text style={styles.doneEmoji}>🏆</Text>
      ) : (
        <Text style={styles.lockEmoji}>🔒</Text>
      )}
    </View>
  );
}

export default function MonsterLadderScreen({
  profileName,
  monsterName,
  progress,
  canFight,
  missingMsg,
  onBack,
  onChallengeFloor,
}) {
  const prog = useMemo(() => getLadderProgress({ ladderProgress: progress }), [progress]);
  const next = nextChallengeFloor(prog);
  const allDone = ladderClearedAll(prog);

  return (
    <View style={styles.root}>
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backBtn}>
          <Text style={styles.backTxt}>← Home</Text>
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.title}>Monster Ladder</Text>
          <Text style={styles.subtitle}>PROJECT ASCENT · 25 floors</Text>
        </View>
      </View>

      <View style={styles.heroPanel}>
        <Text style={styles.heroLine}>
          Handler <Text style={styles.heroStrong}>{profileName || '—'}</Text>
        </Text>
        <Text style={styles.heroLine}>
          Monster <Text style={styles.heroStrong}>{monsterName || '—'}</Text>
        </Text>
        <View style={styles.statsRow}>
          <Text style={styles.stat}>Cleared: {prog.highestFloorCleared}/{LADDER_FLOOR_COUNT}</Text>
          <Text style={styles.stat}>Wins: {prog.wins}</Text>
        </View>
        {allDone ? (
          <Text style={styles.victoryBanner}>
            You reached The Core Feed. The Noise still hums — but you climbed it all.
          </Text>
        ) : (
          <Text style={styles.nextBanner}>
            Next challenge: Floor {next} — {LADDER_REGIONS[next - 1]?.name}
          </Text>
        )}
        {missingMsg ? <Text style={styles.missing}>{missingMsg}</Text> : null}
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollInner}>
        {LADDER_REGIONS.map((region) => (
          <FloorRow
            key={region.id}
            region={region}
            progress={prog}
            disabled={!canFight}
            onChallenge={onChallengeFloor}
          />
        ))}
      </ScrollView>

      <View style={styles.footer}>
        <Text style={styles.footerTxt}>
          Defeat the floor boss to climb. Lose and retry — progress saves to your profile.
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, minHeight: 0 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 2,
    borderBottomColor: LOBBY.panelBorder,
    backgroundColor: ART.panelFill,
  },
  backBtn: { paddingVertical: 6, paddingRight: 12 },
  backTxt: { fontWeight: '800', fontSize: 15, color: '#0984e3' },
  headerCenter: { flex: 1 },
  title: { fontWeight: '900', fontSize: 20, color: ART.textInk },
  subtitle: { fontWeight: '700', fontSize: 12, color: ART.textMuted, marginTop: 2 },
  heroPanel: {
    margin: 12,
    padding: 14,
    ...gamePanelStyle('#6c5ce7'),
    gap: 6,
  },
  heroLine: { fontWeight: '700', fontSize: 14, color: ART.textInk },
  heroStrong: { fontWeight: '900', color: '#6c5ce7' },
  statsRow: { flexDirection: 'row', gap: 16, marginTop: 4 },
  stat: { fontWeight: '800', fontSize: 12, color: ART.textMuted },
  nextBanner: {
    marginTop: 8,
    fontWeight: '800',
    fontSize: 13,
    color: '#d35400',
    backgroundColor: 'rgba(255, 209, 102, 0.35)',
    padding: 8,
    borderRadius: 8,
  },
  victoryBanner: {
    marginTop: 8,
    fontWeight: '800',
    fontSize: 13,
    color: '#1e8449',
    backgroundColor: 'rgba(46, 204, 113, 0.2)',
    padding: 8,
    borderRadius: 8,
  },
  missing: { fontWeight: '800', fontSize: 13, color: ART.danger, marginTop: 6 },
  scroll: { flex: 1, minHeight: 0 },
  scrollInner: { paddingHorizontal: 12, paddingBottom: 16, gap: 8 },
  floorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 10,
    borderRadius: ART.radiusMd,
    borderWidth: 2,
    borderColor: LOBBY.panelBorder,
    backgroundColor: '#fff',
  },
  floorCleared: { borderColor: '#27ae60', backgroundColor: 'rgba(46, 204, 113, 0.08)' },
  floorCurrent: { borderColor: '#e67e22', backgroundColor: 'rgba(255, 159, 107, 0.12)' },
  floorLocked: { opacity: 0.72 },
  floorNum: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#dfe6e9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  floorNumTxt: { fontWeight: '900', fontSize: 14, color: ART.textInk },
  floorBody: { flex: 1, minWidth: 0, gap: 2 },
  floorName: { fontWeight: '900', fontSize: 14, color: ART.textInk },
  floorBoss: { fontWeight: '700', fontSize: 11, color: ART.textMuted },
  floorTag: { fontWeight: '600', fontSize: 11, color: '#7f8c8d', fontStyle: 'italic' },
  clearedBadge: { fontWeight: '800', fontSize: 10, color: '#27ae60', marginTop: 2 },
  currentBadge: { fontWeight: '800', fontSize: 10, color: '#d35400', marginTop: 2 },
  lockedBadge: { fontWeight: '700', fontSize: 10, color: '#95a5a6', marginTop: 2 },
  challengeBtn: {
    backgroundColor: ART.btnFight,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: ART.radiusSm,
  },
  challengeOff: { opacity: 0.45 },
  challengeTxt: { color: '#fff', fontWeight: '900', fontSize: 13 },
  doneEmoji: { fontSize: 22 },
  lockEmoji: { fontSize: 18, opacity: 0.5 },
  footer: {
    padding: 12,
    borderTopWidth: 2,
    borderTopColor: LOBBY.panelBorder,
    backgroundColor: 'rgba(18, 22, 36, 0.92)',
  },
  footerTxt: {
    textAlign: 'center',
    fontWeight: '700',
    fontSize: 11,
    color: '#bdc3c7',
  },
});
