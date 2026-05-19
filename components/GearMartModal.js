import React, { useMemo, useState } from 'react';
import { Modal, Platform, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import {
  GEAR_CATALOG,
  GEAR_CATEGORY_LABELS,
  formatGearBonusLines,
} from '../utils/cosmetics';
import { gearShopPrice } from '../src/gameBalance/shop';

const FILTERS = [
  { id: 'all', label: 'All' },
  { id: 'attack', label: 'Attack' },
  { id: 'magic', label: 'Magic' },
  { id: 'defense', label: 'Defense' },
  { id: 'speed', label: 'Speed' },
  { id: 'element', label: 'Element' },
  { id: 'utility', label: 'Utility' },
];

function gearMatchesFilter(g, filter) {
  if (filter === 'all') return true;
  const b = g.bonuses || {};
  if (filter === 'attack') return !!(b.attackMin || b.attackMax || b.critPct);
  if (filter === 'magic') return !!(b.magicMin || b.magicMax || b.mp || b.magicDefMin || b.magicDefMax);
  if (filter === 'defense') return !!(b.hp || b.defMin || b.defMax || b.magicDefMin || b.magicDefMax);
  if (filter === 'speed') return !!(b.dodgePct || b.agility || b.hitRate);
  if (filter === 'element') return !!g.element;
  if (filter === 'utility') return !!b.expPct || g.category === 'fun';
  return true;
}

/**
 * Standalone gear shop — buy items into profile inventory.
 */
export default function GearMartModal({ visible, coins, ownedGearIds, onClose, onBuy }) {
  const [filterCat, setFilterCat] = useState('all');
  const [detailGear, setDetailGear] = useState(null);
  const ownedSet = useMemo(() => new Set(ownedGearIds || []), [ownedGearIds]);

  const catalog = useMemo(() => {
    return GEAR_CATALOG.filter((g) => gearMatchesFilter(g, filterCat));
  }, [filterCat]);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <Text style={styles.title}>Gear Mart</Text>
          <Text style={styles.sub}>Buy gear for your profile, then equip it on monsters</Text>
          <Text style={styles.coins}>Coins: {coins ?? 0}</Text>

          <View style={styles.filterRow}>
            {FILTERS.map((filter) => (
              <TouchableOpacity
                key={filter.id}
                style={[styles.filterChip, filterCat === filter.id && styles.filterChipOn]}
                onPress={() => setFilterCat(filter.id)}
              >
                <Text style={[styles.filterTxt, filterCat === filter.id && styles.filterTxtOn]}>
                  {filter.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <ScrollView
            style={styles.list}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator
            nestedScrollEnabled
            keyboardShouldPersistTaps="handled"
          >
            {catalog.map((g) => {
              const have = ownedSet.has(g.id);
              const price = gearShopPrice(g);
              const afford = !have && (coins ?? 0) >= price;
              const bonusLines = formatGearBonusLines(g);
              return (
                <View key={g.id} style={styles.row}>
                  <TouchableOpacity style={styles.emojiCard} onPress={() => setDetailGear(g)} activeOpacity={0.86}>
                    <Text style={styles.emoji}>{g.emoji}</Text>
                    <Text style={styles.tapHint}>Details</Text>
                  </TouchableOpacity>
                  <View style={styles.mid}>
                    <Text style={styles.name}>{g.name}</Text>
                    <Text style={styles.meta}>
                      {GEAR_CATEGORY_LABELS[g.category]} · {price} coins
                    </Text>
                    <Text style={styles.bonus}>{bonusLines.join(' · ')}</Text>
                    <Text style={styles.status}>{have ? '✓ Owned' : 'Not owned'}</Text>
                  </View>
                  <TouchableOpacity
                    style={[styles.buyBtn, (!afford || have) && styles.buyOff]}
                    disabled={have || !afford}
                    onPress={() => onBuy?.(g.id)}
                  >
                    <Text style={styles.buyTxt}>{have ? 'Owned' : 'Buy'}</Text>
                  </TouchableOpacity>
                </View>
              );
            })}
          </ScrollView>

          <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
            <Text style={styles.closeTxt}>Close</Text>
          </TouchableOpacity>
          {detailGear ? (
            <View style={styles.detailOverlay}>
              <View style={styles.detailCard}>
                <TouchableOpacity style={styles.detailClose} onPress={() => setDetailGear(null)}>
                  <Text style={styles.detailCloseTxt}>×</Text>
                </TouchableOpacity>
                <Text style={styles.detailEmoji}>{detailGear.emoji}</Text>
                <Text style={styles.detailName}>{detailGear.name}</Text>
                <Text style={styles.detailMeta}>
                  {GEAR_CATEGORY_LABELS[detailGear.category] ?? detailGear.category} · {gearShopPrice(detailGear)} coins
                </Text>
                {formatGearBonusLines(detailGear).map((line) => (
                  <Text key={line} style={styles.detailLine}>{line}</Text>
                ))}
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
    backgroundColor: 'rgba(3, 7, 18, 0.72)',
    justifyContent: 'flex-end',
  },
  card: {
    backgroundColor: '#0b1830',
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    borderWidth: 2,
    borderColor: '#b9843b',
    borderBottomWidth: 0,
    paddingHorizontal: 14,
    paddingTop: 14,
    paddingBottom: 12,
    maxHeight: '88%',
    height: '88%',
    flexDirection: 'column',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -8 },
    shadowOpacity: 0.35,
    shadowRadius: 18,
  },
  title: {
    fontSize: 22,
    fontWeight: '900',
    color: '#fff4cf',
    textAlign: 'center',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    textShadowColor: 'rgba(0,0,0,0.75)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 3,
  },
  sub: {
    textAlign: 'center',
    fontWeight: '800',
    fontSize: 13,
    color: '#bfdbfe',
    marginTop: 4,
    lineHeight: 18,
  },
  coins: { textAlign: 'center', fontWeight: '900', fontSize: 16, color: '#fcd34d', marginVertical: 8 },
  filterRow: { flexDirection: 'row', gap: 6, marginBottom: 8, flexWrap: 'wrap' },
  filterChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(255,224,138,0.35)',
    backgroundColor: 'rgba(42, 58, 86, 0.86)',
  },
  filterChipOn: { backgroundColor: 'rgba(92, 57, 143, 0.96)', borderColor: '#d8b4fe' },
  filterTxt: { fontWeight: '900', fontSize: 12, color: '#f4e3bd' },
  filterTxtOn: { color: '#fff8dd' },
  list: {
    flex: 1,
    minHeight: 0,
    ...(Platform.OS === 'web'
      ? { overflowY: 'auto', WebkitOverflowScrolling: 'touch' }
      : {}),
  },
  listContent: { paddingBottom: 12 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,224,138,0.22)',
    backgroundColor: 'rgba(14, 28, 52, 0.82)',
    marginBottom: 8,
  },
  emojiCard: { width: 56, alignItems: 'center', justifyContent: 'center' },
  emoji: { fontSize: 34, textAlign: 'center' },
  tapHint: { color: '#fde68a', fontWeight: '900', fontSize: 8, textTransform: 'uppercase', marginTop: 1 },
  mid: { flex: 1, paddingHorizontal: 8, minWidth: 0 },
  name: { fontWeight: '900', fontSize: 15, color: '#fff4cf' },
  meta: { fontWeight: '800', fontSize: 12, color: '#c4b5fd', marginTop: 2 },
  bonus: { fontWeight: '800', fontSize: 11, color: '#86efac', marginTop: 4 },
  status: { fontWeight: '900', fontSize: 12, color: '#fcd34d', marginTop: 4 },
  buyBtn: {
    backgroundColor: 'rgba(48, 129, 66, 0.96)',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#efd17a',
    borderBottomWidth: 4,
    borderBottomColor: '#31551f',
    minWidth: 72,
    alignItems: 'center',
  },
  buyOff: { opacity: 0.4 },
  buyTxt: { fontWeight: '900', fontSize: 13, color: '#fff8dd', textTransform: 'uppercase' },
  closeBtn: {
    marginTop: 10,
    alignSelf: 'center',
    paddingHorizontal: 28,
    paddingVertical: 12,
    backgroundColor: 'rgba(74, 48, 24, 0.84)',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,224,138,0.62)',
  },
  closeTxt: { fontWeight: '900', fontSize: 16, color: '#fff1bc', textTransform: 'uppercase' },
  detailOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(3, 7, 18, 0.72)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  detailCard: {
    width: '90%',
    maxWidth: 340,
    borderRadius: 22,
    borderWidth: 2,
    borderColor: '#facc15',
    backgroundColor: 'rgba(15, 23, 42, 0.98)',
    padding: 18,
    alignItems: 'center',
  },
  detailClose: {
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
  detailCloseTxt: { color: '#fff', fontSize: 20, fontWeight: '900', lineHeight: 22 },
  detailEmoji: { fontSize: 54, marginBottom: 4 },
  detailName: { color: '#fff4cf', fontWeight: '900', fontSize: 22, textAlign: 'center' },
  detailMeta: { color: '#c4b5fd', fontWeight: '900', fontSize: 13, marginTop: 4, marginBottom: 10 },
  detailLine: {
    alignSelf: 'stretch',
    color: '#bbf7d0',
    fontWeight: '900',
    fontSize: 13,
    paddingVertical: 6,
    paddingHorizontal: 10,
    marginTop: 5,
    borderRadius: 10,
    backgroundColor: 'rgba(134, 239, 172, 0.1)',
  },
});
