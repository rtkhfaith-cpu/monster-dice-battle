import React, { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import MonsterPreview from './MonsterPreview';
import { fighterFromOwned } from '../utils/fighterFromOwned';
import { getMonsterTemplate } from '../utils/monsterTemplates';
import { MAX_PLAYER_PROFILES } from '../utils/gameStorage';
import { LOBBY, panelShadow } from '../utils/gameTheme';

function profileMonster(profile) {
  const om =
    profile?.ownedMonsters?.find((x) => x.id === profile.selectedMonsterId) ??
    profile?.ownedMonsters?.[0] ??
    null;
  if (!om) return { om: null, fighter: null };
  return { om, fighter: fighterFromOwned(om) };
}

/**
 * Console-style save slots (up to 5).
 */
export default function SaveSlotPanel({
  profiles,
  activeProfileId,
  setupP1ProfileId,
  setupP2ProfileId,
  gameMode,
  onSelectProfile,
  onCreateProfile,
  onUpdateName,
  compact = false,
}) {
  const active = profiles.find((p) => p.id === activeProfileId) ?? null;
  const [nameDraft, setNameDraft] = useState(active?.name ?? '');

  useEffect(() => {
    setNameDraft(active?.name ?? '');
  }, [activeProfileId, active?.name]);

  const slots = Array.from({ length: MAX_PLAYER_PROFILES }, (_, i) => profiles[i] ?? null);
  const canCreate = profiles.length < MAX_PLAYER_PROFILES;

  function slotLabel(profileId) {
    if (gameMode !== 'twoPlayer' || !profileId) return null;
    if (profileId === setupP1ProfileId && profileId === setupP2ProfileId) return 'P1+P2';
    if (profileId === setupP1ProfileId) return 'P1';
    if (profileId === setupP2ProfileId) return 'P2';
    return null;
  }

  return (
    <View style={styles.panel}>
      <Text style={styles.panelTitle}>Save Slots</Text>

      <ScrollView
        style={[styles.slotScroll, compact && styles.slotScrollCompact]}
        contentContainerStyle={styles.slotList}
        showsVerticalScrollIndicator={false}
        nestedScrollEnabled
      >
      {slots.map((p, index) => {
        const isEmpty = !p;
        const isCreateSlot = isEmpty && index === profiles.length && canCreate;
        const selected = p && p.id === activeProfileId;
        const { om, fighter } = profileMonster(p);
        const tpl = om ? getMonsterTemplate(om.templateId) : null;
        const badge = p ? slotLabel(p.id) : null;

        if (isEmpty && !isCreateSlot) {
          return (
            <View key={`empty-${index}`} style={[styles.slot, styles.slotLocked]}>
              <Text style={styles.lockedTxt}>—</Text>
            </View>
          );
        }

        if (isCreateSlot) {
          return (
            <TouchableOpacity key="create" style={[styles.slot, styles.slotNew]} onPress={onCreateProfile}>
              <Text style={styles.newEmoji}>＋</Text>
              <Text style={styles.newLbl}>New Player</Text>
              <Text style={styles.newSub}>Create save</Text>
            </TouchableOpacity>
          );
        }

        return (
          <TouchableOpacity
            key={p.id}
            style={[styles.slot, selected && styles.slotOn]}
            onPress={() => onSelectProfile?.(p.id)}
            activeOpacity={0.9}
          >
            {fighter ? (
              <MonsterPreview parts={fighter.monsterParts} size={52} mood="happy" />
            ) : (
              <Text style={styles.fallbackEmoji}>👾</Text>
            )}
            <View style={styles.slotMeta}>
              <Text style={styles.slotName} numberOfLines={1}>
                {p.name}
              </Text>
              <Text style={styles.slotLine}>Lv {om?.level ?? 1} · 🪙{p.coins ?? 0}</Text>
              <Text style={styles.slotMon} numberOfLines={1}>
                {om ? om.nickname || tpl?.name : 'No monster'}
              </Text>
              {selected ? <Text style={styles.selTag}>★ SELECTED</Text> : null}
              {badge ? <Text style={styles.badge}>{badge}</Text> : null}
            </View>
          </TouchableOpacity>
        );
      })}
      </ScrollView>

      {active ? (
        <View style={styles.nameRow}>
          <Text style={styles.nameLbl}>Name</Text>
          <TextInput
            style={styles.nameInput}
            value={nameDraft}
            onChangeText={setNameDraft}
            onBlur={() => {
              const t = nameDraft.trim().slice(0, 24);
              if (t && t !== active.name) onUpdateName?.(active.id, t);
            }}
            maxLength={24}
            placeholder="Hero name"
            placeholderTextColor="#7f8c9a"
          />
        </View>
      ) : null}

      {!canCreate ? <Text style={styles.maxMsg}>Maximum 5 players saved.</Text> : null}
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
  slotScroll: { flex: 1, minHeight: 0 },
  slotScrollCompact: { flexGrow: 0, maxHeight: 200 },
  slotList: { paddingBottom: 2 },
  panelTitle: {
    fontWeight: '900',
    fontSize: 15,
    color: LOBBY.textStrong,
    textAlign: 'center',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  slot: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: LOBBY.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: LOBBY.cardBorder,
    padding: 6,
    marginBottom: 6,
    minHeight: 58,
  },
  slotOn: {
    borderColor: LOBBY.cardActiveBorder,
    backgroundColor: LOBBY.cardActive,
    borderWidth: 2,
  },
  slotNew: {
    justifyContent: 'center',
    backgroundColor: LOBBY.chipAlt,
    borderStyle: 'dashed',
  },
  slotLocked: {
    justifyContent: 'center',
    alignItems: 'center',
    opacity: 0.35,
    minHeight: 48,
  },
  lockedTxt: { fontSize: 20, fontWeight: '900', color: '#95a5a6' },
  fallbackEmoji: { fontSize: 40, width: 52, textAlign: 'center' },
  slotMeta: { flex: 1, marginLeft: 6, minWidth: 0 },
  slotName: { fontWeight: '900', fontSize: 15, color: '#1b1b2f' },
  slotLine: { fontWeight: '800', fontSize: 12, color: '#4a5568', marginTop: 2 },
  slotMon: { fontWeight: '700', fontSize: 11, color: '#636e72', marginTop: 1 },
  selTag: { fontWeight: '900', fontSize: 11, color: '#27ae60', marginTop: 3 },
  badge: { fontWeight: '900', fontSize: 11, color: '#c0392b', marginTop: 2 },
  newEmoji: { fontSize: 28, fontWeight: '900', color: '#0984e3', width: 52, textAlign: 'center' },
  newLbl: { fontWeight: '900', fontSize: 14, color: '#1b1b2f' },
  newSub: { fontWeight: '700', fontSize: 11, color: '#636e72' },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
    gap: 6,
  },
  nameLbl: { fontWeight: '900', fontSize: 13, color: '#1a1a2e' },
  nameInput: {
    flex: 1,
    backgroundColor: '#fff',
    borderWidth: 2,
    borderColor: '#2d2d44',
    borderRadius: 8,
    paddingVertical: 6,
    paddingHorizontal: 8,
    fontWeight: '800',
    fontSize: 14,
    color: '#1b1b2f',
  },
  maxMsg: {
    textAlign: 'center',
    fontWeight: '800',
    fontSize: 11,
    color: '#c0392b',
    marginTop: 4,
  },
});
