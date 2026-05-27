import React, { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import {
  getPassiveDescription,
  getPassiveSkillDef,
  PASSIVE_SKILL_BOOK_SHOP,
} from '../src/gameSystems/passiveSkills';
import { passiveBookShopOffers } from '../src/gameBalance/shop';
const RARITY_COLORS = {
  rare: '#60a5fa',
  epic: '#c084fc',
  legendary: '#fbbf24',
  mythic: '#f472b6',
};

/**
 * Passive skill book catalog inside Gear & Skill Shop.
 */
export default function PassiveSkillBookShop({
  coins = 0,
  profileId = '',
  profile,
  onBuy,
}) {
  const [filter, setFilter] = useState('all');
  const [detail, setDetail] = useState(null);

  const rows = useMemo(() => {
    return PASSIVE_SKILL_BOOK_SHOP.map((row) => {
      const def = getPassiveSkillDef(row.skillId);
      const offers = passiveBookShopOffers(row.skillId, profileId);
      return { ...row, def, offers };
    });
  }, [profileId, profile]);

  const filtered = rows.filter((r) => {
    if (filter === 'all') return true;
    return r.def?.effectType === filter;
  });

  return (
    <View style={styles.wrap}>
      <Text style={styles.hint}>Books are consumed when equipped. Buy again to equip on another monster.</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll}>
        {[
          { id: 'all', label: 'All' },
          { id: 'lifesteal', label: 'Lifesteal' },
          { id: 'reflect', label: 'Reflect' },
          { id: 'regen', label: 'Regen' },
          { id: 'poison', label: 'Poison' },
          { id: 'burn', label: 'Burn' },
          { id: 'dodge', label: 'Dodge' },
          { id: 'crit', label: 'Crit' },
          { id: 'berserk', label: 'Berserk' },
          { id: 'antiCrit', label: 'Defense' },
          { id: 'barrier', label: 'Barrier' },
        ].map((f) => (
          <TouchableOpacity
            key={f.id}
            style={[styles.chip, filter === f.id && styles.chipOn]}
            onPress={() => setFilter(f.id)}
          >
            <Text style={[styles.chipTxt, filter === f.id && styles.chipTxtOn]}>{f.label}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <ScrollView style={styles.list} contentContainerStyle={styles.listContent} nestedScrollEnabled>
        {filtered.map((row) => (
          <View key={row.skillId} style={styles.row}>
            <TouchableOpacity style={styles.emojiBox} onPress={() => setDetail(row)}>
              <Text style={styles.emoji}>{row.emoji}</Text>
            </TouchableOpacity>
            <View style={styles.mid}>
              <Text style={styles.name}>{row.def?.name ?? row.skillId}</Text>
              <Text style={styles.meta}>{row.def?.effectType ?? 'passive'}</Text>
              {row.offers.map((o) => (
                <TouchableOpacity
                  key={o.rarity}
                  style={[styles.buyBtn, (coins ?? 0) < o.price && styles.buyOff]}
                  disabled={(coins ?? 0) < o.price}
                  onPress={() => onBuy?.(row.skillId, o.rarity, o.price)}
                >
                  <Text style={styles.buyTxt}>
                    Buy {o.rarity} · {o.price}c
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        ))}
      </ScrollView>

      {detail ? (
        <View style={styles.detailOverlay}>
          <View style={styles.detailCard}>
            <TouchableOpacity style={styles.detailClose} onPress={() => setDetail(null)}>
              <Text style={styles.detailCloseTxt}>×</Text>
            </TouchableOpacity>
            <Text style={styles.detailEmoji}>{detail.emoji}</Text>
            <Text style={styles.detailName}>{detail.def?.name}</Text>
            {['rare', 'epic'].map((r) => (
              <Text key={r} style={[styles.detailLine, { color: RARITY_COLORS[r] }]}>
                {r}: {getPassiveDescription(detail.skillId, r)}
              </Text>
            ))}
            <Text style={styles.detailNote}>
              Legendary/Mythic: bosses, chests, lucky spin — not sold here normally.
            </Text>
          </View>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, minHeight: 200 },
  hint: { color: '#94a3b8', fontSize: 12, marginBottom: 8, paddingHorizontal: 4 },
  filterScroll: { maxHeight: 36, marginBottom: 8 },
  chip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    backgroundColor: 'rgba(30,41,59,0.8)',
    marginRight: 6,
  },
  chipOn: { backgroundColor: '#4f46e5' },
  chipTxt: { color: '#94a3b8', fontSize: 11, fontWeight: '600' },
  chipTxtOn: { color: '#fff' },
  list: { flex: 1 },
  listContent: { paddingBottom: 12 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(148,163,184,0.15)',
  },
  emojiBox: {
    width: 52,
    height: 52,
    borderRadius: 10,
    backgroundColor: 'rgba(15,23,42,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  emoji: { fontSize: 28 },
  mid: { flex: 1, marginLeft: 10 },
  name: { color: '#f1f5f9', fontWeight: '700', fontSize: 15 },
  meta: { color: '#94a3b8', fontSize: 12, marginTop: 2 },
  buyBtn: {
    marginTop: 6,
    alignSelf: 'flex-start',
    backgroundColor: '#4f46e5',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  buyOff: { opacity: 0.45 },
  buyTxt: { color: '#fff', fontSize: 12, fontWeight: '700' },
  detailOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.65)',
    justifyContent: 'center',
    padding: 20,
  },
  detailCard: {
    backgroundColor: '#1e293b',
    borderRadius: 16,
    padding: 20,
  },
  detailClose: { position: 'absolute', right: 12, top: 8, zIndex: 2 },
  detailCloseTxt: { color: '#94a3b8', fontSize: 28 },
  detailEmoji: { fontSize: 40, textAlign: 'center' },
  detailName: { color: '#f8fafc', fontSize: 20, fontWeight: '800', textAlign: 'center', marginVertical: 8 },
  detailLine: { fontSize: 13, marginTop: 6 },
  detailNote: { color: '#94a3b8', fontSize: 11, marginTop: 12, fontStyle: 'italic' },
});
