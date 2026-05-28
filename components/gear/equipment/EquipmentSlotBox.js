import React from 'react';
import { StyleSheet, Text, TouchableOpacity } from 'react-native';
import { GEAR_UI, GearIcon, SLOT_ICONS, gearRarityUi, isMythicRarity } from '../gearUiTheme';

/**
 * Compact MMORPG-style equipment slot box.
 *
 * Visual goals:
 *   - icon + short label (Head, Body, Wpn 1, Hand 1, Leg 1)
 *   - rarity border when equipped
 *   - single-line gear name (truncated)
 *   - dashed border + dim look when empty
 *   - small footprint so the monster stays visually centered
 */
export default function EquipmentSlotBox({
  label,
  slotKey,
  gear,
  selected,
  onPress,
  compact,
  widthOverride,
}) {
  const ui = gear ? gearRarityUi(gear.rarity) : null;
  const mythic = gear && isMythicRarity(gear.rarity);

  return (
    <TouchableOpacity
      activeOpacity={0.85}
      onPress={onPress}
      style={[
        styles.box,
        compact && styles.boxCompact,
        widthOverride ? { width: widthOverride } : null,
        gear ? styles.filled : styles.empty,
        gear && { borderColor: ui.border },
        selected && styles.selected,
        mythic && styles.mythic,
      ]}
    >
      {gear ? (
        <GearIcon gear={gear} size={22} />
      ) : (
        <Text style={styles.icon}>{SLOT_ICONS[slotKey] ?? '◆'}</Text>
      )}
      <Text style={styles.lbl} numberOfLines={1}>
        {label}
      </Text>
      {gear ? (
        <Text style={[styles.name, { color: ui.color }]} numberOfLines={1}>
          {gear.name}
        </Text>
      ) : (
        <Text style={styles.emptyTxt}>Empty</Text>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  box: {
    width: 80,
    height: 84,
    borderRadius: 12,
    borderWidth: 2,
    paddingVertical: 6,
    paddingHorizontal: 4,
    alignItems: 'center',
    justifyContent: 'flex-start',
    backgroundColor: GEAR_UI.panelDeep,
  },
  boxCompact: { width: 72, height: 76 },
  empty: {
    borderColor: GEAR_UI.slotEmptyBorder,
    borderStyle: 'dashed',
    backgroundColor: GEAR_UI.slotEmptyBg,
  },
  filled: { backgroundColor: 'rgba(18, 53, 40, 0.65)' },
  selected: {
    borderColor: GEAR_UI.accent,
    backgroundColor: GEAR_UI.slotSelected,
    shadowColor: GEAR_UI.accent,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.55,
    shadowRadius: 8,
    elevation: 6,
  },
  mythic: {
    borderWidth: 3,
    shadowColor: '#e84393',
    shadowOpacity: 0.4,
    shadowRadius: 10,
  },
  icon: { fontSize: 20, marginBottom: 2 },
  lbl: {
    fontSize: 9,
    fontWeight: '900',
    color: GEAR_UI.muted,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  name: {
    fontSize: 9,
    fontWeight: '900',
    textAlign: 'center',
    marginTop: 3,
    maxWidth: '100%',
  },
  emptyTxt: { fontSize: 9, fontWeight: '800', color: GEAR_UI.sub, marginTop: 4 },
});
