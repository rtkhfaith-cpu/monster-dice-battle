import React, { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { GEAR_UI, gearRarityUi } from './gear/gearUiTheme';
import {
  GEM_RARITY_UI,
  GEM_STAT_LABELS,
  gemEmoji,
  gemSocketInsertCoinCost,
} from '../src/gameSystems/gems/gemDefinitions';
import {
  listGemStacks,
  listGearWithSockets,
  parseGemKey,
} from '../src/gameSystems/gems/gemInventory';

function gemShortName(stat, rarity) {
  return `${GEM_RARITY_UI[rarity]?.label ?? rarity} ${GEM_STAT_LABELS[stat] ?? stat}`;
}

/**
 * Socket / unsocket gems on gear pieces that have sockets.
 */
export default function GearGemSocketPanel({
  profile,
  coins,
  onSocket,
  onUnsocket,
  compact = false,
  gearFilter = null,
}) {
  const stacks = useMemo(() => listGemStacks(profile), [profile]);
  const gearRows = useMemo(() => {
    const rows = listGearWithSockets(profile);
    if (!gearFilter) return rows;
    return rows.filter((g) => g.instanceId === gearFilter);
  }, [profile, gearFilter]);

  const [selectedGearId, setSelectedGearId] = useState(gearFilter ?? gearRows[0]?.instanceId ?? null);
  const [pickSocketIndex, setPickSocketIndex] = useState(null);

  const selectedGear = gearRows.find((g) => g.instanceId === selectedGearId) ?? gearRows[0] ?? null;

  if (gearRows.length === 0) {
    return (
      <Text style={styles.muted}>
        No gear with sockets yet. Epic gear can have 1 socket; Mythic can have up to 2.
      </Text>
    );
  }

  return (
    <View style={styles.wrap}>
      {!gearFilter && gearRows.length > 1 ? (
        <>
          <Text style={styles.sectionLbl}>Gear with sockets</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.gearRow}>
            {gearRows.map((g) => {
              const on = g.instanceId === selectedGear?.instanceId;
              const ui = gearRarityUi(g.rarity);
              return (
                <TouchableOpacity
                  key={g.instanceId}
                  style={[styles.gearChip, on && styles.gearChipOn, { borderColor: on ? GEAR_UI.accent : ui.border }]}
                  onPress={() => {
                    setSelectedGearId(g.instanceId);
                    setPickSocketIndex(null);
                  }}
                  activeOpacity={0.88}
                >
                  <Text style={[styles.gearChipName, { color: ui.color }]} numberOfLines={2}>
                    {g.name}
                  </Text>
                  <Text style={styles.gearChipMeta}>
                    {g.sockets.filter((s) => s.gem).length}/{g.sockets.length} filled
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </>
      ) : null}

      {selectedGear ? (
        <View style={styles.socketRow}>
          {selectedGear.sockets.map((socket, socketIdx) => {
            const socketIndex = typeof socket.index === 'number' ? socket.index : socketIdx;
            const filled = !!socket.gem;
            const parsed = socket.gem?.key ? parseGemKey(socket.gem.key) : null;
            const picking = pickSocketIndex === socketIndex;
            const removeAffordable = typeof coins !== 'number' || coins >= (socket.removeCost ?? 0);
            return (
              <View key={socket.id || `sk-${socketIndex}`} style={styles.socketBox}>
                <Text style={styles.socketLbl}>Socket {socketIndex + 1}</Text>
                {filled && parsed ? (
                  <>
                    <Text style={styles.socketEmoji}>{gemEmoji(parsed.stat, parsed.rarity)}</Text>
                    <Text style={[styles.socketGem, { color: GEM_RARITY_UI[parsed.rarity]?.color }]} numberOfLines={2}>
                      {gemShortName(parsed.stat, parsed.rarity)}
                    </Text>
                    <Text style={styles.socketVal}>Lv {socket.gem.level}</Text>
                    <TouchableOpacity
                      style={[styles.socketBtn, !removeAffordable && styles.socketBtnOff]}
                      disabled={!removeAffordable}
                      onPress={() => onUnsocket?.(selectedGear.instanceId, socketIndex)}
                    >
                      <Text style={styles.socketBtnTxt}>
                        Remove · 🪙 {socket.removeCost}
                      </Text>
                    </TouchableOpacity>
                  </>
                ) : (
                  <>
                    <Text style={styles.socketEmptyIcon}>＋</Text>
                    <Text style={styles.socketEmptyTxt}>Empty</Text>
                    <TouchableOpacity
                      style={[styles.socketBtn, styles.socketBtnInsert]}
                      disabled={stacks.length === 0}
                      onPress={() => setPickSocketIndex(picking ? null : socketIndex)}
                    >
                      <Text style={styles.socketBtnTxt}>Insert gem</Text>
                    </TouchableOpacity>
                  </>
                )}
                {picking && !filled ? (
                  <View style={styles.pickList}>
                    {stacks.length === 0 ? (
                      <Text style={styles.pickMuted}>No gems in inventory.</Text>
                    ) : (
                      stacks.map((g) => {
                        const insertCost = gemSocketInsertCoinCost(g.rarity);
                        const insertAff = typeof coins !== 'number' || coins >= insertCost;
                        return (
                          <TouchableOpacity
                            key={g.id}
                            style={[styles.pickRow, !insertAff && styles.pickRowOff]}
                            disabled={!insertAff}
                            onPress={() => {
                              onSocket?.(selectedGear.instanceId, socketIndex, g.id);
                              setPickSocketIndex(null);
                            }}
                          >
                            <Text style={styles.pickEmoji}>{g.emoji}</Text>
                            <View style={styles.pickBody}>
                              <Text style={[styles.pickName, { color: GEM_RARITY_UI[g.rarity]?.color }]}>
                                {g.name}
                              </Text>
                              <Text style={styles.pickMeta}>
                                Lv {g.level} · +{g.currentValue} · 🪙 {insertCost}
                              </Text>
                            </View>
                          </TouchableOpacity>
                        );
                      })
                    )}
                  </View>
                ) : null}
              </View>
            );
          })}
        </View>
      ) : null}

      {!compact ? (
        <Text style={styles.hint}>
          Socketing and removing gems costs coins. Only epic/mythic gear with sockets can hold gems.
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginTop: 4 },
  sectionLbl: {
    color: GEAR_UI.accent,
    fontWeight: '900',
    fontSize: 11,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  gearRow: { maxHeight: 64, marginBottom: 8 },
  gearChip: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 10,
    borderWidth: 2,
    backgroundColor: GEAR_UI.panel,
    marginRight: 6,
    minWidth: 88,
    maxWidth: 120,
  },
  gearChipOn: { backgroundColor: GEAR_UI.setActive },
  gearChipName: { fontSize: 9, fontWeight: '900', textAlign: 'center' },
  gearChipMeta: { fontSize: 8, fontWeight: '800', color: GEAR_UI.muted, textAlign: 'center', marginTop: 2 },
  socketRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  socketBox: {
    flex: 1,
    minWidth: 120,
    minHeight: 110,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: GEAR_UI.panelBorder,
    backgroundColor: GEAR_UI.panelDeep,
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 6,
  },
  socketLbl: { fontSize: 8, fontWeight: '900', color: GEAR_UI.muted, textTransform: 'uppercase' },
  socketEmoji: { fontSize: 22, marginTop: 4 },
  socketGem: { fontSize: 9, fontWeight: '900', textAlign: 'center', marginTop: 2 },
  socketVal: { fontSize: 9, fontWeight: '800', color: GEAR_UI.statPos, marginTop: 2 },
  socketEmptyIcon: { fontSize: 24, color: GEAR_UI.muted, marginTop: 8 },
  socketEmptyTxt: { fontSize: 9, fontWeight: '800', color: GEAR_UI.muted, marginTop: 2 },
  socketBtn: {
    marginTop: 6,
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 8,
    backgroundColor: GEAR_UI.btnDanger,
    borderWidth: 1,
    borderColor: GEAR_UI.btnDangerBorder,
  },
  socketBtnInsert: { backgroundColor: GEAR_UI.btnPrimary, borderColor: GEAR_UI.btnPrimaryBorder },
  socketBtnOff: { opacity: 0.45 },
  socketBtnTxt: { fontSize: 8, fontWeight: '900', color: GEAR_UI.tabTxtOn, textAlign: 'center' },
  pickList: {
    marginTop: 8,
    width: '100%',
    borderTopWidth: 1,
    borderTopColor: GEAR_UI.panelBorder,
    paddingTop: 6,
  },
  pickRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 5,
    paddingHorizontal: 4,
    borderRadius: 8,
    marginBottom: 4,
    backgroundColor: GEAR_UI.panel,
  },
  pickRowOff: { opacity: 0.45 },
  pickEmoji: { fontSize: 16, width: 22, textAlign: 'center' },
  pickBody: { flex: 1, minWidth: 0 },
  pickName: { fontSize: 9, fontWeight: '900' },
  pickMeta: { fontSize: 8, fontWeight: '800', color: GEAR_UI.sub },
  pickMuted: { fontSize: 9, color: GEAR_UI.muted, fontWeight: '800', textAlign: 'center' },
  hint: { color: GEAR_UI.muted, fontSize: 10, fontWeight: '800', marginTop: 8, lineHeight: 14 },
  muted: { color: GEAR_UI.muted, fontSize: 12, fontWeight: '800', textAlign: 'center', padding: 12, lineHeight: 18 },
});
