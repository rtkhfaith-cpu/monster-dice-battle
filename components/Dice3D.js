import React, { useEffect, useRef, useState } from 'react';
import { Animated, Easing, StyleSheet, Text, View } from 'react-native';

function clampFace(n) {
  const v = Math.round(Number(n));
  if (!Number.isFinite(v)) return 1;
  return Math.min(6, Math.max(1, v));
}

/** Dot grid [row,col] ∈ {0,1,2} for standard pip layouts */
const PIPS = {
  1: [[1, 1]],
  2: [
    [0, 0],
    [2, 2],
  ],
  3: [
    [0, 0],
    [1, 1],
    [2, 2],
  ],
  4: [
    [0, 0],
    [0, 2],
    [2, 0],
    [2, 2],
  ],
  5: [
    [0, 0],
    [0, 2],
    [1, 1],
    [2, 0],
    [2, 2],
  ],
  6: [
    [0, 0],
    [0, 2],
    [1, 0],
    [1, 2],
    [2, 0],
    [2, 2],
  ],
};

/**
 * Fake 3D dice: spin + bounce + face cycling, then reveal `finalValue` (1–6).
 * When `active` flips true, reads `finalValue` from props (parent rolls before mount tick) or use internal roll.
 */
/** Static dice face for idle / result display */
export function DiceFaceStatic({ value = 1, size = 72, placeholder = false }) {
  const v = clampFace(value);
  return (
    <View style={[faceStyles.face, { width: size, height: size }, placeholder && faceStyles.placeholder]}>
      {placeholder ? (
        <Text style={[faceStyles.qMark, { fontSize: size * 0.42 }]}>?</Text>
      ) : (
        <GridPips value={v} cell={size / 5} />
      )}
    </View>
  );
}

export default function Dice3D({ active, finalValue, onComplete, size = 120, durationMs = 1000, flashMs = 100 }) {
  const spin = useRef(new Animated.Value(0)).current;
  const bounce = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(1)).current;
  const glow = useRef(new Animated.Value(0)).current;
  const sad = useRef(new Animated.Value(0)).current;
  const [faceFlash, setFaceFlash] = useState(1);
  const [revealed, setRevealed] = useState(false);
  const flashTimer = useRef(null);
  const onDoneRef = useRef(onComplete);
  useEffect(() => {
    onDoneRef.current = onComplete;
  }, [onComplete]);

  useEffect(() => {
    if (!active) {
      setRevealed(false);
      spin.setValue(0);
      bounce.setValue(0);
      scale.setValue(1);
      return;
    }

    const v = clampFace(finalValue);
    setRevealed(false);
    let tick = 0;
    flashTimer.current = setInterval(() => {
      tick += 1;
      setFaceFlash((tick % 6) + 1);
    }, flashMs);

    spin.setValue(0);
    bounce.setValue(0);
    scale.setValue(1);

    let finished = false;
    const safeDone = () => {
      if (finished) return;
      finished = true;
      if (flashTimer.current) clearInterval(flashTimer.current);
      flashTimer.current = null;
      setFaceFlash(v);
      setRevealed(true);
      try {
        onDoneRef.current?.(v);
      } catch (e) {
        console.warn('[Dice3D] onComplete failed', e);
      }
    };

    const failSafe = setTimeout(() => safeDone(), durationMs + 450);

    const anim = Animated.parallel([
      Animated.sequence([
        Animated.timing(spin, {
          toValue: 0.78,
          duration: durationMs * 0.52,
          easing: Easing.linear,
          useNativeDriver: true,
        }),
        Animated.timing(spin, {
          toValue: 1,
          duration: durationMs * 0.48,
          easing: Easing.out(Easing.quint),
          useNativeDriver: true,
        }),
      ]),
      Animated.sequence([
        Animated.timing(bounce, { toValue: 1, duration: durationMs * 0.35, easing: Easing.out(Easing.quad), useNativeDriver: true }),
        Animated.timing(bounce, { toValue: 0, duration: durationMs * 0.65, easing: Easing.out(Easing.quad), useNativeDriver: true }),
      ]),
      Animated.sequence([
        Animated.timing(scale, { toValue: 1.12, duration: durationMs * 0.25, useNativeDriver: true }),
        Animated.timing(scale, { toValue: 0.96, duration: durationMs * 0.35, useNativeDriver: true }),
        Animated.timing(scale, { toValue: 1, duration: durationMs * 0.4, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      ]),
    ]);

    anim.start((result) => {
      clearTimeout(failSafe);
      if (result?.finished === true) safeDone();
    });

    return () => {
      clearTimeout(failSafe);
      if (flashTimer.current) clearInterval(flashTimer.current);
      flashTimer.current = null;
      anim.stop();
    };
  }, [active, finalValue, durationMs, flashMs, spin, bounce, scale]);

  useEffect(() => {
    if (!revealed) {
      glow.setValue(0);
      sad.setValue(0);
      return undefined;
    }
    const v = clampFace(finalValue);
    if (v === 6) {
      const loop = Animated.loop(
        Animated.sequence([
          Animated.timing(glow, { toValue: 1, duration: 220, useNativeDriver: false }),
          Animated.timing(glow, { toValue: 0, duration: 220, useNativeDriver: false }),
        ]),
      );
      loop.start();
      return () => loop.stop();
    }
    if (v === 1) {
      Animated.spring(sad, { toValue: 1, useNativeDriver: true }).start();
    }
    return undefined;
  }, [revealed, finalValue, glow, sad]);

  const rotate = spin.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '720deg'],
  });

  const lift = bounce.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -18],
  });

  const showFace = revealed ? clampFace(finalValue) : faceFlash;
  const glowBorder = glow.interpolate({ inputRange: [0, 1], outputRange: ['#2d2d44', '#fbbf24'] });
  const isSix = revealed && clampFace(finalValue) === 6;

  return (
    <View style={[styles.wrap, { width: size + 24, height: size + 42 }]}>
      <Animated.View
        style={[
          styles.cube,
          {
            width: size,
            height: size,
            transform: [{ rotateZ: rotate }, { translateY: lift }, { scale }],
          },
        ]}
      >
        {isSix ? (
          <Animated.View style={[styles.face, { width: size, height: size, borderColor: glowBorder, borderWidth: 5 }]}>
            <GridPips value={showFace} cell={size / 5} />
          </Animated.View>
        ) : (
          <View style={[styles.face, { width: size, height: size }]}>
            <GridPips value={showFace} cell={size / 5} />
          </View>
        )}
        <View style={[styles.shadow, { width: size * 0.85, bottom: -size * 0.12 }]} />
      </Animated.View>
      {revealed && clampFace(finalValue) === 1 ? (
        <Animated.Text style={[styles.sadLbl, { opacity: sad }]}>
          😢 OH NO!
        </Animated.Text>
      ) : null}
    </View>
  );
}

