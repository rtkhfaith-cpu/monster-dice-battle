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
import { expToAdvanceFrom } from '../../../utils/expLevel';
import { getGearInstance } from '../../../src/gameSystems/gear/inventoryGearUtils';
import { getSlotInstanceId } from '../../../src/gameSystems/gear/equipmentSystem';
import { detectActiveGearSet, previewSetBonusChange } from '../../../src/gameSystems/gear/gearSets';
import { listUnequippedBooks, monsterEquippedPassives } from '../../../src/gameSystems/passiveInventory';
import { passiveSlotLimitForRarity } from '../../../src/gameSystems/passiveSkills';
import { petEquippedToMonster } from '../../../src/gameSystems/petInventory';
import { getMonsterTemplate } from '../../../utils/monsterTemplates';
import { getLadderMonsterTemplate } from '../../../utils/monsterLadder/ladderMonsterCatalog';
import {
  getBattleRoster,
  pickBattleInstance,
  rosterInstancesForTemplate,
} from '../../../utils/rosterInventory';
import { clampMergeTier, mergeCostForNextTier, MAX_MERGE_TIER } from '../../../utils/mergeSystem';
import { GEAR_UI, gearModalStyles } from '../gearUiTheme';
import MonsterEquipmentLayout from './MonsterEquipmentLayout';
import MonsterFinalStatsPanel from './MonsterFinalStatsPanel';
import MonsterSelectorRow from './MonsterSelectorRow';
import SetBonusPanel from './SetBonusPanel';
import CompatibleItemPanel from './CompatibleItemPanel';
import PetSlotBox from './PetSlotBox';
import SkillSlotPanel from './SkillSlotPanel';

const PET_RARITY_COLOR = { rare: '#60a5fa', epic: '#c084fc', mythic: '#f472b6' };

function skillLine(skill) {
  if (!skill?.name) return null;
  if (skill.kind === 'magic') return `${skill.emoji ?? '✨'} ${skill.name} · ${skill.mpCost ?? 0} MP`;
  return `${skill.emoji ?? '👊'} ${skill.name}`;
}

/**
 * MMORPG-style equipment screen — monster center, slots around, bottom sheet on slot tap.
 */
