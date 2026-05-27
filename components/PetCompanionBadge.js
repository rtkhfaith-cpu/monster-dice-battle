import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, Text } from 'react-native';

/**
 * Floating pet companion beside monster — no frame; faces toward opponent.
 * @param {'left'|'right'} side — battler slot (left = P1, right = P2)
 */
export default function PetCompanionBadge({ pet, triggerPulse = 0, side = 'left' }) {
  const floatY = useRef(new Animated.Value(0)).current;
  const pulse = useRef(new Animated.Value(1)).current;
  // P1 (left slot) faces right; P2 (right slot) faces left — matches AnimatedMonster mirror.
  const faceOpponent = side === 'left';

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(floatY, { toValue: -5, duration: 1200, useNativeDriver: true }),
        Animated.timing(floatY, { toValue: 0, duration: 1200, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [floatY]);

  useEffect(() => {
    if (!triggerPulse) return;
    pulse.setValue(1);
    Animated.sequence([
      Animated.timing(pulse, { toValue: 1.25, duration: 120, useNativeDriver: true }),
      Animated.timing(pulse, { toValue: 1, duration: 180, useNativeDriver: true }),
    ]).start();
  }, [triggerPulse, pulse]);

  if (!pet?.emoji) return null;

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.wrap,
        side === 'right' ? styles.wrapRight : styles.wrapLeft,
        { transform: [{ translateY: floatY }] },
      ]}
    >
      <Animated.View
        style={{
          alignItems: 'center',
          transform: [{ scaleX: faceOpponent ? -1 : 1 }, { scale: pulse }],
        }}
      >
        <Text style={styles.emoji}>{pet.emoji}</Text>
        <Text style={[styles.lv, faceOpponent && styles.lvFlipped]}>Lv {pet.level ?? 1}</Text>
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    top: -8,
    zIndex: 12,
  },
  wrapLeft: { right: -4 },
  wrapRight: { left: -4 },
  emoji: { fontSize: 22, lineHeight: 26 },
  lv: { fontSize: 9, fontWeight: '800', color: '#e2e8f0', marginTop: -2 },
  lvFlipped: { transform: [{ scaleX: -1 }] },
});
