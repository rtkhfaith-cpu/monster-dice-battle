import React from 'react';
import { StyleSheet, Text, TouchableOpacity } from 'react-native';
import { GEAR_UI } from '../gearUiTheme';

export default function PetSlotBox({ pet, selected, onPress, compact }) {
  return (
    <TouchableOpacity
      activeOpacity={0.9}
      onPress={onPress}
      style={[
        styles.box,
        compact && styles.compact,
        pet ? styles.filled : styles.empty,
        selected && styles.selected,
      ]}
    >
      <Text style={styles.icon}>{pet ? pet.emoji : '🐾'}</Text>
      {pet ? (
        <>
          <Text style={styles.name} numberOfLines={1}>
            {pet.name}
          </Text>
          <Text style={[styles.metaLine, { color: pet.rarityColor ?? GEAR_UI.sub }]} numberOfLines={1}>
            Lv {pet.level} · {pet.rarity}
          </Text>
        </>
      ) : (
        <>
          <Text style={styles.lbl}>Pet</Text>
          <Text style={styles.emptyTxt}>Empty</Text>
        </>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  box: {
    width: 96,
    maxWidth: 96,
    height: 84,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: GEAR_UI.slotEmptyBorder,
    paddingVertical: 4,
    paddingHorizontal: 4,
    alignItems: 'center',
    backgroundColor: GEAR_UI.panelDeep,
  },
  compact: { width: 86, maxWidth: 86, height: 76 },
  empty: { borderStyle: 'dashed', backgroundColor: GEAR_UI.slotEmptyBg },
  filled: { borderColor: '#86efac', backgroundColor: 'rgba(18, 53, 40, 0.65)' },
  selected: {
    borderColor: GEAR_UI.accent,
    backgroundColor: GEAR_UI.slotSelected,
    shadowColor: GEAR_UI.accent,
    shadowOpacity: 0.5,
    shadowRadius: 8,
    elevation: 5,
  },
  icon: { fontSize: 22 },
  lbl: { fontSize: 9, fontWeight: '900', color: GEAR_UI.muted, textTransform: 'uppercase', marginTop: 2 },
  name: { fontSize: 9, fontWeight: '900', color: GEAR_UI.title, marginTop: 2, textAlign: 'center' },
  metaLine: { fontSize: 8, fontWeight: '900', textTransform: 'uppercase', marginTop: 1, textAlign: 'center' },
  emptyTxt: { fontSize: 9, fontWeight: '800', color: GEAR_UI.sub, marginTop: 4 },
});
