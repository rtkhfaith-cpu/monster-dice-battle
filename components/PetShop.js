import React, { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { PET_CATALOG, PET_SHOP_IDS, getPetDef } from '../src/gameSystems/pets';
import { describePetSkill } from '../src/gameSystems/petSkills';

const RARITY_COLORS = { rare: '#60a5fa', epic: '#c084fc', mythic: '#f472b6' };

export default function PetShop({ coins = 0, onBuy }) {
  const [filter, setFilter] = useState('all');

  const rows = useMemo(() => {
    return PET_SHOP_IDS.map((id) => {
      const def = getPetDef(id);
      return { ...def, skillText: def.skills.map((s) => describePetSkill(s, def.rarity)).join(' · ') };
    });
  }, []);

  const filtered = rows.filter((r) => filter === 'all' || r.rarity === filter);

  return (
    <View style={styles.wrap}>
      <Text style={styles.hint}>Rare & Epic pets only. Mythic pets come from chests.</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll}>
        {['all', 'rare', 'epic'].map((f) => (
          <TouchableOpacity
            key={f}
            style={[styles.chip, filter === f && styles.chipOn]}
            onPress={() => setFilter(f)}
          >
            <Text style={[styles.chipTxt, filter === f && styles.chipTxtOn]}>{f}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
      <ScrollView style={styles.list} nestedScrollEnabled>
        {filtered.map((row) => (
          <View key={row.id} style={styles.row}>
            <Text style={styles.emoji}>{row.emoji}</Text>
            <View style={styles.mid}>
              <Text style={styles.name}>{row.name}</Text>
              <Text style={[styles.rarity, { color: RARITY_COLORS[row.rarity] }]}>{row.rarity}</Text>
              <Text style={styles.skills}>{row.skillText}</Text>
              <TouchableOpacity
                style={[styles.buyBtn, (coins ?? 0) < row.shopPrice && styles.buyOff]}
                disabled={(coins ?? 0) < row.shopPrice}
                onPress={() => onBuy?.(row.id, row.shopPrice)}
              >
                <Text style={styles.buyTxt}>Buy · {row.shopPrice}c</Text>
              </TouchableOpacity>
            </View>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, minHeight: 200 },
  hint: { color: '#94a3b8', fontSize: 12, marginBottom: 8 },
  filterScroll: { maxHeight: 36, marginBottom: 8 },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: 'rgba(30,41,59,0.8)',
    marginRight: 8,
  },
  chipOn: { backgroundColor: '#334155' },
  chipTxt: { color: '#94a3b8', fontWeight: '700', fontSize: 12, textTransform: 'capitalize' },
  chipTxtOn: { color: '#f8fafc' },
  list: { flex: 1 },
  row: { flexDirection: 'row', gap: 10, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: 'rgba(148,163,184,0.15)' },
  emoji: { fontSize: 32, width: 44, textAlign: 'center' },
  mid: { flex: 1 },
  name: { fontWeight: '900', fontSize: 15, color: '#f1f5f9' },
  rarity: { fontSize: 11, fontWeight: '800', textTransform: 'uppercase' },
  skills: { fontSize: 11, color: '#94a3b8', marginTop: 2, marginBottom: 6 },
  buyBtn: {
    alignSelf: 'flex-start',
    backgroundColor: '#2563eb',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  buyOff: { opacity: 0.45 },
  buyTxt: { color: '#fff', fontWeight: '800', fontSize: 12 },
});
