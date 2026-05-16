import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export default function HPBar({
  label,
  current,
  max,
  fillColor = '#4ECDC4',
  trackColor = 'rgba(0,0,0,0.12)',
  textColor = '#333',
  dense = false,
}) {
  const ratio = max > 0 ? Math.max(0, Math.min(1, current / max)) : 0;
  return (
    <View style={[styles.wrap, dense && styles.wrapDense]}>
      <Text style={[styles.label, dense && styles.labelDense, { color: textColor }]}>{label}</Text>
      <View style={[styles.track, dense && styles.trackDense, { backgroundColor: trackColor }]}>
        <View
          style={[
            styles.fill,
            dense && styles.fillDense,
            {
              width: `${ratio * 100}%`,
              backgroundColor: fillColor,
            },
          ]}
        />
      </View>
      <Text style={[styles.value, dense && styles.valueDense, { color: textColor }]}>
        {Math.max(0, Math.round(current))} / {max}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginVertical: 4,
    width: '100%',
  },
  wrapDense: {
    marginVertical: 2,
    width: '100%',
  },
  label: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 2,
  },
  labelDense: {
    fontSize: 15,
    fontWeight: '900',
    marginBottom: 2,
  },
  track: {
    height: 16,
    borderRadius: 8,
    overflow: 'hidden',
  },
  trackDense: {
    height: 14,
    borderRadius: 7,
  },
  fill: {
    height: '100%',
    borderRadius: 8,
  },
  fillDense: {
    borderRadius: 5,
  },
  value: {
    marginTop: 2,
    fontSize: 12,
    fontWeight: '600',
  },
  valueDense: {
    marginTop: 3,
    fontSize: 15,
    fontWeight: '900',
  },
});
