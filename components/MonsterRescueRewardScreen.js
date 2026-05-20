import React from 'react';
import { Image, Pressable, ScrollView, Text, View } from 'react-native';
import { GAME_ASSETS } from '../utils/gameAssetPaths';
import RescueGameFrame from './monsterRescue/RescueGameFrame';
import { rescueUiStyles } from './monsterRescue/rescueUiTheme';

export default function MonsterRescueRewardScreen({
  won,
  timeUp = false,
  stageLabel,
  rewards,
  saveMessage,
  onContinue,
  onRetry,
}) {
  const r = rewards ?? {};
  const chestLine = r.chestAwarded
    ? r.chestDrop
      ? `Chest opened — check your reward!`
      : `+1 ${r.chestAwarded === 'gear' ? 'Gear' : 'Monster'} chest (Monster Ladder)`
    : r.chestBlocked
      ? 'Daily ladder chest already claimed today'
      : null;

  return (
    <RescueGameFrame contentStyle={{ paddingHorizontal: 12 }}>
      <ScrollView style={rescueUiStyles.rewardScroll} contentContainerStyle={rescueUiStyles.rewardBody}>
        <Image
          source={{ uri: won ? GAME_ASSETS.chestOpen : GAME_ASSETS.chestClosed }}
          style={rescueUiStyles.chestImg}
          resizeMode="contain"
        />
        <Text style={[rescueUiStyles.banner, won ? rescueUiStyles.bannerWin : rescueUiStyles.bannerLose]}>
          {won ? 'Stage Cleared!' : timeUp ? "Time's Up!" : 'Try Again!'}
        </Text>
        <Text style={rescueUiStyles.sub}>{stageLabel}</Text>

        <View style={rescueUiStyles.statsPanel}>
          <Text style={rescueUiStyles.statRow}>Bubbles cleared: {r.bubblesCleared ?? 0}</Text>
          <Text style={rescueUiStyles.statRow}>Peak combo: x{r.comboPeak ?? 1}</Text>
          {chestLine ? <Text style={rescueUiStyles.statReward}>{chestLine}</Text> : null}
          <View style={rescueUiStyles.statDivider} />
          <Text style={rescueUiStyles.statReward}>+{r.coins ?? 0} coins</Text>
          <Text style={rescueUiStyles.statReward}>+{r.exp ?? 0} monster EXP</Text>
        </View>

        {saveMessage ? (
          <Text style={rescueUiStyles.saveStatus}>{saveMessage}</Text>
        ) : null}

        <Pressable
          style={({ pressed }) => [rescueUiStyles.primaryBtn, pressed && { opacity: 0.92, transform: [{ scale: 0.98 }] }]}
          onPress={won ? onContinue : onRetry}
        >
          <Text style={rescueUiStyles.primaryBtnText}>{won ? 'Continue' : 'Retry Stage'}</Text>
        </Pressable>
        {!won ? (
          <Pressable
            style={({ pressed }) => [rescueUiStyles.secondaryBtn, pressed && { opacity: 0.88 }]}
            onPress={onContinue}
          >
            <Text style={rescueUiStyles.secondaryBtnText}>Back to Stages</Text>
          </Pressable>
        ) : null}
      </ScrollView>
    </RescueGameFrame>
  );
}
