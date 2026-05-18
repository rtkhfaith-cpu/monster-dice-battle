import React, { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, View } from 'react-native';

/**
 * Lightweight fantasy arena backdrop for online lobby — glow + silhouettes.
 */
export default function OnlineLobbyBackground() {
  const driftA = useRef(new Animated.Value(0)).current;
  const driftB = useRef(new Animated.Value(0)).current;
  const pulse = useRef(new Animated.Value(0)).current;
  const float1 = useRef(new Animated.Value(0)).current;
  const float2 = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const cloudLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(driftA, { toValue: 1, duration: 22000, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(driftA, { toValue: 0, duration: 22000, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ]),
    );
    const cloudLoopB = Animated.loop(
      Animated.sequence([
        Animated.timing(driftB, { toValue: 1, duration: 28000, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(driftB, { toValue: 0, duration: 28000, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ]),
    );
    const glowLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 3200, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0, duration: 3200, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ]),
    );
    const p1 = Animated.loop(
      Animated.sequence([
        Animated.timing(float1, { toValue: 1, duration: 4000, useNativeDriver: true }),
        Animated.timing(float1, { toValue: 0, duration: 4000, useNativeDriver: true }),
      ]),
    );
    const p2 = Animated.loop(
      Animated.sequence([
        Animated.timing(float2, { toValue: 1, duration: 5200, useNativeDriver: true }),
        Animated.timing(float2, { toValue: 0, duration: 5200, useNativeDriver: true }),
      ]),
    );
    cloudLoop.start();
    cloudLoopB.start();
    glowLoop.start();
    p1.start();
    p2.start();
    return () => {
      cloudLoop.stop();
      cloudLoopB.stop();
      glowLoop.stop();
      p1.stop();
      p2.stop();
    };
  }, [driftA, driftB, pulse, float1, float2]);

  const txA = driftA.interpolate({ inputRange: [0, 1], outputRange: [-12, 18] });
  const txB = driftB.interpolate({ inputRange: [0, 1], outputRange: [14, -10] });
  const glowOp = pulse.interpolate({ inputRange: [0, 1], outputRange: [0.35, 0.65] });
  const fy1 = float1.interpolate({ inputRange: [0, 1], outputRange: [0, -10] });
  const fy2 = float2.interpolate({ inputRange: [0, 1], outputRange: [0, 8] });

  return (
    <View style={styles.root} pointerEvents="none">
      <View style={styles.skyTop} />
      <View style={styles.skyBottom} />
      <Animated.View style={[styles.arenaGlow, { opacity: glowOp }]} />
      <Animated.View style={[styles.cloud, styles.cloudA, { transform: [{ translateX: txA }] }]} />
      <Animated.View style={[styles.cloud, styles.cloudB, { transform: [{ translateX: txB }] }]} />
      <Animated.View style={[styles.cloud, styles.cloudC, { transform: [{ translateX: txA }] }]} />
      <View style={styles.hill} />
      <View style={styles.platform} />
      <Animated.Text style={[styles.silhouette, styles.silLeft, { transform: [{ translateY: fy1 }] }]}>
        🦖
      </Animated.Text>
      <Animated.Text style={[styles.silhouette, styles.silRight, { transform: [{ translateY: fy2 }] }]}>
        🐉
      </Animated.Text>
      <View style={styles.particle} />
      <View style={[styles.particle, styles.particle2]} />
      <View style={[styles.particle, styles.particle3]} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    ...StyleSheet.absoluteFillObject,
    overflow: 'hidden',
    backgroundColor: '#081324',
  },
  skyTop: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    height: '55%',
    backgroundColor: '#0b1830',
  },
  skyBottom: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: '45%',
    backgroundColor: '#10233f',
  },
  arenaGlow: {
    position: 'absolute',
    left: '15%',
    right: '15%',
    bottom: '18%',
    height: '28%',
    borderRadius: 120,
    backgroundColor: 'rgba(96, 165, 250, 0.22)',
  },
  cloud: {
    position: 'absolute',
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 24,
  },
  cloudA: { top: '8%', left: '8%', width: 72, height: 28 },
  cloudB: { top: '14%', right: '10%', width: 88, height: 32 },
  cloudC: { top: '5%', left: '42%', width: 56, height: 22, opacity: 0.75 },
  hill: {
    position: 'absolute',
    left: '-10%',
    right: '-10%',
    bottom: '22%',
    height: '18%',
    backgroundColor: '#14294a',
    borderTopLeftRadius: 120,
    borderTopRightRadius: 120,
    opacity: 0.85,
  },
  platform: {
    position: 'absolute',
    left: '12%',
    right: '12%',
    bottom: '20%',
    height: '8%',
    backgroundColor: 'rgba(185, 132, 59, 0.2)',
    borderRadius: 20,
    borderWidth: 2,
    borderColor: 'rgba(255,224,138,0.32)',
  },
  silhouette: {
    position: 'absolute',
    bottom: '24%',
    fontSize: 42,
    opacity: 0.16,
  },
  silLeft: { left: '8%' },
  silRight: { right: '8%' },
  particle: {
    position: 'absolute',
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(252, 211, 77, 0.58)',
    top: '32%',
    left: '22%',
  },
  particle2: { top: '48%', left: '68%', width: 4, height: 4 },
  particle3: { top: '22%', left: '55%', width: 5, height: 5, opacity: 0.7 },
});
