import React, { useCallback, useEffect, useState } from 'react';
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

  const { height: winH, width: winW } = useWindowDimensions();
  const [playSize, setPlaySize] = useState(null);

  const fallbackW = Math.min(Math.max(winW - 24, 280), 520);
  const fallbackH = Math.min(Math.max(winH - 120, 360), 640);
  const canvasW = playSize?.w ?? fallbackW;
  const canvasH = playSize?.h ?? fallbackH;

  const onPlayAreaLayout = useCallback((e) => {
    const { width, height } = e.nativeEvent.layout;
    const w = Math.floor(width);
    const h = Math.floor(height);
    if (w < 200 || h < 280) return;
    setPlaySize((prev) => (prev?.w === w && prev?.h === h ? prev : { w, h }));
  }, []);

  const handleFinish = useCallback(
    (payload) => {
      if (payload?.won) playSound('win');
      else playSound('lose');
      onFinish?.(payload);
    },
    [onFinish],
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

      <View
        style={[rescueUiStyles.canvasFrame, { width: '100%', maxWidth: fallbackW, alignSelf: 'center' }]}
        onLayout={onPlayAreaLayout}
      >
        {Platform.OS === 'web' && playSize ? (
          <MonsterRescueView
            key={`rescue-stage-${stageId}-${playSize.w}x${playSize.h}`}
            stageId={stageId}
            shooterMonsterTemplateId={shooterMonsterTemplateId}
            width={canvasW}
            height={canvasH}
            onFinish={handleFinish}
          />
        ) : Platform.OS === 'web' ? (
          <View style={rescueUiStyles.canvasPlaceholder} />
        ) : (
          <View style={rescueUiStyles.canvasPlaceholder}>
            <Text style={rescueUiStyles.noticeText}>Open in a web browser to play Monster Rescue.</Text>
          </View>
        )}
      </View>
    </RescueGameFrame>
  );
}
