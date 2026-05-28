import React, { useMemo } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity } from 'react-native';
import MonsterPreview from '../../MonsterPreview';
import { getMonsterTemplate, rarityRank } from '../../../utils/monsterTemplates';
import { GEAR_UI, gearRarityUi } from '../gearUiTheme';

function rarityBorderColor(templateId) {
  const tpl = getMonsterTemplate(templateId);
  return gearRarityUi(tpl?.rarity ?? 'common').border;
}

export default function MonsterSelectorRow({ monsters, selectedId, onSelect }) {
  const sorted = useMemo(() => {
    if (!monsters?.length) return [];
    return [...monsters].sort((a, b) => {
      const ra = rarityRank(getMonsterTemplate(a.templateId)?.rarity ?? 'common');
      const rb = rarityRank(getMonsterTemplate(b.templateId)?.rarity ?? 'common');
      if (rb !== ra) return rb - ra;
      return (b.level ?? 0) - (a.level ?? 0);
    });
  }, [monsters]);

  if (!monsters?.length || monsters.length < 2) return null;

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={styles.scroll}
      contentContainerStyle={styles.content}
    >
      {sorted.map((m) => {
        const on = m.id === selectedId;
        const borderColor = rarityBorderColor(m.templateId);
        return (
          <TouchableOpacity
            key={m.id}
            style={[
              styles.chip,
              { borderColor },
              on && styles.chipOn,
            ]}
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
    backgroundColor: GEAR_UI.panel,
    minWidth: 60,
  },
  chipOn: {
    backgroundColor: GEAR_UI.setActive,
    borderWidth: 3,
    shadowColor: GEAR_UI.accent,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.45,
    shadowRadius: 6,
    elevation: 4,
  },
  name: { fontSize: 9, fontWeight: '900', color: GEAR_UI.sub, marginTop: 2, maxWidth: 64 },
  nameOn: { color: GEAR_UI.title },
});
