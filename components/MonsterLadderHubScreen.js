import React, { useMemo } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import MonsterPreview from './MonsterPreview';
import { ART, gamePanelStyle } from '../utils/artDirection';
import { LOBBY } from '../utils/gameTheme';
import { RARITY_UI } from '../utils/monsterTemplates';
import { getLadderMonsterTemplate } from '../utils/monsterLadder/ladderMonsterCatalog';
import { getLadderTheme } from '../utils/monsterLadder/ladderLevelThemes';
import {
  formatStageLabel,
  getCurrentStage,
  getStageKind,
  nextRewardHints,
} from '../utils/monsterLadder';
import { getLadderRewardDayKey } from '../utils/monsterLadder/ladderDailyReset';
import { fighterFromLadderOwned } from '../utils/monsterLadder/ladderFighters';

function StageNode({ sub, current, cleared, kind }) {
  const isBoss = kind === 'miniBoss' || kind === 'bigBoss';
  return (
    <View
      style={[
        styles.node,
        current && styles.nodeCurrent,
        cleared && styles.nodeCleared,
        isBoss && styles.nodeBoss,
      ]}
    >
      <Text style={styles.nodeTxt}>{sub}</Text>
      {kind === 'miniBoss' ? <Text style={styles.nodeIcon}>🎁</Text> : null}
      {kind === 'bigBoss' ? <Text style={styles.nodeIcon}>🥚</Text> : null}
    </View>
  );
}

