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
import { powerScoreFromBundle } from '../../../utils/statsCalc';
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
import {
  clampMergeTier,
  mergeCostForNextTier,
  MAX_MERGE_TIER,
  pickPrimaryInstance,
} from '../../../utils/mergeSystem';
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

function skillDescription(skill) {
  if (!skill) return '';
  const status = skill.status;
  if (status?.type === 'heal') {
    return `Heals in normal battle for ${status.healMaxHpPct ?? 20}% max HP. In dungeons, position-2 support heals the team.`;
  }
  if (status?.type === 'revive') {
    return `Revives a fallen teammate in dungeons/team battles at ${status.reviveHpPct ?? 40}% HP. Disabled in normal 1v1 battles.`;
  }
  if (status?.type === 'burn') return `Deals magic damage and can burn for ${status.turns ?? 2} turns.`;
  if (status?.type === 'poison') return `Deals magic damage and can poison for ${status.turns ?? 2} turns.`;
  if (status?.type === 'stun') return `Deals magic damage and can stun for ${status.turns ?? 1} turn.`;
  if (status?.type === 'atkDown') return `Deals magic damage and can reduce enemy Attack for ${status.turns ?? 2} turns.`;
  if (status?.type === 'defDown') return `Deals magic damage and can reduce enemy Defense for ${status.turns ?? 2} turns.`;
  if (status?.type === 'atkUp') return `Self buff: raises Attack for ${status.turns ?? 2} turns.`;
  if (status?.type === 'defUp') return `Self buff: raises Defense for ${status.turns ?? 2} turns.`;
  if (skill.kind === 'magic') {
    return `Magic attack${skill.power ? ` (${Math.round(skill.power * 100)}% power)` : ''}.`;
  }
  return `Basic physical attack${skill.power ? ` (${Math.round(skill.power * 100)}% power)` : ''}.`;
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

  const totalPower = useMemo(() => (
    fighter?.stats ? Math.round(powerScoreFromBundle(fighter.stats)) : 0
  ), [fighter]);

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
    const primary = pickPrimaryInstance(instances) ?? ownedMonster;
    const mergeTier = clampMergeTier(primary.mergeTier);
    const nextCost = mergeCostForNextTier(mergeTier);
    const extras = Math.max(0, instances.length - 1);
    return {
      primaryId: primary.id,
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
        selectedMergeInfo={mergeInfo}
        onMergeMonster={onMergeMonster}
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
          <Text style={[styles.infoLine, styles.progressLine]}>
            Lv {ownedMonster.level ?? 1} · EXP {ownedMonster.exp ?? 0}/
            {expToAdvanceFrom(ownedMonster.level ?? 1)}
          </Text>
          <Text style={[styles.infoLine, styles.powerLine]}>
            Total Power: {totalPower.toLocaleString()}
          </Text>
          <Text style={styles.infoTitle}>Skills</Text>
          {fighter?.skills?.physical ? (
            <View style={styles.skillInfoRow}>
              <Text style={styles.infoLine}>{skillLine(fighter.skills.physical)}</Text>
              <Text style={styles.skillDesc}>{skillDescription(fighter.skills.physical)}</Text>
            </View>
          ) : null}
          {(fighter?.skills?.magic ?? []).map((skill) => (
            <View key={skill.id ?? skill.name} style={styles.skillInfoRow}>
              <Text style={styles.infoLine}>{skillLine(skill)}</Text>
              <Text style={styles.skillDesc}>{skillDescription(skill)}</Text>
            </View>
          ))}
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
    borderColor: 'rgba(255,224,138,0.42)',
    backgroundColor: 'rgba(2, 8, 23, 0.94)',
  },
  infoTitle: {
    color: '#fde68a',
    fontWeight: '900',
    fontSize: 13,
    textTransform: 'uppercase',
    marginTop: 2,
    marginBottom: 4,
    textShadowColor: 'rgba(0,0,0,0.85)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  infoLine: {
    color: '#f8fafc',
    fontWeight: '900',
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 3,
    textShadowColor: 'rgba(0,0,0,0.8)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  progressLine: {
    color: '#ffffff',
    backgroundColor: 'rgba(15, 23, 42, 0.92)',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginBottom: 8,
  },
  powerLine: {
    color: '#fde68a',
    backgroundColor: 'rgba(69, 26, 3, 0.55)',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(250, 204, 21, 0.35)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginBottom: 8,
  },
  skillInfoRow: {
    marginBottom: 8,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.08)',
  },
  skillDesc: {
    color: '#cbd5e1',
    fontWeight: '800',
    fontSize: 11,
    lineHeight: 15,
    marginTop: 1,
  },
});
