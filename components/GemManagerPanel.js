import React, { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import MonsterPreview from './MonsterPreview';
import { GEAR_UI } from './gear/gearUiTheme';
import {
  GEM_RARITY_UI,
  GEM_SLOT_CATEGORIES,
  GEM_STAT_LABELS,
  gemEmoji,
} from '../src/gameSystems/gems/gemDefinitions';
import { listGemStacks, normalizeEquippedGems, parseGemKey } from '../src/gameSystems/gems/gemInventory';
import { gemStatValue } from '../src/gameSystems/gems/gemDefinitions';

const SLOT_LABELS = { offensive: 'Offensive', defensive: 'Defensive', utility: 'Utility' };

function gemShortName(stat, rarity) {
  return `${GEM_RARITY_UI[rarity]?.label ?? rarity} ${GEM_STAT_LABELS[stat] ?? stat}`;
}

/**
 * Gem management — upgrade gems with duplicates and equip up to 3 per monster
 * (one offensive / defensive / utility). Self-contained with a monster picker.
 */
export default function GemManagerPanel({
  profile,
  monsters,
  onUpgrade,
  onEquip,
  onUnequip,
}) {
  const roster = monsters ?? profile?.ownedMonsters ?? [];
  const [selectedMonsterId, setSelectedMonsterId] = useState(roster[0]?.id ?? null);

  const stacks = useMemo(() => listGemStacks(profile), [profile]);
  const selectedMonster = roster.find((m) => m.id === selectedMonsterId) ?? roster[0] ?? null;
  const equipped = normalizeEquippedGems(selectedMonster?.equippedGems, profile);

  return (
    <View style={styles.wrap}>
      {roster.length > 0 ? (
        <>
          <Text style={styles.sectionLbl}>Equip to monster</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.monsterRow}>
            {roster.map((m) => {
              const on = m.id === selectedMonster?.id;
              return (
                <TouchableOpacity
                  key={m.id}
                  style={[styles.monsterChip, on && styles.monsterChipOn]}
                  onPress={() => setSelectedMonsterId(m.id)}
                  activeOpacity={0.88}
                >
                  <MonsterPreview parts={m.monsterParts} size={28} mood="happy" />
                  <Text style={[styles.monsterName, on && styles.monsterNameOn]} numberOfLines={1}>
                    {m.nickname || m.templateId}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          <View style={styles.slotRow}>
            {['offensive', 'defensive', 'utility'].map((slot) => {
              const key = equipped[slot];
              const parsed = key ? parseGemKey(key) : null;
              const stack = parsed ? stacks.find((s) => s.id === key) : null;
              return (
                <View key={slot} style={styles.slotBox}>
                  <Text style={styles.slotLbl}>{SLOT_LABELS[slot]}</Text>
                  {parsed && stack ? (
                    <>
                      <Text style={styles.slotEmoji}>{gemEmoji(parsed.stat)}</Text>
                      <Text style={[styles.slotGem, { color: GEM_RARITY_UI[parsed.rarity]?.color }]} numberOfLines={2}>
                        {gemShortName(parsed.stat, parsed.rarity)}
                      </Text>
                      <Text style={styles.slotVal}>
                        Lv {stack.level} · +{stack.currentValue}
                      </Text>
                      <TouchableOpacity
                        style={styles.slotClear}
                        onPress={() => onUnequip?.(selectedMonster.id, slot)}
                      >
                        <Text style={styles.slotClearTxt}>Remove</Text>
                      </TouchableOpacity>
                    </>
                  ) : (
                    <>
                      <Text style={styles.slotEmptyIcon}>＋</Text>
                      <Text style={styles.slotEmptyTxt}>
                        {GEM_SLOT_CATEGORIES[slot].map((s) => GEM_STAT_LABELS[s]).join(' / ')}
                      </Text>
                    </>
                  )}
                </View>
              );
            })}
          </View>
        </>
      ) : null}

      <Text style={styles.sectionLbl}>Your gems ({stacks.length})</Text>
      <ScrollView style={styles.list} nestedScrollEnabled keyboardShouldPersistTaps="handled">
        {stacks.length === 0 ? (
          <Text style={styles.muted}>
            No gems yet. Buy Rare gems in the Shop, or earn Epic/Mythic gems from chests and dungeon bosses.
          </Text>
        ) : (
          stacks.map((g) => {
            const ui = GEM_RARITY_UI[g.rarity] ?? GEM_RARITY_UI.rare;
            const canEquip = !!selectedMonster;
            const equippedHere = selectedMonster && equipped[g.slot] === g.id;
            return (
              <View key={g.id} style={[styles.card, { borderColor: ui.color }]}>
                <View style={styles.cardTop}>
                  <Text style={styles.cardEmoji}>{g.emoji}</Text>
                  <View style={styles.cardBody}>
                    <Text style={[styles.cardName, { color: ui.color }]} numberOfLines={1}>
                      {g.name}
                    </Text>
                    <Text style={styles.cardMeta}>
                      Lv {g.level} · {SLOT_LABELS[g.slot]} slot
                    </Text>
                    <Text style={styles.cardVal}>
                      Current: +{g.currentValue} {GEM_STAT_LABELS[g.stat]}
                      {g.nextValue != null ? `   Next: +${g.nextValue}` : '   (max)'}
                    </Text>
                    <Text style={styles.cardCopies}>
                      Copies: {g.copies}{g.atMaxLevel ? '' : ` / ${g.upgradeCost}`}
                    </Text>
                  </View>
                </View>
                <View style={styles.cardActions}>
                  {g.atMaxLevel ? (
                    <View style={[styles.btn, styles.btnOff]}>
                      <Text style={styles.btnTxt}>Max level</Text>
                    </View>
                  ) : g.canUpgrade ? (
                    <TouchableOpacity style={[styles.btn, styles.btnUpgrade]} onPress={() => onUpgrade?.(g.id)}>
                      <Text style={styles.btnTxt}>Upgrade → Lv {g.level + 1}</Text>
                    </TouchableOpacity>
                  ) : (
                    <View style={[styles.btn, styles.btnOff]}>
                      <Text style={styles.btnTxt}>Need {g.upgradeCost} copies</Text>
                    </View>
                  )}
                  {canEquip ? (
                    equippedHere ? (
                      <View style={[styles.btn, styles.btnEquipped]}>
                        <Text style={styles.btnTxt}>Equipped</Text>
                      </View>
                    ) : (
                      <TouchableOpacity
                        style={[styles.btn, styles.btnEquip]}
                        onPress={() => onEquip?.(selectedMonster.id, g.id)}
                      >
                        <Text style={styles.btnTxt}>Equip</Text>
                      </TouchableOpacity>
                    )
                  ) : null}
                </View>
              </View>
            );
          })
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, minHeight: 0 },
  sectionLbl: {
    color: GEAR_UI.accent,
    fontWeight: '900',
    fontSize: 11,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: 6,
    marginBottom: 6,
  },
  monsterRow: { maxHeight: 60, marginBottom: 4 },
  monsterChip: {
    alignItems: 'center',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: GEAR_UI.panelBorder,
    backgroundColor: GEAR_UI.panel,
    marginRight: 6,
    minWidth: 56,
  },
  monsterChipOn: { borderColor: GEAR_UI.accent, backgroundColor: GEAR_UI.setActive },
  monsterName: { fontSize: 8, fontWeight: '900', color: GEAR_UI.sub, marginTop: 2, maxWidth: 56 },
  monsterNameOn: { color: GEAR_UI.title },
  slotRow: { flexDirection: 'row', gap: 6, marginBottom: 8 },
  slotBox: {
    flex: 1,
    minHeight: 92,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: GEAR_UI.panelBorder,
    backgroundColor: GEAR_UI.panelDeep,
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 4,
  },
  slotLbl: { fontSize: 8, fontWeight: '900', color: GEAR_UI.muted, textTransform: 'uppercase' },
  slotEmoji: { fontSize: 20, marginTop: 2 },
  slotGem: { fontSize: 9, fontWeight: '900', textAlign: 'center', marginTop: 2 },
  slotVal: { fontSize: 9, fontWeight: '800', color: GEAR_UI.statPos, marginTop: 2 },
  slotClear: { marginTop: 4, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8, backgroundColor: GEAR_UI.btnDanger },
  slotClearTxt: { fontSize: 8, fontWeight: '900', color: '#fecaca' },
  slotEmptyIcon: { fontSize: 22, color: GEAR_UI.muted, marginTop: 6 },
  slotEmptyTxt: { fontSize: 8, fontWeight: '800', color: GEAR_UI.muted, textAlign: 'center', marginTop: 2 },
  list: { flex: 1 },
  muted: { color: GEAR_UI.muted, fontSize: 12, fontWeight: '800', textAlign: 'center', padding: 16, lineHeight: 18 },
  card: {
    padding: 10,
    marginBottom: 8,
    borderRadius: 12,
    borderWidth: 2,
    backgroundColor: GEAR_UI.panel,
  },
  cardTop: { flexDirection: 'row', gap: 8, alignItems: 'flex-start' },
  cardEmoji: { fontSize: 26, width: 34, textAlign: 'center' },
  cardBody: { flex: 1, minWidth: 0 },
  cardName: { fontWeight: '900', fontSize: 13 },
  cardMeta: { color: GEAR_UI.sub, fontSize: 10, fontWeight: '800', marginTop: 2 },
  cardVal: { color: GEAR_UI.statPos, fontSize: 11, fontWeight: '800', marginTop: 3 },
  cardCopies: { color: GEAR_UI.coins, fontSize: 10, fontWeight: '900', marginTop: 3 },
  cardActions: { flexDirection: 'row', gap: 8, marginTop: 8 },
  btn: { flex: 1, paddingVertical: 8, borderRadius: 10, alignItems: 'center', borderWidth: 1 },
  btnTxt: { fontWeight: '900', fontSize: 10, color: GEAR_UI.tabTxtOn, textTransform: 'uppercase' },
  btnUpgrade: { backgroundColor: GEAR_UI.btnPrimary, borderColor: GEAR_UI.btnPrimaryBorder },
  btnEquip: { backgroundColor: GEAR_UI.tabOn, borderColor: GEAR_UI.tabOnBorder },
  btnEquipped: { backgroundColor: 'rgba(18,53,40,0.6)', borderColor: GEAR_UI.slotFilledBorder },
  btnOff: { backgroundColor: 'rgba(148,163,184,0.18)', borderColor: 'rgba(148,163,184,0.4)' },
});
