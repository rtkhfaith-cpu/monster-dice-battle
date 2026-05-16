import React, { useMemo, useState } from 'react';
import { Modal, Platform, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import {
  GEAR_CATALOG,
  GEAR_CATEGORY_LABELS,
  formatGearBonusLines,
} from '../utils/cosmetics';

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
              const afford = !have && (coins ?? 0) >= g.price;
              const bonusLines = formatGearBonusLines(g);
              return (
                <View key={g.id} style={styles.row}>
                  <Text style={styles.emoji}>{g.emoji}</Text>
                  <View style={styles.mid}>
                    <Text style={styles.name}>{g.name}</Text>
                    <Text style={styles.meta}>
                      {GEAR_CATEGORY_LABELS[g.category]} · {g.price} coins
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
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
  },
  card: {
    backgroundColor: '#fff8f2',
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    borderWidth: 4,
    borderColor: '#8e44ad',
    paddingHorizontal: 14,
    paddingTop: 14,
    paddingBottom: 12,
    maxHeight: '88%',
    height: '88%',
    flexDirection: 'column',
  },
  title: { fontSize: 22, fontWeight: '900', color: '#2d2d44', textAlign: 'center' },
  sub: {
    textAlign: 'center',
    fontWeight: '700',
    fontSize: 13,
    color: '#4a5568',
    marginTop: 4,
    lineHeight: 18,
  },
  coins: { textAlign: 'center', fontWeight: '900', fontSize: 16, color: '#c0392b', marginVertical: 8 },
  filterRow: { flexDirection: 'row', gap: 6, marginBottom: 8, flexWrap: 'wrap' },
  filterChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#dfe6e9',
    backgroundColor: '#fff',
  },
  filterChipOn: { backgroundColor: '#9b59b6', borderColor: '#6c3483' },
  filterTxt: { fontWeight: '800', fontSize: 12, color: '#636e72' },
  filterTxtOn: { color: '#fff' },
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
    paddingVertical: 12,
    borderBottomWidth: 2,
    borderColor: '#f0e6ff',
  },
  emoji: { fontSize: 34, width: 48, textAlign: 'center' },
  mid: { flex: 1, paddingHorizontal: 8, minWidth: 0 },
  name: { fontWeight: '900', fontSize: 15, color: '#1a1a2e' },
  meta: { fontWeight: '800', fontSize: 12, color: '#636e72', marginTop: 2 },
  bonus: { fontWeight: '800', fontSize: 11, color: '#27ae60', marginTop: 4 },
  status: { fontWeight: '800', fontSize: 12, color: '#4a5568', marginTop: 4 },
  buyBtn: {
    backgroundColor: '#8ac926',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#2d2d44',
    minWidth: 72,
    alignItems: 'center',
  },
  buyOff: { opacity: 0.4 },
  buyTxt: { fontWeight: '900', fontSize: 13, color: '#1b1b2f' },
  closeBtn: {
    marginTop: 10,
    alignSelf: 'center',
    paddingHorizontal: 28,
    paddingVertical: 12,
    backgroundColor: '#9b59b6',
    borderRadius: 14,
    borderWidth: 3,
    borderColor: '#2d2d44',
  },
  closeTxt: { fontWeight: '900', fontSize: 16, color: '#fff' },
});
