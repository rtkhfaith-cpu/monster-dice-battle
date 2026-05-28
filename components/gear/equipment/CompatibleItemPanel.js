import React from 'react';
import {
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { formatGearStatLines } from '../../../src/gameSystems/gear/gearGenerator';
import {
  canEquipPassive,
  listUnequippedBooks,
} from '../../../src/gameSystems/passiveInventory';
import {
  getPassiveDescription,
  getPassiveSkillDef,
} from '../../../src/gameSystems/passiveSkills';
import { calculatePetStats } from '../../../src/gameSystems/pets';
import { describePetSkill } from '../../../src/gameSystems/petSkills';
import GearComparisonPanel from './GearComparisonPanel';
import { GEAR_UI, GearIcon, gearRarityUi, isMythicRarity } from '../gearUiTheme';

const SLOT_TITLES = {
  head: 'Head',
  body: 'Body',
  weapon: 'Weapon',
  hand: 'Hand',
  legs: 'Legs',
};

const PASSIVE_RARITY = { rare: '#60a5fa', epic: '#c084fc', legendary: '#fbbf24', mythic: '#f472b6' };
const PET_RARITY = { rare: '#60a5fa', epic: '#c084fc', mythic: '#f472b6' };

export default function CompatibleItemPanel({
  selectedSlot,
  currentGear,
  compatibleGear,
  selectedGearId,
  onSelectGear,
  setPreviewMessage,
  pets,
  equippedPetId,
  selectedPetId,
  onSelectPet,
  passiveBooks,
  equippedPassives,
  passiveSlotLimit,
  monster,
  selectedBookId,
  onSelectBook,
  onEquip,
  onUnequip,
  onClose,
}) {
  if (!selectedSlot) return null;

  const kind = selectedSlot.kind;

  let title = 'Select item';
  if (kind === 'gear') {
    const base = SLOT_TITLES[selectedSlot.slot] ?? selectedSlot.slot;
    title = `${base}${selectedSlot.index > 0 ? ` ${selectedSlot.index + 1}` : ''}`;
  } else if (kind === 'pet') title = 'Pet';
  else if (kind === 'skills') title = 'Passive skills';

  const selectedGear = compatibleGear?.find((g) => g.instanceId === selectedGearId);

  return (
    <View style={styles.panel}>
      <View style={styles.hdr}>
        <Text style={styles.title}>{title}</Text>
        <TouchableOpacity onPress={onClose} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Text style={styles.close}>×</Text>
        </TouchableOpacity>
      </View>

      {kind === 'gear' && currentGear ? (
        <View style={styles.currentRow}>
          <Text style={styles.currentLbl}>Equipped: </Text>
          <Text style={[styles.currentName, { color: gearRarityUi(currentGear.rarity).color }]}>
            {currentGear.name}
          </Text>
        </View>
      ) : null}

      <ScrollView style={styles.list} nestedScrollEnabled keyboardShouldPersistTaps="handled">
        {kind === 'gear' ? (
          <>
            {currentGear ? (
              <TouchableOpacity style={styles.clearRow} onPress={onUnequip}>
                <Text style={styles.clearTxt}>Unequip current item</Text>
              </TouchableOpacity>
            ) : null}
            {compatibleGear?.length === 0 ? (
              <Text style={styles.muted}>No matching gear in your stash. Visit Gear Mart or open chests.</Text>
            ) : (
              compatibleGear.map((g) => {
                const ui = gearRarityUi(g.rarity);
                const on = selectedGearId === g.instanceId;
                const onOther = g.equippedToMonsterId && g.equippedToMonsterId !== monster?.id;
                return (
                  <TouchableOpacity
                    key={g.instanceId}
                    style={[styles.row, on && styles.rowOn, isMythicRarity(g.rarity) && styles.rowMythic]}
                    onPress={() => onSelectGear(g.instanceId)}
                    activeOpacity={0.86}
                  >
                    <View style={styles.rowEmojiBox}>
                      <GearIcon gear={g} size={24} />
                    </View>
                    <View style={styles.rowBody}>
                      <Text style={[styles.rowName, { color: ui.color }]}>{g.name}</Text>
                      <Text style={styles.rowMeta}>
                        {g.rarity} · {g.setName}
                        {` · Socket: ${Math.max(0, g.sockets?.length ?? 0)}`}
                      </Text>
                      <Text style={styles.rowStats}>{formatGearStatLines(g.stats).join(' · ')}</Text>
                      {onOther ? <Text style={styles.otherMon}>On another monster</Text> : null}
                    </View>
                    {on ? <Text style={styles.check}>✓</Text> : null}
                  </TouchableOpacity>
                );
              })
            )}
            <GearComparisonPanel
              currentGear={currentGear}
              selectedGear={selectedGear}
              setPreviewMessage={setPreviewMessage}
            />
          </>
        ) : null}

        {kind === 'pet' ? (
          <>
            {equippedPetId ? (
              <TouchableOpacity style={styles.clearRow} onPress={onUnequip}>
                <Text style={styles.clearTxt}>Unequip pet</Text>
              </TouchableOpacity>
            ) : null}
            {pets?.length === 0 ? (
              <Text style={styles.muted}>No pets owned. Get pets from the Gear Mart.</Text>
            ) : (
              pets.map((p) => {
                const stats = calculatePetStats({ rarity: p.rarity, level: p.level });
                const on = selectedPetId === p.instanceId;
                const elsewhere = p.equippedToMonsterId && p.equippedToMonsterId !== monster?.id;
                return (
                  <TouchableOpacity
                    key={p.instanceId}
                    style={[styles.row, on && styles.rowOn]}
                    onPress={() => onSelectPet(p.instanceId)}
                    disabled={elsewhere}
                    activeOpacity={0.86}
                  >
                    <Text style={styles.rowEmoji}>{p.emoji}</Text>
                    <View style={styles.rowBody}>
                      <Text style={[styles.rowName, { color: PET_RARITY[p.rarity] }]}>
                        {p.name} · Lv {p.level}
                      </Text>
                      <Text style={styles.rowStats}>
                        HP+{stats.hp} ATK+{stats.atk} · {(p.skills || [])
                          .map((s) => describePetSkill(s, p.rarity))
                          .join(' · ')}
                      </Text>
                      {elsewhere ? <Text style={styles.otherMon}>Equipped elsewhere</Text> : null}
                    </View>
                    {on ? <Text style={styles.check}>✓</Text> : null}
                  </TouchableOpacity>
                );
              })
            )}
          </>
        ) : null}

        {kind === 'skills' ? (
          <>
            {equippedPassives?.map((p) => {
              const def = getPassiveSkillDef(p.skillId);
              return (
                <View key={p.skillId} style={styles.skillEquipped}>
                  <View style={styles.rowBody}>
                    <Text style={[styles.rowName, { color: PASSIVE_RARITY[p.rarity] }]}>
                      {def?.name ?? p.skillId}
                    </Text>
                    <Text style={styles.rowStats}>{getPassiveDescription(p.skillId, p.rarity)}</Text>
                  </View>
                  <TouchableOpacity style={styles.removeBtn} onPress={() => onUnequip?.(p.skillId)}>
                    <Text style={styles.removeTxt}>Remove</Text>
                  </TouchableOpacity>
                </View>
              );
            })}
            {equippedPassives?.length < passiveSlotLimit ? (
              passiveBooks?.length === 0 ? (
                <Text style={styles.muted}>No skill books in inventory.</Text>
              ) : (
                passiveBooks.map((book) => {
                  const check = canEquipPassive(monster, book, equippedPassives);
                  const def = getPassiveSkillDef(book.skillId);
                  const on = selectedBookId === book.instanceId;
                  return (
                    <TouchableOpacity
                      key={book.instanceId}
                      style={[styles.row, on && styles.rowOn, !check.ok && styles.rowOff]}
                      disabled={!check.ok}
                      onPress={() => onSelectBook(book.instanceId)}
                    >
                      <View style={styles.rowBody}>
                        <Text style={[styles.rowName, { color: PASSIVE_RARITY[book.rarity] }]}>
                          {def?.name ?? book.skillName}
                        </Text>
                        <Text style={styles.rowStats}>
                          {getPassiveDescription(book.skillId, book.rarity)}
                        </Text>
                        {!check.ok ? <Text style={styles.err}>{check.error}</Text> : null}
                      </View>
                      {on ? <Text style={styles.check}>✓</Text> : null}
                    </TouchableOpacity>
                  );
                })
              )
            ) : (
              <Text style={styles.muted}>All passive slots filled.</Text>
            )}
          </>
        ) : null}
      </ScrollView>

      <View style={styles.actions}>
        <TouchableOpacity style={styles.btnCancel} onPress={onClose}>
          <Text style={styles.btnCancelTxt}>Close</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.btnPrimary,
            (kind === 'gear' && !selectedGearId) ||
            (kind === 'pet' && !selectedPetId) ||
            (kind === 'skills' && !selectedBookId)
              ? styles.btnOff
              : null,
          ]}
          disabled={
            (kind === 'gear' && !selectedGearId) ||
            (kind === 'pet' && !selectedPetId) ||
            (kind === 'skills' && !selectedBookId)
          }
          onPress={onEquip}
        >
          <Text style={styles.btnPrimaryTxt}>
            {kind === 'gear' ? (currentGear ? 'Replace' : 'Equip') : kind === 'pet' ? 'Equip pet' : 'Equip skill'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  panel: {
    borderTopWidth: 2,
    borderTopColor: GEAR_UI.pickerBorder,
    backgroundColor: GEAR_UI.picker,
    paddingHorizontal: 12,
    paddingTop: 10,
    paddingBottom: Platform.OS === 'ios' ? 12 : 8,
    maxHeight: '48%',
  },
  hdr: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: GEAR_UI.accentSoft,
  },
  title: { fontWeight: '900', color: GEAR_UI.title, fontSize: 15, flex: 1 },
  close: { color: GEAR_UI.muted, fontSize: 28, fontWeight: '300' },
  currentRow: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: 8, alignItems: 'center' },
  currentLbl: { fontWeight: '800', color: GEAR_UI.muted, fontSize: 11 },
  currentName: { fontWeight: '900', fontSize: 12 },
  list: { maxHeight: 220 },
  clearRow: {
    padding: 10,
    marginBottom: 8,
    borderRadius: 10,
    backgroundColor: GEAR_UI.btnDanger,
    borderWidth: 1,
    borderColor: GEAR_UI.btnDangerBorder,
    alignItems: 'center',
  },
  clearTxt: { color: '#fecaca', fontWeight: '900', fontSize: 12 },
  row: {
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
  rowOn: { borderColor: GEAR_UI.slotFilledBorder, backgroundColor: 'rgba(18, 53, 40, 0.55)' },
  rowMythic: { borderWidth: 2, borderColor: '#e84393' },
  rowOff: { opacity: 0.45 },
  rowEmoji: { fontSize: 24, width: 32, textAlign: 'center' },
  rowEmojiBox: { width: 36, alignItems: 'center', justifyContent: 'center' },
  rowBody: { flex: 1, minWidth: 0 },
  rowName: { fontWeight: '900', fontSize: 13 },
  rowMeta: { fontWeight: '800', color: '#c4b5fd', fontSize: 10, marginTop: 2 },
  rowStats: { fontWeight: '800', color: GEAR_UI.sub, fontSize: 10, marginTop: 3 },
  otherMon: { color: GEAR_UI.statNeg, fontSize: 9, fontWeight: '900', marginTop: 4 },
  check: { fontWeight: '900', fontSize: 18, color: GEAR_UI.statPos },
  muted: { fontWeight: '800', color: GEAR_UI.muted, textAlign: 'center', padding: 16, lineHeight: 18 },
  skillEquipped: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    marginBottom: 6,
    borderRadius: 12,
    backgroundColor: GEAR_UI.panel,
    borderWidth: 1,
    borderColor: GEAR_UI.panelBorder,
  },
  removeBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: GEAR_UI.btnDanger,
  },
  removeTxt: { color: '#fecaca', fontWeight: '900', fontSize: 10 },
  err: { color: GEAR_UI.statNeg, fontSize: 10, marginTop: 4 },
  actions: { flexDirection: 'row', gap: 10, marginTop: 10 },
  btnCancel: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 12,
    backgroundColor: GEAR_UI.btnSecondary,
    borderWidth: 1,
    borderColor: GEAR_UI.btnSecondaryBorder,
  },
  btnCancelTxt: { color: GEAR_UI.tabTxtOn, fontWeight: '900', fontSize: 12 },
  btnPrimary: {
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
  btnPrimaryTxt: { color: GEAR_UI.tabTxtOn, fontWeight: '900', fontSize: 12 },
  btnOff: { opacity: 0.45 },
});
