import React, { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Ellipse, Line, Path, Rect } from 'react-native-svg';

/** Move-specific doodles (coded — no bitmaps). */
export default function MoveEffect({ effectType, emoji, animate = true, rageBoost = false }) {
  const pulse = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!animate) return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 520, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0, duration: 520, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [animate, pulse]);

  const sc = pulse.interpolate({ inputRange: [0, 1], outputRange: [0.94, 1.06] });
  const op = pulse.interpolate({ inputRange: [0, 1], outputRange: [0.82, 1] });

  return (
    <Animated.View style={{ transform: [{ scale: sc }], opacity: op }} accessibilityLabel={`Move effect ${effectType}`}>
      {renderEffect(effectType, emoji, rageBoost)}
    </Animated.View>
  );
}

function renderEffect(effectType, emoji, rageBoost) {
  switch (effectType) {
    case 'fire':
      return (
        <View style={styles.cluster}>
          <Text style={styles.bigEmoji}>{emoji}</Text>
          <Svg width={140} height={56} viewBox="0 0 140 56">
            <Path
              d="M10 42 Q40 8 72 36 T130 44"
              stroke="#e67e22"
              strokeWidth={rageBoost ? 9 : 6}
              fill="none"
              strokeLinecap="round"
              opacity={0.9}
            />
            <Path
              d="M24 48 Q48 20 76 42"
              stroke="#f1c40f"
              strokeWidth={rageBoost ? 6 : 4}
              fill="none"
              strokeLinecap="round"
            />
            {rageBoost ? <Path d="M16 50 Q50 16 90 40 T132 48" stroke="#e74c3c" strokeWidth={4} fill="none" strokeLinecap="round" opacity={0.8} /> : null}
          </Svg>
        </View>
      );

    case 'water':
      return (
        <View style={styles.cluster}>
          <Text style={styles.bigEmoji}>{emoji}</Text>
          <Svg width={140} height={72} viewBox="0 0 140 72">
            <Path d="M0 52 Q36 44 72 52 T144 54 L144 74 L0 74 Z" fill="#3498db" opacity={0.55} />
            <Circle cx={40} cy={34} r={11} fill="#85c1e9" opacity={0.7} />
            <Circle cx={88} cy={28} r={14} fill="#5dade2" opacity={0.65} />
          </Svg>
        </View>
      );

    case 'toiletPaper':
      return (
        <View style={styles.cluster}>
          <Text style={styles.bigEmoji}>{emoji}</Text>
          <Svg width={140} height={52} viewBox="0 0 140 52">
            <Rect x={48} y={10} width={62} height={30} rx={8} fill="#ecf0f1" stroke="#2d3436" strokeWidth={3} />
            <Ellipse cx={56} cy={25} rx={6} ry={18} fill="#dfe6e9" opacity={0.9} />
            <Circle cx={100} cy={22} r={5} fill="#bdc3c7" opacity={0.7} />
            <Circle cx={112} cy={30} r={4} fill="#bdc3c7" opacity={0.5} />
          </Svg>
        </View>
      );

    case 'egg':
      return (
        <View style={styles.cluster}>
          <Text style={styles.bigEmoji}>{emoji}</Text>
          <Svg width={120} height={70} viewBox="0 0 120 70">
            <Ellipse cx={40} cy={32} rx={18} ry={26} fill="#fdebd0" stroke="#2d2d44" strokeWidth={3} />
            <Path d="M68 52 Q94 62 106 54" stroke="#f7dc6f" strokeWidth={4} opacity={0.45} strokeLinecap="round" />
          </Svg>
        </View>
      );

    case 'bottle':
      return (
        <View style={styles.cluster}>
          <Text style={styles.bigEmoji}>{emoji}</Text>
          <Svg width={96} height={86} viewBox="0 0 96 86">
            <Rect x={40} y={8} width={16} height={14} rx={3} fill="#74b9ff" stroke="#2d2d44" strokeWidth={3} />
            <Rect x={30} y={22} width={36} height={54} rx={8} fill="#0984e3" opacity={0.85} stroke="#2d2d44" strokeWidth={3} />
            <Ellipse cx={48} cy={36} rx={10} ry={14} fill="#dfe6ff" opacity={0.4} />
          </Svg>
        </View>
      );

    case 'cactus':
      return (
        <View style={styles.cluster}>
          <Text style={styles.bigEmoji}>{emoji}</Text>
          <Svg width={100} height={86} viewBox="0 0 100 86">
            <Rect x={44} y={24} width={12} height={48} rx={5} fill="#27ae60" stroke="#145a32" strokeWidth={3} />
            <Ellipse cx={32} cy={44} rx={10} ry={22} fill="#27ae60" stroke="#145a32" strokeWidth={3} />
            <Ellipse cx={68} cy={36} rx={10} ry={18} fill="#27ae60" stroke="#145a32" strokeWidth={3} />
            <Circle cx={50} cy={72} r={6} fill="#ecf0f1" opacity={0.7} />
          </Svg>
        </View>
      );

    case 'magic67':
      return (
        <View style={[styles.cluster, { alignItems: 'center' }]}>
          <View style={styles.glowSixtySeven}>
            <Text style={styles.sixSeven}>67</Text>
          </View>
          <Svg width={150} height={48} viewBox="0 0 150 48">
            {[0, 1, 2, 3, 4].map((i) => (
              <Line
                key={i}
                x1={20 + i * 26}
                y1={44}
                x2={42 + i * 26}
                y2={10}
                stroke="#af7ac5"
                strokeWidth={3}
                opacity={0.85 - i * 0.08}
              />
            ))}
          </Svg>
          <Text style={styles.miniEmoji}>{emoji}</Text>
        </View>
      );

    case 'whip':
      return (
        <View style={styles.cluster}>
          <Text style={styles.bigEmoji}>{emoji}</Text>
          <Svg width={120} height={70} viewBox="0 0 120 70">
            <Path d="M8 62 Q54 52 94 28 Q118 40 114 62" stroke="#5d4037" strokeWidth={6} fill="none" strokeLinecap="round" strokeLinejoin="round" />
            <Path d="M12 62 L118 62" stroke="#d35400" strokeWidth={10} opacity={0.15} strokeLinecap="round" />
          </Svg>
        </View>
      );

    case 'roar':
      return (
        <View style={styles.cluster}>
          <Text style={{ fontSize: 36 }}>{emoji}</Text>
          <Svg width={170} height={90} viewBox="0 0 170 90">
            <Circle cx={40} cy={48} r={14} stroke="#f39c12" strokeWidth={3} fill="none" opacity={0.9} />
            <Circle cx={40} cy={48} r={26} stroke="#e59866" strokeWidth={3} fill="none" opacity={0.55} />
            <Circle cx={40} cy={48} r={38} stroke="#fad7a0" strokeWidth={2} fill="none" opacity={0.38} />
          </Svg>
          <Text style={[styles.miniEmoji, { marginTop: 2 }]}>ROAR!</Text>
        </View>
      );

    case 'nag':
      return (
        <View style={styles.cluster}>
          <Text style={{ fontSize: 28 }}>{emoji}</Text>
          {[0, 1, 2].map((i) => (
            <View key={i} style={[styles.bubble, { marginTop: 4 + i * 2 }]}>
              <Text style={styles.bubbleTxt}>Nag! Nag! Nag!</Text>
            </View>
          ))}
        </View>
      );

    case 'smellySocks':
      return (
        <View style={styles.cluster}>
          <Text style={styles.bigEmoji}>{emoji}</Text>
          <Svg width={150} height={86} viewBox="0 0 150 86">
            <Path d="M30 72 Q72 72 118 62 Q122 54 132 62 Q104 74 74 74 Z" fill="#c8d6bf" opacity={0.75} stroke="#2d3436" strokeWidth={3} />
            <Circle cx={60} cy={34} r={38} fill="#7dcea0" opacity={0.18} stroke="#196f3d" strokeWidth={2} />
            <Circle cx={100} cy={28} r={28} fill="#a9dfbf" opacity={0.14} />
          </Svg>
        </View>
      );

    default:
      return (
        <View style={styles.cluster}>
          <Text style={styles.bigEmoji}>{emoji || '✨'}</Text>
        </View>
      );
  }
}

const styles = StyleSheet.create({
  cluster: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 88,
  },
  bigEmoji: {
    fontSize: 36,
    marginBottom: 2,
  },
  miniEmoji: {
    fontSize: 18,
    fontWeight: '800',
    color: '#6c3483',
  },
  glowSixtySeven: {
    borderRadius: 18,
    paddingHorizontal: 22,
    paddingVertical: 6,
    backgroundColor: 'rgba(175,122,197,0.35)',
    borderWidth: 3,
    borderColor: '#8e44ad',
    marginBottom: 4,
  },
  sixSeven: {
    fontSize: 38,
    fontWeight: '900',
    color: '#5b2c6f',
    letterSpacing: 2,
  },
  bubble: {
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#2d3436',
    paddingHorizontal: 10,
    paddingVertical: 4,
    alignSelf: 'center',
  },
  bubbleTxt: {
    fontWeight: '800',
    color: '#2c3e50',
    fontSize: 12,
  },
});
