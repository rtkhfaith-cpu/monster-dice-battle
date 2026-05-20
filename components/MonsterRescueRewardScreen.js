import React from 'react';
import { Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { GAME_ASSETS } from '../utils/gameAssetPaths';

export default function MonsterRescueRewardScreen({
  won,
  stageLabel,
  rewards,
  onContinue,
  onRetry,
}) {
  const r = rewards ?? {};
  return (
    <View style={styles.root}>
      <Image
        source={{ uri: won ? GAME_ASSETS.chestOpen : GAME_ASSETS.chestClosed }}
        style={styles.chestImg}
        resizeMode="contain"
      />
      <Text style={[styles.banner, won ? styles.bannerWin : styles.bannerLose]}>
        {won ? 'Rescue Complete!' : 'Try Again!'}
      </Text>
      <Text style={styles.stage}>{stageLabel}</Text>

      <View style={styles.panel}>
        <Text style={styles.row}>Score: {r.score ?? 0}</Text>
        <Text style={styles.row}>Monsters rescued: {r.rescued ?? 0}</Text>
        <Text style={styles.row}>Peak combo: x{r.comboPeak ?? 1}</Text>
        <View style={styles.divider} />
        <Text style={styles.reward}>+{r.coins ?? 0} coins</Text>
        <Text style={styles.reward}>+{r.exp ?? 0} monster EXP</Text>
        {r.shards ? <Text style={styles.reward}>+{r.shards} shards</Text> : null}
      </View>

      <TouchableOpacity
        style={styles.primaryBtn}
        onPress={won ? onContinue : onRetry}
        activeOpacity={0.88}
      >
        <Text style={styles.primaryBtnText}>{won ? 'Continue' : 'Retry Stage'}</Text>
      </TouchableOpacity>
      {!won ? (
        <TouchableOpacity style={styles.secondaryBtn} onPress={onContinue} activeOpacity={0.88}>
          <Text style={styles.secondaryBtnText}>Back to Stages</Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    padding: 16,
    gap: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chestImg: { width: 64, height: 64 },
  banner: { fontSize: 22, fontWeight: '900' },
  bannerWin: { color: '#86efac' },
  bannerLose: { color: '#fca5a5' },
  stage: { color: '#93c5fd', fontWeight: '700' },
  panel: {
    width: '100%',
    maxWidth: 320,
    backgroundColor: 'rgba(15, 22, 42, 0.92)',
    borderRadius: 14,
    padding: 14,
    gap: 5,
    borderWidth: 1,
    borderColor: 'rgba(255,224,143,0.45)',
  },
  row: { color: '#e2e8f0', fontWeight: '600', fontSize: 13 },
  divider: { height: 1, backgroundColor: 'rgba(255,255,255,0.12)', marginVertical: 6 },
  reward: { color: '#fde68a', fontWeight: '800', fontSize: 15 },
  primaryBtn: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(48, 129, 66, 0.96)',
    borderWidth: 1,
    borderColor: '#efd17a',
    minWidth: 180,
    alignItems: 'center',
  },
  primaryBtnText: { color: '#f4fce8', fontWeight: '900', fontSize: 15 },
  secondaryBtn: {
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
  },
  secondaryBtnText: { color: '#cbd5e1', fontWeight: '700' },
});
