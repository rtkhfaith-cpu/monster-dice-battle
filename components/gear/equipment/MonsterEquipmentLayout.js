import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import MonsterPreview from '../../MonsterPreview';
import EquipmentSlotBox from './EquipmentSlotBox';
import { GEAR_UI } from '../gearUiTheme';

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
  petSlotNode = null,
  skillSlotNode = null,
  monsterTopNode = null,
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
  const slotWidth = compact ? 72 : 80;
  // Total width of the weapon row (Wpn1 + spacer + Wpn2).
  const outerRowWidth = slotWidth * 2 + sideGap * 2 + monsterSize;
  // Widths for Pet/Skills/Legs (same size) and wider Head/Body.
  const sideBoxWidth = compact ? 86 : 96;
  const wideBoxWidth = compact ? 96 : 116;

  const SpacerCenter = () => (
    <View style={[styles.centerCol, { width: monsterSize, marginHorizontal: sideGap }]} />
  );

  return (
    <View style={styles.stage}>
      {/* Row 1: HEAD (outer edges of Pet/Skills aligned with Weapon row outer edges) */}
      <View style={[styles.rowTop, { width: outerRowWidth }]}>
        <View style={styles.topSidePet}>{petSlotNode}</View>
        <EquipmentSlotBox
          label="Head"
          slotKey="head"
          gear={gear('head')}
          selected={isSelected('head')}
          onPress={() => onSelectGearSlot('head', 0)}
          compact={compact}
          widthOverride={wideBoxWidth}
        />
        <View>{skillSlotNode}</View>
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
          {monsterTopNode ? (
            <View style={styles.monsterTopRow}>
              {monsterTopNode}
            </View>
          ) : null}
          <MonsterPreview
            parts={fighter?.monsterParts}
            size={monsterSize}
            mood="happy"
          />
          <Text style={styles.levelTxt}>Lv {fighter?.level ?? 1}</Text>
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

      {/* Row 4: LEG 1 · BODY (centered) · LEG 2 — outer edges aligned with Pet/Skills */}
      <View style={[styles.rowBottomRow, { width: outerRowWidth }]}>
        <EquipmentSlotBox
          label="Leg 1"
          slotKey="legs"
          gear={gear('legs', 0)}
          selected={isSelected('legs', 0)}
          onPress={() => onSelectGearSlot('legs', 0)}
          compact={compact}
          widthOverride={sideBoxWidth}
        />
        <EquipmentSlotBox
          label="Body"
          slotKey="body"
          gear={gear('body')}
          selected={isSelected('body')}
          onPress={() => onSelectGearSlot('body', 0)}
          compact={compact}
          widthOverride={wideBoxWidth}
        />
        <EquipmentSlotBox
          label="Leg 2"
          slotKey="legs"
          gear={gear('legs', 1)}
          selected={isSelected('legs', 1)}
          onPress={() => onSelectGearSlot('legs', 1)}
          compact={compact}
          widthOverride={sideBoxWidth}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  stage: { alignItems: 'center', paddingVertical: 4 },
  rowTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
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
  topSidePet: {},
  rowBottom: {
    transform: [{ translateY: -4 }],
    marginBottom: 4,
  },
  rowBottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
    transform: [{ translateY: -4 }],
  },
  centerCol: {},
  monsterCore: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: -90,
  },
  monsterTopRow: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 2,
    alignItems: 'center',
  },
  levelTxt: {
    marginTop: -2,
    color: GEAR_UI.accent,
    fontSize: 11,
    fontWeight: '900',
  },
});
