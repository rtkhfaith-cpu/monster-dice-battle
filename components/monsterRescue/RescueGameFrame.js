import React from 'react';
import { ImageBackground, Platform, View } from 'react-native';
import { GAME_ASSETS } from '../../utils/gameAssetPaths';
import { gameSurfaceDataProps, WEB_GAME_TOUCH_STYLE } from '../../utils/webGameTouch';
import { rescueFrameStyles } from './rescueUiTheme';

export default function RescueGameFrame({ children, contentStyle }) {
  return (
    <View style={rescueFrameStyles.root} {...gameSurfaceDataProps()}>
      <View style={[rescueFrameStyles.gameFrame, WEB_GAME_TOUCH_STYLE]} {...gameSurfaceDataProps()}>
        <ImageBackground
          source={{ uri: GAME_ASSETS.monsterRescueBackground }}
          style={rescueFrameStyles.backgroundLayer}
          imageStyle={rescueFrameStyles.backgroundImage}
          resizeMode="cover"
          {...(Platform.OS === 'web' ? { accessibilityElementsHidden: true, importantForAccessibility: 'no-hide-descendants' } : {})}
        >
          <View style={[rescueFrameStyles.uiLayer, contentStyle, WEB_GAME_TOUCH_STYLE]}>{children}</View>
        </ImageBackground>
      </View>
    </View>
  );
}
