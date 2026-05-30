import React, { useMemo } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import MonsterPreview from '../../MonsterPreview';
import { getLadderMonsterTemplate } from '../../../utils/monsterLadder/ladderMonsterCatalog';
import { getMonsterTemplate, rarityRank, ROLE_LABELS } from '../../../utils/monsterTemplates';
import { rosterInstancesForTemplate } from '../../../utils/rosterInventory';
import {
  clampMergeTier,
  mergeCostForNextTier,
  MAX_MERGE_TIER,
  pickPrimaryInstance,
} from '../../../utils/mergeSystem';
import { GEAR_UI, gearRarityUi } from '../gearUiTheme';

function templateFor(templateId) {
  return getMonsterTemplate(templateId) ?? getLadderMonsterTemplate(templateId);
}

function rarityBorderColor(templateId) {
  return gearRarityUi(templateFor(templateId)?.rarity ?? 'common').border;
}

function roleLabel(templateId) {
  const role = templateFor(templateId)?.role ?? 'balanced';
  if (ROLE_LABELS[role]) return ROLE_LABELS[role];
  return String(role)
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

export default function MonsterSelectorRow({
  monsters,
  allOwnedMonsters,
  selectedId,
  battleMonsterId,
  onSelect,
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
  const decorated = useMemo(
    () => sorted.map((m) => ({
      ...m,
      chipBorderColor: rarityBorderColor(m.templateId),
      chipRoleLabel: roleLabel(m.templateId),
    })),
    [sorted],
  );
  const mergeInfoBySpecies = useMemo(() => {
    const map = new Map();
    const roster = allOwnedMonsters ?? [];
    for (const m of decorated) {
      const speciesInstances = rosterInstancesForTemplate(roster, m.templateId);
      const primary = pickPrimaryInstance(speciesInstances) ?? m;
      const mergeTier = clampMergeTier(primary.mergeTier);
      const nextCost = mergeCostForNextTier(mergeTier);
      const extras = Math.max(0, speciesInstances.length - 1);
      map.set(m.templateId, {
        primaryId: primary.id,
        mergeTier,
        nextCost,
        extras,
        canMerge: nextCost != null && extras >= nextCost,
        isMax: mergeTier >= MAX_MERGE_TIER,
      });
    }
    return map;
  }, [allOwnedMonsters, decorated]);

  if (!monsters?.length) return null;

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={styles.scroll}
      contentContainerStyle={styles.content}
    >
      {decorated.map((m) => {
        const on = m.id === selectedId;
        const forBattle = battleMonsterId && m.id === battleMonsterId;
        const mergeInfo = mergeInfoBySpecies.get(m.templateId) ?? null;
        // Show the merge button whenever the player owns a spare duplicate of this
        // species (extras > 0) — even if not yet enough for the next tier — so the
        // merge option (Merge +N or "Need X copies") is never hidden. Also show on
        // the selected chip for context.
        const showMerge = !!onMergeMonster && !!mergeInfo
          && (on || mergeInfo.canMerge || mergeInfo.extras > 0);
        return (
          <View
            key={m.id}
            style={[
              styles.chip,
              { borderColor: m.chipBorderColor },
              mergeInfo?.canMerge && styles.chipMergeReady,
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
              {mergeInfo && (mergeInfo.mergeTier > 0 || mergeInfo.isMax) ? (
                <View style={styles.tierBadge}>
                  <Text style={styles.tierBadgeTxt}>
                    {mergeInfo.isMax ? 'MAX' : `+${mergeInfo.mergeTier}`}
                  </Text>
                </View>
              ) : null}
              <MonsterPreview parts={m.monsterParts} size={32} mood="happy" />
              <Text style={[styles.name, on && styles.nameOn]} numberOfLines={1}>
                {m.nickname || m.templateId}
              </Text>
              <Text style={[styles.role, on && styles.roleOn]} numberOfLines={1}>
                {m.chipRoleLabel}
              </Text>
              <Text style={[styles.mergeTierLine, on && styles.mergeTierLineOn]} numberOfLines={1}>
                {mergeInfo?.isMax ? 'Merge MAX' : `Merge +${mergeInfo?.mergeTier ?? 0}`}
              </Text>
              {forBattle ? <Text style={styles.battleLbl}>Battle</Text> : null}
            </TouchableOpacity>
            {showMerge ? (
              <TouchableOpacity
                style={[
                  styles.mergeBtn,
                  !mergeInfo.canMerge && styles.mergeBtnNeed,
                ]}
                onPress={() => onMergeMonster(mergeInfo.primaryId)}
                activeOpacity={0.86}
              >
                <Text style={styles.mergeBtnTxt}>
                  {mergeInfo.isMax
                    ? 'MAX'
                    : mergeInfo.canMerge
                      ? `Merge +${mergeInfo.mergeTier + 1}`
                      : `Need ${mergeInfo.nextCost ?? '-'}`}
                </Text>
                {!mergeInfo.isMax ? (
                  <Text style={styles.mergeMetaTxt}>
                    {mergeInfo.extras}/{mergeInfo.nextCost ?? '-'} copies
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
  scroll: { maxHeight: 168, marginBottom: 6 },
  content: { gap: 6, paddingHorizontal: 2, paddingBottom: 4, alignItems: 'flex-start' },
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
  chipMergeReady: {
    borderColor: '#fcd34d',
    shadowColor: '#f59e0b',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 6,
    elevation: 4,
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
  role: { fontSize: 8, fontWeight: '900', color: '#c4b5fd', marginTop: 1, maxWidth: 66 },
  roleOn: { color: '#e9d5ff' },
  mergeTierLine: { fontSize: 8, fontWeight: '900', color: '#fcd34d', marginTop: 1, maxWidth: 66 },
  mergeTierLineOn: { color: '#fde68a' },
  tierBadge: {
    position: 'absolute',
    top: 2,
    left: 2,
    zIndex: 2,
    minWidth: 16,
    paddingHorizontal: 3,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#9333ea',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  tierBadgeTxt: { fontSize: 8, fontWeight: '900', color: '#fff' },
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
