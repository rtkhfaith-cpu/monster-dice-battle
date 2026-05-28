import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { GEAR_UI } from '../gearUiTheme';

export default function SkillSlotPanel({ equippedPassives, slotLimit, selected, onPress, compact }) {
  const filled = equippedPassives?.length ?? 0;

  return (
    <TouchableOpacity
      activeOpacity={0.9}
      onPress={onPress}
      style={[styles.box, compact && styles.compact, selected && styles.selected]}
    >
      <Text style={styles.icon}>📜</Text>
      <Text style={styles.lbl}>Skills</Text>
      <Text style={styles.count}>
        {filled}/{slotLimit} equipped
      </Text>
      <View style={styles.slots}>
        {Array.from({ length: Math.max(slotLimit, 1) }, (_, i) => {
          const p = equippedPassives?.[i];
          return (
            <View key={`sk-${i}`} style={[styles.skillDot, p && styles.skillDotOn]}>
              <Text style={styles.skillDotTxt}>{p ? '★' : '·'}</Text>
            </View>
          );
        })}
      </View>
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
    borderColor: GEAR_UI.panelBorder,
    paddingVertical: 4,
    paddingHorizontal: 4,
    alignItems: 'center',
    backgroundColor: GEAR_UI.panelDeep,
  },
  compact: { width: 86, maxWidth: 86, height: 76 },
  selected: {
    borderColor: GEAR_UI.accent,
    backgroundColor: GEAR_UI.slotSelected,
    shadowColor: GEAR_UI.accent,
    shadowOpacity: 0.5,
    shadowRadius: 8,
    elevation: 5,
  },
  icon: { fontSize: 20 },
  lbl: { fontSize: 8, fontWeight: '900', color: GEAR_UI.muted, textTransform: 'uppercase', marginTop: 2 },
  count: { fontSize: 8, fontWeight: '800', color: GEAR_UI.sub, marginTop: 4, textAlign: 'center' },
  slots: { flexDirection: 'row', gap: 4, marginTop: 6 },
  skillDot: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 1,
    borderColor: GEAR_UI.slotEmptyBorder,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: GEAR_UI.slotEmptyBg,
  },
  skillDotOn: { borderColor: '#c4b5fd', backgroundColor: 'rgba(92, 57, 143, 0.5)' },
  skillDotTxt: { fontSize: 10, fontWeight: '900', color: GEAR_UI.title },
});
