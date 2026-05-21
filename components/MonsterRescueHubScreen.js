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
import {
  countRescueChestsClaimedThisWeek,
  getRescueStageStatus,
  isRescueStagePlayable,
} from '../utils/monsterRescue/progress';
import { GAME_ASSETS } from '../utils/gameAssetPaths';
import RescueGameFrame from './monsterRescue/RescueGameFrame';
import { rescueUiStyles } from './monsterRescue/rescueUiTheme';
import { WEB_DECORATIVE_IMAGE_PROPS } from '../utils/webGameTouch';

const RESCUE_CHEST_STAGES_PER_WEEK = RESCUE_THEMES.length * 2;

function stageActionLabel(status) {
  if (status === 'locked') return '🔒';
  if (status === 'closed') return '📦';
  if (status === 'cleared') return '✓';
  return '›';
}

export default function MonsterRescueHubScreen({
  profileName,
  rescueState,
  weeklyResetHint,
  hasPlayerKey = false,
  onBack,
  onStartStage,
}) {
  const highestCleared = rescueState?.highestCleared ?? 0;
  const chestsClaimed = countRescueChestsClaimedThisWeek(rescueState);

  return (
    <RescueGameFrame>
      <TouchableOpacity onPress={onBack} style={rescueUiStyles.navPill} activeOpacity={0.86}>
        <Text style={rescueUiStyles.navPillText}>← Quests</Text>
      </TouchableOpacity>

      <View style={rescueUiStyles.headerPanel}>
        <View style={rescueUiStyles.titleRow}>
          <Image
            source={{ uri: GAME_ASSETS.chestClosed }}
            style={rescueUiStyles.titleIcon}
            resizeMode="contain"
            {...WEB_DECORATIVE_IMAGE_PROPS}
          />
          <View style={{ flex: 1 }}>
            <Text style={rescueUiStyles.kicker}>Quest 2</Text>
            <Text style={rescueUiStyles.title}>Monster Rescue</Text>
            <Text style={rescueUiStyles.sub}>
              {profileName} · this week {highestCleared}/{RESCUE_TOTAL_LEVELS} · chests {chestsClaimed}/{RESCUE_CHEST_STAGES_PER_WEEK}
            </Text>
          </View>
        </View>
        <Text style={rescueUiStyles.blurb}>
          Clear every bubble before time runs out. Sub-levels 5 and 10 each grant one chest per week (opened immediately). Cleared stages close until the weekly reset.
        </Text>
        {weeklyResetHint ? (
          <Text style={rescueUiStyles.saveHint}>{weeklyResetHint}</Text>
        ) : null}
        <Text style={rescueUiStyles.saveHint}>
          {hasPlayerKey
            ? 'After each stage, progress saves automatically on this device and syncs to the cloud — no extra button needed.'
            : 'After each stage, progress saves on this device. Set a 4-digit Player Key on the home screen for automatic cloud backup when you finish a stage.'}
        </Text>
      </View>

      <View style={rescueUiStyles.noticeBar}>
        <Text style={rescueUiStyles.noticeText} numberOfLines={3}>
          {highestCleared >= RESCUE_TOTAL_LEVELS
            ? 'Weekly run complete! All 60 stages and up to 12 chests claimed. Next run unlocks Sunday 6:00 PM (Singapore).'
            : highestCleared > 0
              ? `Next stage: ${highestCleared + 1} of ${RESCUE_TOTAL_LEVELS}. Incomplete progress resets on the weekly deadline.`
              : 'Start at Bubble Bay 1-1 — you have until the next Sunday 6:00 PM (Singapore) to reach 6-10.'}
        </Text>
      </View>

      <ScrollView style={rescueUiStyles.stageList} contentContainerStyle={rescueUiStyles.stageListContent}>
        {RESCUE_THEMES.map((theme) => (
          <View key={theme.id} style={{ gap: 6 }}>
            <Text style={styles.themeTitle}>{theme.label}</Text>
            {Array.from({ length: RESCUE_SUB_LEVELS }, (_, i) => {
              const subLevel = i + 1;
              const levelId = encodeRescueLevel(theme.id, subLevel);
              const status = getRescueStageStatus(rescueState, levelId);
              const playable = isRescueStagePlayable(rescueState, levelId);
              const subKind = getRescueSubKind(subLevel);
              const banner = rescueSubBanner(subKind);
              const stage = getRescueStage(levelId);
              const diff = describeRescueDifficulty(levelId);
              return (
                <TouchableOpacity
                  key={levelId}
                  activeOpacity={playable ? 0.88 : 1}
                  disabled={!playable}
                  style={[
                    rescueUiStyles.stageRow,
                    status === 'locked' && rescueUiStyles.stageLocked,
                    (status === 'cleared' || status === 'closed') && rescueUiStyles.stageCleared,
                    subKind !== 'normal' && styles.chestRow,
                    status === 'closed' && styles.chestClosedRow,
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
                      {status === 'closed' ? ' · chest claimed' : ''}
                    </Text>
                    <Text style={rescueUiStyles.stageMeta}>
                      {stage.colorCount} colors · {diff.timeLabel} limit · {diff.moveLabel} · push every {diff.rowPushEvery} shots
                    </Text>
                  </View>
                  <Text style={rescueUiStyles.stageAction}>{stageActionLabel(status)}</Text>
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
  chestClosedRow: {
    opacity: 0.72,
  },
};
