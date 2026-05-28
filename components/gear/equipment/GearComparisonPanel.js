import React, { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { formatGearStatLines } from '../../../src/gameSystems/gear/gearGenerator';
import { GEAR_UI, gearRarityUi } from '../gearUiTheme';

const STAT_LABELS = {
  attack: 'ATK',
  magicAttack: 'MAG',
  defense: 'DEF',
  magicDefence: 'MDEF',
  hp: 'HP',
  speed: 'SPD',
  crit: 'Crit',
  dodge: 'Dodge',
  hitRate: 'Hit',
};
const HIDDEN_PLAYER_STATS = new Set(['healPower', 'firePower', 'poisonPower', 'skillPower']);

function statMap(gear) {
  const m = {};
  for (const s of gear?.stats || []) m[s.type] = s.value;
  return m;
}

export default function GearComparisonPanel({ currentGear, selectedGear, setPreviewMessage }) {
  const deltas = useMemo(() => {
    if (!selectedGear) return [];
    const cur = statMap(currentGear);
    const sel = statMap(selectedGear);
    const types = new Set([...Object.keys(cur), ...Object.keys(sel)]);
    const lines = [];
    for (const type of types) {
      if (HIDDEN_PLAYER_STATS.has(type)) continue;
      const diff = (sel[type] ?? 0) - (cur[type] ?? 0);
      if (diff !== 0) lines.push({ type, diff });
    }
    return lines;
  }, [currentGear, selectedGear]);

  if (!selectedGear) return null;

  const selUi = gearRarityUi(selectedGear.rarity);

  return (
    <View style={styles.wrap}>
      <Text style={styles.title}>Comparison</Text>
      <View style={styles.cols}>
        <View style={styles.col}>
          <Text style={styles.hdr}>Current</Text>
          <Text style={styles.name}>{currentGear ? currentGear.name : '— Empty —'}</Text>
          {currentGear ? (
            formatGearStatLines(currentGear.stats).map((line) => (
              <Text key={`c-${line}`} style={styles.stat}>
                {line}
              </Text>
            ))
          ) : (
            <Text style={styles.empty}>No item equipped</Text>
          )}
        </View>
        <Text style={styles.arrow}>→</Text>
        <View style={styles.col}>
          <Text style={styles.hdr}>Selected</Text>
          <Text style={[styles.name, { color: selUi.color }]}>{selectedGear.name}</Text>
          {formatGearStatLines(selectedGear.stats).map((line) => (
            <Text key={`s-${line}`} style={styles.stat}>
              {line}
            </Text>
          ))}
        </View>
      </View>
      {deltas.length > 0 ? (
        <View style={styles.deltaBox}>
          <Text style={styles.deltaTitle}>Change</Text>
          {deltas.map((d) => (
            <Text
              key={d.type}
              style={[styles.deltaLine, d.diff > 0 ? styles.pos : styles.neg]}
            >
              {STAT_LABELS[d.type] ?? d.type}: {d.diff > 0 ? '+' : ''}
              {d.diff}
            </Text>
          ))}
        </View>
      ) : (
        <Text style={styles.same}>Same stat lines</Text>
      )}
      {setPreviewMessage ? <Text style={styles.setMsg}>{setPreviewMessage}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginTop: 8,
    padding: 10,
    borderRadius: 12,
    backgroundColor: GEAR_UI.panelDeep,
    borderWidth: 1,
    borderColor: GEAR_UI.accentSoft,
  },
  title: { fontWeight: '900', color: GEAR_UI.accent, fontSize: 11, textTransform: 'uppercase', marginBottom: 8 },
  cols: { flexDirection: 'row', alignItems: 'flex-start' },
  col: { flex: 1 },
  hdr: { fontWeight: '900', color: GEAR_UI.muted, fontSize: 9, textTransform: 'uppercase' },
  name: { fontWeight: '900', color: GEAR_UI.title, fontSize: 12, marginTop: 2, marginBottom: 4 },
  stat: { fontWeight: '800', color: '#cbd5e1', fontSize: 10, marginTop: 2 },
  empty: { fontWeight: '800', color: GEAR_UI.muted, fontSize: 10, fontStyle: 'italic' },
  arrow: { fontWeight: '900', color: GEAR_UI.coins, fontSize: 16, paddingHorizontal: 6, paddingTop: 14 },
  deltaBox: { marginTop: 8, paddingTop: 8, borderTopWidth: 1, borderTopColor: GEAR_UI.accentSoft },
  deltaTitle: { fontWeight: '900', color: GEAR_UI.muted, fontSize: 9, textTransform: 'uppercase', marginBottom: 4 },
  deltaLine: { fontWeight: '900', fontSize: 11, marginTop: 2 },
  pos: { color: GEAR_UI.statPos },
  neg: { color: GEAR_UI.statNeg },
  same: { color: GEAR_UI.muted, fontSize: 10, marginTop: 8, fontWeight: '800' },
  setMsg: { color: GEAR_UI.coins, fontSize: 11, marginTop: 8, fontWeight: '800', fontStyle: 'italic' },
});
