import React from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import MonsterPreview from '../../MonsterPreview';
import { GEAR_UI } from '../gearUiTheme';

export default function MonsterSelectorRow({ monsters, selectedId, onSelect }) {
  if (!monsters?.length || monsters.length < 2) return null;

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={styles.scroll}
      contentContainerStyle={styles.content}
    >
      {monsters.map((m) => {
        const on = m.id === selectedId;
        return (
          <TouchableOpacity
            key={m.id}
            style={[styles.chip, on && styles.chipOn]}
            onPress={() => onSelect?.(m.id)}
            activeOpacity={0.88}
          >
            <MonsterPreview parts={m.monsterParts} size={32} mood="happy" />
            <Text style={[styles.name, on && styles.nameOn]} numberOfLines={1}>
              {m.nickname || m.templateId}
            </Text>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { maxHeight: 64, marginBottom: 6 },
  content: { gap: 6, paddingHorizontal: 2 },
  chip: {
    alignItems: 'center',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: GEAR_UI.panelBorder,
    backgroundColor: GEAR_UI.panel,
    minWidth: 60,
  },
  chipOn: {
    borderColor: GEAR_UI.accent,
    backgroundColor: GEAR_UI.setActive,
  },
  name: { fontSize: 9, fontWeight: '900', color: GEAR_UI.sub, marginTop: 2, maxWidth: 64 },
  nameOn: { color: GEAR_UI.title },
});
