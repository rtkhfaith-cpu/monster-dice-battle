import React, { useEffect, useRef, useState } from 'react';
import { Animated, Easing, StyleSheet, Text, View } from 'react-native';
import { fx } from '../utils/battleEffectScale';
import { floatColorForKind } from '../src/gameSystems/passiveBattleFeedback';

const FLOAT_MS = 1100;

function PassiveFloatItem({ item, arenaW, arenaH }) {
  const rise = useRef(new Animated.Value(0)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    rise.setValue(0);
    opacity.setValue(0);
    Animated.parallel([
      Animated.timing(rise, {
        toValue: 1,
        duration: FLOAT_MS,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.sequence([
        Animated.timing(opacity, { toValue: 1, duration: 120, useNativeDriver: true }),
        Animated.delay(FLOAT_MS - 420),
        Animated.timing(opacity, { toValue: 0, duration: 300, useNativeDriver: true }),
      ]),
    ]).start();
  }, [item.id]);

  const fromLeft = item.fighterId === 1;
  const anchorX = fromLeft ? arenaW * 0.24 : arenaW * 0.76;
  const anchorY = arenaH * 0.56;
  const translateY = rise.interpolate({ inputRange: [0, 1], outputRange: [0, -fx(44)] });
  const color = floatColorForKind(item.floatKind);
  const isHeal = item.floatKind === 'heal';
  const showAmount = (item.amount ?? 0) > 0;
  const amountText = isHeal
    ? `+${Math.round(item.amount)}`
    : showAmount
      ? `-${Math.round(item.amount)}`
      : null;

  return (
    <Animated.View
      style={[
        styles.floatWrap,
        {
          left: anchorX - fx(52),
          top: anchorY,
          opacity,
          transform: [{ translateY }],
        },
      ]}
      pointerEvents="none"
    >
      {amountText ? (
        <Text style={[styles.amount, { color }, isHeal && styles.amountHeal]}>{amountText}</Text>
      ) : null}
      <Text style={[styles.label, !amountText && styles.labelProminent, { color }]}>
        {item.label}
      </Text>
    </Animated.View>
  );
}

/**
 * Floating passive numbers (heal / poison / burn / reflect) over the RPG arena.
 * @param {{ items: Array<{ id: string, fighterId: 1|2, floatKind: string, amount: number, label: string }>, centerComment?: string|null }} props
 */
export default function BattlePassiveFloatLayer({ items = [], centerComment = null }) {
  const [arenaW, setArenaW] = useState(360);
  const [arenaH, setArenaH] = useState(360);

  if (!items.length && !centerComment) return null;

  return (
    <View
      style={styles.layer}
      pointerEvents="none"
      onLayout={(e) => {
        const { width, height } = e.nativeEvent.layout;
        if (width > 80) setArenaW(width);
        if (height > 80) setArenaH(height);
      }}
    >
      {centerComment ? (
        <View style={[styles.centerComment, { top: arenaH * 0.38 }]}>
          <Text style={styles.centerCommentTxt} numberOfLines={2}>
            {centerComment}
          </Text>
        </View>
      ) : null}
      {items.map((item) => (
        <PassiveFloatItem key={item.id} item={item} arenaW={arenaW} arenaH={arenaH} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  layer: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 25,
    overflow: 'hidden',
  },
  centerComment: {
    position: 'absolute',
    left: '8%',
    right: '8%',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: fx(8),
    paddingHorizontal: fx(12),
    backgroundColor: 'rgba(26, 18, 48, 0.82)',
    borderRadius: fx(12),
    borderWidth: 2,
    borderColor: 'rgba(181, 101, 247, 0.55)',
  },
  centerCommentTxt: {
    fontWeight: '800',
    fontSize: fx(17),
    color: '#f3e8ff',
    textAlign: 'center',
    letterSpacing: 0.4,
    textShadowColor: 'rgba(0,0,0,0.7)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  floatWrap: {
    position: 'absolute',
    width: fx(104),
    alignItems: 'center',
  },
  amount: {
    fontWeight: '900',
    fontSize: fx(34),
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  amountHeal: {
    fontSize: fx(32),
  },
  label: {
    marginTop: fx(2),
    fontWeight: '800',
    fontSize: fx(14),
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    textShadowColor: 'rgba(0, 0, 0, 0.45)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  labelProminent: {
    fontSize: fx(20),
    marginTop: 0,
  },
});
