import React, { useMemo, useState } from 'react';
import {
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from 'react-native';
import MonsterPreview from './MonsterPreview';
import { fighterFromOwned } from '../utils/fighterFromOwned';
import { getGearInstance } from '../src/gameSystems/gear/inventoryGearUtils';
import { getSlotInstanceId } from '../src/gameSystems/gear/equipmentSystem';
import { detectActiveGearSet, previewSetBonusChange } from '../src/gameSystems/gear/gearSets';
import { formatGearStatLines } from '../src/gameSystems/gear/gearGenerator';
import {
  GEAR_UI,
  SLOT_ICONS,
  SET_EMOJI,
  gearModalStyles,
  gearRarityUi,
  isMythicRarity,
} from './gear/gearUiTheme';

const SLOT_LABELS = { head: 'Head', body: 'Body', weapon: 'Weapon', hand: 'Hand', legs: 'Legs' };

const STAT_LABELS = {
  attack: 'ATK',
  defense: 'DEF',
  hp: 'HP',
  speed: 'SPD',
  crit: 'Crit',
  dodge: 'Dodge',
  hitRate: 'Hit',
  healPower: 'Heal',
  firePower: 'Fire',
  poisonPower: 'Poison',
  skillPower: 'Skill',
};

function statDeltaLines(current, selected) {
  if (!selected) return [];
  const curMap = {};
  for (const s of current?.stats || []) curMap[s.type] = s.value;
  return (selected.stats || [])
    .map((s) => ({ type: s.type, diff: s.value - (curMap[s.type] ?? 0) }))
    .filter((d) => d.diff !== 0);
}

function SlotBox({ label, slotKey, gear, onPress, onUnequip, compact }) {
  const ui = gear ? gearRarityUi(gear.rarity) : null;
  const mythic = gear && isMythicRarity(gear.rarity);
  const setEmoji = gear?.set ? SET_EMOJI[gear.set] : null;

  return (
    <TouchableOpacity
      activeOpacity={0.88}
      style={[
        styles.slotBox,
        compact && styles.slotBoxCompact,
        gear ? styles.slotFilled : styles.slotEmpty,
        gear && { borderColor: ui.border },
        mythic && styles.slotMythic,
      ]}
      onPress={onPress}
    >
      <Text style={styles.slotIcon}>{SLOT_ICONS[slotKey] ?? '◆'}</Text>
      <Text style={styles.slotLbl}>{label}</Text>
      {gear ? (
        <>
          <View style={[styles.rarityPill, { backgroundColor: ui.chipBg }]}>
            <Text style={[styles.rarityPillTxt, { color: ui.chipFg }]}>{gear.rarity}</Text>
          </View>
          {setEmoji ? <Text style={styles.setEmoji}>{setEmoji}</Text> : null}
          <Text style={[styles.slotName, { color: ui.color }]} numberOfLines={2}>
            {gear.name}
          </Text>
          <Text style={styles.slotStats} numberOfLines={2}>
            {formatGearStatLines(gear.stats).join(' · ')}
          </Text>
          {gear.sockets?.length ? (
            <Text style={styles.socketTxt}>◇ {gear.sockets.length} socket</Text>
          ) : null}
          <TouchableOpacity
            style={styles.unequipBtn}
            onPress={(e) => {
              e?.stopPropagation?.();
              onUnequip?.();
            }}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Text style={styles.unequipTxt}>Remove</Text>
          </TouchableOpacity>
        </>
      ) : (
        <>
          <Text style={styles.emptyPlus}>+</Text>
          <Text style={styles.slotEmptyTxt}>Tap to equip</Text>
        </>
      )}
    </TouchableOpacity>
  );
}

export default function MonsterEquipmentScreen({
  visible,
  ownedMonster,
  profile,
  onClose,
  onEquip,
  onUnequip,
}) {
  const { width } = useWindowDimensions();
  const compact = width < 380;
  const [picker, setPicker] = useState(null);

  const fighter = useMemo(() => {
    if (!ownedMonster) return null;
    return fighterFromOwned(ownedMonster, profile);
  }, [ownedMonster, profile]);

  const equipment = ownedMonster?.equipment;
  const setBonus = useMemo(
    () => (profile && equipment ? detectActiveGearSet(profile, equipment) : null),
    [profile, equipment],
  );

  const compatible = useMemo(() => {
    if (!picker || !profile?.gearInventory) return [];
    return profile.gearInventory.filter(
      (g) =>
        g.slot === picker.slot
        && (!g.equippedToMonsterId || g.equippedToMonsterId === ownedMonster?.id),
    );
  }, [picker, profile, ownedMonster?.id]);

  const currentGear = picker
    ? getGearInstance(profile, getSlotInstanceId(equipment, picker.slot, picker.index))
    : null;
  const selectedGear = picker?.selectedId ? getGearInstance(profile, picker.selectedId) : null;
  const deltas = statDeltaLines(currentGear, selectedGear);
  const setPreview =
    selectedGear && picker
      ? previewSetBonusChange(profile, equipment, selectedGear.instanceId, picker.slot, picker.index)
      : null;

  function openPicker(slot, index = 0) {
    setPicker({ slot, index, selectedId: null });
  }

  function confirmEquip() {
    if (!picker?.selectedId) return;
    onEquip?.(picker.selectedId, picker.slot, picker.index);
    setPicker(null);
  }

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={gearModalStyles.backdrop}>
        <View style={[gearModalStyles.card, { maxHeight: picker ? '96%' : '92%' }]}>
          <View style={styles.hdr}>
            <Text style={gearModalStyles.title}>Equip Gear</Text>
            <TouchableOpacity style={styles.closeHit} onPress={onClose} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
              <Text style={styles.closeTxt}>×</Text>
            </TouchableOpacity>
          </View>

          <ScrollView
            style={styles.scroll}
            contentContainerStyle={styles.scrollContent}
            nestedScrollEnabled
            keyboardShouldPersistTaps="handled"
          >
            <View style={styles.previewRow}>
              <MonsterPreview
                templateId={ownedMonster?.templateId}
                monsterParts={fighter?.monsterParts}
                size={compact ? 100 : 120}
                mood="happy"
              />
              <View style={styles.previewMeta}>
                <Text style={styles.monsterName}>{ownedMonster?.nickname ?? 'Monster'}</Text>
                <Text style={styles.previewHint}>Tap a slot to choose gear</Text>
              </View>
            </View>

            {setBonus ? (
              <View style={styles.setBanner}>
                <Text style={styles.setTitle}>✨ {setBonus.name} — Active</Text>
                <Text style={styles.setDesc}>{setBonus.description}</Text>
              </View>
            ) : (
              <Text style={styles.setMuted}>Equip one item per category for a set bonus</Text>
            )}

            <View style={styles.slotArena}>
              <View style={styles.slotRowCenter}>
                <SlotBox
                  label="Head"
                  slotKey="head"
                  compact={compact}
                  gear={getGearInstance(profile, equipment?.head)}
                  onPress={() => openPicker('head', 0)}
                  onUnequip={() => onUnequip?.('head', 0)}
                />
              </View>

              <View style={styles.slotRowMain}>
                <SlotBox
                  label="Wpn 1"
                  slotKey="weapon"
                  compact={compact}
                  gear={getGearInstance(profile, equipment?.weapon?.[0])}
                  onPress={() => openPicker('weapon', 0)}
                  onUnequip={() => onUnequip?.('weapon', 0)}
                />
                <View style={styles.bodyGap} />
                <SlotBox
                  label="Body"
                  slotKey="body"
                  compact={compact}
                  gear={getGearInstance(profile, equipment?.body)}
                  onPress={() => openPicker('body', 0)}
                  onUnequip={() => onUnequip?.('body', 0)}
                />
                <View style={styles.bodyGap} />
                <SlotBox
                  label="Wpn 2"
                  slotKey="weapon"
                  compact={compact}
                  gear={getGearInstance(profile, equipment?.weapon?.[1])}
                  onPress={() => openPicker('weapon', 1)}
                  onUnequip={() => onUnequip?.('weapon', 1)}
                />
              </View>

              <View style={styles.slotRowPair}>
                <SlotBox
                  label="Hand 1"
                  slotKey="hand"
                  compact={compact}
                  gear={getGearInstance(profile, equipment?.hand?.[0])}
                  onPress={() => openPicker('hand', 0)}
                  onUnequip={() => onUnequip?.('hand', 0)}
                />
                <SlotBox
                  label="Hand 2"
                  slotKey="hand"
                  compact={compact}
                  gear={getGearInstance(profile, equipment?.hand?.[1])}
                  onPress={() => openPicker('hand', 1)}
                  onUnequip={() => onUnequip?.('hand', 1)}
                />
              </View>

              <View style={styles.slotRowPair}>
                <SlotBox
                  label="Legs 1"
                  slotKey="legs"
                  compact={compact}
                  gear={getGearInstance(profile, equipment?.legs?.[0])}
                  onPress={() => openPicker('legs', 0)}
                  onUnequip={() => onUnequip?.('legs', 0)}
                />
                <SlotBox
                  label="Legs 2"
                  slotKey="legs"
                  compact={compact}
                  gear={getGearInstance(profile, equipment?.legs?.[1])}
                  onPress={() => openPicker('legs', 1)}
                  onUnequip={() => onUnequip?.('legs', 1)}
                />
              </View>
            </View>

            {fighter?.stats ? (
              <View style={styles.statsBox}>
                <Text style={styles.statsTitle}>Battle stats (with gear)</Text>
                <Text style={styles.statLine}>
                  <Text style={styles.statLbl}>HP </Text>
                  {fighter.stats.hp}
                </Text>
                <Text style={styles.statLine}>
                  <Text style={styles.statLbl}>ATK </Text>
                  {fighter.stats.attack?.min}–{fighter.stats.attack?.max}
                </Text>
                <Text style={styles.statLine}>
                  <Text style={styles.statLbl}>DEF </Text>
                  {fighter.stats.def?.min}–{fighter.stats.def?.max}
                </Text>
                <Text style={styles.statLine}>
                  <Text style={styles.statLbl}>Crit </Text>
                  {fighter.stats.critPct}% ·{' '}
                  <Text style={styles.statLbl}>Dodge </Text>
                  {fighter.stats.dodge ?? fighter.stats.dodgePct} ·{' '}
                  <Text style={styles.statLbl}>Hit </Text>
                  {fighter.stats.hitRate}
                </Text>
              </View>
            ) : null}
          </ScrollView>

          {picker ? (
            <View style={styles.picker}>
              <View style={styles.pickerHdr}>
                <Text style={styles.pickerTitle}>
                  {SLOT_ICONS[picker.slot]} {SLOT_LABELS[picker.slot]}
                  {picker.index > 0 ? ` ${picker.index + 1}` : ''}
                </Text>
                <TouchableOpacity onPress={() => setPicker(null)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                  <Text style={styles.pickerClose}>×</Text>
                </TouchableOpacity>
              </View>

              <ScrollView style={styles.pickerList} nestedScrollEnabled keyboardShouldPersistTaps="handled">
                {compatible.length === 0 ? (
                  <Text style={styles.muted}>No matching gear in inventory. Visit the shop or open chests.</Text>
                ) : (
                  compatible.map((g) => {
                    const ui = gearRarityUi(g.rarity);
                    const on = picker.selectedId === g.instanceId;
                    return (
                      <TouchableOpacity
                        key={g.instanceId}
                        style={[styles.pickRow, on && styles.pickRowOn, isMythicRarity(g.rarity) && styles.pickRowMythic]}
                        onPress={() => setPicker({ ...picker, selectedId: g.instanceId })}
                        activeOpacity={0.86}
                      >
                        <Text style={styles.pickEmoji}>{SET_EMOJI[g.set] ?? SLOT_ICONS[g.slot]}</Text>
                        <View style={styles.pickBody}>
                          <View style={styles.pickNameRow}>
                            <Text style={[styles.pickName, { color: ui.color }]}>{g.name}</Text>
                            <View style={[styles.rarityPill, { backgroundColor: ui.chipBg }]}>
                              <Text style={[styles.rarityPillTxt, { color: ui.chipFg }]}>{g.rarity}</Text>
                            </View>
                          </View>
                          <Text style={styles.pickMeta}>{g.setName} set · {formatGearStatLines(g.stats).join(' · ')}</Text>
                          {g.sockets?.length ? (
                            <Text style={styles.socketTxt}>◇ {g.sockets.length} socket(s)</Text>
                          ) : null}
                        </View>
                        {on ? <Text style={styles.pickCheck}>✓</Text> : null}
                      </TouchableOpacity>
                    );
                  })
                )}
              </ScrollView>

              {selectedGear ? (
                <View style={styles.compare}>
                  <Text style={styles.compareTitle}>Stat change</Text>
                  <View style={styles.compareCols}>
                    <View style={styles.compareCol}>
                      <Text style={styles.compareHdr}>Current</Text>
                      <Text style={styles.compareName}>{currentGear ? currentGear.name : '— Empty —'}</Text>
                      {(currentGear?.stats || []).map((s) => (
                        <Text key={`c-${s.type}`} style={styles.compareStat}>
                          {STAT_LABELS[s.type] ?? s.type}: +{s.value}
                        </Text>
                      ))}
                      {!currentGear ? <Text style={styles.compareEmpty}>No item equipped</Text> : null}
                    </View>
                    <Text style={styles.compareArrow}>→</Text>
                    <View style={styles.compareCol}>
                      <Text style={styles.compareHdr}>Selected</Text>
                      <Text style={[styles.compareName, { color: gearRarityUi(selectedGear.rarity).color }]}>
                        {selectedGear.name}
                      </Text>
                      {deltas.length === 0 ? (
                        <Text style={styles.compareStat}>Same stats</Text>
                      ) : (
                        deltas.map((d) => (
                          <Text
                            key={d.type}
                            style={[styles.compareDelta, d.diff > 0 ? styles.deltaPos : styles.deltaNeg]}
                          >
                            {STAT_LABELS[d.type] ?? d.type}: {d.diff > 0 ? '+' : ''}
                            {d.diff}
                          </Text>
                        ))
                      )}
                    </View>
                  </View>
                  {setPreview?.message ? <Text style={styles.setPreview}>{setPreview.message}</Text> : null}
                </View>
              ) : null}

              <View style={styles.pickerActions}>
                <TouchableOpacity style={styles.btnCancel} onPress={() => setPicker(null)}>
                  <Text style={styles.btnCancelTxt}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.btnEquip, !picker.selectedId && gearModalStyles.btnOff]}
                  disabled={!picker.selectedId}
                  onPress={confirmEquip}
                >
                  <Text style={styles.btnEquipTxt}>Equip</Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <TouchableOpacity style={gearModalStyles.closeBtn} onPress={onClose}>
              <Text style={gearModalStyles.closeTxt}>Done</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  hdr: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
  closeHit: { position: 'absolute', right: 0, top: -4, padding: 4 },
  closeTxt: { color: GEAR_UI.muted, fontSize: 32, fontWeight: '300' },
  scroll: { flex: 1, minHeight: 0 },
  scrollContent: { paddingBottom: 12 },
  previewRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: GEAR_UI.panel,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: GEAR_UI.panelBorder,
    padding: 10,
    marginBottom: 10,
  },
  previewMeta: { flex: 1, marginLeft: 10 },
  monsterName: { fontWeight: '900', color: GEAR_UI.title, fontSize: 16 },
  previewHint: { fontWeight: '800', color: GEAR_UI.sub, fontSize: 11, marginTop: 4 },
  setBanner: {
    backgroundColor: GEAR_UI.setActive,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: GEAR_UI.setActiveBorder,
    padding: 12,
    marginBottom: 12,
  },
  setTitle: { color: '#fff8dd', fontWeight: '900', fontSize: 14 },
  setDesc: { color: '#c4b5fd', fontSize: 12, marginTop: 4, fontWeight: '800' },
  setMuted: {
    color: GEAR_UI.muted,
    fontSize: 11,
    marginBottom: 10,
    textAlign: 'center',
    fontWeight: '800',
  },
  slotArena: { marginBottom: 12 },
  slotRowCenter: { alignItems: 'center', marginBottom: 8 },
  slotRowMain: { flexDirection: 'row', alignItems: 'stretch', marginBottom: 8 },
  slotRowPair: { flexDirection: 'row', gap: 8, marginBottom: 8 },
  bodyGap: { width: 8 },
  slotBox: {
    flex: 1,
    minHeight: 108,
    borderRadius: 12,
    borderWidth: 2,
    padding: 8,
    alignItems: 'center',
    justifyContent: 'flex-start',
  },
  slotBoxCompact: { minHeight: 96, padding: 6 },
  slotEmpty: {
    backgroundColor: GEAR_UI.slotEmptyBg,
    borderColor: GEAR_UI.slotEmptyBorder,
    borderStyle: 'dashed',
  },
  slotFilled: { backgroundColor: GEAR_UI.slotFilledBg },
  slotMythic: {
    borderWidth: 3,
    shadowColor: '#e84393',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.45,
    shadowRadius: 8,
    elevation: 4,
  },
  slotIcon: { fontSize: 22, marginBottom: 2 },
  slotLbl: { fontWeight: '900', fontSize: 9, color: GEAR_UI.muted, textTransform: 'uppercase' },
  slotName: { fontWeight: '900', fontSize: 10, textAlign: 'center', marginTop: 4 },
  slotStats: { fontWeight: '800', fontSize: 8, color: GEAR_UI.statPos, textAlign: 'center', marginTop: 2 },
  socketTxt: { fontWeight: '900', fontSize: 8, color: GEAR_UI.coins, marginTop: 2 },
  setEmoji: { fontSize: 14, marginTop: 2 },
  emptyPlus: { fontSize: 28, color: GEAR_UI.muted, marginTop: 8 },
  slotEmptyTxt: { fontWeight: '800', fontSize: 9, color: GEAR_UI.sub, marginTop: 4 },
  unequipBtn: {
    marginTop: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: GEAR_UI.btnDanger,
    borderWidth: 1,
    borderColor: GEAR_UI.btnDangerBorder,
  },
  unequipTxt: { color: '#fecaca', fontSize: 9, fontWeight: '900', textTransform: 'uppercase' },
  rarityPill: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6, marginTop: 4 },
  rarityPillTxt: { fontWeight: '900', fontSize: 8, textTransform: 'uppercase' },
  statsBox: {
    backgroundColor: GEAR_UI.panelDeep,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: GEAR_UI.accentSoft,
    padding: 12,
  },
  statsTitle: {
    fontWeight: '900',
    color: GEAR_UI.accent,
    marginBottom: 6,
    textTransform: 'uppercase',
    fontSize: 12,
  },
  statLine: { fontWeight: '800', color: '#d9f7ff', fontSize: 12, marginBottom: 4 },
  statLbl: { fontWeight: '900', color: GEAR_UI.title },
  picker: {
    borderTopWidth: 2,
    borderTopColor: GEAR_UI.pickerBorder,
    backgroundColor: GEAR_UI.picker,
    paddingHorizontal: 12,
    paddingTop: 10,
    paddingBottom: Platform.OS === 'ios' ? 8 : 4,
    maxHeight: '52%',
  },
  pickerHdr: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: GEAR_UI.accentSoft,
  },
  pickerTitle: { fontWeight: '900', color: GEAR_UI.title, fontSize: 14, flex: 1 },
  pickerClose: { color: GEAR_UI.muted, fontSize: 28, fontWeight: '300' },
  pickerList: { maxHeight: 130 },
  pickRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: GEAR_UI.panelBorder,
    backgroundColor: GEAR_UI.panel,
    marginBottom: 6,
    gap: 8,
  },
  pickRowOn: { borderColor: GEAR_UI.slotFilledBorder, backgroundColor: 'rgba(18, 53, 40, 0.55)' },
  pickRowMythic: { borderWidth: 2, borderColor: '#e84393' },
  pickEmoji: { fontSize: 26, width: 32, textAlign: 'center' },
  pickBody: { flex: 1, minWidth: 0 },
  pickNameRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 6 },
  pickName: { fontWeight: '900', fontSize: 13, flex: 1 },
  pickMeta: { fontWeight: '800', color: '#c4b5fd', fontSize: 11, marginTop: 3 },
  pickCheck: { fontWeight: '900', fontSize: 18, color: GEAR_UI.statPos },
  muted: { fontWeight: '800', color: GEAR_UI.muted, textAlign: 'center', padding: 12, lineHeight: 18 },
  compare: {
    marginTop: 8,
    padding: 10,
    borderRadius: 12,
    backgroundColor: GEAR_UI.panelDeep,
    borderWidth: 1,
    borderColor: GEAR_UI.accentSoft,
  },
  compareTitle: { fontWeight: '900', color: GEAR_UI.accent, fontSize: 11, textTransform: 'uppercase', marginBottom: 6 },
  compareCols: { flexDirection: 'row', alignItems: 'flex-start' },
  compareCol: { flex: 1 },
  compareHdr: { fontWeight: '900', color: GEAR_UI.muted, fontSize: 9, textTransform: 'uppercase' },
  compareName: { fontWeight: '900', color: GEAR_UI.title, fontSize: 12, marginTop: 2, marginBottom: 4 },
  compareStat: { fontWeight: '800', color: '#cbd5e1', fontSize: 10 },
  compareEmpty: { fontWeight: '800', color: GEAR_UI.muted, fontSize: 10, fontStyle: 'italic' },
  compareArrow: { fontWeight: '900', color: GEAR_UI.coins, fontSize: 16, paddingHorizontal: 6, paddingTop: 14 },
  compareDelta: { fontWeight: '900', fontSize: 11, marginTop: 2 },
  deltaPos: { color: GEAR_UI.statPos },
  deltaNeg: { color: GEAR_UI.statNeg },
  setPreview: { color: GEAR_UI.coins, fontSize: 11, marginTop: 8, fontWeight: '800', fontStyle: 'italic' },
  pickerActions: { flexDirection: 'row', gap: 10, marginTop: 10 },
  btnCancel: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 12,
    backgroundColor: GEAR_UI.btnSecondary,
    borderWidth: 1,
    borderColor: GEAR_UI.btnSecondaryBorder,
    borderBottomWidth: 4,
    borderBottomColor: '#1e293b',
  },
  btnCancelTxt: { color: GEAR_UI.tabTxtOn, fontWeight: '900', textTransform: 'uppercase', fontSize: 12 },
  btnEquip: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 12,
    backgroundColor: GEAR_UI.btnPrimary,
    borderWidth: 1,
    borderColor: GEAR_UI.btnPrimaryBorder,
    borderBottomWidth: 4,
    borderBottomColor: GEAR_UI.btnPrimaryEdge,
  },
  btnEquipTxt: { color: GEAR_UI.tabTxtOn, fontWeight: '900', textTransform: 'uppercase', fontSize: 12 },
});
