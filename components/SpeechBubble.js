import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

export default function SpeechBubble({ text, side = 'left', visible = true }) {
  if (!visible || !text) return null;
  return (
    <View style={[styles.wrap, side === 'right' ? styles.right : styles.left]} pointerEvents="none">
      <View style={styles.bubble}>
        <Text style={styles.txt} numberOfLines={3}>
          {text}
        </Text>
      </View>
      <View style={[styles.tail, side === 'right' ? styles.tailR : styles.tailL]} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    top: -6,
    zIndex: 12,
    maxWidth: 150,
  },
  left: { left: -4 },
  right: { right: -4 },
  bubble: {
    backgroundColor: '#fffdf5',
    borderWidth: 3,
    borderColor: '#2d2d44',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    elevation: 2,
  },
  txt: {
    fontSize: 11,
    fontWeight: '900',
    color: '#1f2947',
    textAlign: 'center',
  },
  tail: {
    width: 0,
    height: 0,
    borderLeftWidth: 8,
    borderRightWidth: 8,
    borderTopWidth: 10,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderTopColor: '#2d2d44',
    alignSelf: 'center',
    marginTop: -2,
  },
  tailL: { marginRight: 20 },
  tailR: { marginLeft: 20, transform: [{ scaleX: -1 }] },
});