export default function MonsterLadderHubScreen({
  profileName,
  monsterLadder,
  onBack,
  onStartBattle,
  onOpenCollection,
  onOpenGear,
}) {
  const ml = monsterLadder;
  const stage = useMemo(() => getCurrentStage(ml), [ml]);
  const theme = useMemo(() => getLadderTheme(stage.mainLevel), [stage.mainLevel]);
  const hints = useMemo(() => nextRewardHints(ml), [ml]);

  const activeOm = ml.ownedMonsters.find((m) => m.id === ml.activeMonsterId);
  const activeFighter = activeOm ? fighterFromLadderOwned(activeOm) : null;
  const featuredTpl = getLadderMonsterTemplate(theme.featuredMonsterId);

  const canFight = !!activeFighter;

  return (
    <View style={styles.root}>
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backBtn}>
          <Text style={styles.backTxt}>← Home</Text>
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.title}>Monster Ladder</Text>
          <Text style={styles.subtitle}>Separate progression · ladder monsters only</Text>
        </View>
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollInner}>
        <View style={styles.heroPanel}>
          <Text style={styles.handler}>
            Handler <Text style={styles.strong}>{profileName || '—'}</Text>
          </Text>
          <Text style={styles.stageBig}>
            Stage {formatStageLabel(stage.mainLevel, stage.subLevel)}
            <Text style={styles.stageIdx}> · {stage.stageIndex}/250</Text>
          </Text>
          <Text style={styles.themeName}>{theme.name}</Text>
          <Text style={styles.themeTag}>{featuredTpl?.name ?? '—'} region</Text>

          <View style={styles.currencyRow}>
            <Text style={styles.currency}>🪙 Ladder gold: {ml.ladderGold}</Text>
            <Text style={styles.currency}>💎 Shards: {ml.ladderShards}</Text>
          </View>
        </View>

        <View style={styles.mapPanel}>
          <Text style={styles.panelTitle}>Current level — 10 sub-stages</Text>
          <View style={styles.nodeRow}>
            {Array.from({ length: 10 }, (_, i) => {
              const sub = i + 1;
              const kind = getStageKind(sub);
              return (
                <StageNode
                  key={sub}
                  sub={sub}
                  kind={kind}
                  current={sub === stage.subLevel}
                  cleared={sub < stage.subLevel}
                />
              );
            })}
          </View>
          <Text style={styles.mapHint}>
            {hints.subsToMini > 0
              ? `Gear chest in ${hints.subsToMini} fight${hints.subsToMini > 1 ? 's' : ''} (sub 5)`
              : hints.subsToBig > 0
                ? `Monster chest in ${hints.subsToBig} fight${hints.subsToBig > 1 ? 's' : ''} (sub 10)`
                : 'Boss rewards on this row complete'}
          </Text>
        </View>

        <View style={styles.dailyPanel}>
          <Text style={styles.panelTitle}>Daily chests (resets 6PM Singapore)</Text>
          <Text style={styles.dailyKey}>Today: {getLadderRewardDayKey()}</Text>
          <View style={styles.dailyRow}>
            <Text style={styles.dailyItem}>
              🎁 Gear chest: {ml.gearChestClaimedToday ? 'claimed' : 'available'}
            </Text>
            <Text style={styles.dailyItem}>
              🥚 Monster chest: {ml.monsterChestClaimedToday ? 'claimed' : 'available'}
            </Text>
          </View>
        </View>

        <View style={styles.activePanel}>
          <Text style={styles.panelTitle}>Active ladder monster</Text>
          {activeFighter ? (
            <View style={styles.activeRow}>
              <MonsterPreview parts={activeFighter.monsterParts} size={72} mood="happy" />
              <View style={styles.activeMeta}>
                <Text style={styles.activeName}>{activeFighter.displayName}</Text>
                <Text style={styles.activeSub}>
                  Lv {activeFighter.level} · {RARITY_UI[activeFighter.rarity]?.label ?? activeFighter.rarity}
                </Text>
              </View>
            </View>
          ) : (
            <Text style={styles.missing}>No ladder monster equipped. Open your collection.</Text>
          )}
          {onOpenCollection ? (
            <View style={styles.inlineActions}>
              <TouchableOpacity style={styles.secondaryBtn} onPress={onOpenCollection}>
                <Text style={styles.secondaryTxt}>Ladder collection</Text>
              </TouchableOpacity>
              {onOpenGear ? (
                <TouchableOpacity style={styles.secondaryBtn} onPress={onOpenGear}>
                  <Text style={styles.secondaryTxt}>Ladder gear</Text>
                </TouchableOpacity>
              ) : null}
            </View>
          ) : null}
        </View>

        <View style={styles.silhouettePanel}>
          <Text style={styles.panelTitle}>Featured exclusives</Text>
          <View style={styles.silhouetteRow}>
            {[theme.featuredMonsterId, ...(theme.gruntPool || [])].slice(0, 4).map((id) => {
              const t = getLadderMonsterTemplate(id);
              const owned = ml.ownedMonsters.some((m) => m.templateId === id);
              return (
                <View key={id} style={[styles.silhouette, !owned && styles.silhouetteLocked]}>
                  <Text style={styles.silhouetteEmoji}>{owned ? '✨' : '❔'}</Text>
                  <Text style={styles.silhouetteName} numberOfLines={1}>
                    {t?.name ?? id}
                  </Text>
                </View>
              );
            })}
          </View>
        </View>

        <View style={styles.assistPanel}>
          <Text style={styles.assistTitle}>Assist (coming soon)</Text>
          <Text style={styles.assistSub}>Borrow a friend monster · mercenary assist · helper fame</Text>
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.startBtn, !canFight && styles.startOff]}
          disabled={!canFight}
          onPress={onStartBattle}
        >
          <Text style={styles.startTxt}>Start Ladder Battle</Text>
        </TouchableOpacity>
        {!canFight ? (
          <Text style={styles.footerHint}>Equip a ladder monster from your collection first.</Text>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, minHeight: 0 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 2,
    borderBottomColor: LOBBY.panelBorder,
    backgroundColor: '#1a1a2e',
  },
  backBtn: { paddingVertical: 6, paddingRight: 12 },
  backTxt: { fontWeight: '800', fontSize: 15, color: '#74b9ff' },
  headerCenter: { flex: 1 },
  title: { fontWeight: '900', fontSize: 20, color: '#fff' },
  subtitle: { fontWeight: '700', fontSize: 11, color: '#a29bfe', marginTop: 2 },
  scroll: { flex: 1, minHeight: 0 },
  scrollInner: { padding: 12, gap: 12, paddingBottom: 20 },
  heroPanel: {
    padding: 14,
    ...gamePanelStyle('#6c5ce7'),
    gap: 6,
  },
  handler: { fontWeight: '700', fontSize: 14, color: ART.textInk },
  strong: { fontWeight: '900', color: '#6c5ce7' },
  stageBig: { fontWeight: '900', fontSize: 22, color: ART.textInk, marginTop: 4 },
  stageIdx: { fontWeight: '800', fontSize: 14, color: ART.textMuted },
  themeName: { fontWeight: '900', fontSize: 16, color: '#4834d4' },
  themeTag: { fontWeight: '700', fontSize: 12, color: ART.textMuted },
  currencyRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginTop: 8 },
  currency: { fontWeight: '800', fontSize: 13, color: '#2d3436' },
  mapPanel: {
    padding: 12,
    borderRadius: ART.radiusMd,
    borderWidth: 2,
    borderColor: LOBBY.panelBorder,
    backgroundColor: '#fff',
    gap: 8,
  },
  panelTitle: { fontWeight: '900', fontSize: 13, color: ART.textInk, textTransform: 'uppercase' },
  nodeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, justifyContent: 'center' },
  node: {
    width: 30,
    height: 36,
    borderRadius: 8,
    backgroundColor: '#dfe6e9',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#b2bec3',
  },
  nodeCurrent: { backgroundColor: '#ffeaa7', borderColor: '#e17055', borderWidth: 2 },
  nodeCleared: { backgroundColor: '#d5f5e3', borderColor: '#27ae60' },
  nodeBoss: { width: 34 },
  nodeTxt: { fontWeight: '900', fontSize: 11, color: '#2d3436' },
  nodeIcon: { fontSize: 8 },
  mapHint: { fontWeight: '700', fontSize: 12, color: '#636e72', textAlign: 'center' },
  dailyPanel: {
    padding: 12,
    borderRadius: ART.radiusMd,
    backgroundColor: 'rgba(108, 92, 231, 0.12)',
    borderWidth: 1,
    borderColor: '#a29bfe',
    gap: 6,
  },
  dailyKey: { fontWeight: '700', fontSize: 11, color: '#636e72' },
  dailyRow: { gap: 4 },
  dailyItem: { fontWeight: '800', fontSize: 13, color: '#2d3436' },
  activePanel: {
    padding: 12,
    borderRadius: ART.radiusMd,
    borderWidth: 2,
    borderColor: LOBBY.panelBorder,
    backgroundColor: '#fff',
    gap: 8,
  },
  activeRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  activeMeta: { flex: 1 },
  activeName: { fontWeight: '900', fontSize: 16, color: ART.textInk },
  activeSub: { fontWeight: '700', fontSize: 12, color: ART.textMuted, marginTop: 2 },
  missing: { fontWeight: '800', fontSize: 13, color: ART.danger },
  secondaryBtn: {
    alignSelf: 'flex-start',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: LOBBY.chip,
    borderWidth: 1,
    borderColor: LOBBY.cardBorder,
  },
  inlineActions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  secondaryTxt: { fontWeight: '900', fontSize: 13, color: LOBBY.textStrong },
  silhouettePanel: {
    padding: 12,
    borderRadius: ART.radiusMd,
    backgroundColor: '#1a1a2e',
    gap: 8,
  },
  silhouetteRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  silhouette: {
    flex: 1,
    minWidth: '40%',
    padding: 8,
    borderRadius: 8,
    backgroundColor: 'rgba(162, 155, 254, 0.25)',
    alignItems: 'center',
  },
  silhouetteLocked: { opacity: 0.55 },
  silhouetteEmoji: { fontSize: 22 },
  silhouetteName: { fontWeight: '800', fontSize: 10, color: '#dfe6e9', marginTop: 4 },
  assistPanel: {
    padding: 10,
    borderRadius: 8,
    borderStyle: 'dashed',
    borderWidth: 1,
    borderColor: '#95a5a6',
  },
  assistTitle: { fontWeight: '900', fontSize: 12, color: '#636e72' },
  assistSub: { fontWeight: '700', fontSize: 11, color: '#95a5a6', marginTop: 2 },
  footer: {
    padding: 12,
    borderTopWidth: 2,
    borderTopColor: LOBBY.panelBorder,
    backgroundColor: '#1a1a2e',
    gap: 6,
  },
  startBtn: {
    backgroundColor: '#6c5ce7',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#4834d4',
  },
  startOff: { opacity: 0.45 },
  startTxt: { color: '#fff', fontWeight: '900', fontSize: 17 },
  footerHint: { textAlign: 'center', fontWeight: '700', fontSize: 11, color: '#bdc3c7' },
});
