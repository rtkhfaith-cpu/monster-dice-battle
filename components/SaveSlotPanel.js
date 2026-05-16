import React, { useEffect, useState } from 'react';
import {
  Platform,
  Pressable,
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
import { gamePanelStyle } from '../utils/artDirection';
import { LOBBY } from '../utils/gameTheme';
import { normalizePlayerKey, validatePlayerKeyPair } from '../utils/playerKey';

function formatSavedAt(iso) {
  if (!iso) return '—';
  try {
    const d = new Date(iso);
    return d.toLocaleString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return '—';
  }
}

function ProfileActionRow({ deleteBusy, onSelect, onDelete }) {
  return (
    <View style={styles.slotActionsRow} pointerEvents="box-none">
      <Pressable
        style={({ pressed }) => [
          styles.actionBtn,
          styles.selectBtn,
          pressed && !deleteBusy && styles.actionPressed,
          deleteBusy && styles.actionDisabled,
        ]}
        onPress={() => {
          if (!deleteBusy) onSelect?.();
        }}
        disabled={deleteBusy}
        accessibilityRole="button"
        accessibilityLabel="Select player"
      >
        <Text style={styles.selectBtnTxt}>Select</Text>
      </Pressable>
      {onDelete ? (
        <Pressable
          style={({ pressed }) => [
            styles.actionBtn,
            styles.deleteBtn,
            pressed && !deleteBusy && styles.actionPressed,
            deleteBusy && styles.actionDisabled,
          ]}
          onPress={() => {
            if (!deleteBusy) onDelete();
          }}
          disabled={deleteBusy}
          accessibilityRole="button"
          accessibilityLabel="Delete player"
        >
          <Text style={styles.deleteBtnTxt}>{deleteBusy ? '…' : 'Delete'}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

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
  onRequestSelectProfile,
  onCreateProfile,
  onRequestDeleteProfile,
  onRequestDeleteCloudProfile,
  deleteBusyProfileId = null,
  cloudPlayers = [],
  cloudFetchLoading = false,
  cloudFetchError = null,
  onFetchCloudPlayers,
  onRequestSelectCloudProfile,
  onUpdateName,
  compact = false,
  embedInScroll = false,
  isMobile = false,
}) {
  const [isCreating, setIsCreating] = useState(false);
  const [editingName, setEditingName] = useState(false);
  const [createNameDraft, setCreateNameDraft] = useState('');
  const [createKeyDraft, setCreateKeyDraft] = useState('');
  const [createConfirmDraft, setCreateConfirmDraft] = useState('');
  const [createError, setCreateError] = useState('');
  const [nameDraft, setNameDraft] = useState('');

  const pickProfile = onRequestSelectProfile ?? onSelectProfile;

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
    setEditingName(false);
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

  function resetCreateForm() {
    setIsCreating(false);
    setCreateNameDraft('');
    setCreateKeyDraft('');
    setCreateConfirmDraft('');
    setCreateError('');
  }

  function handleStartCreate() {
    if (!canCreate) return;
    setIsCreating(true);
    setCreateNameDraft(`Player ${profiles.length + 1}`);
    setCreateKeyDraft('');
    setCreateConfirmDraft('');
    setCreateError('');
  }

  function handleSaveNewPlayer() {
    const trimmed = createNameDraft.trim().slice(0, 24);
    if (!trimmed) {
      setCreateError('Player name cannot be empty.');
      return;
    }
    const keyErr = validatePlayerKeyPair(createKeyDraft, createConfirmDraft);
    if (keyErr) {
      setCreateError(keyErr);
      return;
    }
    const name = trimmed;
    onCreateProfile?.(name, normalizePlayerKey(createKeyDraft), normalizePlayerKey(createConfirmDraft));
    resetCreateForm();
  }

  function handleSaveName() {
    if (!editProfile) return;
    const trimmed = nameDraft.trim().slice(0, 24);
    if (trimmed && trimmed !== editProfile.name) {
      onUpdateName?.(editProfile.id, trimmed);
    }
  }

  const listScrollable = !embedInScroll && profiles.length > 2;
  const SlotListWrap = embedInScroll || !listScrollable ? View : ScrollView;
  const slotListProps =
    embedInScroll || !listScrollable
      ? { style: styles.slotListWrap }
      : {
          style: [styles.slotScroll, styles.slotScrollLimited],
          contentContainerStyle: styles.slotList,
          showsVerticalScrollIndicator: true,
          nestedScrollEnabled: true,
          keyboardShouldPersistTaps: 'handled',
        };

  return (
    <View
      style={[
        styles.panel,
        compact && styles.panelCompact,
        embedInScroll && styles.panelEmbed,
        isMobile && styles.panelMobile,
      ]}
    >
      <Text style={[styles.panelTitle, isMobile && styles.panelTitleMobile]}>Player Login</Text>

      <View style={styles.sectionHead}>
        <Text style={styles.sectionTitle}>Local saved players</Text>
      </View>

      {profiles.length === 0 && !isCreating ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyTitle}>No local players found.</Text>
          <Text style={styles.emptySub}>
            Create a new player or fetch your cloud saves from DynamoDB.
          </Text>
        </View>
      ) : null}

      {profiles.length > 0 ? (
        <SlotListWrap {...slotListProps}>
          {profiles.map((p) => {
            const selected = isProfileHighlighted(p.id);
            const sessionSelected = p.id === activeProfileId;
            const { om, fighter } = profileMonster(p);
            const tpl = om ? getMonsterTemplate(om.templateId) : null;
            const badge = slotLabel(p.id);

            const deleteBusy = deleteBusyProfileId === p.id;

            return (
              <View
                key={p.id}
                style={[
                  styles.slot,
                  compact && styles.slotCompact,
                  isMobile && styles.slotMobile,
                  selected && styles.slotOn,
                ]}
              >
                <View style={styles.slotTop}>
                  {fighter ? (
                    <MonsterPreview
                      parts={fighter.monsterParts}
                      size={isMobile ? 44 : compact ? 40 : 52}
                      mood="happy"
                    />
                  ) : (
                    <Text style={styles.fallbackEmoji}>👾</Text>
                  )}
                  <View style={styles.slotMeta}>
                    <Text style={[styles.slotName, isMobile && styles.slotNameMobile]} numberOfLines={1}>
                      {p.name}
                    </Text>
                    <Text style={[styles.slotLine, isMobile && styles.slotLineMobile]}>
                      Lv {om?.level ?? 1} · 🪙 {p.coins ?? 0}
                    </Text>
                    <Text style={[styles.slotMon, isMobile && styles.slotMonMobile]} numberOfLines={1}>
                      {om ? om.nickname || tpl?.name : 'No monster'}
                    </Text>
                    {sessionSelected ? <Text style={styles.selTag}>★ SELECTED</Text> : null}
                    {badge ? <Text style={styles.badge}>{badge}</Text> : null}
                  </View>
                </View>
                <ProfileActionRow
                  deleteBusy={deleteBusy}
                  onSelect={() => pickProfile?.(p.id)}
                  onDelete={
                    onRequestDeleteProfile
                      ? () => onRequestDeleteProfile(p.id, { playerName: p.name })
                      : undefined
                  }
                />
              </View>
            );
          })}
        </SlotListWrap>
      ) : null}

      {isCreating ? (
        <View style={styles.createBox}>
          <Text style={styles.createLbl}>Player name</Text>
          <TextInput
            style={styles.nameInput}
            value={createNameDraft}
            onChangeText={(t) => {
              setCreateNameDraft(t);
              if (createError) setCreateError('');
            }}
            placeholder="Enter name"
            placeholderTextColor="#636e72"
            maxLength={24}
            autoCorrect={false}
            autoCapitalize="words"
            returnKeyType="next"
            editable
            {...(Platform.OS === 'web' ? { autoFocus: true } : {})}
          />
          <Text style={[styles.createLbl, styles.createLblSpaced]}>Create Player Key</Text>
          <Text style={styles.createHint}>
            Choose a 4-digit key. You need this to open or delete this player later.
          </Text>
          <Text style={styles.fieldSubLbl}>4-digit Player Key</Text>
          <TextInput
            style={styles.keyInput}
            value={createKeyDraft}
            onChangeText={(t) => {
              setCreateKeyDraft(normalizePlayerKey(t));
              if (createError) setCreateError('');
            }}
            placeholder="••••"
            placeholderTextColor="#636e72"
            keyboardType="number-pad"
            maxLength={4}
            secureTextEntry
            autoComplete="off"
            textContentType="none"
            returnKeyType="next"
          />
          <Text style={styles.fieldSubLbl}>Confirm Player Key</Text>
          <TextInput
            style={styles.keyInput}
            value={createConfirmDraft}
            onChangeText={(t) => {
              setCreateConfirmDraft(normalizePlayerKey(t));
              if (createError) setCreateError('');
            }}
            placeholder="••••"
            placeholderTextColor="#636e72"
            keyboardType="number-pad"
            maxLength={4}
            secureTextEntry
            autoComplete="off"
            textContentType="none"
            returnKeyType="done"
            onSubmitEditing={handleSaveNewPlayer}
          />
          {createError ? <Text style={styles.createError}>{createError}</Text> : null}
          <View style={styles.createActions}>
            <TouchableOpacity style={styles.cancelBtn} onPress={resetCreateForm} activeOpacity={0.85}>
              <Text style={styles.cancelBtnTxt}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.saveBtn} onPress={handleSaveNewPlayer} activeOpacity={0.85}>
              <Text style={styles.saveBtnTxt}>Create Player</Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : canCreate ? (
        <TouchableOpacity style={styles.createPrimaryBtn} onPress={handleStartCreate} activeOpacity={0.85}>
          <Text style={styles.createPrimaryTxt}>+ Create New Player</Text>
        </TouchableOpacity>
      ) : null}

      <View style={[styles.sectionHead, styles.sectionHeadSpaced]}>
        <Text style={styles.sectionTitle}>Cloud players</Text>
      </View>

      {onFetchCloudPlayers ? (
        <TouchableOpacity
          style={[styles.fetchCloudBtn, cloudFetchLoading && styles.fetchCloudBtnBusy]}
          onPress={onFetchCloudPlayers}
          disabled={cloudFetchLoading}
          activeOpacity={0.85}
        >
          <Text style={styles.fetchCloudTxt}>
            {cloudFetchLoading ? 'Fetching…' : '☁ Fetch Cloud Players'}
          </Text>
        </TouchableOpacity>
      ) : null}

      {cloudFetchError ? <Text style={styles.cloudErr}>{cloudFetchError}</Text> : null}

      {cloudPlayers.length > 0 ? (
        <View style={styles.cloudList}>
          {cloudPlayers.map((cp) => {
            const deleteBusy = deleteBusyProfileId === cp.profileID;
            const sessionSelected = cp.profileID === activeProfileId;
            const cloudTpl = cp.monsterTemplateId ? getMonsterTemplate(cp.monsterTemplateId) : null;
            return (
              <View
                key={cp.profileID}
                style={[styles.slot, isMobile && styles.slotMobile, sessionSelected && styles.slotOn]}
              >
                <View style={styles.slotTop}>
                  <Text style={styles.fallbackEmoji}>☁</Text>
                  <View style={styles.slotMeta}>
                    <Text style={styles.slotName} numberOfLines={1}>
                      {cp.playerName || 'Player'}
                    </Text>
                    <Text style={styles.slotLine}>
                      Lv {cp.level ?? 1} · 🪙 {cp.coins ?? 0}
                    </Text>
                    <Text style={styles.slotMon} numberOfLines={1}>
                      {cloudTpl?.name ?? (cp.selectedMonsterId ? 'Monster saved' : 'Cloud save')}
                    </Text>
                    <Text style={styles.savedAt}>Saved {formatSavedAt(cp.updatedAt)}</Text>
                    {sessionSelected ? <Text style={styles.selTag}>★ SELECTED</Text> : null}
                  </View>
                </View>
                <ProfileActionRow
                  deleteBusy={deleteBusy}
                  onSelect={() => onRequestSelectCloudProfile?.(cp)}
                  onDelete={
                    onRequestDeleteCloudProfile ? () => onRequestDeleteCloudProfile(cp) : undefined
                  }
                />
              </View>
            );
          })}
        </View>
      ) : cloudFetchLoading ? null : (
        <Text style={styles.cloudHint}>Tap Fetch Cloud Players to load saves from the cloud.</Text>
      )}

      {editProfile && !isCreating && !editingName ? (
        <View style={styles.nameRow}>
          <Text style={styles.namePreview} numberOfLines={1}>
            Name: <Text style={styles.namePreviewVal}>{editProfile.name}</Text>
          </Text>
          <TouchableOpacity
            style={styles.editNameBtn}
            onPress={() => setEditingName(true)}
            activeOpacity={0.85}
          >
            <Text style={styles.editNameBtnTxt}>Edit Name</Text>
          </TouchableOpacity>
        </View>
      ) : null}

      {editProfile && !isCreating && editingName ? (
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
          <View style={styles.createActions}>
            <TouchableOpacity
              style={styles.cancelBtn}
              onPress={() => {
                setEditingName(false);
                setNameDraft(editProfile.name ?? '');
              }}
              activeOpacity={0.85}
            >
              <Text style={styles.cancelBtnTxt}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.saveBtn} onPress={handleSaveName} activeOpacity={0.85}>
              <Text style={styles.saveBtnTxt}>Save</Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : null}

      {atMax ? <Text style={styles.maxMsg}>Maximum 5 players saved.</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  panel: {
    flexGrow: 0,
    flexShrink: 0,
    minWidth: 0,
    padding: 10,
    overflow: 'visible',
    ...gamePanelStyle(LOBBY.panelBorder),
  },
  panelCompact: {
    flexGrow: 0,
    flexShrink: 0,
    flexBasis: 'auto',
    padding: 8,
  },
  panelEmbed: {
    flex: 0,
    flexGrow: 0,
  },
  panelMobile: {
    padding: 14,
    borderRadius: 16,
  },
  slotListWrap: {
    flexGrow: 0,
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
  panelTitleMobile: { fontSize: 14, marginBottom: 10 },
  sectionHead: { marginTop: 4, marginBottom: 8 },
  sectionHeadSpaced: { marginTop: 14 },
  sectionTitle: {
    fontWeight: '900',
    fontSize: 13,
    color: LOBBY.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  fetchCloudBtn: {
    backgroundColor: '#74b9ff',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#2d2d44',
    paddingVertical: 12,
    alignItems: 'center',
    marginBottom: 8,
  },
  fetchCloudBtnBusy: { opacity: 0.65 },
  fetchCloudTxt: { fontWeight: '900', fontSize: 16, color: '#1b1b2f' },
  cloudErr: {
    fontWeight: '800',
    fontSize: 13,
    color: '#c0392b',
    marginBottom: 8,
    textAlign: 'center',
  },
  cloudHint: {
    fontWeight: '700',
    fontSize: 13,
    color: LOBBY.textMuted,
    textAlign: 'center',
    marginBottom: 8,
    lineHeight: 18,
  },
  cloudList: { marginBottom: 8 },
  savedAt: {
    fontWeight: '700',
    fontSize: 11,
    color: '#636e72',
    marginTop: 2,
  },
  selectBtn: {
    borderWidth: 2,
    borderColor: '#2d2d44',
    backgroundColor: '#8ac926',
  },
  selectBtnTxt: { fontWeight: '900', fontSize: 14, color: '#1b1b2f' },
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
    maxHeight: 360,
  },
  slotList: {
    paddingBottom: 4,
  },
  slot: {
    flexDirection: 'column',
    alignItems: 'stretch',
    backgroundColor: LOBBY.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: LOBBY.cardBorder,
    padding: 10,
    marginBottom: 8,
    overflow: 'visible',
    ...(Platform.OS === 'web' ? { position: 'relative', zIndex: 1 } : {}),
  },
  slotTop: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    minWidth: 0,
  },
  slotActionsRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
    gap: 8,
    marginTop: 10,
    width: '100%',
    zIndex: 2,
  },
  actionBtn: {
    flex: 1,
    minHeight: 44,
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    ...(Platform.OS === 'web' ? { cursor: 'pointer' } : {}),
  },
  actionPressed: {
    opacity: 0.88,
  },
  actionDisabled: {
    opacity: 0.5,
  },
  deleteBtn: {
    borderWidth: 2,
    borderColor: '#c0392b',
    backgroundColor: '#fdecea',
  },
  deleteBtnTxt: {
    fontWeight: '900',
    fontSize: 14,
    color: '#c0392b',
  },
  slotCompact: {
    paddingVertical: 8,
  },
  slotMobile: {
    paddingVertical: 10,
    paddingHorizontal: 8,
  },
  slotOn: {
    borderColor: LOBBY.cardActiveBorder,
    backgroundColor: LOBBY.cardActive,
    borderWidth: 2,
  },
  fallbackEmoji: { fontSize: 36, width: 48, textAlign: 'center' },
  slotMeta: { flex: 1, marginLeft: 8, minWidth: 0 },
  slotName: { fontWeight: '900', fontSize: 16, color: '#1b1b2f' },
  slotNameMobile: { fontSize: 15 },
  slotLine: { fontWeight: '800', fontSize: 13, color: '#4a5568', marginTop: 2 },
  slotLineMobile: { fontSize: 12 },
  slotMon: { fontWeight: '700', fontSize: 12, color: '#636e72', marginTop: 2 },
  slotMonMobile: { fontSize: 11 },
  selTag: { fontWeight: '900', fontSize: 11, color: '#27ae60', marginTop: 4 },
  badge: { fontWeight: '900', fontSize: 11, color: '#c0392b', marginTop: 2 },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    marginTop: 4,
    marginBottom: 4,
    paddingVertical: 4,
  },
  namePreview: {
    flex: 1,
    fontWeight: '800',
    fontSize: 14,
    color: LOBBY.textMuted,
  },
  namePreviewVal: {
    fontWeight: '900',
    color: LOBBY.textStrong,
  },
  editNameBtn: {
    backgroundColor: LOBBY.chip,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: LOBBY.cardBorder,
  },
  editNameBtnTxt: {
    fontWeight: '900',
    fontSize: 13,
    color: LOBBY.textStrong,
  },
  createPrimaryBtn: {
    backgroundColor: '#48cae4',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#2d2d44',
    paddingVertical: 12,
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
  createLblSpaced: { marginTop: 10 },
  createHint: {
    fontWeight: '700',
    fontSize: 13,
    color: '#4a5568',
    lineHeight: 18,
    marginBottom: 10,
  },
  fieldSubLbl: {
    fontWeight: '800',
    fontSize: 13,
    color: '#1a1a2e',
    marginBottom: 6,
  },
  keyInput: {
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
    letterSpacing: 4,
    textAlign: 'center',
    marginBottom: 10,
    ...(Platform.OS === 'web' ? { outlineStyle: 'none' } : {}),
  },
  createError: {
    fontWeight: '800',
    fontSize: 13,
    color: '#c0392b',
    marginBottom: 8,
    lineHeight: 18,
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
