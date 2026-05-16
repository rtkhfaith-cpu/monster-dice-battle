import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Dice3D, { DiceFaceStatic } from './Dice3D';
import { BATTLE } from '../utils/gameTheme';

/**
 * Tappable battle dice — visible in all roll states; never removed after roll.
 */
export default function BattleDiceButton({
  sideLabel = '',
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
  const label = rolling
    ? 'Rolling…'
    : canRoll
      ? 'Tap to roll'
      : shownValue != null
        ? `Result: ${shownValue}`
        : 'Dice';

  const pulse = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (!active || rolling) {
      pulse.setValue(1);
      return undefined;
    }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1.06, duration: 520, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 1, duration: 520, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [active, rolling, pulse]);

  return (
    <Animated.View style={{ transform: [{ scale: active && !rolling ? pulse : 1 }] }}>
    <TouchableOpacity
      style={[
        styles.wrap,
        compact && styles.wrapCompact,
        active && styles.active,
        dimmed && styles.dimmed,
        canRoll && !rolling && styles.ready,
        rolling && styles.rolling,
        !canRoll && !rolling && shownValue != null && styles.result,
        !canRoll && !rolling && shownValue == null && styles.wait,
      ]}
      disabled={!canRoll || rolling}
      onPress={onPress}
      activeOpacity={0.88}
      accessibilityRole="button"
      accessibilityLabel={label}
    >
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
      {sideLabel ? (
        <Text style={[styles.sideLabel, compact && styles.sideLabelCompact]} numberOfLines={1}>
          {sideLabel}
        </Text>
      ) : null}
      <Text style={[styles.label, compact && styles.labelCompact]}>{label}</Text>
    </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 16,
    backgroundColor: BATTLE.diceReady,
    borderWidth: 2,
    borderColor: BATTLE.diceBorder,
    minWidth: 100,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  wrapCompact: {
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 12,
    minWidth: 72,
  },
  ready: {
    borderColor: '#f4c56a',
    backgroundColor: '#fffdf5',
  },
  rolling: {
    borderColor: '#7ec8f5',
    backgroundColor: '#f0f8ff',
  },
  result: {
    borderColor: '#8fd48a',
    backgroundColor: '#f4fff4',
  },
  wait: {
    opacity: 0.65,
  },
  active: {
    borderColor: '#ff9f1c',
    borderWidth: 3,
    shadowColor: '#ffd166',
    shadowOpacity: 0.95,
    shadowRadius: 10,
    elevation: 6,
  },
  dimmed: {
    opacity: 0.45,
  },
  sideLabel: {
    fontWeight: '900',
    fontSize: 12,
    color: '#1a1a2e',
    marginBottom: 2,
    maxWidth: 110,
    textAlign: 'center',
  },
  sideLabelCompact: { fontSize: 11 },
  diceSlot: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 80,
  },
  diceSlotCompact: { minHeight: 52 },
  label: {
    marginTop: 4,
    fontWeight: '900',
    fontSize: 13,
    color: BATTLE.dock,
    textAlign: 'center',
  },
  labelCompact: { fontSize: 11, marginTop: 2 },
});
