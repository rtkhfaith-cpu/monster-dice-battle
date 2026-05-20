import React from 'react';
import { ImageBackground, View } from 'react-native';
import { GAME_ASSETS } from '../../utils/gameAssetPaths';
import { rescueFrameStyles } from './rescueUiTheme';

export default function RescueGameFrame({ children, contentStyle }) {
  return (
    <View style={rescueFrameStyles.root}>
      <View style={rescueFrameStyles.gameFrame}>
        <ImageBackground
          source={{ uri: GAME_ASSETS.monsterRescueBackground }}
          style={rescueFrameStyles.backgroundLayer}
          imageStyle={rescueFrameStyles.backgroundImage}
          resizeMode="cover"
        >
          <View style={[rescueFrameStyles.uiLayer, contentStyle]}>{children}</View>
        </ImageBackground>
      </View>
    </View>
  );
}