export default function EquipmentScreen({
  ownedMonster,
  profile,
  coins,
  ownedMonsters,
  battleMonsterId,
  onSelectMonster,
  onClose,
  onEquip,
  onUnequip,
  onEquipPet,
  onUnequipPet,
  onEquipPassiveBook,
  onRemovePassive,
  onMergeMonster,
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

  const selectorMonsters = useMemo(
    () => getBattleRoster({ ownedMonsters }),
    [ownedMonsters],
  );

  const selectorSelectedId = useMemo(() => {
    if (!ownedMonster) return null;
    if (selectorMonsters.some((m) => m.id === ownedMonster.id)) return ownedMonster.id;
    const instances = rosterInstancesForTemplate(ownedMonsters ?? [], ownedMonster.templateId);
    return pickBattleInstance(instances)?.id ?? ownedMonster.id;
  }, [ownedMonster, ownedMonsters, selectorMonsters]);

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

  const mergeInfo = useMemo(() => {
    if (!ownedMonster) return null;
    const instances = rosterInstancesForTemplate(ownedMonsters ?? [], ownedMonster.templateId);
    const mergeTier = clampMergeTier(ownedMonster.mergeTier);
    const nextCost = mergeCostForNextTier(mergeTier);
    const extras = Math.max(0, instances.length - 1);
    return {
      mergeTier,
      nextCost,
      extras,
      canMerge: nextCost != null && extras >= nextCost,
      isMax: mergeTier >= MAX_MERGE_TIER,
    };
  }, [ownedMonster, ownedMonsters]);

  const getGear = (instanceId) => getGearInstance(profile, instanceId);

  const currentGear =
    selectedSlot?.kind === 'gear'
      ? getGear(getSlotInstanceId(equipment, selectedSlot.slot, selectedSlot.index ?? 0))
      : null;

  const compatibleGear = useMemo(() => {
    if (selectedSlot?.kind !== 'gear' || !profile?.gearInventory) return [];
    return profile.gearInventory.filter(
      (g) => g.slot === selectedSlot.slot && !g.equippedToMonsterId,
    );
  }, [selectedSlot, profile]);

  const pets = useMemo(() => {
    const all = profile?.ownedPets ?? [];
    return all.filter((p) => p.equippedToMonsterId !== ownedMonster?.id);
  }, [profile, ownedMonster?.id]);

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
        monsters={selectorMonsters}
        selectedId={selectorSelectedId}
        battleMonsterId={battleMonsterId}
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
            petSlotNode={(
              <PetSlotBox
                pet={equippedPet}
                selected={selectedSlot?.kind === 'pet'}
                onPress={openPetSlot}
                compact={compact}
              />
            )}
            skillSlotNode={(
              <SkillSlotPanel
                equippedPassives={equippedPassives}
                slotLimit={passiveLimit}
                selected={selectedSlot?.kind === 'skills'}
                onPress={openSkillsSlot}
                compact={compact}
              />
            )}
          />
        </View>

        <MonsterFinalStatsPanel fighter={fighter} compact={compact} />

        <View style={styles.infoPanel}>
          <Text style={styles.infoTitle}>Monster Progress</Text>
          <Text style={styles.infoLine}>
            Lv {ownedMonster.level ?? 1} · EXP {ownedMonster.exp ?? 0}/
            {expToAdvanceFrom(ownedMonster.level ?? 1)}
          </Text>
          <Text style={styles.infoTitle}>Skills</Text>
          {fighter?.skills?.physical ? (
            <Text style={styles.infoLine}>{skillLine(fighter.skills.physical)}</Text>
          ) : null}
          {(fighter?.skills?.magic ?? []).map((skill) => (
            <Text key={skill.id ?? skill.name} style={styles.infoLine}>
              {skillLine(skill)}
            </Text>
          ))}
          {mergeInfo ? (
            <View style={styles.mergePanel}>
              <View style={styles.mergeTextWrap}>
                <Text style={styles.infoTitle}>Merge</Text>
                <Text style={styles.infoLine}>
                  Current +{mergeInfo.mergeTier} · Extras {mergeInfo.extras}
                  {mergeInfo.nextCost != null ? `/${mergeInfo.nextCost}` : ''}
                </Text>
              </View>
              {mergeInfo.isMax ? (
                <View style={styles.mergeMax}>
                  <Text style={styles.mergeMaxTxt}>MAX</Text>
                </View>
              ) : (
                <TouchableOpacity
                  style={[styles.mergeBtn, !mergeInfo.canMerge && styles.mergeBtnOff]}
                  disabled={!mergeInfo.canMerge}
                  onPress={() => onMergeMonster?.(ownedMonster.id)}
                >
                  <Text style={styles.mergeBtnTxt}>Merge +{mergeInfo.mergeTier + 1}</Text>
                </TouchableOpacity>
              )}
            </View>
          ) : null}
        </View>
      </ScrollView>

      <CompatibleItemPanel
        selectedSlot={selectedSlot}
        currentGear={currentGear}
        compatibleGear={compatibleGear}
        selectedGearId={selectedGearId}
        onSelectGear={setSelectedGearId}
        setPreviewMessage={setPreviewMessage}
        pets={pets}
        ownedMonsters={ownedMonsters}
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
  empty: { padding: 24, alignItems: 'center' },
  emptyTxt: { color: GEAR_UI.muted, fontWeight: '800', marginBottom: 16 },
  infoPanel: {
    marginTop: 10,
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,224,138,0.28)',
    backgroundColor: 'rgba(7, 17, 32, 0.72)',
  },
  infoTitle: {
    color: GEAR_UI.accent,
    fontWeight: '900',
    fontSize: 12,
    textTransform: 'uppercase',
    marginTop: 2,
    marginBottom: 4,
  },
  infoLine: {
    color: GEAR_UI.text,
    fontWeight: '800',
    fontSize: 12,
    lineHeight: 17,
    marginBottom: 3,
  },
  mergePanel: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,224,138,0.18)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  mergeTextWrap: { flex: 1 },
  mergeBtn: {
    borderRadius: 999,
    backgroundColor: '#7c3aed',
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  mergeBtnOff: {
    backgroundColor: 'rgba(71, 85, 105, 0.8)',
    opacity: 0.75,
  },
  mergeBtnTxt: { color: '#fff', fontWeight: '900', fontSize: 12 },
  mergeMax: {
    borderRadius: 999,
    backgroundColor: 'rgba(250, 204, 21, 0.18)',
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  mergeMaxTxt: { color: '#fde68a', fontWeight: '900', fontSize: 12 },
});
