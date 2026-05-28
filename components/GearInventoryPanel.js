import React, { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import {
  filterGearInventory,
  sortGearInventory,
  gearCardSummary,
} from '../src/gameSystems/gear/inventoryGearUtils';
import {
  GEAR_UI,
  GearIcon,
  gearRarityUi,
  isMythicRarity,
} from './gear/gearUiTheme';

const FILTERS = [
  { id: 'all', label: 'All' },
  { id: 'head', label: 'Head' },
  { id: 'body', label: 'Body' },
  { id: 'weapon', label: 'Weapon' },
  { id: 'hand', label: 'Hand' },
  { id: 'legs', label: 'Legs' },
  { id: 'rare', label: 'Rare' },
  { id: 'epic', label: 'Epic' },
  { id: 'mythic', label: 'Mythic' },
  { id: 'equipped', label: 'Equipped' },
  { id: 'unequipped', label: 'Free' },
];

export default function GearInventoryPanel({ profile, onSell, onOpenEquip }) {
  const [filter, setFilter] = useState('all');
  const [sortBy, setSortBy] = useState('rarity');

  const list = useMemo(() => {
    const raw = profile?.gearInventory ?? [];
    const filtered = filterGearInventory(raw, filter);
    return sortGearInventory(filtered, sortBy);
  }, [profile, filter, sortBy]);

  return (
    <View style={styles.wrap}>
      <View style={styles.hdrRow}>
        <Text style={styles.title}>Gear ({list.length})</Text>
        {onOpenEquip ? (
          <TouchableOpacity style={styles.equipBtn} onPress={onOpenEquip} activeOpacity={0.88}>
            <Text style={styles.equipBtnTxt}>Equip Gear</Text>
          </TouchableOpacity>
        ) : null}
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipScroll}>
        {FILTERS.map((f) => (
          <TouchableOpacity
            key={f.id}
            style={[styles.chip, filter === f.id && styles.chipOn]}
            onPress={() => setFilter(f.id)}
          >
            <Text style={[styles.chipTxt, filter === f.id && styles.chipTxtOn]}>{f.label}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <View style={styles.sortRow}>
        {[
          { id: 'rarity', label: 'Rarity' },
          { id: 'slot', label: 'Slot' },
          { id: 'equipped', label: 'Status' },
        ].map((s) => (
          <TouchableOpacity
            key={s.id}
            style={[styles.sortChip, sortBy === s.id && styles.chipOn]}
            onPress={() => setSortBy(s.id)}
          >
            <Text style={[styles.chipTxt, sortBy === s.id && styles.chipTxtOn]}>{s.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView style={styles.list} nestedScrollEnabled keyboardShouldPersistTaps="handled">
        {list.length === 0 ? (
          <Text style={styles.muted}>No gear yet. Buy from the shop or earn from chests.</Text>
        ) : (
          list.map((g) => {
            const card = gearCardSummary(g, profile);
            const ui = gearRarityUi(g.rarity);
            const mythic = isMythicRarity(g.rarity);
            const equipped = !!g.equippedToMonsterId;
            return (
              <View
                key={g.instanceId}
                style={[
                  styles.card,
                  { borderColor: ui.border },
                  mythic && styles.cardMythic,
                  equipped && styles.cardEquipped,
                ]}
              >
                <View style={styles.cardTop}>
                  <View style={styles.cardEmoji}>
                    <GearIcon gear={g} size={28} />
                  </View>
                  <View style={styles.cardMid}>
                    <Text style={[styles.cardName, { color: ui.color }]}>{card.name}</Text>
                    <View style={styles.cardMetaRow}>
                      <View style={[styles.rarityPill, { backgroundColor: ui.chipBg }]}>
                        <Text style={[styles.rarityPillTxt, { color: ui.chipFg }]}>{g.rarity}</Text>
                      </View>
                      <Text style={styles.cardSlot}>{g.slot}</Text>
                    </View>
                  </View>
                </View>
                <Text style={styles.cardSet}>{card.setName} Set</Text>
                <Text style={styles.cardStats}>{card.statLines.join(' · ')}</Text>
                {card.socketCount > 0 ? (
                  <Text style={styles.cardSockets}>◇ {card.socketCount} socket(s)</Text>
                ) : null}
                <Text style={[styles.cardEquipped, equipped && styles.cardEquippedOn]}>
                  {equipped ? `Equipped: ${card.equippedMonsterName}` : 'Not equipped'}
                </Text>
                {onSell && !equipped ? (
                  <TouchableOpacity style={styles.sellBtn} onPress={() => onSell(g.instanceId)}>
                    <Text style={styles.sellTxt}>Sell</Text>
                  </TouchableOpacity>
                ) : null}
              </View>
            );
          })
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, minHeight: 200 },
  hdrRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  title: {
    color: GEAR_UI.accent,
    fontWeight: '900',
    fontSize: 13,
    textTransform: 'uppercase',
  },
  equipBtn: {
    backgroundColor: GEAR_UI.tabOn,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: GEAR_UI.tabOnBorder,
    borderBottomWidth: 3,
    borderBottomColor: '#4c1d95',
  },
  equipBtnTxt: { color: GEAR_UI.tabTxtOn, fontWeight: '900', fontSize: 11, textTransform: 'uppercase' },
  chipScroll: { maxHeight: 38, marginBottom: 6 },
  chip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: GEAR_UI.tabBorder,
    backgroundColor: GEAR_UI.tab,
    marginRight: 6,
  },
  chipOn: { backgroundColor: GEAR_UI.tabOn, borderColor: GEAR_UI.tabOnBorder },
  chipTxt: { color: GEAR_UI.tabTxt, fontSize: 11, fontWeight: '900' },
  chipTxtOn: { color: GEAR_UI.tabTxtOn },
  sortRow: { flexDirection: 'row', marginBottom: 8, gap: 6 },
  sortChip: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: GEAR_UI.tabBorder,
    backgroundColor: 'rgba(14, 28, 52, 0.6)',
  },
  list: { maxHeight: 300 },
  muted: { color: GEAR_UI.muted, fontSize: 12, fontWeight: '800', textAlign: 'center', padding: 16, lineHeight: 18 },
  card: {
    padding: 12,
    marginBottom: 8,
    borderRadius: 14,
    backgroundColor: GEAR_UI.panel,
    borderWidth: 2,
    borderColor: GEAR_UI.panelBorder,
  },
  cardMythic: {
    borderWidth: 3,
    shadowColor: '#e84393',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.35,
    shadowRadius: 6,
  },
  cardEquipped: { opacity: 0.92, borderStyle: 'solid' },
  cardTop: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  cardEmoji: { width: 40, alignItems: 'center', justifyContent: 'flex-start' },
  cardMid: { flex: 1, minWidth: 0 },
  cardName: { fontWeight: '900', fontSize: 15 },
  cardMetaRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4, flexWrap: 'wrap' },
  rarityPill: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
  rarityPillTxt: { fontWeight: '900', fontSize: 9, textTransform: 'uppercase' },
  cardSlot: { fontWeight: '800', color: GEAR_UI.sub, fontSize: 11, textTransform: 'capitalize' },
  cardSet: { color: '#c4b5fd', fontSize: 11, marginTop: 6, fontWeight: '800' },
  cardStats: { color: GEAR_UI.statPos, fontSize: 11, marginTop: 4, fontWeight: '800', lineHeight: 16 },
  cardSockets: { color: GEAR_UI.coins, fontSize: 10, marginTop: 4, fontWeight: '900' },
  cardEquipped: { color: GEAR_UI.muted, fontSize: 10, marginTop: 6, fontWeight: '800' },
  cardEquippedOn: { color: '#fcd34d' },
  sellBtn: {
    alignSelf: 'flex-start',
    marginTop: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: GEAR_UI.btnDanger,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: GEAR_UI.btnDangerBorder,
    borderBottomWidth: 3,
    borderBottomColor: '#450a0a',
  },
  sellTxt: { color: '#fecaca', fontSize: 11, fontWeight: '900', textTransform: 'uppercase' },
});
