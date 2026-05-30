import React, { useMemo } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { GEAR_UI } from './gear/gearUiTheme';
import {
  GEM_RARITY_UI,
  GEM_STAT_LABELS,
  gemEmoji,
} from '../src/gameSystems/gems/gemDefinitions';
import { listGemStacks, listSocketedGems } from '../src/gameSystems/gems/gemInventory';

/**
 * Gem management — merge/upgrade gems. Socket gems from Inventory → Gear → tap item.
 */
export default function GemManagerPanel({
  profile,
  coins,
  onUpgrade,
}) {
  const stacks = useMemo(() => listGemStacks(profile), [profile]);
  const socketed = useMemo(() => listSocketedGems(profile), [profile]);

  return (
    <View style={styles.wrap}>
      <Text style={styles.intro}>
        Merge gems here. To socket a gem, open Inventory → Gear, tap a piece with sockets, then tap Insert gem.
      </Text>

      {socketed.length > 0 ? (
        <>
          <Text style={styles.sectionLbl}>Socketed on gear ({socketed.length})</Text>
          {socketed.map((row) => {
            const ui = GEM_RARITY_UI[row.gem.rarity] ?? GEM_RARITY_UI.rare;
            return (
              <View key={`${row.gearInstanceId}-${row.socketIndex}`} style={[styles.socketedRow, { borderColor: ui.color }]}>
                <Text style={styles.socketedEmoji}>{gemEmoji(row.gem.stat, row.gem.rarity)}</Text>
                <View style={styles.socketedBody}>
                  <Text style={[styles.socketedName, { color: ui.color }]}>
                    {GEM_STAT_LABELS[row.gem.stat] ?? row.gem.stat} · Lv {row.gem.level}
                  </Text>
                  <Text style={styles.socketedMeta}>{row.gearName}</Text>
                </View>
              </View>
            );
          })}
        </>
      ) : null}

      <Text style={styles.sectionLbl}>Your gems ({stacks.length})</Text>
      <ScrollView style={styles.list} nestedScrollEnabled keyboardShouldPersistTaps="handled">
        {stacks.length === 0 ? (
          <Text style={styles.muted}>
            No gems in stash. Buy Rare gems in the Shop, or earn Epic/Mythic gems from chests and dungeon bosses.
            Socketed gems appear under “Socketed on gear” above.
          </Text>
        ) : (
          stacks.map((g) => {
            const ui = GEM_RARITY_UI[g.rarity] ?? GEM_RARITY_UI.rare;
            const canAffordMerge = typeof coins !== 'number' || coins >= g.mergeCoinCost;
            return (
              <View key={g.id} style={[styles.card, { borderColor: ui.color }]}>
                <View style={styles.cardTop}>
                  <Text style={styles.cardEmoji}>{g.emoji}</Text>
                  <View style={styles.cardBody}>
                    <Text style={[styles.cardName, { color: ui.color }]} numberOfLines={1}>
                      {g.name}
                    </Text>
                    <Text style={styles.cardMeta}>
                      Lv {g.level} · {GEM_STAT_LABELS[g.stat]}
                    </Text>
                    <Text style={styles.cardVal}>
                      Current: +{g.currentValue}
                      {g.nextValue != null ? `   Next: +${g.nextValue}` : '   (max)'}
                    </Text>
                    <Text style={styles.cardCopies}>
                      Owned ×{g.count}
                      {g.atMaxLevel
                        ? ''
                        : ` · merge needs ${g.upgradeCost} fuel (have ${g.fuelAvailable})`}
                    </Text>
                  </View>
                </View>
                <View style={styles.cardActions}>
                  {g.atMaxLevel ? (
                    <View style={[styles.btn, styles.btnOff]}>
                      <Text style={styles.btnTxt}>Max level</Text>
                    </View>
                  ) : g.canUpgrade ? (
                    <TouchableOpacity
                      style={[styles.btn, styles.btnUpgrade, !canAffordMerge && styles.btnOff]}
                      disabled={!canAffordMerge}
                      onPress={() => onUpgrade?.(g.id)}
                    >
                      <Text style={styles.btnTxt}>
                        Merge → Lv {g.level + 1} · 🪙 {g.mergeCoinCost}
                      </Text>
                    </TouchableOpacity>
                  ) : (
                    <View style={[styles.btn, styles.btnOff]}>
                      <Text style={styles.btnTxt}>
                        Need {g.upgradeCost} fuel gem{g.upgradeCost === 1 ? '' : 's'} (have {g.fuelAvailable})
                      </Text>
                    </View>
                  )}
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
  intro: {
    color: GEAR_UI.sub,
    fontSize: 11,
    fontWeight: '800',
    lineHeight: 16,
    marginBottom: 8,
  },
  sectionLbl: {
    color: GEAR_UI.accent,
    fontWeight: '900',
    fontSize: 11,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: 10,
    marginBottom: 6,
  },
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
  btnOff: { backgroundColor: 'rgba(148,163,184,0.18)', borderColor: 'rgba(148,163,184,0.4)' },
  socketedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 8,
    marginBottom: 6,
    borderRadius: 10,
    borderWidth: 1,
    backgroundColor: GEAR_UI.panelDeep,
  },
  socketedEmoji: { fontSize: 20, width: 28, textAlign: 'center' },
  socketedBody: { flex: 1, minWidth: 0 },
  socketedName: { fontWeight: '900', fontSize: 11 },
  socketedMeta: { color: GEAR_UI.sub, fontSize: 10, fontWeight: '800', marginTop: 2 },
});
