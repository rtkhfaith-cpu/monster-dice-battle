import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Dice3D, { DiceFaceStatic } from './Dice3D';
import { BATTLE } from '../utils/gameTheme';

/**
 * Battle dice — minimal UI: tiny tag above, dice only (no status captions).
 */
export default function BattleDiceButton({
  tagLabel = '',
  rolling = false,
  rollValue = 1,
  shownValue = null,
  canRoll = false,
  active = false,
  dimmed = false,
  onPress,
  onRollComplete,
  size = 72,
  durationMs = 1000,
  compact = false,
}) {
  const a11yLabel = rolling
    ? 'Rolling dice'
    : canRoll
      ? 'Roll dice'
      : shownValue != null
        ? `Dice showing ${shownValue}`
        : 'Dice';

  const pulse = useRef(new Animated.Value(1)).current;
  const glow = useRef(new Animated.Value(0.4)).current;
  const inactiveScale = dimmed && !active ? 0.88 : active ? 1.06 : 0.94;

  useEffect(() => {
    if (!active || rolling) {
      pulse.setValue(1);
      glow.setValue(0.35);
      return undefined;
    }
    const loop = Animated.loop(
      Animated.parallel([
        Animated.sequence([
          Animated.timing(pulse, { toValue: 1.1, duration: 520, useNativeDriver: true }),
          Animated.timing(pulse, { toValue: 1, duration: 520, useNativeDriver: true }),
        ]),
        Animated.sequence([
          Animated.timing(glow, { toValue: 1, duration: 520, useNativeDriver: true }),
          Animated.timing(glow, { toValue: 0.45, duration: 520, useNativeDriver: true }),
        ]),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [active, rolling, pulse, glow]);

  return (
    <Animated.View style={{ transform: [{ scale: active && !rolling ? pulse : inactiveScale }] }}>
      {active && !rolling ? (
        <Animated.View pointerEvents="none" style={[styles.glowRing, { opacity: glow }]} />
      ) : null}
      <TouchableOpacity
        style={[
          styles.wrap,
          compact && styles.wrapCompact,
          active && styles.active,
          dimmed && styles.dimmed,
          canRoll && !rolling && styles.ready,
          rolling && styles.rolling,
        ]}
        disabled={!canRoll || rolling}
        onPress={onPress}
        activeOpacity={0.88}
        accessibilityRole="button"
        accessibilityLabel={a11yLabel}
      >
        {tagLabel ? (
          <Text style={[styles.tag, compact && styles.tagCompact]} numberOfLines={1}>
            {tagLabel}
          </Text>
        ) : null}
        <View style={[styles.diceSlot, compact && styles.diceSlotCompact]}>
          {rolling ? (
            <Dice3D
              active
              finalValue={rollValue}
              durationMs={durationMs}
              flashMs={100}
              size={size}
              onComplete={onRollComplete}
            />
          ) : (
            <DiceFaceStatic value={shownValue ?? 1} size={size} placeholder={canRoll && shownValue == null} />
          )}
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 14,
    backgroundColor: BATTLE.diceReady,
    borderWidth: 2,
    borderColor: BATTLE.diceBorder,
    minWidth: 76,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 3,
    elevation: 2,
  },
  wrapCompact: {
    paddingVertical: 2,
    paddingHorizontal: 6,
    borderRadius: 12,
    minWidth: 64,
  },
  ready: {
    borderColor: '#f4c56a',
    backgroundColor: '#fffdf5',
  },
  rolling: {
    borderColor: '#7ec8f5',
    backgroundColor: '#f0f8ff',
  },
  active: {
    borderColor: '#ff9f1c',
    borderWidth: 3,
    shadowColor: '#ffd166',
    shadowOpacity: 0.85,
    shadowRadius: 10,
    elevation: 6,
  },
  dimmed: {
    opacity: 0.7,
  },
  glowRing: {
    position: 'absolute',
    top: -3,
    left: -3,
    right: -3,
    bottom: -3,
    borderRadius: 16,
    borderWidth: 3,
    borderColor: '#ffd166',
    backgroundColor: 'rgba(255, 209, 102, 0.18)',
  },
  tag: {
    fontWeight: '900',
    fontSize: 9,
    letterSpacing: 0.8,
    color: '#4a5568',
    marginBottom: 2,
    textAlign: 'center',
  },
  tagCompact: { fontSize: 8 },
  diceSlot: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 68,
  },
  diceSlotCompact: { minHeight: 56 },
});
