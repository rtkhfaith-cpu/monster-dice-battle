import React, { useMemo, useState } from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from 'react-native';
import { fighterFromOwned } from '../../../utils/fighterFromOwned';
import { getGearInstance } from '../../../src/gameSystems/gear/inventoryGearUtils';
import { getSlotInstanceId } from '../../../src/gameSystems/gear/equipmentSystem';
import { detectActiveGearSet, previewSetBonusChange } from '../../../src/gameSystems/gear/gearSets';
import { listUnequippedBooks, monsterEquippedPassives } from '../../../src/gameSystems/passiveInventory';
import { passiveSlotLimitForRarity } from '../../../src/gameSystems/passiveSkills';
import { petEquippedToMonster } from '../../../src/gameSystems/petInventory';
import { getMonsterTemplate } from '../../../utils/monsterTemplates';
import { getLadderMonsterTemplate } from '../../../utils/monsterLadder/ladderMonsterCatalog';
import { GEAR_UI, gearModalStyles } from '../gearUiTheme';
import MonsterEquipmentLayout from './MonsterEquipmentLayout';
import MonsterFinalStatsPanel from './MonsterFinalStatsPanel';
import MonsterSelectorRow from './MonsterSelectorRow';
import SetBonusPanel from './SetBonusPanel';
import CompatibleItemPanel from './CompatibleItemPanel';
import PetSlotBox from './PetSlotBox';
import SkillSlotPanel from './SkillSlotPanel';

const PET_RARITY_COLOR = { rare: '#60a5fa', epic: '#c084fc', mythic: '#f472b6' };

/**
 * MMORPG-style equipment screen — monster center, slots around, bottom sheet on slot tap.
 */
