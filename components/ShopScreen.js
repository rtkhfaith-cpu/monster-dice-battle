import React from 'react';
import { Modal, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { COSMETIC_CATALOG, getCosmetic } from '../utils/cosmetics';

export default function ShopScreen({ visible, coins, ownedIds, onClose, onPurchase }) {
  const owned = new Set(ownedIds || []);
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <Text style={styles.title}>Goofy Gift Shop</Text>
          <Text style={styles.sub}>Coins: {coins ?? 0}</Text>
          <ScrollView style={styles.list} showsVerticalScrollIndicator={false}>
            {COSMETIC_CATALOG.map((c) => {
              const have = owned.has(c.id);
              const afford = !have && (coins ?? 0) >= c.price;
              return (
                <View key={c.id} style={styles.row}>
                  <Text style={styles.emoji}>{c.emoji}</Text>
                  <View style={styles.mid}>
                    <Text style={styles.name}>{c.name}</Text>
                    <Text style={styles.price}>{have ? 'Owned!' : `${c.price} coins`}</Text>
                  </View>
                  <TouchableOpacity
                    style={[styles.buy, (!afford || have) && styles.buyOff]}
                    disabled={have || !afford}
                    onPress={() => {
                      const cos = getCosmetic(c.id);
                      if (cos) onPurchase?.(cos.id, cos.price);
                    }}
                  >
                    <Text style={styles.buyTxt}>{have ? '—' : 'Buy'}</Text>
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
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
    paddingBottom: 20,
  },
  card: {
    backgroundColor: '#fff8f2',
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    borderWidth: 4,
    borderColor: '#ff9f1c',
    padding: 14,
    maxHeight: '72%',
  },
  title: {
    fontSize: 22,
    fontWeight: '900',
    color: '#2d2d44',
    textAlign: 'center',
  },
  sub: {
    textAlign: 'center',
    fontWeight: '800',
    color: '#c0392b',
    marginBottom: 10,
  },
  list: { maxHeight: '100%' },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 2,
    borderColor: '#ffe8cc',
  },
  emoji: { fontSize: 28, width: 42, textAlign: 'center' },
  mid: { flex: 1, paddingHorizontal: 8 },
  name: { fontWeight: '900', fontSize: 16, color: '#273043' },
  price: { fontWeight: '800', color: '#7f8c9a', marginTop: 2 },
  buy: {
    backgroundColor: '#8ac926',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#2d2d44',
  },
  buyOff: { opacity: 0.35 },
  buyTxt: { fontWeight: '900', fontSize: 15, color: '#1b1b2f' },
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
  closeTxt: {
    fontWeight: '900',
    fontSize: 17,
    color: '#0b2b3a',
  },
});
