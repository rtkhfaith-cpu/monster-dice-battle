import React, { useMemo } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import MonsterPreview from '../../MonsterPreview';
import { getLadderMonsterTemplate } from '../../../utils/monsterLadder/ladderMonsterCatalog';
import { getMonsterTemplate, rarityRank } from '../../../utils/monsterTemplates';
import { GEAR_UI, gearRarityUi } from '../gearUiTheme';

function templateFor(templateId) {
  return getMonsterTemplate(templateId) ?? getLadderMonsterTemplate(templateId);
}

function rarityBorderColor(templateId) {
  return gearRarityUi(templateFor(templateId)?.rarity ?? 'common').border;
}

export default function MonsterSelectorRow({
  monsters,
  selectedId,
  battleMonsterId,
  onSelect,
  selectedMergeInfo = null,
  onMergeMonster,
}) {
  const sorted = useMemo(() => {
    if (!monsters?.length) return [];
    return [...monsters].sort((a, b) => {
      const ra = rarityRank(templateFor(a.templateId)?.rarity ?? 'common');
      const rb = rarityRank(templateFor(b.templateId)?.rarity ?? 'common');
      if (rb !== ra) return rb - ra;
      return (b.level ?? 0) - (a.level ?? 0);
    });
  }, [monsters]);

  if (!monsters?.length) return null;

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={styles.scroll}
      contentContainerStyle={styles.content}
    >
      {sorted.map((m) => {
        const on = m.id === selectedId;
        const forBattle = battleMonsterId && m.id === battleMonsterId;
        const borderColor = rarityBorderColor(m.templateId);
        const showMerge = on && selectedMergeInfo && onMergeMonster;
        return (
          <View
            key={m.id}
            style={[
              styles.chip,
              { borderColor },
              on && styles.chipOn,
            ]}
          >
            <TouchableOpacity
              style={styles.selectTap}
              onPress={() => onSelect?.(m.id)}
              activeOpacity={0.88}
            >
              {forBattle ? (
                <View style={styles.battleBadge}>
                  <Text style={styles.battleBadgeTxt}>⚔</Text>
                </View>
              ) : null}
              <MonsterPreview parts={m.monsterParts} size={32} mood="happy" />
              <Text style={[styles.name, on && styles.nameOn]} numberOfLines={1}>
                {m.nickname || m.templateId}
              </Text>
              {forBattle ? <Text style={styles.battleLbl}>Battle</Text> : null}
            </TouchableOpacity>
            {showMerge ? (
              <TouchableOpacity
                style={[
                  styles.mergeBtn,
                  !selectedMergeInfo.canMerge && styles.mergeBtnNeed,
                ]}
                onPress={() => onMergeMonster(selectedMergeInfo.primaryId)}
                activeOpacity={0.86}
              >
                <Text style={styles.mergeBtnTxt}>
                  {selectedMergeInfo.isMax
                    ? 'MAX'
                    : selectedMergeInfo.canMerge
                      ? `Merge +${selectedMergeInfo.mergeTier + 1}`
                      : `Need ${selectedMergeInfo.nextCost ?? '-'}`}
                </Text>
                {!selectedMergeInfo.isMax ? (
                  <Text style={styles.mergeMetaTxt}>
                    {selectedMergeInfo.extras}/{selectedMergeInfo.nextCost ?? '-'} copies
                  </Text>
                ) : null}
              </TouchableOpacity>
            ) : null}
          </View>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { maxHeight: 98, marginBottom: 6 },
  content: { gap: 6, paddingHorizontal: 2 },
  chip: {
    alignItems: 'center',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 10,
    borderWidth: 2,
    backgroundColor: GEAR_UI.panel,
    minWidth: 60,
    position: 'relative',
  },
  selectTap: { alignItems: 'center' },
  battleBadge: {
    position: 'absolute',
    top: 2,
    right: 4,
    zIndex: 2,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: GEAR_UI.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  battleBadgeTxt: { fontSize: 8, fontWeight: '900' },
  battleLbl: { fontSize: 7, fontWeight: '900', color: GEAR_UI.accent, marginTop: 1 },
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
  mergeBtn: {
    marginTop: 4,
    borderRadius: 999,
    backgroundColor: '#a855f7',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.55)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    alignItems: 'center',
    minWidth: 70,
  },
  mergeBtnNeed: {
    backgroundColor: 'rgba(71, 85, 105, 0.95)',
  },
  mergeBtnTxt: { color: '#fff', fontWeight: '900', fontSize: 9 },
  mergeMetaTxt: { color: '#e9d5ff', fontWeight: '900', fontSize: 7, marginTop: 1 },
});
