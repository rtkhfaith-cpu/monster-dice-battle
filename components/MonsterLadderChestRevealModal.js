import React from 'react';
import { Image, Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { RARITY_UI } from '../utils/monsterTemplates';
import { getLadderGear } from '../utils/monsterLadder/ladderGearCatalog';
import { getLadderMonsterTemplate } from '../utils/monsterLadder/ladderMonsterCatalog';
import { GAME_ASSETS } from '../utils/gameAssetPaths';

function rarityLabel(rarity) {
  return RARITY_UI[rarity]?.label ?? rarity ?? 'Reward';
}

function rewardName(drop) {
  if (!drop) return 'No chest reward';
  if (drop.kind === 'gear') return getLadderGear(drop.id)?.name ?? drop.name ?? drop.id;
  return getLadderMonsterTemplate(drop.id)?.name ?? drop.name ?? drop.id;
}

export default function MonsterLadderChestRevealModal({ visible, drop, onClose }) {
  if (!drop) return null;
  const ui = RARITY_UI[drop.rarity] ?? RARITY_UI.common;
  const duplicate = !!drop.duplicate;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={[styles.card, { borderColor: ui.border }]}>
          <Text style={styles.kicker}>Monster Ladder Chest</Text>
          <View style={[styles.orb, { backgroundColor: ui.chipBg, borderColor: ui.border }]}>
            <Image source={{ uri: GAME_ASSETS.chestOpen }} style={styles.chestImg} resizeMode="contain" />
          </View>
          <Text style={[styles.rarity, { color: ui.border }]}>
            {rarityLabel(drop.rarity)}
          </Text>
          <Text style={styles.name}>{rewardName(drop)}</Text>
          <Text style={styles.type}>
            {drop.kind === 'gear' ? 'Ladder gear' : 'Ladder monster'}
          </Text>
          {duplicate ? (
            <Text style={styles.duplicate}>
              Duplicate converted into {drop.shardsGained ?? 0} ladder shards.
            </Text>
          ) : (
            <Text style={styles.newItem}>Added to your ladder collection.</Text>
          )}
          {(drop.rarity === 'legendary' || drop.rarity === 'mythic') ? (
            <Text style={styles.dramatic}>
              {drop.rarity === 'mythic' ? 'MYTHIC SIGNAL LOCKED.' : 'LEGENDARY SIGNAL FOUND.'}
            </Text>
          ) : null}
          <TouchableOpacity style={[styles.btn, { backgroundColor: ui.border }]} onPress={onClose}>
            <Text style={styles.btnTxt}>Continue</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(8, 10, 24, 0.86)',
    justifyContent: 'center',
    padding: 20,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 20,
    borderWidth: 4,
    padding: 22,
    alignItems: 'center',
  },
  kicker: {
    fontWeight: '900',
    fontSize: 12,
    color: '#636e72',
    textTransform: 'uppercase',
    letterSpacing: 1.6,
    marginBottom: 12,
  },
  orb: {
    width: 96,
    height: 96,
    borderRadius: 48,
    borderWidth: 4,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  chestImg: { width: 76, height: 76 },
  rarity: { fontWeight: '900', fontSize: 18, textTransform: 'uppercase' },
  name: {
    marginTop: 6,
    fontWeight: '900',
    fontSize: 24,
    color: '#1a1a2e',
    textAlign: 'center',
  },
  type: { marginTop: 4, fontWeight: '800', fontSize: 13, color: '#636e72' },
  duplicate: {
    marginTop: 12,
    fontWeight: '900',
    fontSize: 14,
    color: '#6c5ce7',
    textAlign: 'center',
  },
  newItem: {
    marginTop: 12,
    fontWeight: '800',
    fontSize: 14,
    color: '#27ae60',
    textAlign: 'center',
  },
  dramatic: {
    marginTop: 10,
    fontWeight: '900',
    fontSize: 13,
    color: '#e84393',
    letterSpacing: 1,
  },
  btn: {
    width: '100%',
    marginTop: 18,
    borderRadius: 12,
    paddingVertical: 13,
    alignItems: 'center',
  },
  btnTxt: { color: '#fff', fontWeight: '900', fontSize: 16 },
});
