import React from 'react';
import { StyleSheet, View } from 'react-native';
import MonsterPreview from '../../MonsterPreview';
import EquipmentSlotBox from './EquipmentSlotBox';
import PetSlotBox from './PetSlotBox';
import SkillSlotPanel from './SkillSlotPanel';

/**
 * MMORPG-style slot ring around the monster (center focus).
 */
export default function MonsterEquipmentLayout({
  fighter,
  equipment,
  profile,
  getGear,
  selectedSlot,
  onSelectGearSlot,
  equippedPet,
  equippedPassives,
  passiveSlotLimit,
  onSelectPet,
  onSelectSkills,
  compact,
}) {
  const gear = (slot, index = 0) => {
    const id =
      slot === 'head'
        ? equipment?.head
        : slot === 'body'
          ? equipment?.body
          : equipment?.[slot]?.[index];
    return id ? getGear(id) : null;
  };

  const isSelected = (kind, slot, index = 0) =>
    selectedSlot?.kind === kind && selectedSlot?.slot === slot && (selectedSlot?.index ?? 0) === index;

  const monsterSize = compact ? 110 : 130;

  return (
    <View style={styles.arena}>
      <View style={styles.rowCenter}>
        <EquipmentSlotBox
          label="Head"
          slotKey="head"
          gear={gear('head')}
          selected={isSelected('gear', 'head')}
          onPress={() => onSelectGearSlot('head', 0)}
          compact={compact}
        />
      </View>

      <View style={styles.rowWeapons}>
        <EquipmentSlotBox
          label="Weapon 1"
          slotKey="weapon"
          gear={gear('weapon', 0)}
          selected={isSelected('gear', 'weapon', 0)}
          onPress={() => onSelectGearSlot('weapon', 0)}
          compact={compact}
        />
        <View style={styles.spacer} />
        <EquipmentSlotBox
          label="Weapon 2"
          slotKey="weapon"
          gear={gear('weapon', 1)}
          selected={isSelected('gear', 'weapon', 1)}
          onPress={() => onSelectGearSlot('weapon', 1)}
          compact={compact}
        />
      </View>

      <View style={styles.rowCenter}>
        <EquipmentSlotBox
          label="Body"
          slotKey="body"
          gear={gear('body')}
          selected={isSelected('gear', 'body')}
          onPress={() => onSelectGearSlot('body', 0)}
          compact={compact}
        />
      </View>

      <View style={styles.rowHandsMonster}>
        <EquipmentSlotBox
          label="Hand 1"
          slotKey="hand"
          gear={gear('hand', 0)}
          selected={isSelected('gear', 'hand', 0)}
          onPress={() => onSelectGearSlot('hand', 0)}
          compact={compact}
        />
        <View style={styles.monsterCore}>
          <MonsterPreview
            templateId={fighter?.monsterTemplateId}
            monsterParts={fighter?.monsterParts}
            size={monsterSize}
            mood="happy"
          />
        </View>
        <EquipmentSlotBox
          label="Hand 2"
          slotKey="hand"
          gear={gear('hand', 1)}
          selected={isSelected('gear', 'hand', 1)}
          onPress={() => onSelectGearSlot('hand', 1)}
          compact={compact}
        />
      </View>

      <View style={styles.rowPetSkills}>
        <PetSlotBox
          pet={equippedPet}
          selected={selectedSlot?.kind === 'pet'}
          onPress={onSelectPet}
          compact={compact}
        />
        <View style={styles.monsterSpacer} />
        <SkillSlotPanel
          equippedPassives={equippedPassives}
          slotLimit={passiveSlotLimit}
          selected={selectedSlot?.kind === 'skills'}
          onPress={onSelectSkills}
          compact={compact}
        />
      </View>

      <View style={styles.rowLegs}>
        <EquipmentSlotBox
          label="Leg 1"
          slotKey="legs"
          gear={gear('legs', 0)}
          selected={isSelected('gear', 'legs', 0)}
          onPress={() => onSelectGearSlot('legs', 0)}
          compact={compact}
        />
        <View style={styles.spacerWide} />
        <EquipmentSlotBox
          label="Leg 2"
          slotKey="legs"
          gear={gear('legs', 1)}
          selected={isSelected('gear', 'legs', 1)}
          onPress={() => onSelectGearSlot('legs', 1)}
          compact={compact}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  arena: { alignItems: 'center', paddingVertical: 4 },
  rowCenter: { flexDirection: 'row', justifyContent: 'center', marginBottom: 6 },
  rowWeapons: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginBottom: 6, gap: 8 },
  rowHandsMonster: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
    gap: 6,
  },
  rowPetSkills: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
    gap: 6,
  },
  rowLegs: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  spacer: { width: 72 },
  spacerWide: { width: 88 },
  monsterSpacer: { width: 88 },
  monsterCore: {
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 100,
    minHeight: 100,
  },
});
