import React from 'react';
import { StyleSheet, View } from 'react-native';
import MonsterPreview from '../../MonsterPreview';
import EquipmentSlotBox from './EquipmentSlotBox';

/**
 * MMORPG-style equipment stage — monster centered, slots arranged neatly around.
 *
 * Row order (top → bottom, no overlap with monster):
 *   1) HEAD
 *   2) WEAPON 1  ·  WEAPON 2
 *   3) HAND 1  ·  MONSTER  ·  HAND 2
 *   4) BODY
 *   5) LEG 1  ·  LEG 2
 */
export default function MonsterEquipmentLayout({
  fighter,
  equipment,
  getGear,
  selectedSlot,
  onSelectGearSlot,
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

  const isSelected = (slot, index = 0) =>
    selectedSlot?.kind === 'gear'
    && selectedSlot?.slot === slot
    && (selectedSlot?.index ?? 0) === index;

  const monsterSize = compact ? 120 : 140;
  const sideGap = compact ? 6 : 8;

  const SpacerCenter = () => (
    <View style={[styles.centerCol, { width: monsterSize, marginHorizontal: sideGap }]} />
  );

  return (
    <View style={styles.stage}>
      {/* Row 1: HEAD */}
      <View style={styles.rowCenter}>
        <EquipmentSlotBox
          label="Head"
          slotKey="head"
          gear={gear('head')}
          selected={isSelected('head')}
          onPress={() => onSelectGearSlot('head', 0)}
          compact={compact}
        />
      </View>

      {/* Row 2: WEAPON 1 · WEAPON 2 */}
      <View style={styles.rowSides}>
        <EquipmentSlotBox
          label="Wpn 1"
          slotKey="weapon"
          gear={gear('weapon', 0)}
          selected={isSelected('weapon', 0)}
          onPress={() => onSelectGearSlot('weapon', 0)}
          compact={compact}
        />
        <SpacerCenter />
        <EquipmentSlotBox
          label="Wpn 2"
          slotKey="weapon"
          gear={gear('weapon', 1)}
          selected={isSelected('weapon', 1)}
          onPress={() => onSelectGearSlot('weapon', 1)}
          compact={compact}
        />
      </View>

      {/* Row 3: HAND · MONSTER · HAND (monster is the visual center) */}
      <View style={styles.rowMonster}>
        <EquipmentSlotBox
          label="Hand 1"
          slotKey="hand"
          gear={gear('hand', 0)}
          selected={isSelected('hand', 0)}
          onPress={() => onSelectGearSlot('hand', 0)}
          compact={compact}
        />
        <View
          style={[
            styles.monsterCore,
            { width: monsterSize, height: monsterSize, marginHorizontal: sideGap },
          ]}
        >
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
          selected={isSelected('hand', 1)}
          onPress={() => onSelectGearSlot('hand', 1)}
          compact={compact}
        />
      </View>

      {/* Row 4: BODY (placed below monster, never overlapping) */}
      <View style={styles.rowCenter}>
        <EquipmentSlotBox
          label="Body"
          slotKey="body"
          gear={gear('body')}
          selected={isSelected('body')}
          onPress={() => onSelectGearSlot('body', 0)}
          compact={compact}
        />
      </View>

      {/* Row 5: LEG 1 · LEG 2 */}
      <View style={styles.rowSides}>
        <EquipmentSlotBox
          label="Leg 1"
          slotKey="legs"
          gear={gear('legs', 0)}
          selected={isSelected('legs', 0)}
          onPress={() => onSelectGearSlot('legs', 0)}
          compact={compact}
        />
        <SpacerCenter />
        <EquipmentSlotBox
          label="Leg 2"
          slotKey="legs"
          gear={gear('legs', 1)}
          selected={isSelected('legs', 1)}
          onPress={() => onSelectGearSlot('legs', 1)}
          compact={compact}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  stage: { alignItems: 'center', paddingVertical: 4 },
  rowCenter: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 6,
  },
  rowSides: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 6,
  },
  rowMonster: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 6,
  },
  centerCol: {},
  monsterCore: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
