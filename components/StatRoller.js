import React, { useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

function formatRange(range) {
  return `${range.min}–${range.max}`;
}

/**
 * Displays rolled ranged stats bundle from `rollStats()` (see utils/random.rollStatsBundle).
 */
export default function StatRoller({ initialRolls = 3, rollStats, onAccept }) {
  const [rollsLeft, setRollsLeft] = useState(initialRolls);
  const [stats, setStats] = useState(null);

  const canRoll = rollsLeft > 0;
  const mustAcceptSoon = rollsLeft <= 0;

  function handleRoll() {
    if (!canRoll || typeof rollStats !== 'function') return;
    const next = rollStats();
    setStats(next);
    setRollsLeft((r) => Math.max(0, r - 1));
  }

  return (
    <View style={styles.card}>
      <Text style={styles.title}>Roll your stats!</Text>
      <Text style={styles.sub}>
        Rolls left: <Text style={styles.em}>{rollsLeft}</Text>
      </Text>
      {stats ? (
        <View style={styles.grid}>
          <Row label="HP" value={`${stats.hp}`} />
          <Row label="MP" value={`${stats.mp}`} />
          <Row label="Attack" value={formatRange(stats.attack)} />
          <Row label="Magic" value={formatRange(stats.magic)} />
          <Row label="Def" value={formatRange(stats.def)} />
          <Row label="Magic Def" value={formatRange(stats.magicDef)} />
          <Row label="Crit %" value={`${stats.critPct}%`} />
          <Row label="Dodge" value={`${stats.dodge ?? stats.dodgePct ?? 0}`} />
        </View>
      ) : (
        <Text style={styles.hint}>Tap “Roll Stats” to generate stats.</Text>
      )}
      <View style={styles.actions}>
        {canRoll ? (
          <TouchableOpacity style={[styles.bigBtn, styles.rollBtn]} onPress={handleRoll} activeOpacity={0.85}>
            <Text style={styles.btnText}>{stats ? 'Roll Again' : 'Roll Stats'}</Text>
          </TouchableOpacity>
        ) : (
          <View style={[styles.bigBtn, styles.rollBtnDisabled]}>
            <Text style={[styles.btnText, styles.btnTextMuted]}>No rolls left</Text>
          </View>
        )}
        <TouchableOpacity
          style={[styles.bigBtn, styles.acceptBtn, !stats && styles.disabled]}
          onPress={() => stats && onAccept(stats)}
          activeOpacity={0.85}
          disabled={!stats}
        >
          <Text style={styles.btnText}>Accept Stats</Text>
        </TouchableOpacity>
      </View>
      {mustAcceptSoon && stats ? (
        <Text style={styles.warn}>Rolls finished — tap Accept Stats to continue.</Text>
      ) : null}
    </View>
  );
}

function Row({ label, value }) {
  return (
    <View style={styles.row}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={styles.statNum}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    marginTop: 12,
    padding: 14,
    backgroundColor: 'rgba(255,255,255,0.9)',
    borderRadius: 16,
    borderWidth: 3,
    borderColor: '#ffb703',
    width: '100%',
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: '#2d2d44',
    textAlign: 'center',
  },
  sub: {
    marginTop: 6,
    textAlign: 'center',
    fontSize: 17,
    color: '#555',
    fontWeight: '600',
  },
  em: {
    color: '#d62828',
    fontWeight: '800',
    fontSize: 20,
  },
  hint: {
    marginTop: 16,
    textAlign: 'center',
    fontSize: 17,
    color: '#666',
    fontWeight: '600',
  },
  grid: {
    marginTop: 14,
    paddingHorizontal: 4,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(45,45,68,0.1)',
    flexWrap: 'wrap',
  },
  statLabel: {
    fontSize: 18,
    fontWeight: '700',
    color: '#3d3d5c',
  },
  statNum: {
    fontSize: 18,
    fontWeight: '800',
    color: '#118ab2',
    textAlign: 'right',
    flexShrink: 1,
    marginLeft: 12,
    maxWidth: '58%',
  },
  actions: {
    marginTop: 18,
    width: '100%',
  },
  bigBtn: {
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#2d2d44',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 0,
    elevation: 2,
    marginBottom: 12,
  },
  rollBtn: {
    backgroundColor: '#ffd166',
  },
  rollBtnDisabled: {
    backgroundColor: '#e0e0e0',
    borderColor: '#b0b0b0',
  },
  acceptBtn: {
    backgroundColor: '#8ac926',
  },
  disabled: {
    opacity: 0.35,
    borderColor: '#999',
  },
  btnText: {
    fontSize: 20,
    fontWeight: '800',
    color: '#1f1f2e',
  },
  btnTextMuted: {
    color: '#666',
    fontWeight: '700',
  },
  warn: {
    marginTop: 14,
    textAlign: 'center',
    color: '#e76f51',
    fontWeight: '700',
    fontSize: 15,
    lineHeight: 20,
  },
});
