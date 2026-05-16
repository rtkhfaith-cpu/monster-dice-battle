import React, { useEffect, useState } from 'react';
import {
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
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
 * Save slots (up to 5) — mobile-first profile pick + name entry.
 */
export default function SaveSlotPanel({
  profiles,
  activeProfileId,
  setupP1ProfileId,
  setupP2ProfileId,
  setupActiveSlot = 1,
  gameMode,
  onSelectProfile,
  onCreateProfile,
  onUpdateName,
  compact = false,
}) {
  const [isCreating, setIsCreating] = useState(false);
  const [createNameDraft, setCreateNameDraft] = useState('');
  const [nameDraft, setNameDraft] = useState('');

  const atMax = profiles.length >= MAX_PLAYER_PROFILES;
  const canCreate = !atMax;

  const editProfileId =
    activeProfileId ??
    (setupActiveSlot === 2 ? setupP2ProfileId : setupP1ProfileId) ??
    profiles[0]?.id ??
    null;
  const editProfile = profiles.find((p) => p.id === editProfileId) ?? null;

  useEffect(() => {
    setNameDraft(editProfile?.name ?? '');
  }, [editProfileId, editProfile?.name]);

  useEffect(() => {
    if (atMax) setIsCreating(false);
  }, [atMax]);

  function slotLabel(profileId) {
    if (gameMode !== 'twoPlayer' || !profileId) return null;
    if (profileId === setupP1ProfileId && profileId === setupP2ProfileId) return 'P1+P2';
    if (profileId === setupP1ProfileId) return 'P1';
    if (profileId === setupP2ProfileId) return 'P2';
    return null;
  }

  function isProfileHighlighted(profileId) {
    if (profileId === activeProfileId) return true;
    if (gameMode === 'twoPlayer') {
      return profileId === setupP1ProfileId || profileId === setupP2ProfileId;
    }
    return profileId === setupP1ProfileId;
  }

  function handleStartCreate() {
    if (!canCreate) return;
    setIsCreating(true);
    setCreateNameDraft(`Player ${profiles.length + 1}`);
  }

  function handleSaveNewPlayer() {
    const trimmed = createNameDraft.trim().slice(0, 24);
    const name = trimmed || `Player ${profiles.length + 1}`;
    onCreateProfile?.(name);
    setIsCreating(false);
    setCreateNameDraft('');
  }

  function handleSaveName() {
    if (!editProfile) return;
    const trimmed = nameDraft.trim().slice(0, 24);
    if (trimmed && trimmed !== editProfile.name) {
      onUpdateName?.(editProfile.id, trimmed);
    }
  }

  const showNameEditor = isCreating || !!editProfile;
  const listScrollable = profiles.length > 2;

  return (
    <View style={[styles.panel, compact && styles.panelCompact]}>
      <Text style={styles.panelTitle}>Save Slots</Text>

      {profiles.length === 0 && !isCreating ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyTitle}>No players yet</Text>
          <Text style={styles.emptySub}>Create a profile to save coins, monsters, and gear.</Text>
        </View>
      ) : null}

      {profiles.length > 0 ? (
        <ScrollView
          style={[styles.slotScroll, listScrollable && styles.slotScrollLimited]}
          contentContainerStyle={styles.slotList}
          showsVerticalScrollIndicator={listScrollable}
          nestedScrollEnabled
          keyboardShouldPersistTaps="handled"
        >
          {profiles.map((p) => {
            const selected = isProfileHighlighted(p.id);
            const sessionSelected = p.id === activeProfileId;
            const { om, fighter } = profileMonster(p);
            const tpl = om ? getMonsterTemplate(om.templateId) : null;
            const badge = slotLabel(p.id);

            return (
              <TouchableOpacity
                key={p.id}
                style={[styles.slot, selected && styles.slotOn]}
                onPress={() => onSelectProfile?.(p.id)}
                activeOpacity={0.85}
                accessibilityRole="button"
                accessibilityLabel={`Select ${p.name}`}
              >
                {fighter ? (
                  <MonsterPreview parts={fighter.monsterParts} size={compact ? 48 : 52} mood="happy" />
                ) : (
                  <Text style={styles.fallbackEmoji}>👾</Text>
                )}
                <View style={styles.slotMeta}>
                  <Text style={styles.slotName} numberOfLines={1}>
                    {p.name}
                  </Text>
                  <Text style={styles.slotLine}>
                    Lv {om?.level ?? 1} · 🪙 {p.coins ?? 0}
                  </Text>
                  <Text style={styles.slotMon} numberOfLines={1}>
                    {om ? om.nickname || tpl?.name : 'No monster'}
                  </Text>
                  {sessionSelected ? <Text style={styles.selTag}>★ SELECTED</Text> : null}
                  {badge ? <Text style={styles.badge}>{badge}</Text> : null}
                </View>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      ) : null}

      {isCreating ? (
        <View style={styles.createBox}>
          <Text style={styles.createLbl}>New player name</Text>
          <TextInput
            style={styles.nameInput}
            value={createNameDraft}
            onChangeText={setCreateNameDraft}
            placeholder="Enter name"
            placeholderTextColor="#636e72"
            maxLength={24}
            autoCorrect={false}
            autoCapitalize="words"
            returnKeyType="done"
            onSubmitEditing={handleSaveNewPlayer}
            editable
            {...(Platform.OS === 'web' ? { autoFocus: true } : {})}
          />
          <View style={styles.createActions}>
            <TouchableOpacity
              style={styles.cancelBtn}
              onPress={() => {
                setIsCreating(false);
                setCreateNameDraft('');
              }}
              activeOpacity={0.85}
            >
              <Text style={styles.cancelBtnTxt}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.saveBtn} onPress={handleSaveNewPlayer} activeOpacity={0.85}>
              <Text style={styles.saveBtnTxt}>Save</Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : canCreate ? (
        <TouchableOpacity style={styles.createPrimaryBtn} onPress={handleStartCreate} activeOpacity={0.85}>
          <Text style={styles.createPrimaryTxt}>+ Create Player</Text>
        </TouchableOpacity>
      ) : null}

      {showNameEditor && editProfile && !isCreating ? (
        <View style={styles.nameBox}>
          <Text style={styles.nameLbl}>Player name</Text>
          <TextInput
            style={styles.nameInput}
            value={nameDraft}
            onChangeText={setNameDraft}
            onBlur={handleSaveName}
            placeholder="Enter your name"
            placeholderTextColor="#636e72"
            maxLength={24}
            autoCorrect={false}
            autoCapitalize="words"
            returnKeyType="done"
            onSubmitEditing={handleSaveName}
            editable
          />
          <TouchableOpacity style={styles.saveNameBtn} onPress={handleSaveName} activeOpacity={0.85}>
            <Text style={styles.saveNameBtnTxt}>Save name</Text>
          </TouchableOpacity>
        </View>
      ) : null}

      {atMax ? <Text style={styles.maxMsg}>Maximum 5 players saved.</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  panel: {
    flex: 1,
    minWidth: 0,
    backgroundColor: LOBBY.panel,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: LOBBY.panelBorder,
    padding: 10,
    ...panelShadow,
  },
  panelCompact: {
    flexGrow: 0,
    flexShrink: 0,
    flexBasis: 'auto',
  },
  panelTitle: {
    fontWeight: '900',
    fontSize: 15,
    color: LOBBY.textStrong,
    textAlign: 'center',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  emptyState: {
    backgroundColor: LOBBY.chipAlt,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: LOBBY.cardBorder,
    padding: 14,
    marginBottom: 10,
    alignItems: 'center',
  },
  emptyTitle: {
    fontWeight: '900',
    fontSize: 17,
    color: LOBBY.textStrong,
    marginBottom: 4,
  },
  emptySub: {
    fontWeight: '700',
    fontSize: 13,
    color: LOBBY.textMuted,
    textAlign: 'center',
    lineHeight: 18,
  },
  slotScroll: {
    flexGrow: 0,
    flexShrink: 1,
  },
  slotScrollLimited: {
    maxHeight: 220,
  },
  slotList: {
    paddingBottom: 4,
  },
  slot: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: LOBBY.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: LOBBY.cardBorder,
    padding: 8,
    marginBottom: 8,
    minHeight: 64,
  },
  slotOn: {
    borderColor: LOBBY.cardActiveBorder,
    backgroundColor: LOBBY.cardActive,
    borderWidth: 2,
  },
  fallbackEmoji: { fontSize: 36, width: 48, textAlign: 'center' },
  slotMeta: { flex: 1, marginLeft: 8, minWidth: 0 },
  slotName: { fontWeight: '900', fontSize: 16, color: '#1b1b2f' },
  slotLine: { fontWeight: '800', fontSize: 13, color: '#4a5568', marginTop: 2 },
  slotMon: { fontWeight: '700', fontSize: 12, color: '#636e72', marginTop: 2 },
  selTag: { fontWeight: '900', fontSize: 11, color: '#27ae60', marginTop: 4 },
  badge: { fontWeight: '900', fontSize: 11, color: '#c0392b', marginTop: 2 },
  createPrimaryBtn: {
    backgroundColor: '#48cae4',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#2d2d44',
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 4,
    marginBottom: 4,
  },
  createPrimaryTxt: {
    fontWeight: '900',
    fontSize: 17,
    color: '#1b1b2f',
  },
  createBox: {
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#48cae4',
    padding: 12,
    marginTop: 4,
    marginBottom: 6,
  },
  createLbl: {
    fontWeight: '900',
    fontSize: 14,
    color: '#1a1a2e',
    marginBottom: 8,
  },
  nameBox: {
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#dfe6e9',
    padding: 12,
    marginTop: 6,
  },
  nameLbl: {
    fontWeight: '900',
    fontSize: 14,
    color: '#1a1a2e',
    marginBottom: 8,
  },
  nameInput: {
    backgroundColor: '#f8f9fa',
    borderWidth: 2,
    borderColor: '#2d2d44',
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 12,
    fontWeight: '800',
    fontSize: 16,
    color: '#1b1b2f',
    minHeight: 48,
    ...(Platform.OS === 'web' ? { outlineStyle: 'none' } : {}),
  },
  createActions: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 10,
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: LOBBY.cardBorder,
    backgroundColor: LOBBY.chip,
    alignItems: 'center',
  },
  cancelBtnTxt: { fontWeight: '900', fontSize: 15, color: LOBBY.textStrong },
  saveBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#2d2d44',
    backgroundColor: '#8ac926',
    alignItems: 'center',
  },
  saveBtnTxt: { fontWeight: '900', fontSize: 15, color: '#1b1b2f' },
  saveNameBtn: {
    marginTop: 10,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#2d2d44',
    backgroundColor: '#ffeaa7',
    alignItems: 'center',
  },
  saveNameBtnTxt: { fontWeight: '900', fontSize: 15, color: '#1b1b2f' },
  maxMsg: {
    textAlign: 'center',
    fontWeight: '800',
    fontSize: 12,
    color: '#c0392b',
    marginTop: 8,
  },
});
