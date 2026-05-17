import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import MonsterPreview from './MonsterPreview';
import { fighterFromOwned } from '../utils/fighterFromOwned';
import { getMonsterTemplate } from '../utils/monsterTemplates';
import { getLadderMonsterTemplate } from '../utils/monsterLadder/ladderMonsterCatalog';
import { MAX_PLAYER_PROFILES } from '../utils/gameStorage';
import { useReadableType } from '../utils/readableType';

function profileMonsterRow(profile) {
  const om =
    profile.ownedMonsters?.find((x) => x.id === profile.selectedMonsterId) ??
    profile.ownedMonsters?.[0] ??
    null;
  if (!om) return { om: null, fighter: null, tpl: null };
  const fighter = fighterFromOwned(om);
  const tpl = getMonsterTemplate(om.templateId) ?? getLadderMonsterTemplate(om.templateId);
  return { om, fighter, tpl };
}

/**
 * Saved player profiles (up to 5) — name, select, create.
 */
export default function PlayerProfileSection({
  profiles,
  activeProfileId,
  setupP1ProfileId,
  setupP2ProfileId,
  activeSlot,
  gameMode,
  onSelectProfile,
  onCreateProfile,
  onUpdateName,
}) {
  const type = useReadableType();
  const active = profiles.find((p) => p.id === activeProfileId) ?? null;
  const [nameDraft, setNameDraft] = useState(active?.name ?? '');

  useEffect(() => {
    setNameDraft(active?.name ?? '');
  }, [activeProfileId, active?.name]);

  const atMax = profiles.length >= MAX_PLAYER_PROFILES;

  function slotBadge(profileId) {
    if (gameMode !== 'twoPlayer') return null;
    if (profileId === setupP1ProfileId && profileId === setupP2ProfileId) return 'P1 & P2';
    if (profileId === setupP1ProfileId) return 'Player 1';
    if (profileId === setupP2ProfileId) return 'Player 2';
    return null;
  }

  return (
    <View style={styles.wrap}>
      <Text style={[styles.title, { fontSize: type.section }]}>Player profiles</Text>
      <Text style={[styles.hint, { fontSize: type.body }]}>
        {gameMode === 'twoPlayer'
          ? 'Tap Player 1 or Player 2 above, then tap a saved profile. Each player keeps their own coins, monsters, and gear.'
          : 'Tap a profile to play as that player. Your coins, monsters, and gear are saved here.'}
      </Text>

      {active ? (
        <View style={styles.nameBox}>
          <Text style={[styles.nameLbl, { fontSize: type.stat }]}>Player name</Text>
          <TextInput
            style={[styles.nameInput, { fontSize: type.btn }]}
            value={nameDraft}
            onChangeText={setNameDraft}
            onBlur={() => {
              const trimmed = nameDraft.trim().slice(0, 24);
              if (trimmed && trimmed !== active.name) onUpdateName?.(active.id, trimmed);
            }}
            placeholder="Enter your name"
            placeholderTextColor="#95a5a6"
            maxLength={24}
            returnKeyType="done"
            onSubmitEditing={() => {
              const trimmed = nameDraft.trim().slice(0, 24);
              if (trimmed) onUpdateName?.(active.id, trimmed);
            }}
          />
        </View>
      ) : null}

      {profiles.map((p) => {
        const selected = p.id === activeProfileId;
        const { om, fighter, tpl } = profileMonsterRow(p);
        const monName = om ? om.nickname || tpl?.name || 'Monster' : 'No monster yet';
        const badge = slotBadge(p.id);
        const battles = p.battleProgress?.totalBattles ?? 0;

        return (
          <TouchableOpacity
            key={p.id}
            style={[styles.card, selected && styles.cardOn]}
            onPress={() => onSelectProfile?.(p.id)}
            activeOpacity={0.9}
          >
            {fighter ? (
              <MonsterPreview parts={fighter.monsterParts} size={72} mood="happy" />
            ) : (
              <View style={styles.emptyPreview}>
                <Text style={styles.emptyEmoji}>👤</Text>
              </View>
            )}
            <View style={styles.cardBody}>
              <Text style={[styles.cardName, { fontSize: type.stat }]}>{p.name}</Text>
              <Text style={[styles.cardLine, { fontSize: type.statSm }]}>
                🪙 {p.coins ?? 0} coins
              </Text>
              <Text style={[styles.cardLine, { fontSize: type.statSm }]}>
                {om ? `${monName} · Lv ${om.level} · EXP ${om.exp ?? 0}` : 'Pick a monster below'}
              </Text>
              <Text style={[styles.cardLine, { fontSize: type.statSm }]}>
                Gear owned: {(p.cosmeticsOwned || []).length} · Battles: {battles}
              </Text>
              {selected ? (
                <Text style={[styles.selectedTag, { fontSize: type.statSm }]}>✓ Selected</Text>
              ) : null}
              {badge ? (
                <Text style={[styles.slotTag, { fontSize: type.statSm }]}>{badge}</Text>
              ) : null}
            </View>
          </TouchableOpacity>
        );
      })}

      <TouchableOpacity
        style={[styles.createBtn, atMax && styles.createBtnOff]}
        disabled={atMax}
        onPress={() => onCreateProfile?.()}
      >
        <Text style={[styles.createTxt, { fontSize: type.btn }]}>+ New player profile</Text>
      </TouchableOpacity>
      {atMax ? (
        <Text style={[styles.maxMsg, { fontSize: type.stat }]}>Maximum 5 players saved.</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginBottom: 8 },
  title: { fontWeight: '900', color: '#273043', marginBottom: 6 },
  hint: { fontWeight: '700', color: '#4a5568', lineHeight: 24, marginBottom: 10 },
  nameBox: {
    backgroundColor: '#fff',
    borderRadius: 14,
    borderWidth: 3,
    borderColor: '#48cae4',
    padding: 12,
    marginBottom: 10,
  },
  nameLbl: { fontWeight: '900', color: '#1a1a2e', marginBottom: 8 },
  nameInput: {
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#2d2d44',
    paddingVertical: 14,
    paddingHorizontal: 14,
    fontWeight: '800',
    color: '#1b1b2f',
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 16,
    borderWidth: 3,
    borderColor: '#dfe6e9',
    padding: 10,
    marginBottom: 10,
  },
  cardOn: { borderColor: '#8ac926', backgroundColor: '#f4ffe8' },
  emptyPreview: {
    width: 72,
    height: 72,
    borderRadius: 12,
    backgroundColor: '#ecf0f1',
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyEmoji: { fontSize: 32 },
  cardBody: { flex: 1, marginLeft: 10 },
  cardName: { fontWeight: '900', color: '#1b1b2f' },
  cardLine: { fontWeight: '700', color: '#4a5568', marginTop: 4, lineHeight: 22 },
  selectedTag: { fontWeight: '900', color: '#27ae60', marginTop: 6 },
  slotTag: { fontWeight: '900', color: '#c0392b', marginTop: 4 },
  createBtn: {
    backgroundColor: '#48cae4',
    paddingVertical: 16,
    borderRadius: 14,
    borderWidth: 3,
    borderColor: '#2d2d44',
    alignItems: 'center',
    marginTop: 4,
  },
  createBtnOff: { opacity: 0.45 },
  createTxt: { fontWeight: '900', color: '#1b1b2f' },
  maxMsg: {
    textAlign: 'center',
    fontWeight: '900',
    color: '#c0392b',
    marginTop: 10,
    lineHeight: 24,
  },
});