export default function EquipmentScreen({
  ownedMonster,
  profile,
  coins,
  ownedMonsters,
  onSelectMonster,
  onClose,
  onEquip,
  onUnequip,
  onEquipPet,
  onUnequipPet,
  onEquipPassiveBook,
  onRemovePassive,
}) {
  const { width, height } = useWindowDimensions();
  const compact = width < 380 || height < 640;
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [selectedGearId, setSelectedGearId] = useState(null);
  const [selectedPetId, setSelectedPetId] = useState(null);
  const [selectedBookId, setSelectedBookId] = useState(null);

  const fighter = useMemo(() => {
    if (!ownedMonster) return null;
    return fighterFromOwned(ownedMonster, profile);
  }, [ownedMonster, profile]);

  const equipment = ownedMonster?.equipment;
  const tpl = getMonsterTemplate(ownedMonster?.templateId) ?? getLadderMonsterTemplate(ownedMonster?.templateId);
  const passiveLimit = passiveSlotLimitForRarity(tpl?.rarity ?? 'common');
  const equippedPassives = monsterEquippedPassives(ownedMonster);
  const passiveBooks = useMemo(() => listUnequippedBooks(profile), [profile]);

  const equippedPetRow = petEquippedToMonster(profile, ownedMonster?.id);
  const equippedPet = equippedPetRow
    ? {
        ...equippedPetRow,
        rarityColor: PET_RARITY_COLOR[equippedPetRow.rarity],
      }
    : null;

  const setBonus = useMemo(
    () => (profile && equipment ? detectActiveGearSet(profile, equipment) : null),
    [profile, equipment],
  );

  const getGear = (instanceId) => getGearInstance(profile, instanceId);

  const currentGear =
    selectedSlot?.kind === 'gear'
      ? getGear(getSlotInstanceId(equipment, selectedSlot.slot, selectedSlot.index ?? 0))
      : null;

  const compatibleGear = useMemo(() => {
    if (selectedSlot?.kind !== 'gear' || !profile?.gearInventory) return [];
    return profile.gearInventory.filter(
      (g) =>
        g.slot === selectedSlot.slot
        && (!g.equippedToMonsterId || g.equippedToMonsterId === ownedMonster?.id),
    );
  }, [selectedSlot, profile, ownedMonster?.id]);

  const pets = useMemo(() => profile?.ownedPets ?? [], [profile]);

  const setPreviewMessage = useMemo(() => {
    if (selectedSlot?.kind !== 'gear' || !selectedGearId) return null;
    const preview = previewSetBonusChange(
      profile,
      equipment,
      selectedGearId,
      selectedSlot.slot,
      selectedSlot.index ?? 0,
    );
    return preview?.message ?? null;
  }, [selectedSlot, selectedGearId, profile, equipment]);

  function openGearSlot(slot, index = 0) {
    setSelectedSlot({ kind: 'gear', slot, index });
    setSelectedGearId(null);
    setSelectedPetId(null);
    setSelectedBookId(null);
  }

  function openPetSlot() {
    setSelectedSlot({ kind: 'pet' });
    setSelectedGearId(null);
    setSelectedPetId(equippedPetRow?.instanceId ?? null);
    setSelectedBookId(null);
  }

  function openSkillsSlot() {
    setSelectedSlot({ kind: 'skills' });
    setSelectedGearId(null);
    setSelectedPetId(null);
    setSelectedBookId(null);
  }

  function closePanel() {
    setSelectedSlot(null);
    setSelectedGearId(null);
    setSelectedPetId(null);
    setSelectedBookId(null);
  }

  function handleEquip() {
    if (selectedSlot?.kind === 'gear' && selectedGearId) {
      onEquip?.(selectedGearId, selectedSlot.slot, selectedSlot.index ?? 0);
      closePanel();
      return;
    }
    if (selectedSlot?.kind === 'pet' && selectedPetId) {
      onEquipPet?.(selectedPetId);
      closePanel();
      return;
    }
    if (selectedSlot?.kind === 'skills' && selectedBookId) {
      onEquipPassiveBook?.(selectedBookId);
      closePanel();
    }
  }

  function handleUnequip() {
    if (selectedSlot?.kind === 'gear') {
      onUnequip?.(selectedSlot.slot, selectedSlot.index ?? 0);
      closePanel();
      return;
    }
    if (selectedSlot?.kind === 'pet') {
      onUnequipPet?.();
      closePanel();
    }
  }

  if (!ownedMonster) {
    return (
      <View style={styles.empty}>
        <Text style={styles.emptyTxt}>Select a monster to equip gear.</Text>
        {onClose ? (
          <TouchableOpacity style={gearModalStyles.closeBtn} onPress={onClose}>
            <Text style={gearModalStyles.closeTxt}>Done</Text>
          </TouchableOpacity>
        ) : null}
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <View style={styles.topBar}>
        <TouchableOpacity onPress={onClose} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
          <Text style={styles.back}>← Done</Text>
        </TouchableOpacity>
        <View style={styles.topCenter}>
          <Text style={styles.screenTitle}>Equipment</Text>
          <Text style={styles.monsterTitle} numberOfLines={1}>
            {ownedMonster.nickname ?? ownedMonster.templateId}
          </Text>
        </View>
        {typeof coins === 'number' ? (
          <Text style={styles.coins}>🪙 {coins}</Text>
        ) : (
          <View style={styles.coinsSpacer} />
        )}
      </View>

      <MonsterSelectorRow
        monsters={ownedMonsters}
        selectedId={ownedMonster.id}
        onSelect={onSelectMonster}
      />

      <SetBonusPanel setBonus={setBonus} progress={null} />

      <ScrollView
        style={styles.contentScroll}
        contentContainerStyle={styles.contentInner}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={[styles.equipStage, selectedSlot && styles.dim]}>
          <MonsterEquipmentLayout
            fighter={fighter}
            equipment={equipment}
            getGear={getGear}
            selectedSlot={selectedSlot}
            onSelectGearSlot={openGearSlot}
            compact={compact}
          />
        </View>

        <View style={styles.petSkillRow}>
          <PetSlotBox
            pet={equippedPet}
            selected={selectedSlot?.kind === 'pet'}
            onPress={openPetSlot}
            compact={compact}
          />
          <SkillSlotPanel
            equippedPassives={equippedPassives}
            slotLimit={passiveLimit}
            selected={selectedSlot?.kind === 'skills'}
            onPress={openSkillsSlot}
            compact={compact}
          />
        </View>

        <MonsterFinalStatsPanel fighter={fighter} compact={compact} />
      </ScrollView>

      <CompatibleItemPanel
        selectedSlot={selectedSlot}
        currentGear={currentGear}
        compatibleGear={compatibleGear}
        selectedGearId={selectedGearId}
        onSelectGear={setSelectedGearId}
        setPreviewMessage={setPreviewMessage}
        pets={pets}
        equippedPetId={equippedPetRow?.instanceId}
        selectedPetId={selectedPetId}
        onSelectPet={setSelectedPetId}
        passiveBooks={passiveBooks}
        equippedPassives={equippedPassives}
        passiveSlotLimit={passiveLimit}
        monster={ownedMonster}
        selectedBookId={selectedBookId}
        onSelectBook={setSelectedBookId}
        onEquip={handleEquip}
        onUnequip={handleUnequip}
        onRemovePassive={onRemovePassive}
        onClose={closePanel}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, minHeight: 0 },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    paddingHorizontal: 2,
  },
  back: { color: GEAR_UI.accent, fontWeight: '900', fontSize: 14, minWidth: 72 },
  topCenter: { flex: 1, alignItems: 'center' },
  screenTitle: {
    fontWeight: '900',
    color: GEAR_UI.title,
    fontSize: 18,
    textShadowColor: GEAR_UI.titleShadow,
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  monsterTitle: { fontWeight: '800', color: GEAR_UI.sub, fontSize: 12, marginTop: 2 },
  coins: { color: GEAR_UI.coins, fontWeight: '900', fontSize: 13, minWidth: 72, textAlign: 'right' },
  coinsSpacer: { minWidth: 72 },
  contentScroll: { flex: 1 },
  contentInner: { paddingBottom: 12 },
  equipStage: {
    alignSelf: 'stretch',
    alignItems: 'center',
    paddingTop: 4,
  },
  dim: { opacity: 0.92 },
  petSkillRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'flex-start',
    gap: 10,
    marginTop: 4,
    marginBottom: 8,
  },
  empty: { padding: 24, alignItems: 'center' },
  emptyTxt: { color: GEAR_UI.muted, fontWeight: '800', marginBottom: 16 },
});
