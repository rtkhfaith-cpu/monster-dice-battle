import React, { useCallback } from 'react';
import { Platform, StyleSheet, Text, TouchableOpacity, View, useWindowDimensions } from 'react-native';
import MonsterRescueView from './MonsterRescueView';
import { playSound } from '../utils/sounds';

export default function MonsterRescueScreen({ stageId, stageLabel, onBack, onFinish }) {
  const { height: winH } = useWindowDimensions();
  const canvasH = Math.min(Math.max(winH - 120, 420), 620);

  const handlePop = useCallback(() => {
    playSound('bubblePop');
  }, []);

  const handleCombo = useCallback(() => {
    playSound('rescueCombo');
  }, []);

  const handleShoot = useCallback(() => {
    playSound('bubbleShoot');
  }, []);

  const handleRescued = useCallback(() => {
    playSound('rescued');
  }, []);

  const handleFinish = useCallback(
    (payload) => {
      if (payload?.won) playSound('win');
      else playSound('lose');
      onFinish?.(payload);
    },
    [onFinish]
  );

  return (
    <View style={styles.root}>
      <View style={styles.topBar}>
        <TouchableOpacity onPress={onBack} style={styles.backBtn}>
          <Text style={styles.backText}>← Exit</Text>
        </TouchableOpacity>
        <Text style={styles.title}>{stageLabel ?? `Stage ${stageId}`}</Text>
        <View style={styles.spacer} />
      </View>

      {Platform.OS === 'web' ? (
        <MonsterRescueView
          key={`rescue-stage-${stageId}`}
          stageId={stageId}
          height={canvasH}
          onPop={handlePop}
          onCombo={handleCombo}
          onShoot={handleShoot}
          onRescued={handleRescued}
          onFinish={handleFinish}
        />
      ) : (
        <View style={[styles.fallback, { height: canvasH }]}>
          <Text style={styles.fallbackText}>Open in a web browser to play Monster Rescue.</Text>
        </View>
      )}

      <Text style={styles.tip}>Drag to aim · release to shoot · match 3+ to rescue!</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, padding: 12, gap: 8 },
  topBar: { flexDirection: 'row', alignItems: 'center' },
  backBtn: { paddingVertical: 6, paddingRight: 12 },
  backText: { color: '#9d174d', fontWeight: '800' },
  title: { flex: 1, textAlign: 'center', fontSize: 18, fontWeight: '900', color: '#831843' },
  spacer: { width: 64 },
  tip: { textAlign: 'center', color: '#64748b', fontSize: 12, fontWeight: '600' },
  fallback: {
    borderRadius: 16,
    backgroundColor: '#fbcfe8',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  fallbackText: { color: '#831843', fontWeight: '700', textAlign: 'center' },
});
