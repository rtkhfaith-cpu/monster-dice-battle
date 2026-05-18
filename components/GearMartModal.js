import React, { useMemo, useState } from 'react';
import { Modal, Platform, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import {
  GEAR_CATALOG,
  GEAR_CATEGORY_LABELS,
  formatGearBonusLines,
} from '../utils/cosmetics';
import { gearShopPrice } from '../src/gameBalance/shop';

/**
 * Standalone gear shop — buy items into profile inventory.
 */
export default function GearMartModal({ visible, coins, ownedGearIds, onClose, onBuy }) {
  const [filterCat, setFilterCat] = useState('all');
  const ownedSet = useMemo(() => new Set(ownedGearIds || []), [ownedGearIds]);

  const catalog = useMemo(() => {
    if (filterCat === 'all') return GEAR_CATALOG;
    return GEAR_CATALOG.filter((g) => g.category === filterCat);
  }, [filterCat]);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <Text style={styles.title}>Gear Mart</Text>
          <Text style={styles.sub}>Buy gear for your profile, then equip it on monsters</Text>
          <Text style={styles.coins}>Coins: {coins ?? 0}</Text>

          <View style={styles.filterRow}>
            {['all', 'stat', 'element', 'fun'].map((cat) => (
              <TouchableOpacity
                key={cat}
                style={[styles.filterChip, filterCat === cat && styles.filterChipOn]}
                onPress={() => setFilterCat(cat)}
              >
                <Text style={[styles.filterTxt, filterCat === cat && styles.filterTxtOn]}>
                  {cat === 'all' ? 'All' : GEAR_CATEGORY_LABELS[cat]}
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
                  <Text style={styles.emoji}>{g.emoji}</Text>
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
  emoji: { fontSize: 34, width: 48, textAlign: 'center' },
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
});
