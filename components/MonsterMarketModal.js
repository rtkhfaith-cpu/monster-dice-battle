import React from 'react';
import { Modal, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import MonsterPreview from './MonsterPreview';
import { mergeMonsterParts } from '../utils/gameStorage';
import { MONSTER_CATALOG, RARITY_UI, ROLE_LABELS } from '../utils/monsterTemplates';
import { monsterShopPrice } from '../src/gameBalance/shop';

/** Count owned instances per template id */
function ownedCounts(wallet) {
  const m = {};
  for (const om of wallet?.ownedMonsters || []) {
    m[om.templateId] = (m[om.templateId] || 0) + 1;
  }
  return m;
}

export default function MonsterMarketModal({ visible, coins, wallet, onClose, onBuy }) {
  const counts = ownedCounts(wallet || {});
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <Text style={styles.title}>Monster Mart</Text>
          <Text style={styles.sub}>Coins: {coins ?? 0}</Text>
          <ScrollView style={styles.list} showsVerticalScrollIndicator={false}>
            {MONSTER_CATALOG.map((m) => {
              const ru = RARITY_UI[m.rarity];
              const count = counts[m.id] || 0;
              const price = monsterShopPrice(m);
              const purchasable = typeof price === 'number';
              const afford = purchasable && (coins ?? 0) >= price;
              const previewParts = mergeMonsterParts(m.id);
              return (
                <View key={m.id} style={[styles.row, { borderLeftColor: ru.border }]}>
                  <View style={styles.thumbCol}>
                    <MonsterPreview parts={previewParts} size={80} mood="happy" />
                  </View>
                  <View style={styles.mid}>
                    <View style={styles.titleRow}>
                      <Text style={styles.name}>{m.name}</Text>
                      <Text style={[styles.rChip, { backgroundColor: ru.chipBg, color: ru.chipFg }]}>{ru.label}</Text>
                    </View>
                    <Text style={styles.role}>{ROLE_LABELS[m.role] ?? m.role}</Text>
                    <Text style={styles.desc}>{m.description}</Text>
                    <Text style={styles.ownedLbl}>{count ? `Owned ×${count}` : 'Not owned yet'}</Text>
                  </View>
                  <View style={styles.right}>
                    <Text style={styles.price}>{purchasable ? `${price} 🪙` : 'Event only'}</Text>
                    <TouchableOpacity
                      style={[styles.buy, (!afford || !onBuy || !purchasable) && styles.buyOff]}
                      disabled={!afford || !onBuy || !purchasable}
                      onPress={() => onBuy?.(m.id, price)}
                    >
                      <Text style={styles.buyTxt}>Buy</Text>
                    </TouchableOpacity>
                  </View>
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
    paddingBottom: 18,
  },
  card: {
    backgroundColor: '#fff8f2',
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    borderWidth: 4,
    borderColor: '#ff9f1c',
    padding: 14,
    maxHeight: '82%',
  },
  title: { fontSize: 22, fontWeight: '900', color: '#2d2d44', textAlign: 'center' },
  sub: { textAlign: 'center', fontWeight: '800', color: '#c0392b', marginBottom: 10 },
  list: { flexGrow: 0 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 6,
    borderBottomWidth: 2,
    borderColor: '#ffe8cc',
    borderLeftWidth: 5,
  },
  thumbCol: {
    width: 92,
    minHeight: 88,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
    backgroundColor: 'rgba(255,255,255,0.75)',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#dfe6e9',
    overflow: 'visible',
    paddingVertical: 4,
  },
  mid: { flex: 1, paddingRight: 6, minWidth: 0 },
  titleRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 6 },
  name: { fontWeight: '900', fontSize: 16, color: '#273043', flexShrink: 1 },
  rChip: {
    fontWeight: '900',
    fontSize: 11,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
    overflow: 'hidden',
  },
  role: { fontWeight: '800', fontSize: 12, color: '#596574', marginTop: 2 },
  desc: { fontWeight: '700', fontSize: 13, color: '#435063', marginTop: 4, lineHeight: 18 },
  ownedLbl: { fontWeight: '800', fontSize: 12, color: '#27ae60', marginTop: 4 },
  right: { justifyContent: 'space-between', alignItems: 'flex-end', width: 88 },
  price: { fontWeight: '900', fontSize: 14, color: '#d35400' },
  buy: {
    backgroundColor: '#8ac926',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: '#2d2d44',
    marginTop: 6,
  },
  buyOff: { opacity: 0.35 },
  buyTxt: { fontWeight: '900', fontSize: 14, color: '#1b1b2f' },
  closeBtn: {
    marginTop: 14,
    alignSelf: 'center',
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: '#48cae4',
    borderRadius: 14,
    borderWidth: 3,
    borderColor: '#2d2d44',
  },
  closeTxt: { fontWeight: '900', fontSize: 17, color: '#0b2b3a' },
});
