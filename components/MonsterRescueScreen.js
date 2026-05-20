import React, { useCallback, useEffect } from 'react';
import { Platform, Text, TouchableOpacity, View, useWindowDimensions } from 'react-native';
import MonsterRescueView from './MonsterRescueView';
import RescueGameFrame from './monsterRescue/RescueGameFrame';
import { rescueUiStyles } from './monsterRescue/rescueUiTheme';
import { playSound } from '../utils/sounds';
import { unlockAudio } from '../src/utils/audioManager';

export default function MonsterRescueScreen({ stageId, stageLabel, shooterMonsterTemplateId, onBack, onFinish }) {
  useEffect(() => {
    unlockAudio();
  }, []);
  const { height: winH } = useWindowDimensions();
  const canvasH = Math.min(Math.max(winH - 140, 320), 560);

  const handlePop = useCallback(() => {
    playSound('bubblePop');
  }, []);

  const handleCombo = useCallback(() => {
    playSound('rescueCombo');
  }, []);

  const handleShoot = useCallback(() => {
    playSound('bubbleShoot');
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
    <RescueGameFrame contentStyle={{ gap: 6, paddingBottom: 6 }}>
      <View style={rescueUiStyles.topBar}>
        <TouchableOpacity onPress={onBack} style={rescueUiStyles.navPill} activeOpacity={0.86}>
          <Text style={rescueUiStyles.navPillText}>← Exit</Text>
        </TouchableOpacity>
        <Text style={rescueUiStyles.topBarTitle} numberOfLines={1}>
          {stageLabel ?? `Stage ${stageId}`}
        </Text>
        <View style={rescueUiStyles.topBarSpacer} />
      </View>

      <View style={rescueUiStyles.canvasFrame}>
        {Platform.OS === 'web' ? (
          <MonsterRescueView
            key={`rescue-stage-${stageId}`}
            stageId={stageId}
            shooterMonsterTemplateId={shooterMonsterTemplateId}
            height={canvasH}
            onPop={handlePop}
            onCombo={handleCombo}
            onShoot={handleShoot}
            onFinish={handleFinish}
          />
        ) : (
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 20 }}>
            <Text style={rescueUiStyles.noticeText}>Open in a web browser to play Monster Rescue.</Text>
          </View>
        )}
      </View>

      <View style={rescueUiStyles.noticeBar}>
        <Text style={rescueUiStyles.noticeText}>Drag to aim the bubble gun · release to shoot · clear the board!</Text>
      </View>
    </RescueGameFrame>
  );
}
