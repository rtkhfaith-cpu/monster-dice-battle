import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { GEAR_UI } from '../gearUiTheme';

/**
 * Compact 2-row Battle Stats grid (player-facing active stats only).
 *
 * Row 1: HP   | ATK | DEF | SPD
 * Row 2: Crit | Dodge | HitRate | MP
 *
 * Pet base bonuses and combat modifiers appear as small footer lines so
 * the panel never overlaps the equipment stage above.
 */
function rangeLabel(range) {
  if (range?.min != null) {
    return range.min === range.max ? String(range.min) : `${range.min}–${range.max}`;
  }
  return '—';
}

export default function MonsterFinalStatsPanel({ fighter, compact }) {
  if (!fighter?.stats) return null;
  const { stats, gearBonuses, petBonuses, activeSetBonus, petCombatModifiers } = fighter;

  const speedVal = stats.speed ?? stats.agility ?? 0;
  const dodgeVal = stats.dodge ?? stats.dodgePct ?? 0;
  const hitRateVal = stats.hitRate ?? 0;

  const row1 = [
    { label: 'HP', display: String(stats.hp ?? 0), bonus: gearBonuses?.hp },
    { label: 'ATK', display: rangeLabel(stats.attack), bonus: gearBonuses?.attack },
    { label: 'DEF', display: rangeLabel(stats.def), bonus: gearBonuses?.defense },
    { label: 'SPD', display: String(speedVal), bonus: gearBonuses?.speed },
  ];
  const row2 = [
    { label: 'Crit', display: `${stats.critPct ?? 0}%`, bonus: gearBonuses?.crit },
    { label: 'Dodge', display: String(Math.round(dodgeVal)), bonus: gearBonuses?.dodge },
    { label: 'HitRate', display: String(Math.round(hitRateVal)), bonus: gearBonuses?.hitRate },
    { label: 'MP', display: String(stats.mp ?? 0), bonus: null },
  ];

  const petLines = [];
  if (petBonuses && (petBonuses.hp || petBonuses.atk || petBonuses.def || petBonuses.spd)) {
    petLines.push(
      `Pet HP+${petBonuses.hp ?? 0} · ATK+${petBonuses.atk ?? 0} · DEF+${petBonuses.def ?? 0} · SPD+${petBonuses.spd ?? 0}`,
    );
  }
  const petCritBonus = petCombatModifiers?.petCritBonusPct ?? 0;
  const petDodgeBonus = petCombatModifiers?.petDodgeBonusPct ?? 0;
  if (petCritBonus > 0 || petDodgeBonus > 0) {
    const parts = [];
    if (petCritBonus > 0) parts.push(`Pet Crit+ ${petCritBonus}%`);
    if (petDodgeBonus > 0) parts.push(`Pet Dodge+ ${petDodgeBonus}%`);
    petLines.push(parts.join(' · '));
  }

  return (
    <View style={[styles.wrap, compact && styles.wrapCompact]}>
      <View style={styles.headerRow}>
        <Text style={styles.title}>Battle stats</Text>
        {activeSetBonus ? (
          <Text style={styles.setHint} numberOfLines={1}>
            {activeSetBonus.name}
          </Text>
        ) : null}
      </View>
      <Row cells={row1} />
      <Row cells={row2} />
      {petLines.map((line) => (
        <Text key={line} style={styles.petLine} numberOfLines={1}>
          {line}
        </Text>
      ))}
    </View>
  );
}

function Row({ cells }) {
  return (
    <View style={styles.row}>
      {cells.map((cell) => (
        <View key={cell.label} style={styles.chip}>
          <Text style={styles.chipLbl}>{cell.label}</Text>
          <Text style={styles.chipVal} numberOfLines={1}>
            {cell.display}
          </Text>
          {cell.bonus > 0 ? <Text style={styles.chipBonus}>+{cell.bonus}</Text> : null}
        </View>
      ))}
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
    marginTop: 4,
    marginBottom: 4,
  },
  wrapCompact: { paddingVertical: 6, paddingHorizontal: 6 },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
    paddingHorizontal: 2,
  },
  title: {
    fontWeight: '900',
    color: GEAR_UI.accent,
    fontSize: 11,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  setHint: {
    color: '#c4b5fd',
    fontSize: 10,
    fontWeight: '800',
    marginLeft: 8,
    flexShrink: 1,
    textAlign: 'right',
  },
  row: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 4,
  },
  chip: {
    flex: 1,
    minWidth: 0,
    paddingVertical: 5,
    paddingHorizontal: 4,
    borderRadius: 8,
    backgroundColor: GEAR_UI.panel,
    borderWidth: 1,
    borderColor: GEAR_UI.panelBorder,
    alignItems: 'center',
  },
  chipLbl: {
    fontSize: 8,
    fontWeight: '900',
    color: GEAR_UI.muted,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  chipVal: {
    fontSize: 11,
    fontWeight: '900',
    color: GEAR_UI.title,
    marginTop: 2,
  },
  chipBonus: {
    fontSize: 8,
    fontWeight: '800',
    color: GEAR_UI.statPos,
    marginTop: 1,
  },
  petLine: {
    fontSize: 9,
    fontWeight: '800',
    color: '#86efac',
    textAlign: 'center',
    marginTop: 4,
  },
});
