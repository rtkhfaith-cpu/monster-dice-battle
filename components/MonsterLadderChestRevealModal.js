import React, { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Image, Modal, Platform, Pressable, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { RARITY_UI } from '../utils/monsterTemplates';
import { getLadderGear } from '../utils/monsterLadder/ladderGearCatalog';
import { getLadderMonsterTemplate } from '../utils/monsterLadder/ladderMonsterCatalog';
import { chestDropSubtitle, chestDropTitle } from '../utils/mainBattleChest';
import GearItemDetailModal from './gear/GearItemDetailModal';
import { GAME_ASSETS } from '../utils/gameAssetPaths';
import { gameSurfaceDataProps, WEB_DECORATIVE_IMAGE_PROPS } from '../utils/webGameTouch';
import { RESCUE_COLORS } from './monsterRescue/rescueUiTheme';

function rarityLabel(rarity) {
  return RARITY_UI[rarity]?.label ?? rarity ?? 'Reward';
}

function rewardName(drop) {
  if (!drop) return 'No chest reward';
  if (drop.kind === 'pet' || drop.kind === 'pet_exp_dust') return chestDropTitle(drop);
  if (drop.kind === 'gear') return getLadderGear(drop.id)?.name ?? drop.name ?? drop.id;
  return getLadderMonsterTemplate(drop.id)?.name ?? drop.name ?? drop.id;
}

function rewardTypeLabel(drop) {
  if (drop?.kind === 'pet') return 'Mythic pet companion';
  if (drop?.kind === 'pet_exp_dust') return 'Pet EXP dust';
  if (drop?.kind === 'gear') return 'Ladder gear';
  return 'Ladder monster';
}

function duplicateMessage(drop) {
  if (drop?.kind === 'pet') {
    const sub = chestDropSubtitle(drop);
    return sub || 'Duplicate pet.';
  }
  if (drop?.kind === 'pet_exp_dust') return chestDropSubtitle(drop);
  if (drop.exchangedForShards || drop.shardsGained > 0) {
    return `Duplicate converted into +${drop.shardsGained ?? 0} ladder shards.`;
  }
  if (drop.kind === 'gear') return `Extra copy stored. Owned x${drop.quantity ?? 2}.`;
  return 'Duplicate stored for merging later.';
}

export default function MonsterLadderChestRevealModal({
  visible,
  drop,
  onClose,
  autoReveal = false,
  kicker = 'Monster Ladder Chest',
}) {
  const [opened, setOpened] = useState(false);
  const [gearDetailOpen, setGearDetailOpen] = useState(false);
  const chestDropY = useRef(new Animated.Value(-280)).current;
  const revealOpacity = useRef(new Animated.Value(0)).current;
  const useNativeDriver = Platform.OS !== 'web';

  useEffect(() => {
    if (!visible || !drop) return;
    setGearDetailOpen(false);
    const revealNow = !!autoReveal;
    setOpened(revealNow);
    chestDropY.setValue(-280);
    revealOpacity.setValue(revealNow ? 1 : 0);
    Animated.spring(chestDropY, {
      toValue: 0,
      friction: 7,
      tension: 42,
      useNativeDriver,
    }).start();
  }, [visible, drop?.id, drop?.petId, drop?.kind, drop?.amount, autoReveal, chestDropY, revealOpacity, useNativeDriver]);

  useEffect(() => {
    if (!opened) {
      revealOpacity.setValue(0);
      return;
    }
    if (autoReveal) {
      revealOpacity.setValue(1);
      return;
    }
    revealOpacity.setValue(0);
    Animated.timing(revealOpacity, {
      toValue: 1,
      duration: 280,
      easing: Easing.out(Easing.quad),
      useNativeDriver,
    }).start();
  }, [opened, autoReveal, revealOpacity, useNativeDriver]);

  if (!visible || !drop) return null;

  const ui = RARITY_UI[drop.rarity] ?? RARITY_UI.common;
  const duplicate = !!drop.duplicate;
  const showReveal = opened;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={[styles.card, { borderColor: ui.border }]} {...gameSurfaceDataProps()}>
          <Text style={styles.kicker}>{kicker}</Text>
          <Animated.View style={[styles.chestDropWrap, { transform: [{ translateY: chestDropY }] }]}>
            <TouchableOpacity
              style={[styles.orb, { backgroundColor: ui.chipBg, borderColor: ui.border }]}
              onPress={() => setOpened(true)}
              activeOpacity={0.85}
              disabled={opened}
            >
              <Image
                source={{ uri: showReveal ? GAME_ASSETS.chestOpen : GAME_ASSETS.chestClosed }}
                style={styles.chestImg}
                resizeMode="contain"
                {...WEB_DECORATIVE_IMAGE_PROPS}
              />
            </TouchableOpacity>
          </Animated.View>
          {!showReveal ? (
            <Text style={styles.tapHint}>Tap the chest to reveal your reward.</Text>
          ) : (
            <View style={styles.revealBlock}>
              <Text style={[styles.rarity, { color: ui.border }]}>
                {rarityLabel(drop.rarity)}
              </Text>
              <Text style={styles.name}>{rewardName(drop)}</Text>
              <Text style={styles.type}>{rewardTypeLabel(drop)}</Text>
              {duplicate ? (
                <Text style={styles.duplicate}>{duplicateMessage(drop)}</Text>
              ) : (
                <Text style={styles.newItem}>
                  {drop.kind === 'pet_exp_dust'
                    ? 'Added to your pet EXP dust.'
                    : 'Added to your collection.'}
                </Text>
              )}
              {(drop.rarity === 'legendary' || drop.rarity === 'mythic') ? (
                <Text style={styles.dramatic}>
                  {drop.rarity === 'mythic' ? 'MYTHIC SIGNAL LOCKED.' : 'LEGENDARY SIGNAL FOUND.'}
                </Text>
              ) : null}
              {drop.kind === 'gear_instance' && drop.gear ? (
                <TouchableOpacity style={styles.detailBtn} onPress={() => setGearDetailOpen(true)} activeOpacity={0.86}>
                  <Text style={styles.detailBtnTxt}>View gear details</Text>
                </TouchableOpacity>
              ) : null}
            </View>
          )}
          <TouchableOpacity
            style={[styles.btn, { backgroundColor: showReveal ? ui.border : '#636e72' }]}
            onPress={showReveal ? onClose : () => setOpened(true)}
          >
            <Text style={styles.btnTxt}>{showReveal ? 'Continue' : 'Open Chest'}</Text>
          </TouchableOpacity>
        </View>
      </View>
      <GearItemDetailModal
        visible={gearDetailOpen && !!drop?.gear}
        gear={drop?.gear}
        mode="reward"
        onClose={() => setGearDetailOpen(false)}
      />
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
    backgroundColor: '#1a1a2e',
    borderRadius: 20,
    borderWidth: 4,
    padding: 22,
    alignItems: 'center',
  },
  kicker: {
    fontWeight: '900',
    fontSize: 12,
    color: '#ffe6a3',
    textTransform: 'uppercase',
    letterSpacing: 1.6,
    marginBottom: 12,
  },
  chestDropWrap: {
    alignItems: 'center',
    marginBottom: 8,
  },
  orb: {
    width: 96,
    height: 96,
    borderRadius: 48,
    borderWidth: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chestImg: { width: 76, height: 76 },
  tapHint: {
    fontWeight: '900',
    fontSize: 15,
    color: '#cbd5e1',
    textAlign: 'center',
    marginTop: 4,
  },
  revealBlock: {
    alignItems: 'center',
    width: '100%',
    marginTop: 4,
  },
  rarity: { fontWeight: '900', fontSize: 18, textTransform: 'uppercase' },
  name: {
    marginTop: 6,
    fontWeight: '900',
    fontSize: 24,
    color: '#f8fafc',
    textAlign: 'center',
  },
  type: { marginTop: 4, fontWeight: '800', fontSize: 13, color: '#93c5fd' },
  duplicate: {
    marginTop: 12,
    fontWeight: '900',
    fontSize: 14,
    color: '#c4b5fd',
    textAlign: 'center',
  },
  newItem: {
    marginTop: 12,
    fontWeight: '800',
    fontSize: 14,
    color: '#86efac',
    textAlign: 'center',
  },
  dramatic: {
    marginTop: 10,
    fontWeight: '900',
    fontSize: 13,
    color: '#f9a8d4',
    letterSpacing: 1,
  },
  detailBtn: {
    marginTop: 12,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,224,138,0.55)',
    backgroundColor: 'rgba(92, 57, 143, 0.45)',
  },
  detailBtnTxt: {
    color: '#ffe08a',
    fontWeight: '900',
    fontSize: 12,
    textTransform: 'uppercase',
  },
  btn: {
    width: '100%',
    marginTop: 18,
    borderRadius: 14,
    paddingVertical: 13,
    alignItems: 'center',
    borderWidth: 2,
  },
  btnContinue: {
    backgroundColor: 'rgba(48, 129, 66, 0.96)',
    borderColor: '#efd17a',
    borderBottomWidth: 5,
    borderBottomColor: '#31551f',
  },
  btnOpen: {
    backgroundColor: 'rgba(34, 50, 80, 0.95)',
    borderColor: 'rgba(255, 219, 142, 0.45)',
  },
  btnTxt: { color: RESCUE_COLORS.title, fontWeight: '900', fontSize: 16 },
});
