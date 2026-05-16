import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';
import { ART } from '../utils/artDirection';

export default function HPBar({
  label,
  current,
  max,
  fillColor = ART.hp,
  trackColor = 'rgba(45, 53, 97, 0.12)',
  textColor = ART.textInk,
  dense = false,
}) {
  const ratio = max > 0 ? Math.max(0, Math.min(1, current / max)) : 0;
  const anim = useRef(new Animated.Value(ratio)).current;
  const flash = useRef(new Animated.Value(0)).current;
  const prev = useRef(current);

  useEffect(() => {
    Animated.spring(anim, {
      toValue: ratio,
      friction: 8,
      tension: 120,
      useNativeDriver: false,
    }).start();
    if (current < prev.current && current > 0) {
      flash.setValue(1);
      Animated.timing(flash, { toValue: 0, duration: 400, useNativeDriver: true }).start();
    }
    prev.current = current;
  }, [current, max, ratio, anim, flash]);

  const widthInterp = anim.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] });
  const flashOp = flash.interpolate({ inputRange: [0, 1], outputRange: [0, 0.55] });

  return (
    <View style={[styles.wrap, dense && styles.wrapDense]}>
      <Text style={[styles.label, dense && styles.labelDense, { color: textColor }]}>{label}</Text>
      <View style={[styles.track, dense && styles.trackDense, { backgroundColor: trackColor, borderColor: ART.outline }]}>
        <Animated.View
          style={[
            styles.fill,
            dense && styles.fillDense,
            { width: widthInterp, backgroundColor: fillColor },
          ]}
        />
        <Animated.View style={[styles.flash, { opacity: flashOp }]} pointerEvents="none" />
      </View>
      <Text style={[styles.value, dense && styles.valueDense, { color: textColor }]}>
        {Math.max(0, Math.round(current))} / {max}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginVertical: 4, width: '100%' },
  wrapDense: { marginVertical: 2, width: '100%' },
  label: { fontSize: 14, fontWeight: '800', marginBottom: 3 },
  labelDense: { fontSize: 15, fontWeight: '900', marginBottom: 2 },
  track: {
    height: 16,
    borderRadius: 9,
    overflow: 'hidden',
    borderWidth: 2,
  },
  trackDense: { height: 14, borderRadius: 8 },
  fill: { height: '100%', borderRadius: 7 },
  fillDense: { borderRadius: 6 },
  flash: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#fff',
  },
  value: { marginTop: 2, fontSize: 12, fontWeight: '700' },
  valueDense: { marginTop: 3, fontSize: 15, fontWeight: '900' },
});
