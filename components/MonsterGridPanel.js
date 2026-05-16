import React from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import MonsterPreview from './MonsterPreview';
import { expToAdvanceFrom } from '../utils/expLevel';
import { fighterFromOwned } from '../utils/fighterFromOwned';
import { getMonsterTemplate, RARITY_UI, ROLE_LABELS } from '../utils/monsterTemplates';
import { LOBBY, panelShadow } from '../utils/gameTheme';

/**
 * Compact monster grid for lobby right column.
 */
export default function MonsterGridPanel({
  wallet,
  slotLabel,
  gameMode = 'twoPlayer',
  selectedP1Id,
  selectedP2Id,
  onSelectMonster,
  embedInScroll = false,
}) {
  const monsters = wallet?.ownedMonsters ?? [];
  const is1P = gameMode === 'onePlayer';
  const GridWrap = embedInScroll ? View : ScrollView;
  const gridWrapProps = embedInScroll
    ? { style: styles.gridEmbed }
    : {
        style: styles.scroll,
        contentContainerStyle: styles.grid,
        showsVerticalScrollIndicator: false,
        nestedScrollEnabled: true,
        keyboardShouldPersistTaps: 'handled',
      };

  return (
    <View style={[styles.panel, embedInScroll && styles.panelEmbed]}>
      <Text style={styles.panelTitle}>Your Monsters</Text>
      <Text style={styles.subTitle} numberOfLines={1}>
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
          <Text style={styles.emptyTxt}>No monsters yet! Open Monster Mart from the top menu.</Text>
        </View>
      ) : (
        <GridWrap {...gridWrapProps}>
          {monsters.map((om) => {
            const f = fighterFromOwned(om);
            const t = getMonsterTemplate(om.templateId);
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

            return (
              <TouchableOpacity
                key={om.id}
                style={[styles.tile, picked && styles.tileOn]}
                onPress={() => onSelectMonster(om.id)}
                activeOpacity={0.9}
              >
                <View style={styles.visWrap}>
                  <MonsterPreview parts={f.monsterParts} size={72} mood="happy" />
                </View>
                <Text style={styles.monName} numberOfLines={1}>
                  {om.nickname || t.name}
                </Text>
                <Text style={styles.stat}>HP {hp} · MP {f.stats.mp}</Text>
                <Text style={styles.stat}>{ROLE_LABELS[t.role] ?? t.role}</Text>
                <Text style={styles.stat}>
                  Lv {om.level} · EXP {om.exp ?? 0}/{expNeed}
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
    backgroundColor: LOBBY.panel,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: LOBBY.panelBorder,
    padding: 8,
    ...panelShadow,
  },
  panelTitle: {
    fontWeight: '900',
    fontSize: 15,
    color: LOBBY.textStrong,
    textAlign: 'center',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  subTitle: {
    fontWeight: '700',
    fontSize: 12,
    color: '#4a5568',
    textAlign: 'center',
    marginBottom: 6,
  },
  subStrong: { fontWeight: '900', color: LOBBY.coin },
  panelEmbed: {
    flex: 0,
    flexGrow: 0,
    minHeight: 0,
  },
  scroll: { flex: 1, minHeight: 0 },
  gridEmbed: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 8,
    paddingBottom: 4,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 8,
    paddingBottom: 4,
  },
  tile: {
    width: '47%',
    maxWidth: 168,
    minWidth: 130,
    minHeight: 44,
    backgroundColor: LOBBY.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: LOBBY.cardBorder,
    padding: 6,
    alignItems: 'center',
  },
  tileOn: {
    borderColor: LOBBY.accentStrong,
    backgroundColor: '#eefaf3',
    borderWidth: 2,
    shadowColor: LOBBY.accentStrong,
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
  monName: {
    fontWeight: '900',
    fontSize: 14,
    color: '#1b1b2f',
    marginTop: 2,
    textAlign: 'center',
  },
  stat: {
    fontWeight: '700',
    fontSize: 11,
    color: '#4a5568',
    textAlign: 'center',
    marginTop: 2,
  },
  rarity: {
    fontWeight: '900',
    fontSize: 11,
    marginTop: 3,
  },
  pickTag: {
    marginTop: 4,
    fontWeight: '900',
    fontSize: 11,
    color: '#fff',
    backgroundColor: LOBBY.accentStrong,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    overflow: 'hidden',
  },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 16 },
  emptyEmoji: { fontSize: 48 },
  emptyTxt: { fontWeight: '800', fontSize: 14, color: '#4a5568', textAlign: 'center', marginTop: 8 },
});
