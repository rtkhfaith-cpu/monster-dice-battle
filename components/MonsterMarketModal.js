import React, { useMemo, useState } from 'react';
import { Modal, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import MonsterPreview from './MonsterPreview';
import MonsterStatCardOverlay from './MonsterStatCardOverlay';
import { mergeMonsterParts } from '../utils/gameStorage';
import { MONSTER_CATALOG, RARITY_UI, ROLE_LABELS } from '../utils/monsterTemplates';
import { computeBattleStats } from '../utils/statsCalc';
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
  const [cardMonster, setCardMonster] = useState(null);
  const counts = ownedCounts(wallet || {});
  const cardFighter = useMemo(() => {
    if (!cardMonster) return null;
    const built = computeBattleStats(cardMonster.id, 1);
    return {
      monsterParts: mergeMonsterParts(cardMonster.id),
      displayName: cardMonster.name,
      rarity: cardMonster.rarity,
      role: cardMonster.role,
      level: 1,
      stats: built?.stats,
    };
  }, [cardMonster]);
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
                  <TouchableOpacity style={styles.thumbCol} activeOpacity={0.86} onPress={() => setCardMonster(m)}>
                    <MonsterPreview parts={previewParts} size={80} mood="happy" />
                    <Text style={styles.tapHint}>Card</Text>
                  </TouchableOpacity>
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
          {cardFighter ? (
            <MonsterStatCardOverlay
              fighter={cardFighter}
              description={cardMonster?.description}
              kicker="Monster Card"
              layerZIndex={30}
              onClose={() => setCardMonster(null)}
            />
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
    paddingBottom: 18,
  },
  card: {
    backgroundColor: '#0b1830',
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    borderWidth: 2,
    borderColor: '#b9843b',
    padding: 14,
    maxHeight: '82%',
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
  sub: { textAlign: 'center', fontWeight: '900', color: '#fcd34d', marginBottom: 10 },
  list: { flexGrow: 0 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,224,138,0.22)',
    borderLeftWidth: 5,
    borderRadius: 16,
    backgroundColor: 'rgba(14, 28, 52, 0.82)',
    marginBottom: 8,
  },
  thumbCol: {
    width: 92,
    minHeight: 88,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
    backgroundColor: 'rgba(7, 17, 32, 0.72)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,224,138,0.28)',
    overflow: 'visible',
    paddingVertical: 4,
  },
  mid: { flex: 1, paddingRight: 6, minWidth: 0 },
  titleRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 6 },
  name: { fontWeight: '900', fontSize: 16, color: '#fff4cf', flexShrink: 1 },
  rChip: {
    fontWeight: '900',
    fontSize: 11,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
    overflow: 'hidden',
  },
  role: { fontWeight: '900', fontSize: 12, color: '#c4b5fd', marginTop: 2 },
  desc: { fontWeight: '800', fontSize: 13, color: '#bfdbfe', marginTop: 4, lineHeight: 18 },
  ownedLbl: { fontWeight: '900', fontSize: 12, color: '#86efac', marginTop: 4 },
  right: { justifyContent: 'space-between', alignItems: 'flex-end', width: 88 },
  price: { fontWeight: '900', fontSize: 14, color: '#fcd34d' },
  buy: {
    backgroundColor: 'rgba(48, 129, 66, 0.96)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 11,
    borderWidth: 1,
    borderColor: '#efd17a',
    borderBottomWidth: 4,
    borderBottomColor: '#31551f',
    marginTop: 6,
  },
  buyOff: { opacity: 0.35 },
  buyTxt: { fontWeight: '900', fontSize: 14, color: '#fff8dd', textTransform: 'uppercase' },
  closeBtn: {
    marginTop: 14,
    alignSelf: 'center',
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: 'rgba(74, 48, 24, 0.84)',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,224,138,0.62)',
  },
  closeTxt: { fontWeight: '900', fontSize: 17, color: '#fff1bc', textTransform: 'uppercase' },
  tapHint: { color: '#fde68a', fontWeight: '900', fontSize: 9, marginTop: 2, textTransform: 'uppercase' },
});
