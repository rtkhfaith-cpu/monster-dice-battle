import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';

/**
 * Floating pet companion above monster (top-right).
 */
export default function PetCompanionBadge({ pet, triggerPulse = 0, side = 'left' }) {
  const floatY = useRef(new Animated.Value(0)).current;
  const pulse = useRef(new Animated.Value(1)).current;

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
        { transform: [{ translateY: floatY }, { scale: pulse }] },
      ]}
    >
      <View style={styles.bubble}>
        <Text style={styles.emoji}>{pet.emoji}</Text>
        <Text style={styles.lv}>Lv {pet.level ?? 1}</Text>
      </View>
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
  bubble: {
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 10,
    backgroundColor: 'rgba(15, 23, 42, 0.72)',
    borderWidth: 1,
    borderColor: 'rgba(148, 163, 184, 0.45)',
  },
  emoji: { fontSize: 18, lineHeight: 22 },
  lv: { fontSize: 9, fontWeight: '800', color: '#e2e8f0', marginTop: -2 },
});
