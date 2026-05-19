import React, { useState } from 'react';
import { Modal, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import MonsterPreview from './MonsterPreview';
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

function formatStats(stats) {
  if (!stats) return '';
  return `HP ${stats.hp} · MP ${stats.mp} · ATK ${stats.attack.min}-${stats.attack.max} · MAG ${stats.magic.min}-${stats.magic.max} · DEF ${stats.def.min}-${stats.def.max} · HIT ${stats.hitRate ?? 92}% · AGI ${stats.agility ?? stats.speed ?? 10}`;
}

export default function MonsterMarketModal({ visible, coins, wallet, onClose, onBuy }) {
  const [cardMonster, setCardMonster] = useState(null);
  const counts = ownedCounts(wallet || {});
  const cardStats = cardMonster ? computeBattleStats(cardMonster.id, 1)?.stats : null;
  const cardRarity = cardMonster ? RARITY_UI[cardMonster.rarity] : null;
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
          {cardMonster ? (
            <View style={styles.cardOverlay}>
              <View style={[styles.monsterCard, { borderColor: cardRarity?.border ?? '#facc15' }]}>
                <TouchableOpacity style={styles.cardClose} onPress={() => setCardMonster(null)}>
                  <Text style={styles.cardCloseTxt}>×</Text>
                </TouchableOpacity>
                <Text style={styles.cardKicker}>Monster Card</Text>
                <Text style={styles.cardName}>{cardMonster.name}</Text>
                <View style={styles.cardArt}>
                  <MonsterPreview parts={mergeMonsterParts(cardMonster.id)} size={170} mood="happy" />
                </View>
                <View style={styles.cardMetaRow}>
                  <Text style={[styles.cardBadge, { backgroundColor: cardRarity?.chipBg ?? '#334155', color: cardRarity?.chipFg ?? '#fff' }]}>
                    {cardRarity?.label ?? cardMonster.rarity}
                  </Text>
                  <Text style={styles.cardRole}>{ROLE_LABELS[cardMonster.role] ?? cardMonster.role}</Text>
                </View>
                <Text style={styles.cardDesc}>{cardMonster.description}</Text>
                <Text style={styles.cardStats}>{formatStats(cardStats)}</Text>
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
  cardOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(3, 7, 18, 0.72)',
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
    shadowColor: '#facc15',
    shadowOpacity: 0.55,
    shadowRadius: 18,
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
  cardMetaRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  cardBadge: { fontWeight: '900', fontSize: 12, paddingHorizontal: 10, paddingVertical: 3, borderRadius: 999, overflow: 'hidden' },
  cardRole: { color: '#c4b5fd', fontWeight: '900', fontSize: 13, textTransform: 'capitalize' },
  cardDesc: { color: '#bfdbfe', fontWeight: '800', fontSize: 12, lineHeight: 17, textAlign: 'center', marginBottom: 8 },
  cardStats: { color: '#86efac', fontWeight: '900', fontSize: 12, lineHeight: 18, textAlign: 'center' },
});
