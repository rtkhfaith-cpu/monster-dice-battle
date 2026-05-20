import React from 'react';
import { Image, ImageBackground, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
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
    <ImageBackground source={{ uri: GAME_ASSETS.monsterRescueBackground }} style={styles.bg} resizeMode="cover">
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
        {r.chests ? <Text style={styles.reward}>Treasure chests: {r.chests}</Text> : null}
        {r.gearDrops ? <Text style={styles.reward}>Gear found: {r.gearDrops}</Text> : null}
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
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  bg: { flex: 1 },
  root: {
    flex: 1,
    padding: 20,
    gap: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.78)',
  },
  chestImg: { width: 72, height: 72, marginBottom: 4 },
  banner: { fontSize: 28, fontWeight: '900' },
  bannerWin: { color: '#15803d' },
  bannerLose: { color: '#b91c1c' },
  stage: { color: '#64748b', fontWeight: '700' },
  panel: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: 'rgba(255,255,255,0.95)',
    borderRadius: 16,
    padding: 16,
    gap: 6,
    borderWidth: 2,
    borderColor: '#fbcfe8',
  },
  row: { color: '#334155', fontWeight: '600' },
  divider: { height: 1, backgroundColor: '#e2e8f0', marginVertical: 6 },
  reward: { color: '#0f766e', fontWeight: '800', fontSize: 16 },
  primaryBtn: {
    paddingVertical: 14,
    paddingHorizontal: 28,
    borderRadius: 14,
    backgroundColor: '#f472b6',
    minWidth: 200,
    alignItems: 'center',
  },
  primaryBtnText: { color: '#fff', fontWeight: '900', fontSize: 16 },
  secondaryBtn: {
    paddingVertical: 12,
    paddingHorizontal: 22,
    borderRadius: 12,
    backgroundColor: '#e2e8f0',
  },
  secondaryBtnText: { color: '#475569', fontWeight: '700' },
});
