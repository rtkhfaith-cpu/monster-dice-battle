import React, { useState } from 'react';
import { Modal, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import MonsterPreview from './MonsterPreview';
import { RARITY_UI, ROLE_LABELS } from '../utils/monsterTemplates';
import { getLadderMonsterTemplate } from '../utils/monsterLadder/ladderMonsterCatalog';
import { fighterFromLadderOwned } from '../utils/monsterLadder/ladderFighters';

function formatStats(stats) {
  if (!stats) return '';
  return `HP ${stats.hp} · MP ${stats.mp} · ATK ${stats.attack.min}-${stats.attack.max} · MAG ${stats.magic.min}-${stats.magic.max} · HIT ${stats.hitRate ?? 92}% · AGI ${stats.agility ?? stats.speed ?? 10}`;
}

function statGrid(stats) {
  if (!stats) return [[], []];
  const range = (r) => `${r?.min ?? 0}-${r?.max ?? 0}`;
  return [
    [
      ['HP', stats.hp],
      ['MP', stats.mp],
      ['ATK', range(stats.attack)],
      ['MAG', range(stats.magic)],
    ],
    [
      ['DEF', range(stats.def)],
      ['HIT', `${stats.hitRate ?? 92}%`],
      ['AGI', stats.agility ?? stats.speed ?? 10],
    ],
  ];
}

export default function MonsterLadderCollectionScreen({
  visible,
  ownedMonsters,
  activeMonsterId,
  onClose,
  onSelectActive,
}) {
  const [cardMonster, setCardMonster] = useState(null);
  const cardFighter = cardMonster ? fighterFromLadderOwned(cardMonster) : null;
  const cardTemplate = cardMonster ? getLadderMonsterTemplate(cardMonster.templateId) : null;
  const cardStats = cardFighter?.baseStats || cardFighter?.stats;
  const cardRarity = RARITY_UI[cardTemplate?.rarity];
  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <Text style={styles.title}>Ladder collection</Text>
          <Text style={styles.sub}>Normal shop monsters cannot fight here.</Text>
          <ScrollView style={styles.list} contentContainerStyle={styles.listInner}>
            {ownedMonsters.length === 0 ? (
              <Text style={styles.empty}>No ladder monsters yet. Win chests on the climb!</Text>
            ) : (
              ownedMonsters.map((om) => {
                const f = fighterFromLadderOwned(om);
                const t = getLadderMonsterTemplate(om.templateId);
                const active = om.id === activeMonsterId;
                return (
                  <TouchableOpacity
                    key={om.id}
                    style={[styles.row, active && styles.rowOn]}
                    onPress={() => onSelectActive(om.id)}
                  >
                    {f ? (
                      <TouchableOpacity
                        activeOpacity={0.86}
                        onPress={() => setCardMonster(om)}
                        style={styles.monsterThumb}
                      >
                        <MonsterPreview parts={f.monsterParts} size={52} mood="happy" />
                        <Text style={styles.tapHint}>Card</Text>
                      </TouchableOpacity>
                    ) : (
                      <Text style={styles.fallback}>?</Text>
                    )}
                    <View style={styles.meta}>
                      <Text style={styles.name}>{om.nickname || t?.name}</Text>
                      <Text style={styles.lv}>
                        Lv {om.level} · {RARITY_UI[t?.rarity]?.label ?? t?.rarity}
                      </Text>
                      <Text style={styles.stats} numberOfLines={2}>{formatStats(f?.baseStats || f?.stats)}</Text>
                    </View>
                    {active ? <Text style={styles.badge}>ACTIVE</Text> : null}
                  </TouchableOpacity>
                );
              })
            )}
          </ScrollView>
          <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
            <Text style={styles.closeTxt}>Done</Text>
          </TouchableOpacity>
          {cardMonster ? (
            <View style={styles.cardOverlay}>
              <View style={[styles.monsterCard, { borderColor: cardRarity?.border ?? '#6c5ce7' }]}>
                <TouchableOpacity style={styles.cardClose} onPress={() => setCardMonster(null)}>
                  <Text style={styles.cardCloseTxt}>×</Text>
                </TouchableOpacity>
                <Text style={styles.cardKicker}>Ladder Monster</Text>
                <Text style={styles.cardName}>{cardMonster.nickname || cardTemplate?.name || 'Monster'}</Text>
                <View style={styles.cardArt}>
                  {cardFighter ? <MonsterPreview parts={cardFighter.monsterParts} size={170} mood="happy" /> : null}
                </View>
                <View style={styles.cardMetaRow}>
                  <Text style={[styles.cardBadge, { backgroundColor: cardRarity?.chipBg ?? '#ede7ff', color: cardRarity?.chipFg ?? '#6c5ce7' }]}>
                    {cardRarity?.label ?? cardTemplate?.rarity}
                  </Text>
                  <Text style={styles.cardRole}>{ROLE_LABELS[cardTemplate?.role] ?? cardTemplate?.role}</Text>
                  <Text style={styles.cardRole}>Lv {cardMonster.level ?? 1}</Text>
                </View>
                <View style={styles.cardStatsGrid}>
                  {statGrid(cardStats).map((col, colIndex) => (
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
              </View>
            </View>
          ) : null}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'flex-end',
  },
  card: {
    maxHeight: '78%',
    backgroundColor: '#fff',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    padding: 16,
  },
  title: { fontWeight: '900', fontSize: 20, color: '#1a1a2e' },
  sub: { fontWeight: '700', fontSize: 12, color: '#636e72', marginBottom: 10 },
  list: { maxHeight: 360 },
  listInner: { gap: 8, paddingBottom: 8 },
  empty: { fontWeight: '800', fontSize: 14, color: '#636e72', textAlign: 'center', padding: 20 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#dfe6e9',
  },
  rowOn: { borderColor: '#6c5ce7', borderWidth: 2, backgroundColor: 'rgba(108,92,231,0.08)' },
  monsterThumb: {
    width: 62,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
    backgroundColor: 'rgba(108,92,231,0.08)',
    paddingVertical: 3,
  },
  tapHint: { color: '#6c5ce7', fontWeight: '900', fontSize: 8, marginTop: 1, textTransform: 'uppercase' },
  fallback: { fontSize: 32, width: 52, textAlign: 'center' },
  meta: { flex: 1 },
  name: { fontWeight: '900', fontSize: 15, color: '#1a1a2e' },
  lv: { fontWeight: '700', fontSize: 12, color: '#636e72', marginTop: 2 },
  stats: { fontWeight: '800', fontSize: 11, color: '#2563eb', marginTop: 3, lineHeight: 14 },
  badge: {
    fontWeight: '900',
    fontSize: 10,
    color: '#6c5ce7',
    backgroundColor: '#ede7ff',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  closeBtn: {
    marginTop: 10,
    backgroundColor: '#6c5ce7',
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  closeTxt: { color: '#fff', fontWeight: '900', fontSize: 15 },
  cardOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(3, 7, 18, 0.7)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 18,
  },
  monsterCard: {
    width: '92%',
    maxWidth: 360,
    borderRadius: 24,
    borderWidth: 3,
    backgroundColor: 'rgba(15, 23, 42, 0.98)',
    padding: 16,
    alignItems: 'center',
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
  },
  cardCloseTxt: { color: '#fff', fontSize: 20, fontWeight: '900', lineHeight: 22 },
  cardKicker: { color: '#fde68a', fontWeight: '900', fontSize: 11, textTransform: 'uppercase', letterSpacing: 1 },
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
  cardMetaRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', flexWrap: 'wrap', gap: 8, marginBottom: 8 },
  cardBadge: { fontWeight: '900', fontSize: 12, paddingHorizontal: 10, paddingVertical: 3, borderRadius: 999, overflow: 'hidden' },
  cardRole: { color: '#c4b5fd', fontWeight: '900', fontSize: 13, textTransform: 'capitalize' },
  cardStatsGrid: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 14,
    marginTop: 4,
  },
  cardStatsCol: {
    flex: 1,
    gap: 5,
  },
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
});
