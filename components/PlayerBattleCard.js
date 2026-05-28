import React, { useState } from 'react';
import { Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import AnimatedMonster from './AnimatedMonster';
import HPBar from './HPBar';
import MPBar from './MPBar';
import { useReadableType } from '../utils/readableType';

function hpPct(cur, max) {
  if (!max) return 0;
  return Math.max(0, Math.min(100, Math.round((cur / max) * 100)));
}

/**
 * Battle arena card — player label, large monster, stats, dice, combo, stats modal.
 */
export default function PlayerBattleCard({
  playerName,
  monsterName,
  tint,
  fighter,
  diceValue,
  superMpNeed = 20,
  rageActive = false,
  comboHitsNeeded = 3,
  mood = 'neutral',
  pose = 'idle',
  side = 'left',
  speechBubble = '',
  superJump = false,
  monsterSize = 120,
  fullWidth = false,
}) {
  const type = useReadableType();
  const [statsOpen, setStatsOpen] = useState(false);
  const diceLabel = diceValue == null ? '—' : String(diceValue);
  const combo = fighter?.combo ?? 0;
  const canSuperSoon = combo >= comboHitsNeeded;
  const canSuper = canSuperSoon && fighter.mp >= superMpNeed;
  const parts = fighter?.monsterParts;
  const hasParts = parts && typeof parts === 'object';
  const pct = hpPct(fighter.hp, fighter.stats.hp);

  return (
    <View
      style={[
        styles.card,
        { borderColor: tint },
        fullWidth ? styles.cardFull : styles.cardHalf,
      ]}
    >
      <View style={styles.topRow}>
        <Text style={[styles.playerName, { fontSize: type.stat }]} numberOfLines={1}>
          {playerName}
        </Text>
        {rageActive ? <Text style={styles.ragePill}>RAGE</Text> : null}
      </View>

      {speechBubble ? (
        <Text style={[styles.bubble, { fontSize: type.statSm }]} numberOfLines={2}>
          {speechBubble}
        </Text>
      ) : null}

      <View style={[styles.monsterWrap, { minHeight: monsterSize + 12 }]}>
        {hasParts ? (
          <AnimatedMonster
            parts={parts}
            size={monsterSize}
            pose={pose}
            side={side}
            mood={mood}
            rage={rageActive}
            superJump={superJump}
          />
        ) : (
          <Text style={[styles.emojiFallback, { fontSize: monsterSize * 0.72 }]}>👾</Text>
        )}
      </View>

      <Text style={[styles.monsterName, { fontSize: type.stat }]} numberOfLines={2}>
        {monsterName || fighter?.displayName || 'Monster'}
      </Text>

      <View style={styles.bars}>
        <HPBar dense label="HP" current={fighter.hp} max={fighter.stats.hp} fillColor={tint} textColor="#1f2940" />
        <MPBar dense label="MP" current={fighter.mp} max={fighter.stats.mp} textColor="#1f2940" />
      </View>

      <Text style={[styles.statLine, { fontSize: type.stat }]}>
        HP <Text style={styles.statStrong}>{fighter.hp}</Text>
        <Text style={styles.statMuted}> / {fighter.stats.hp}</Text>
        <Text style={styles.statMuted}> ({pct}%)</Text>
      </Text>
      <Text style={[styles.statLine, { fontSize: type.stat }]}>
        MP <Text style={styles.statStrong}>{fighter.mp}</Text>
        <Text style={styles.statMuted}> / {fighter.stats.mp}</Text>
      </Text>

      <View style={styles.diceComboRow}>
        <View style={styles.pill}>
          <Text style={[styles.pillLbl, { fontSize: type.statSm }]}>Dice</Text>
          <Text style={[styles.pillVal, { fontSize: type.stat + 2 }]}>{diceLabel}</Text>
        </View>
        <View style={styles.pill}>
          <Text style={[styles.pillLbl, { fontSize: type.statSm }]}>Combo</Text>
          <Text style={[styles.pillVal, { fontSize: type.stat + 2 }]}>{combo}</Text>
        </View>
      </View>

      {canSuperSoon ? (
        <Text style={[styles.superHint, { fontSize: type.statSm }]}>
          {canSuper ? '⚡ Super ready!' : `Super needs ${superMpNeed} MP`}
        </Text>
      ) : null}

      <TouchableOpacity
        style={styles.statsBtn}
        onPress={() => setStatsOpen(true)}
        accessibilityLabel={`${playerName} stats`}
      >
        <Text style={[styles.statsBtnTxt, { fontSize: type.btnSm }]}>Stats</Text>
      </TouchableOpacity>

      <Modal visible={statsOpen} transparent animationType="fade" onRequestClose={() => setStatsOpen(false)}>
        <TouchableOpacity style={styles.modalBg} activeOpacity={1} onPress={() => setStatsOpen(false)}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>{playerName}</Text>
            <Text style={styles.modalSub}>{monsterName || fighter?.displayName}</Text>
            <HPBar dense label="HP" current={fighter.hp} max={fighter.stats.hp} fillColor={tint} textColor="#1f2940" />
            <MPBar dense label="MP" current={fighter.mp} max={fighter.stats.mp} textColor="#1f2940" />
            <Text style={styles.modalStat}>Attack {fighter.stats.attack.min}–{fighter.stats.attack.max}</Text>
            <Text style={styles.modalStat}>
              Crit {fighter.stats.critPct}% · Hit {Math.round(fighter.stats.hitRate ?? 0)} · Dodge{' '}
              {Math.round(fighter.stats.dodge ?? fighter.stats.dodgePct ?? 0)}
            </Text>
            <Text style={styles.modalNote}>Tap outside to close</Text>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    borderWidth: 4,
    paddingHorizontal: 10,
    paddingVertical: 10,
    alignItems: 'center',
    minWidth: 0,
    overflow: 'hidden',
  },
  cardHalf: {
    flex: 1,
  },
  cardFull: {
    width: '100%',
    alignSelf: 'stretch',
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    gap: 6,
    marginBottom: 4,
  },
  playerName: {
    fontWeight: '900',
    color: '#1a1a2e',
    textAlign: 'center',
    flexShrink: 1,
  },
  ragePill: {
    fontSize: 12,
    fontWeight: '900',
    color: '#fff',
    backgroundColor: '#e74c3c',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    overflow: 'hidden',
  },
  bubble: {
    fontWeight: '800',
    color: '#4a2800',
    backgroundColor: '#fff3cd',
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#f4a259',
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginBottom: 6,
    textAlign: 'center',
    width: '100%',
  },
  monsterWrap: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 4,
  },
  emojiFallback: {
    textAlign: 'center',
  },
  monsterName: {
    fontWeight: '900',
    color: '#273043',
    textAlign: 'center',
    marginBottom: 6,
    width: '100%',
  },
  bars: {
    width: '100%',
    marginBottom: 4,
  },
  statLine: {
    fontWeight: '800',
    color: '#2d3436',
    width: '100%',
    textAlign: 'center',
    lineHeight: 26,
  },
  statStrong: {
    fontWeight: '900',
    color: '#c1121f',
  },
  statMuted: {
    fontWeight: '700',
    color: '#636e72',
  },
  diceComboRow: {
    flexDirection: 'row',
    width: '100%',
    gap: 8,
    marginTop: 6,
    marginBottom: 4,
  },
  pill: {
    flex: 1,
    backgroundColor: '#f0f4ff',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#b2bec3',
    paddingVertical: 8,
    paddingHorizontal: 6,
    alignItems: 'center',
  },
  pillLbl: {
    fontWeight: '800',
    color: '#4a5568',
  },
  pillVal: {
    fontWeight: '900',
    color: '#c1121f',
    marginTop: 2,
  },
  superHint: {
    fontWeight: '900',
    color: '#d35400',
    marginBottom: 4,
    textAlign: 'center',
  },
  statsBtn: {
    marginTop: 4,
    backgroundColor: '#ffd166',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 3,
    borderColor: '#2d2d44',
    width: '100%',
    alignItems: 'center',
  },
  statsBtnTxt: {
    fontWeight: '900',
    color: '#1b1b2f',
  },
  modalBg: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.35)',
    justifyContent: 'center',
    padding: 20,
  },
  modalCard: {
    backgroundColor: '#fff8f2',
    borderRadius: 16,
    borderWidth: 3,
    borderColor: '#ff9f1c',
    padding: 16,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: '900',
    marginBottom: 4,
    textAlign: 'center',
    color: '#1a1a2e',
  },
  modalSub: {
    fontSize: 18,
    fontWeight: '800',
    textAlign: 'center',
    color: '#636e72',
    marginBottom: 12,
  },
  modalStat: {
    fontSize: 16,
    fontWeight: '800',
    color: '#2d3436',
    marginTop: 6,
    textAlign: 'center',
  },
  modalNote: {
    marginTop: 12,
    textAlign: 'center',
    fontSize: 14,
    color: '#7f8c9a',
    fontWeight: '700',
  },
});
