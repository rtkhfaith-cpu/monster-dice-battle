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
      <View style={styles.box}>
        <Text style={styles.text} numberOfLines={2}>
          {text}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  anchor: {
    position: 'absolute',
    zIndex: 8,
  },
  box: {
    width: '100%',
    justifyContent: 'center',
    backgroundColor: 'rgba(18, 22, 36, 0.72)',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    paddingHorizontal: 10,
    paddingVertical: 7,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  text: {
    fontWeight: '900',
    fontSize: 15,
    lineHeight: 19,
    color: '#ffffff',
    textAlign: 'left',
  },
});