function GridPips({ value, cell }) {
  const coords = PIPS[value] || PIPS[1];
  const set = new Set(coords.map(([r, c]) => `${r},${c}`));
  const rows = [0, 1, 2].map((r) => (
    <View key={r} style={styles.row}>
      {[0, 1, 2].map((c) => (
        <View key={c} style={{ width: cell, height: cell, justifyContent: 'center', alignItems: 'center' }}>
          {set.has(`${r},${c}`) ? <View style={[styles.pip, { width: cell * 0.38, height: cell * 0.38, borderRadius: cell * 0.2 }]} /> : null}
        </View>
      ))}
    </View>
  ));
  return <View style={styles.grid}>{rows}</View>;
}

const faceStyles = StyleSheet.create({
  face: {
    backgroundColor: '#fff8f2',
    borderRadius: 14,
    borderWidth: 2,
    borderColor: '#c9b99a',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 8,
  },
  placeholder: {
    backgroundColor: '#fffdf8',
    borderStyle: 'dashed',
    borderColor: '#d4c4a8',
  },
  qMark: {
    fontWeight: '900',
    color: '#b8a88a',
  },
});

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  cube: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
  },
  face: {
    backgroundColor: '#fff8f2',
    borderRadius: 14,
    borderWidth: 3,
    borderColor: '#2d2d44',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 4, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 0,
    elevation: 6,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 10,
  },
  shadow: {
    position: 'absolute',
    height: 10,
    backgroundColor: 'rgba(0,0,0,0.18)',
    borderRadius: 20,
    alignSelf: 'center',
    zIndex: -1,
  },
  grid: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  row: {
    flexDirection: 'row',
  },
  pip: {
    backgroundColor: '#1f1f2e',
  },
  sadLbl: {
    marginTop: 4,
    fontWeight: '900',
    fontSize: 14,
    color: '#566573',
    textAlign: 'center',
  },
});
