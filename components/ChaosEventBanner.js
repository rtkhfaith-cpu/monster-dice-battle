import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

/** Loud chaos intro — parent clears after a timeout. */
export default function ChaosEventBanner({ event }) {
  if (!event) return null;
  return (
    <View style={styles.wrap} pointerEvents="none">
      <Text style={styles.chaos}>CHAOS ROUND!</Text>
      <Text style={styles.emoji}>{event.emoji}</Text>
      <Text style={styles.title}>{event.title}</Text>
      <Text style={styles.blurb}>{event.blurb}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    top: 4,
    left: 6,
    right: 6,
    zIndex: 30,
    backgroundColor: 'rgba(255,235,120,0.96)',
    borderWidth: 4,
    borderColor: '#d35400',
    borderRadius: 16,
    paddingVertical: 8,
    paddingHorizontal: 10,
    alignItems: 'center',
    elevation: 8,
  },
  chaos: {
    fontSize: 13,
    fontWeight: '900',
    color: '#c0392b',
    letterSpacing: 1,
  },
  emoji: { fontSize: 32, marginVertical: 2 },
  title: { fontSize: 15, fontWeight: '900', color: '#1b1b2f', textAlign: 'center' },
  blurb: { fontSize: 11, fontWeight: '800', color: '#4a2352', textAlign: 'center', marginTop: 4, lineHeight: 15 },
});
