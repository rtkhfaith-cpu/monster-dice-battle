import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import MonsterPreview from './MonsterPreview';
import { RARITY_UI, ROLE_LABELS } from '../utils/monsterTemplates';

function statGrid(stats) {
  if (!stats) return [[], []];
  const range = (r) => (r && typeof r === 'object' ? `${r.min ?? 0}-${r.max ?? 0}` : String(r ?? '—'));
  return [
    [
      ['HP', stats.hp],
      ['MP', stats.mp],
      ['ATK', range(stats.attack)],
      ['MAG', range(stats.magic)],
    ],
    [
      ['DEF', range(stats.def)],
      ['MDEF', range(stats.magicDef)],
      ['HIT', `${stats.hitRate ?? 92}%`],
      ['AGI', stats.agility ?? stats.speed ?? 10],
    ],
  ];
}

function hasGearBonuses(bonuses) {
  if (!bonuses || typeof bonuses !== 'object') return false;
  return Object.values(bonuses).some((v) => typeof v === 'number' && v > 0);
}

/**
 * Full-screen overlay showing one monster's current battle stats (gear + merge included).
 */
export default function MonsterStatCardOverlay({
  fighter,
  kicker = 'Your Monster',
  mergeTier = 0,
  selected = false,
  primaryAction,
  onClose,
}) {
  if (!fighter) return null;

  const stats = fighter.stats;
  const rarity = RARITY_UI[fighter.rarity];
  const mergeLabel = mergeTier > 0 ? ` · Merge +${mergeTier}` : '';
  const gearNote = hasGearBonuses(fighter.gearBonuses);

  return (
    <View style={styles.cardOverlay} pointerEvents="box-none">
      <Pressable style={styles.cardBackdrop} onPress={onClose} accessibilityLabel="Close monster card" />
      <View style={[styles.monsterCard, { borderColor: rarity?.border ?? '#6c5ce7' }]}>
        <Pressable style={styles.cardClose} onPress={onClose} accessibilityLabel="Close">
          <Text style={styles.cardCloseTxt}>×</Text>
        </Pressable>
        <Text style={styles.cardKicker}>{kicker}</Text>
        <Text style={styles.cardName}>{fighter.displayName ?? 'Monster'}</Text>
        <View style={styles.cardArt}>
          <MonsterPreview parts={fighter.monsterParts} size={170} mood="happy" />
        </View>
        <View style={styles.cardMetaRow}>
          <Text
            style={[
              styles.cardBadge,
              { backgroundColor: rarity?.chipBg ?? '#ede7ff', color: rarity?.chipFg ?? '#6c5ce7' },
            ]}
          >
            {rarity?.label ?? fighter.rarity}
          </Text>
          <Text style={styles.cardRole}>{ROLE_LABELS[fighter.role] ?? fighter.role}</Text>
          <Text style={styles.cardRole}>Lv {fighter.level ?? 1}{mergeLabel}</Text>
          {fighter.element ? (
            <Text style={styles.cardElement}>{String(fighter.element).toUpperCase()}</Text>
          ) : null}
          {selected ? <Text style={styles.cardSelected}>SELECTED</Text> : null}
        </View>
        {gearNote ? <Text style={styles.gearNote}>Stats include equipped gear</Text> : null}
        <View style={styles.cardStatsGrid}>
          {statGrid(stats).map((col, colIndex) => (
            <View key={colIndex ? 'right' : 'left'} style={styles.cardStatsCol}>
              {col.map(([label, value]) => (
                <View key={label} style={styles.cardStatRow}>
                  <Text style={styles.cardStatLabel}>{label}</Text>
                  <Text style={styles.cardStatValue}>{value}</Text>
                </View>
              ))}
            </View>
          ))}
        </View>
        {stats ? (
          <Text style={styles.extraStats}>
            CRIT {stats.critPct ?? 0}% · DODGE {stats.dodgePct ?? 0}%
          </Text>
        ) : null}
        {primaryAction ? (
          <Pressable
            style={[styles.primaryBtn, primaryAction.disabled && styles.primaryBtnOff]}
            onPress={primaryAction.onPress}
            disabled={primaryAction.disabled}
          >
            <Text style={styles.primaryBtnTxt}>{primaryAction.label}</Text>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  cardOverlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 20,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 18,
  },
  cardBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(3, 7, 18, 0.7)',
  },
  monsterCard: {
    width: '92%',
    maxWidth: 360,
    borderRadius: 24,
    borderWidth: 3,
    backgroundColor: 'rgba(15, 23, 42, 0.98)',
    padding: 16,
    alignItems: 'center',
    zIndex: 1,
  },
  cardClose: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: 'rgba(127, 29, 29, 0.9)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
  },
  cardCloseTxt: { color: '#fff', fontSize: 20, fontWeight: '900', lineHeight: 22 },
  cardKicker: {
    color: '#fde68a',
    fontWeight: '900',
    fontSize: 11,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  cardName: { color: '#fff4cf', fontWeight: '900', fontSize: 23, textAlign: 'center', marginTop: 3 },
  cardArt: {
    width: '86%',
    minHeight: 190,
    marginVertical: 10,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(255,224,138,0.32)',
    backgroundColor: 'rgba(7, 17, 32, 0.86)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 4,
  },
  cardBadge: {
    fontWeight: '900',
    fontSize: 12,
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 999,
    overflow: 'hidden',
  },
  cardRole: { color: '#c4b5fd', fontWeight: '900', fontSize: 13, textTransform: 'capitalize' },
  cardElement: { color: '#7dd3fc', fontWeight: '900', fontSize: 12 },
  cardSelected: {
    fontWeight: '900',
    fontSize: 10,
    color: '#6c5ce7',
    backgroundColor: '#ede7ff',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  gearNote: {
    color: '#94a3b8',
    fontWeight: '700',
    fontSize: 11,
    marginBottom: 6,
    textAlign: 'center',
  },
  cardStatsGrid: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 14,
    marginTop: 4,
  },
  cardStatsCol: { flex: 1, gap: 5 },
  cardStatRow: {
    minHeight: 24,
    borderRadius: 10,
    backgroundColor: 'rgba(134, 239, 172, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(134, 239, 172, 0.22)',
    paddingHorizontal: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  cardStatLabel: { color: '#bbf7d0', fontWeight: '900', fontSize: 11 },
  cardStatValue: { color: '#fff7cc', fontWeight: '900', fontSize: 12 },
  extraStats: {
    color: '#fcd34d',
    fontWeight: '800',
    fontSize: 11,
    marginTop: 8,
    textAlign: 'center',
  },
  primaryBtn: {
    marginTop: 12,
    width: '100%',
    backgroundColor: '#6c5ce7',
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  primaryBtnOff: { opacity: 0.55 },
  primaryBtnTxt: { color: '#fff', fontWeight: '900', fontSize: 15 },
});
