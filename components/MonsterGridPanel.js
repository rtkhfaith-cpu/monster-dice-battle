import React from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import MonsterPreview from './MonsterPreview';
import { expToAdvanceFrom } from '../utils/expLevel';
import { evolutionFormForMonster } from '../utils/monsterEvolutionForms';
import { visualFormTierFromLevel } from '../utils/evolution';
import { fighterFromOwned } from '../utils/fighterFromOwned';
import { getMonsterTemplate, RARITY_UI, ROLE_LABELS } from '../utils/monsterTemplates';
import { getLadderMonsterTemplate } from '../utils/monsterLadder/ladderMonsterCatalog';
import { gamePanelStyle } from '../utils/artDirection';
import { LOBBY } from '../utils/gameTheme';

/**
 * Monster roster grid — mobile: 2 equal columns; desktop: flexible wrap.
 */
export default function MonsterGridPanel({
  wallet,
  slotLabel,
  gameMode = 'twoPlayer',
  selectedP1Id,
  selectedP2Id,
  onSelectMonster,
  embedInScroll = false,
  isMobile = false,
}) {
  const monsters = wallet?.ownedMonsters ?? [];
  const is1P = gameMode === 'onePlayer';
  const previewSize = isMobile ? 58 : 72;
  const GridWrap = embedInScroll ? View : ScrollView;
  const gridWrapProps = embedInScroll
    ? { style: [styles.gridEmbed, isMobile && styles.gridMobile] }
    : {
        style: styles.scroll,
        contentContainerStyle: [styles.grid, isMobile && styles.gridMobile],
        showsVerticalScrollIndicator: false,
        nestedScrollEnabled: true,
        keyboardShouldPersistTaps: 'handled',
      };

  return (
    <View style={[styles.panel, embedInScroll && styles.panelEmbed, isMobile && styles.panelMobile]}>
      <Text style={[styles.panelTitle, isMobile && styles.panelTitleMobile]}>Your Monsters</Text>
      <Text style={[styles.subTitle, isMobile && styles.subTitleMobile]} numberOfLines={2}>
        {is1P ? (
          <>
            <Text style={styles.subStrong}>Pick your fighter</Text>
            {slotLabel ? ` · ${slotLabel}` : ''}
          </>
        ) : (
          <>
            For: <Text style={styles.subStrong}>{slotLabel || '—'}</Text>
          </>
        )}
      </Text>

      {monsters.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyEmoji}>🥚</Text>
          <Text style={[styles.emptyTxt, isMobile && styles.emptyTxtMobile]}>
            No monsters yet! Open Monster Mart from the shop section below.
          </Text>
        </View>
      ) : (
        <GridWrap {...gridWrapProps}>
          {monsters.map((om) => {
            const f = fighterFromOwned(om);
            const t = getMonsterTemplate(om.templateId) ?? getLadderMonsterTemplate(om.templateId);
            if (!f || !t) return null;
            const picked = is1P ? selectedP1Id === om.id : selectedP1Id === om.id || selectedP2Id === om.id;
            const tag = is1P
              ? picked
                ? 'Selected'
                : null
              : selectedP1Id === om.id && selectedP2Id === om.id
                ? 'Player 1 & 2'
                : selectedP1Id === om.id
                  ? 'Player 1'
                  : selectedP2Id === om.id
                    ? 'Player 2'
                    : null;
            const expNeed = expToAdvanceFrom(om.level);
            const hp = f.stats.hp;
            const form = evolutionFormForMonster(om.templateId, visualFormTierFromLevel(om.level));

            return (
              <TouchableOpacity
                key={om.id}
                style={[styles.tile, isMobile && styles.tileMobile, picked && styles.tileOn]}
                onPress={() => onSelectMonster(om.id)}
                activeOpacity={0.9}
              >
                <View style={[styles.visWrap, isMobile && styles.visWrapMobile]}>
                  <MonsterPreview parts={f.monsterParts} size={previewSize} mood="happy" />
                </View>
                <Text style={[styles.monName, isMobile && styles.monNameMobile]} numberOfLines={1}>
                  {om.nickname || t.name}
                </Text>
                <Text style={[styles.stat, isMobile && styles.statMobile]}>
                  HP {hp} · MP {f.stats.mp}
                </Text>
                <Text style={[styles.stat, isMobile && styles.statMobile]} numberOfLines={1}>
                  {ROLE_LABELS[t.role] ?? t.role} {f.isLadderMonster ? '· Ladder' : ''}
                </Text>
                <Text style={[styles.stat, isMobile && styles.statMobile]} numberOfLines={1}>
                  {form.name} · Lv {om.level}
                </Text>
                <Text style={[styles.stat, isMobile && styles.statMobile]} numberOfLines={1}>
                  {om.exp ?? 0}/{expNeed} EXP
                </Text>
                <Text style={[styles.rarity, { color: RARITY_UI[t.rarity].color || '#6c5ce7' }]}>
                  {RARITY_UI[t.rarity].label}
                </Text>
                {tag ? <Text style={styles.pickTag}>{tag}</Text> : null}
              </TouchableOpacity>
            );
          })}
        </GridWrap>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  panel: {
    flex: 1,
    minWidth: 0,
    minHeight: 0,
    padding: 12,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: '#d6a94c',
    backgroundColor: 'rgba(7, 18, 42, 0.9)',
    shadowColor: 'rgba(0,0,0,0.55)',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 7,
  },
  panelMobile: {
    flex: 0,
    flexGrow: 0,
    padding: 14,
    borderRadius: 16,
  },
  panelTitle: {
    fontWeight: '900',
    fontSize: 15,
    color: '#f8e7b5',
    textAlign: 'center',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  panelTitleMobile: { fontSize: 14 },
  subTitle: {
    fontWeight: '700',
    fontSize: 12,
    color: '#b8d9ff',
    textAlign: 'center',
    marginBottom: 8,
    paddingHorizontal: 4,
  },
  subTitleMobile: { fontSize: 12, marginBottom: 10, lineHeight: 17 },
  subStrong: { fontWeight: '900', color: '#87dfff' },
  panelEmbed: {
    flex: 0,
    flexGrow: 0,
    minHeight: 0,
  },
  scroll: { flex: 1, minHeight: 0 },
  gridEmbed: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 10,
    paddingBottom: 4,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 10,
    paddingBottom: 4,
  },
  gridMobile: {
    justifyContent: 'space-between',
    gap: 12,
  },
  tile: {
    width: '47%',
    maxWidth: 168,
    minWidth: 130,
    backgroundColor: 'rgba(13, 31, 69, 0.92)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(246,196,95,0.28)',
    padding: 8,
    alignItems: 'center',
  },
  tileMobile: {
    width: '48%',
    maxWidth: undefined,
    minWidth: 0,
    flexGrow: 0,
    flexShrink: 0,
    padding: 8,
    paddingBottom: 10,
  },
  tileOn: {
    borderColor: '#60d8ff',
    backgroundColor: 'rgba(31, 79, 149, 0.95)',
    borderWidth: 2,
    shadowColor: '#60d8ff',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 4,
  },
  visWrap: {
    height: 78,
    justifyContent: 'center',
    alignItems: 'center',
  },
  visWrapMobile: {
    height: 64,
  },
  monName: {
    fontWeight: '900',
    fontSize: 14,
    color: '#fff7d6',
    marginTop: 4,
    textAlign: 'center',
    width: '100%',
  },
  monNameMobile: { fontSize: 13 },
  stat: {
    fontWeight: '700',
    fontSize: 11,
    color: '#b8d9ff',
    textAlign: 'center',
    marginTop: 2,
    width: '100%',
  },
  statMobile: { fontSize: 10, lineHeight: 14 },
  rarity: {
    fontWeight: '900',
    fontSize: 11,
    marginTop: 3,
  },
  pickTag: {
    marginTop: 4,
    fontWeight: '900',
    fontSize: 10,
    color: '#fff',
    backgroundColor: '#1d9bd1',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    overflow: 'hidden',
  },
  empty: { alignItems: 'center', justifyContent: 'center', padding: 20 },
  emptyEmoji: { fontSize: 44 },
  emptyTxt: { fontWeight: '800', fontSize: 14, color: '#b8d9ff', textAlign: 'center', marginTop: 8 },
  emptyTxtMobile: { fontSize: 13, lineHeight: 19, paddingHorizontal: 8 },
});
