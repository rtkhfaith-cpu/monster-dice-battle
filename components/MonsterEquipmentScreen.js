import React from 'react';
import { Modal, Platform, StyleSheet, View, useWindowDimensions } from 'react-native';
import EquipmentScreen from './gear/equipment/EquipmentScreen';
import { gearModalStyles } from './gear/gearUiTheme';

/**
 * Full-screen equipment modal (MMORPG layout).
 */
export default function MonsterEquipmentScreen({
  visible,
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
  const { height } = useWindowDimensions();

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={gearModalStyles.backdrop}>
        <View style={[gearModalStyles.card, styles.card, { maxHeight: Math.min(height * 0.94, 780) }]}>
          <EquipmentScreen
            ownedMonster={ownedMonster}
            profile={profile}
            coins={coins}
            ownedMonsters={ownedMonsters}
            onSelectMonster={onSelectMonster}
            onClose={onClose}
            onEquip={onEquip}
            onUnequip={onUnequip}
            onEquipPet={onEquipPet}
            onUnequipPet={onUnequipPet}
            onEquipPassiveBook={onEquipPassiveBook}
            onRemovePassive={onRemovePassive}
          />
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  card: {
    paddingTop: Platform.OS === 'ios' ? 14 : 10,
    paddingHorizontal: 12,
    paddingBottom: Platform.OS === 'ios' ? 10 : 8,
  },
});
