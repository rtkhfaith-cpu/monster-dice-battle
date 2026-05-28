import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { GEAR_UI } from '../gearUiTheme';

function statVal(stats, gearBonuses, key, range = false) {
  const s = stats?.[key];
  const bonus = gearBonuses?.[key] ?? 0;
  if (range && s?.min != null) {
    return { display: `${s.min}–${s.max}`, bonus: bonus > 0 ? `+${bonus}` : null };
  }
  if (typeof s === 'number') {
    return { display: String(s), bonus: bonus > 0 ? `+${bonus}` : null };
  }
  return { display: '—', bonus: null };
}

const ROWS = [
  { key: 'hp', label: 'HP' },
  { key: 'attack', label: 'ATK', range: true },
  { key: 'def', label: 'DEF', range: true },
  { key: 'speed', label: 'SPD', alt: 'agility' },
  { key: 'critPct', label: 'Crit' },
  { key: 'dodge', label: 'Dodge', alt: 'dodgePct' },
  { key: 'hitRate', label: 'HitRate' },
];

const POWER_ROWS = [
  { key: 'healPower', label: 'Heal', fromGear: true },
  { key: 'firePower', label: 'Fire', fromGear: true },
  { key: 'poisonPower', label: 'Poison', fromGear: true },
  { key: 'skillPower', label: 'Skill', fromGear: true },
];

export default function MonsterFinalStatsPanel({ fighter, compact }) {
  if (!fighter?.stats) return null;
  const { stats, gearBonuses, petBonuses, activeSetBonus, petCombatModifiers } = fighter;

  const mainRows = ROWS.map((r) => {
    const valKey = r.alt && stats[r.alt] != null ? r.alt : r.key === 'def' ? 'def' : r.key === 'attack' ? 'attack' : r.key;
    const gbKey =
      r.key === 'attack'
        ? 'attack'
        : r.key === 'def'
          ? 'defense'
          : r.key === 'critPct'
            ? 'crit'
            : r.key === 'dodge'
              ? 'dodge'
              : r.key;
    if (r.range) {
      const v = statVal(stats, gearBonuses, valKey, true);
      return { label: r.label, ...v };
    }
    const raw = stats[valKey] ?? stats[r.key];
    const bonus = gearBonuses?.[gbKey] ?? (r.key === 'speed' ? petBonuses?.spd : null);
    return {
      label: r.label,
      display: String(raw ?? '—'),
      bonus: bonus > 0 ? `+${bonus}` : petBonuses && r.key === 'hp' && petBonuses.hp ? `+${petBonuses.hp}` : null,
    };
  });

  const powerRows = POWER_ROWS.filter((r) => (gearBonuses?.[r.key] ?? 0) > 0).map((r) => ({
    label: r.label,
    display: String(gearBonuses[r.key]),
    bonus: null,
  }));
  const petCombatRows = [];
  if ((petCombatModifiers?.petCritBonusPct ?? 0) > 0) {
    petCombatRows.push({ label: 'Pet Crit+', display: `${petCombatModifiers.petCritBonusPct}%` });
  }
  if ((petCombatModifiers?.petDodgeBonusPct ?? 0) > 0) {
    petCombatRows.push({ label: 'Pet Dodge+', display: `${petCombatModifiers.petDodgeBonusPct}%` });
  }

  return (
    <View style={[styles.wrap, compact && styles.wrapCompact]}>
      <Text style={styles.title}>Battle stats</Text>
      {activeSetBonus ? (
        <Text style={styles.setHint}>{activeSetBonus.name} bonus applied</Text>
      ) : null}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
        {mainRows.map((row) => (
          <View key={row.label} style={styles.chip}>
            <Text style={styles.chipLbl}>{row.label}</Text>
            <Text style={styles.chipVal}>{row.display}</Text>
            {row.bonus ? <Text style={styles.chipBonus}>{row.bonus}</Text> : null}
          </View>
        ))}
        {powerRows.map((row) => (
          <View key={row.label} style={styles.chip}>
            <Text style={styles.chipLbl}>{row.label}</Text>
            <Text style={styles.chipVal}>{row.display}</Text>
          </View>
        ))}
        {petCombatRows.map((row) => (
          <View key={row.label} style={[styles.chip, styles.petChip]}>
            <Text style={styles.chipLbl}>{row.label}</Text>
            <Text style={styles.chipVal}>{row.display}</Text>
          </View>
        ))}
        {petBonuses && (petBonuses.hp || petBonuses.atk) ? (
          <View style={[styles.chip, styles.petChip]}>
            <Text style={styles.chipLbl}>Pet</Text>
            <Text style={styles.chipVal}>
              HP+{petBonuses.hp} ATK+{petBonuses.atk} DEF+{petBonuses.def} SPD+{petBonuses.spd}
            </Text>
          </View>
        ) : null}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    backgroundColor: GEAR_UI.panelDeep,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: GEAR_UI.accentSoft,
    paddingVertical: 8,
    paddingHorizontal: 8,
    marginBottom: 8,
  },
  wrapCompact: { marginBottom: 6 },
  title: {
    fontWeight: '900',
    color: GEAR_UI.accent,
    fontSize: 11,
    textTransform: 'uppercase',
    marginBottom: 6,
    paddingHorizontal: 4,
  },
  setHint: { color: '#c4b5fd', fontSize: 9, fontWeight: '800', marginBottom: 4, paddingHorizontal: 4 },
  row: { flexDirection: 'row', gap: 6, paddingHorizontal: 2 },
  chip: {
    minWidth: 56,
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderRadius: 8,
    backgroundColor: GEAR_UI.panel,
    borderWidth: 1,
    borderColor: GEAR_UI.panelBorder,
    alignItems: 'center',
  },
  petChip: { borderColor: '#86efac' },
  chipLbl: { fontSize: 8, fontWeight: '900', color: GEAR_UI.muted, textTransform: 'uppercase' },
  chipVal: { fontSize: 11, fontWeight: '900', color: GEAR_UI.title, marginTop: 2 },
  chipBonus: { fontSize: 8, fontWeight: '800', color: GEAR_UI.statPos, marginTop: 2 },
});
