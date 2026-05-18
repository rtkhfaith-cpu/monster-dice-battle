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
import { getLadderMonsterTemplate } from '../utils/monsterLadder/ladderMonsterCatalog';
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
  const [cloudDropdownOpen, setCloudDropdownOpen] = useState(false);

  const pickProfile = onRequestSelectProfile ?? onSelectProfile;

  const atMax = profiles.length >= MAX_PLAYER_PROFILES;
  const canCreate = true;

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

  function isProfileHighlighted(profileId) {
    return profileId === activeProfileId;
  }

  function openCloudDropdown() {
    const next = !cloudDropdownOpen;
    setCloudDropdownOpen(next);
    if (next) onFetchCloudPlayers?.();
  }

  const activeCloudMeta = cloudPlayers.find((cp) => cp.profileID === activeProfileId) ?? null;
  const cloudSelectLabel = activeCloudMeta
    ? activeCloudMeta.playerName || 'Player'
    : activeProfileId && profiles.find((p) => p.id === activeProfileId)
      ? profiles.find((p) => p.id === activeProfileId)?.name
      : 'Select Player';

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
        <Text style={styles.sectionTitle}>Your player</Text>
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
            const tpl = om ? getMonsterTemplate(om.templateId) ?? getLadderMonsterTemplate(om.templateId) : null;
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
                    {sessionSelected ? <Text style={styles.selTag}>★ ACTIVE</Text> : null}
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
      ) : (
        <TouchableOpacity style={styles.createPrimaryBtn} onPress={handleStartCreate} activeOpacity={0.85}>
          <Text style={styles.createPrimaryTxt}>
            {atMax ? '+ Create New Player (replaces current)' : '+ Create New Player'}
          </Text>
        </TouchableOpacity>
      )}

      <View style={[styles.sectionHead, styles.sectionHeadSpaced]}>
        <Text style={styles.sectionTitle}>Cloud saves</Text>
      </View>

      {onFetchCloudPlayers ? (
        <View style={styles.dropdownWrap}>
          <Pressable
            style={({ pressed }) => [
              styles.dropdownBtn,
              cloudDropdownOpen && styles.dropdownBtnOpen,
              pressed && styles.actionPressed,
            ]}
            onPress={openCloudDropdown}
            accessibilityRole="button"
            accessibilityLabel="Select player from cloud"
          >
            <Text style={styles.dropdownBtnLbl}>Select Player</Text>
            <Text style={styles.dropdownBtnVal} numberOfLines={1}>
              {cloudFetchLoading && cloudDropdownOpen ? 'Loading…' : cloudSelectLabel}
            </Text>
            <Text style={styles.dropdownChevron}>{cloudDropdownOpen ? '▲' : '▼'}</Text>
          </Pressable>

          {cloudDropdownOpen ? (
            <ScrollView style={styles.dropdownMenu} nestedScrollEnabled keyboardShouldPersistTaps="handled">
              {cloudFetchLoading ? (
                <Text style={styles.dropdownItemHint}>Loading cloud players…</Text>
              ) : null}
              {cloudFetchError ? <Text style={styles.cloudErr}>{cloudFetchError}</Text> : null}
              {!cloudFetchLoading && !cloudFetchError && cloudPlayers.length === 0 ? (
                <Text style={styles.dropdownItemHint}>No cloud players found. Create one below.</Text>
              ) : null}
              {cloudPlayers.map((cp) => {
                const selected = cp.profileID === activeProfileId;
                const cloudTpl = cp.monsterTemplateId
                  ? getMonsterTemplate(cp.monsterTemplateId) ?? getLadderMonsterTemplate(cp.monsterTemplateId)
                  : null;
                return (
                  <Pressable
                    key={cp.profileID}
                    style={({ pressed }) => [
                      styles.dropdownItem,
                      selected && styles.dropdownItemOn,
                      pressed && styles.actionPressed,
                    ]}
                    onPress={() => {
                      setCloudDropdownOpen(false);
                      onRequestSelectCloudProfile?.(cp);
                    }}
                  >
                    <Text style={styles.dropdownItemName} numberOfLines={1}>
                      {cp.playerName || 'Player'}
                      {selected ? ' ★' : ''}
                    </Text>
                    <Text style={styles.dropdownItemSub} numberOfLines={1}>
                      Lv {cp.level ?? 1} · 🪙 {cp.coins ?? 0} ·{' '}
                      {cloudTpl?.name ?? 'Cloud save'}
                      {cp.requiresKey === false ? ' · no PIN' : ''}
                    </Text>
                    <Text style={styles.savedAt}>Saved {formatSavedAt(cp.updatedAt)}</Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          ) : null}
        </View>
      ) : null}

      {activeCloudMeta && onRequestDeleteCloudProfile ? (
        <Pressable
          style={({ pressed }) => [styles.deleteCloudLink, pressed && styles.actionPressed]}
          onPress={() => onRequestDeleteCloudProfile(activeCloudMeta)}
          disabled={deleteBusyProfileId === activeCloudMeta.profileID}
        >
          <Text style={styles.deleteCloudLinkTxt}>
            {deleteBusyProfileId === activeCloudMeta.profileID ? 'Deleting…' : 'Delete cloud player'}
          </Text>
        </Pressable>
      ) : null}

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

      {atMax ? (
        <Text style={styles.maxMsg}>
          One active player on this device. Pick a cloud save below to switch — no delete needed.
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  panel: {
    flexGrow: 0,
    flexShrink: 0,
    minWidth: 0,
    padding: 12,
    overflow: 'visible',
    borderRadius: 20,
    borderWidth: 2,
    borderColor: '#d6a94c',
    backgroundColor: 'rgba(7, 18, 42, 0.9)',
    shadowColor: 'rgba(0,0,0,0.55)',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 7,
    ...(Platform.OS === 'web'
      ? {
          boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.16), 0 14px 32px rgba(0,0,0,0.45)',
        }
      : {}),
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
    color: '#f8e7b5',
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
    color: '#87dfff',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  dropdownWrap: {
    marginBottom: 8,
    zIndex: 10,
    ...(Platform.OS === 'web' ? { position: 'relative' } : {}),
  },
  dropdownBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(19, 48, 101, 0.96)',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#d6a94c',
    paddingVertical: 12,
    paddingHorizontal: 12,
    minHeight: 48,
    ...(Platform.OS === 'web' ? { cursor: 'pointer' } : {}),
  },
  dropdownBtnOpen: {
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
  },
  dropdownBtnLbl: {
    fontWeight: '900',
    fontSize: 12,
    color: '#f8e7b5',
    textTransform: 'uppercase',
  },
  dropdownBtnVal: {
    flex: 1,
    fontWeight: '800',
    fontSize: 15,
    color: '#ffffff',
    minWidth: 0,
  },
  dropdownChevron: { fontWeight: '900', fontSize: 12, color: '#87dfff' },
  dropdownMenu: {
    backgroundColor: 'rgba(6, 18, 40, 0.98)',
    borderWidth: 2,
    borderTopWidth: 0,
    borderColor: '#d6a94c',
    borderBottomLeftRadius: 12,
    borderBottomRightRadius: 12,
    maxHeight: 240,
    overflow: 'hidden',
    ...(Platform.OS === 'web' ? { boxShadow: '0 8px 24px rgba(0,0,0,0.12)' } : {}),
  },
  dropdownItem: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(246,196,95,0.22)',
    ...(Platform.OS === 'web' ? { cursor: 'pointer' } : {}),
  },
  dropdownItemOn: {
    backgroundColor: 'rgba(61, 116, 196, 0.4)',
  },
  dropdownItemName: {
    fontWeight: '900',
    fontSize: 15,
    color: '#f8e7b5',
  },
  dropdownItemSub: {
    fontWeight: '700',
    fontSize: 12,
    color: '#b8d9ff',
    marginTop: 2,
  },
  dropdownItemHint: {
    fontWeight: '700',
    fontSize: 13,
    color: '#b8d9ff',
    padding: 12,
    textAlign: 'center',
  },
  deleteCloudLink: {
    alignSelf: 'center',
    marginBottom: 8,
    paddingVertical: 6,
    paddingHorizontal: 8,
  },
  deleteCloudLinkTxt: {
    fontWeight: '800',
    fontSize: 13,
    color: '#c0392b',
    textDecorationLine: 'underline',
  },
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
    color: '#94a9c9',
    marginTop: 2,
  },
  selectBtn: {
    borderWidth: 2,
    borderColor: '#2d2d44',
    backgroundColor: '#8ac926',
  },
  selectBtnTxt: { fontWeight: '900', fontSize: 14, color: '#1b1b2f' },
  emptyState: {
    backgroundColor: 'rgba(28, 64, 126, 0.7)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(246,196,95,0.28)',
    padding: 14,
    marginBottom: 10,
    alignItems: 'center',
  },
  emptyTitle: {
    fontWeight: '900',
    fontSize: 17,
    color: '#f8e7b5',
    marginBottom: 4,
  },
  emptySub: {
    fontWeight: '700',
    fontSize: 13,
    color: '#b8d9ff',
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
    backgroundColor: 'rgba(13, 31, 69, 0.92)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(246,196,95,0.28)',
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
    borderColor: '#60d8ff',
    backgroundColor: 'rgba(31, 79, 149, 0.95)',
    borderWidth: 2,
    shadowColor: '#60d8ff',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.45,
    shadowRadius: 12,
    elevation: 5,
  },
  fallbackEmoji: { fontSize: 36, width: 48, textAlign: 'center' },
  slotMeta: { flex: 1, marginLeft: 8, minWidth: 0 },
  slotName: { fontWeight: '900', fontSize: 16, color: '#fff7d6' },
  slotNameMobile: { fontSize: 15 },
  slotLine: { fontWeight: '800', fontSize: 13, color: '#b8d9ff', marginTop: 2 },
  slotLineMobile: { fontSize: 12 },
  slotMon: { fontWeight: '700', fontSize: 12, color: '#91a7c7', marginTop: 2 },
  slotMonMobile: { fontSize: 11 },
  selTag: { fontWeight: '900', fontSize: 11, color: '#7cffc3', marginTop: 4 },
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
    color: '#b8d9ff',
  },
  namePreviewVal: {
    fontWeight: '900',
    color: '#fff7d6',
  },
  editNameBtn: {
    backgroundColor: 'rgba(31, 79, 149, 0.8)',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#d6a94c',
  },
  editNameBtnTxt: {
    fontWeight: '900',
    fontSize: 13,
    color: '#f8e7b5',
  },
  createPrimaryBtn: {
    backgroundColor: '#1d9bd1',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#87dfff',
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 4,
    marginBottom: 4,
  },
  createPrimaryTxt: {
    fontWeight: '900',
    fontSize: 17,
    color: '#ffffff',
  },
  createBox: {
    backgroundColor: 'rgba(5, 16, 34, 0.92)',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#60d8ff',
    padding: 12,
    marginTop: 4,
    marginBottom: 6,
  },
  createLbl: {
    fontWeight: '900',
    fontSize: 14,
    color: '#f8e7b5',
    marginBottom: 8,
  },
  createLblSpaced: { marginTop: 10 },
  createHint: {
    fontWeight: '700',
    fontSize: 13,
    color: '#b8d9ff',
    lineHeight: 18,
    marginBottom: 10,
  },
  fieldSubLbl: {
    fontWeight: '800',
    fontSize: 13,
    color: '#f8e7b5',
    marginBottom: 6,
  },
  keyInput: {
    backgroundColor: 'rgba(3, 10, 24, 0.85)',
    borderWidth: 2,
    borderColor: '#d6a94c',
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 12,
    fontWeight: '800',
    fontSize: 16,
    color: '#fff',
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
    backgroundColor: 'rgba(5, 16, 34, 0.92)',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#60d8ff',
    padding: 12,
    marginTop: 6,
  },
  nameLbl: {
    fontWeight: '900',
    fontSize: 14,
    color: '#f8e7b5',
    marginBottom: 8,
  },
  nameInput: {
    backgroundColor: 'rgba(3, 10, 24, 0.85)',
    borderWidth: 2,
    borderColor: '#d6a94c',
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 12,
    fontWeight: '800',
    fontSize: 16,
    color: '#fff',
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
    borderColor: '#d6a94c',
    backgroundColor: 'rgba(31, 79, 149, 0.8)',
    alignItems: 'center',
  },
  cancelBtnTxt: { fontWeight: '900', fontSize: 15, color: '#f8e7b5' },
  saveBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#f8d36d',
    backgroundColor: '#16a34a',
    alignItems: 'center',
  },
  saveBtnTxt: { fontWeight: '900', fontSize: 15, color: '#fff' },
  saveNameBtn: {
    marginTop: 10,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#d6a94c',
    backgroundColor: '#1d9bd1',
    alignItems: 'center',
  },
  saveNameBtnTxt: { fontWeight: '900', fontSize: 15, color: '#fff' },
  maxMsg: {
    textAlign: 'center',
    fontWeight: '800',
    fontSize: 12,
    color: '#c0392b',
    marginTop: 8,
  },
});
