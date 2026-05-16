import React from 'react';
import { StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import AnimatedMonster from './AnimatedMonster';
import BattleEffect from './BattleEffect';
import SpeechBubble from './SpeechBubble';

/**
 * Middle battle stage: two large toy monsters + optional speech bubbles + effect overlay.
 */
export default function BattleStage({
  p1,
  p2,
  p1Pose,
  p2Pose,
  p1Mood,
  p2Mood,
  p1Rage,
  p2Rage,
  p1Bubble,
  p2Bubble,
  superJumpSide,
  currentEffect,
  round,
  instruction,
  battlePhase,
  chaosFx,
}) {
  const { width } = useWindowDimensions();
  const slotBudget = Math.max(0, (width - 40) / 2);
  const size = Math.min(242, Math.max(164, Math.round(slotBudget * 0.88)));
  return (
    <View style={styles.stage}>
      <View style={styles.ground} pointerEvents="none" />
      <View style={styles.roundRibbonOuter} pointerEvents="none">
        <Text style={styles.roundRibbonTxt}>Round {round}</Text>
      </View>
      <View style={styles.row}>
        <View style={[styles.slot, styles.leftSlot]}>
          <View style={styles.bubSlot}>
            <SpeechBubble text={p1Bubble} side="left" visible={!!p1Bubble} />
            <AnimatedMonster
              parts={p1.monsterParts}
              size={size}
              pose={p1Pose}
              side="left"
              mood={p1Mood}
              rage={p1Rage}
              superJump={superJumpSide === 'left'}
            />
          </View>
        </View>
        <View style={[styles.slot, styles.rightSlot]}>
          <View style={styles.bubSlot}>
            <SpeechBubble text={p2Bubble} side="right" visible={!!p2Bubble} />
            <AnimatedMonster
              parts={p2.monsterParts}
              size={size}
              pose={p2Pose}
              side="right"
              mood={p2Mood}
              rage={p2Rage}
              superJump={superJumpSide === 'right'}
            />
          </View>
        </View>
      </View>
      {chaosFx === 'toilet' ? (
        <View style={styles.toiletBurst} pointerEvents="none">
          <Text style={styles.toiletEmoji}>🚽💥</Text>
        </View>
      ) : null}
      <View style={styles.fxLayer} pointerEvents="box-none">
        <BattleEffect currentEffect={battlePhase === 'resolveAttack' ? currentEffect : null} instruction={instruction} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  stage: {
    flex: 1,
    minHeight: 288,
    borderRadius: 18,
    borderWidth: 4,
    borderColor: '#ff9f1c',
    backgroundColor: 'rgba(255,250,230,0.95)',
    overflow: 'hidden',
    justifyContent: 'flex-end',
  },
  roundRibbonOuter: {
    position: 'absolute',
    top: 6,
    left: 0,
    right: 0,
    zIndex: 8,
    alignItems: 'center',
  },
  roundRibbonTxt: {
    fontWeight: '900',
    fontSize: 16,
    color: '#4a2800',
    backgroundColor: 'rgba(254,239,217,0.95)',
    paddingHorizontal: 12,
    paddingVertical: 3,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#ff9f1c',
    overflow: 'hidden',
    includeFontPadding: false,
    textAlignVertical: 'center',
  },
  ground: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 36,
    backgroundColor: 'rgba(143,211,172,0.45)',
    borderTopWidth: 3,
    borderColor: '#2d6a4f',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    paddingHorizontal: 4,
    paddingBottom: 4,
    flex: 1,
  },
  slot: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-end',
    minHeight: 232,
  },
  leftSlot: { paddingRight: 2 },
  rightSlot: { paddingLeft: 2 },
  bubSlot: {
    alignItems: 'center',
    justifyContent: 'flex-end',
    position: 'relative',
    width: '100%',
  },
  fxLayer: {
    position: 'absolute',
    left: 4,
    right: 4,
    top: 38,
    bottom: 56,
    justifyContent: 'flex-start',
    alignItems: 'center',
    paddingTop: 2,
    zIndex: 5,
  },
  toiletBurst: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(174,214,241,0.35)',
    zIndex: 4,
    justifyContent: 'center',
    alignItems: 'center',
  },
  toiletEmoji: {
    fontSize: 64,
  },
});
