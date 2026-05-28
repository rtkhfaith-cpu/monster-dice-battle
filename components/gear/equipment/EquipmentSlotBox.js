import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { formatGearStatLines } from '../../../src/gameSystems/gear/gearGenerator';
import { GEAR_UI, SLOT_ICONS, emojiForGear, gearRarityUi, isMythicRarity } from '../gearUiTheme';

export default function EquipmentSlotBox({
  label,
  slotKey,
  gear,
  selected,
  onPress,
  compact,
}) {
  const ui = gear ? gearRarityUi(gear.rarity) : null;
  const mythic = gear && isMythicRarity(gear.rarity);

  return (
    <TouchableOpacity
      activeOpacity={0.9}
      onPress={onPress}
      style={[
        styles.box,
        compact && styles.boxCompact,
        gear ? styles.filled : styles.empty,
        gear && { borderColor: ui.border },
        selected && styles.selected,
        mythic && styles.mythic,
      ]}
    >
      <Text style={styles.icon}>{gear ? emojiForGear(gear) : SLOT_ICONS[slotKey] ?? '◆'}</Text>
      <Text style={styles.lbl}>{label}</Text>
      {gear ? (
        <>
          <Text style={[styles.name, { color: ui.color }]} numberOfLines={2}>
            {gear.name}
          </Text>
          {gear.sockets?.length ? (
            <Text style={styles.socket}>◇ {gear.sockets.length}</Text>
          ) : null}
          <Text style={styles.statHint} numberOfLines={1}>
            {formatGearStatLines(gear.stats).join(' · ')}
          </Text>
        </>
      ) : (
        <Text style={styles.emptyTxt}>Empty</Text>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  box: {
    width: 88,
    minHeight: 92,
    borderRadius: 12,
    borderWidth: 2,
    paddingVertical: 6,
    paddingHorizontal: 4,
    alignItems: 'center',
    justifyContent: 'flex-start',
    backgroundColor: GEAR_UI.panelDeep,
  },
  boxCompact: { width: 76, minHeight: 84 },
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
    fontSize: 8,
    fontWeight: '900',
    color: GEAR_UI.muted,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  name: { fontSize: 9, fontWeight: '900', textAlign: 'center', marginTop: 3 },
  socket: { fontSize: 8, fontWeight: '900', color: GEAR_UI.coins, marginTop: 2 },
  statHint: { fontSize: 7, fontWeight: '800', color: GEAR_UI.statPos, marginTop: 2, textAlign: 'center' },
  emptyTxt: { fontSize: 9, fontWeight: '800', color: GEAR_UI.sub, marginTop: 6 },
});
