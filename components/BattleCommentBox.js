import React from 'react';
import { StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { getStrictLayout } from '../utils/battleLayout';

/**
 * Battle message — anchored near dice, compact dark pill.
 */
export default function BattleCommentBox({ message }) {
  const { width, height } = useWindowDimensions();
  const text = typeof message === 'string' ? message.trim() : '';
  if (!text) return null;

  const L = getStrictLayout(width, height);

  return (
    <View
      style={[
        styles.anchor,
        {
          left: L.commentLeft,
          top: L.commentTop,
          width: L.commentW,
          maxWidth: L.commentW,
        },
      ]}
      pointerEvents="none"
    >
      <Text style={styles.text} numberOfLines={3}>
        {text}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  anchor: {
    position: 'absolute',
    zIndex: 8,
    alignItems: 'center',
  },
  text: {
    fontWeight: '900',
    fontSize: 17,
    lineHeight: 23,
    color: '#ffffff',
    textAlign: 'center',
    textShadowColor: 'rgba(0, 0, 0, 0.85)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 8,
    width: '100%',
  },
});
