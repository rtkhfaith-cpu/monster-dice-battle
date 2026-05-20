import React from 'react';
import { Image, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { RESCUE_STAGES } from '../utils/monsterRescue';
import { GAME_ASSETS } from '../utils/gameAssetPaths';
import RescueGameFrame from './monsterRescue/RescueGameFrame';
import { rescueUiStyles } from './monsterRescue/rescueUiTheme';

export default function MonsterRescueHubScreen({
  profileName,
  highestCleared = 0,
  totalRescued = 0,
  onBack,
  onStartStage,
}) {
  return (
    <RescueGameFrame>
      <TouchableOpacity onPress={onBack} style={rescueUiStyles.navPill} activeOpacity={0.86}>
        <Text style={rescueUiStyles.navPillText}>← Quests</Text>
      </TouchableOpacity>

      <View style={rescueUiStyles.headerPanel}>
        <View style={rescueUiStyles.titleRow}>
          <Image source={{ uri: GAME_ASSETS.chestClosed }} style={rescueUiStyles.titleIcon} resizeMode="contain" />
          <View style={{ flex: 1 }}>
            <Text style={rescueUiStyles.kicker}>Quest 2</Text>
            <Text style={rescueUiStyles.title}>Monster Rescue</Text>
            <Text style={rescueUiStyles.sub}>
              {profileName} · {totalRescued} rescued
            </Text>
          </View>
        </View>
        <Text style={rescueUiStyles.blurb}>
          Match 3+ bubbles to free monsters. Combos boost rewards!
        </Text>
      </View>

      <View style={rescueUiStyles.noticeBar}>
        <Text style={rescueUiStyles.noticeText} numberOfLines={2}>
          {highestCleared > 0
            ? `Cleared through stage ${highestCleared}. Next stage unlocks when you win.`
            : 'Start at Stage 1 — pop bubbles and rescue monsters!'}
        </Text>
      </View>

      <ScrollView style={rescueUiStyles.stageList} contentContainerStyle={rescueUiStyles.stageListContent}>
        {RESCUE_STAGES.map((stage) => {
          const locked = stage.id > highestCleared + 1;
          const cleared = stage.id <= highestCleared;
          return (
            <TouchableOpacity
              key={stage.id}
              activeOpacity={locked ? 1 : 0.88}
              disabled={locked}
              style={[
                rescueUiStyles.stageRow,
                locked && rescueUiStyles.stageLocked,
                cleared && rescueUiStyles.stageCleared,
              ]}
              onPress={() => onStartStage(stage.id)}
            >
              <View style={rescueUiStyles.stageBadge}>
                <Text style={rescueUiStyles.stageBadgeText}>{stage.id}</Text>
              </View>
              <View style={rescueUiStyles.stageCopy}>
                <Text style={rescueUiStyles.stageName}>{stage.label}</Text>
                <Text style={rescueUiStyles.stageMeta}>
                  {stage.colorCount} colors · {stage.shotLimit} shots · {stage.targetScore} pts
                </Text>
              </View>
              <Text style={rescueUiStyles.stageAction}>{locked ? '🔒' : cleared ? '★' : '›'}</Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </RescueGameFrame>
  );
}
