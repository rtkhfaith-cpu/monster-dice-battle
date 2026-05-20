import React from 'react';
import { Image, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import {
  RESCUE_SUB_LEVELS,
  RESCUE_THEMES,
  RESCUE_TOTAL_LEVELS,
  encodeRescueLevel,
  formatRescueLabel,
  getRescueStage,
  getRescueSubKind,
  rescueSubBanner,
} from '../utils/monsterRescue/stages';
import { describeRescueDifficulty } from '../utils/monsterRescue/difficulty';
import { GAME_ASSETS } from '../utils/gameAssetPaths';
import RescueGameFrame from './monsterRescue/RescueGameFrame';
import { rescueUiStyles } from './monsterRescue/rescueUiTheme';

export default function MonsterRescueHubScreen({
  profileName,
  highestCleared = 0,
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
              {profileName} · cleared {highestCleared}/{RESCUE_TOTAL_LEVELS}
            </Text>
          </View>
        </View>
        <Text style={rescueUiStyles.blurb}>
          Clear every bubble before time runs out. Drag the cannon left/right to aim, then release to shoot. Sub-levels 5 and 10 award Monster Ladder chests.
        </Text>
      </View>

      <View style={rescueUiStyles.noticeBar}>
        <Text style={rescueUiStyles.noticeText} numberOfLines={2}>
          {highestCleared >= RESCUE_TOTAL_LEVELS
            ? 'All rescue themes complete!'
            : highestCleared > 0
              ? `Next: level ${highestCleared + 1} of ${RESCUE_TOTAL_LEVELS}`
              : 'Start at Bubble Bay 1-1'}
        </Text>
      </View>

      <ScrollView style={rescueUiStyles.stageList} contentContainerStyle={rescueUiStyles.stageListContent}>
        {RESCUE_THEMES.map((theme) => (
          <View key={theme.id} style={{ gap: 6 }}>
            <Text style={styles.themeTitle}>{theme.label}</Text>
            {Array.from({ length: RESCUE_SUB_LEVELS }, (_, i) => {
              const subLevel = i + 1;
              const levelId = encodeRescueLevel(theme.id, subLevel);
              const locked = levelId > highestCleared + 1;
              const cleared = levelId <= highestCleared;
              const subKind = getRescueSubKind(subLevel);
              const banner = rescueSubBanner(subKind);
              const stage = getRescueStage(levelId);
              const diff = describeRescueDifficulty(levelId);
              return (
                <TouchableOpacity
                  key={levelId}
                  activeOpacity={locked ? 1 : 0.88}
                  disabled={locked}
                  style={[
                    rescueUiStyles.stageRow,
                    locked && rescueUiStyles.stageLocked,
                    cleared && rescueUiStyles.stageCleared,
                    subKind !== 'normal' && styles.chestRow,
                  ]}
                  onPress={() => onStartStage(levelId)}
                >
                  <View style={rescueUiStyles.stageBadge}>
                    <Text style={rescueUiStyles.stageBadgeText}>{subLevel}</Text>
                  </View>
                  <View style={rescueUiStyles.stageCopy}>
                    <Text style={rescueUiStyles.stageName}>
                      {formatRescueLabel(theme.id, subLevel)}
                      {banner ? ` · ${banner}` : ''}
                    </Text>
                    <Text style={rescueUiStyles.stageMeta}>
                      {stage.colorCount} colors · {diff.timeLabel} · push every {diff.rowPushEvery} shots
                    </Text>
                  </View>
                  <Text style={rescueUiStyles.stageAction}>{locked ? '🔒' : cleared ? '★' : '›'}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        ))}
      </ScrollView>
    </RescueGameFrame>
  );
}

const styles = {
  themeTitle: {
    color: '#ffe6a3',
    fontSize: 13,
    fontWeight: '900',
    marginTop: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  chestRow: {
    borderColor: 'rgba(250, 204, 21, 0.55)',
  },
};
