import React, { useEffect, useRef, useState } from 'react';
import { Animated, Easing, StyleSheet, Text, View } from 'react-native';
import { fx } from '../utils/battleEffectScale';
import { getProjectile } from '../utils/battleProjectiles';

/**
 * Projectile flight + splat — only mounted while `active`; calls onComplete when done.
 */
export default function BattleProjectileLayer({ effect, onImpact, onComplete, active = true }) {
  const [arenaH, setArenaH] = useState(360);
  const progress = useRef(new Animated.Value(0)).current;
  const splat = useRef(new Animated.Value(0)).current;
  const dmgUp = useRef(new Animated.Value(0)).current;
  const spin = useRef(new Animated.Value(0)).current;
  const missFade = useRef(new Animated.Value(1)).current;
  const runId = useRef(0);

  const atkId = effect?.attackerId ?? 1;
  const defId = effect?.defenderId ?? (atkId === 1 ? 2 : 1);
  const projectile = getProjectile(effect?.projectileId || 'poop');
  const fromLeft = atkId === 1;
  const laneY = arenaH * 0.48;
  const startY = laneY;
  const endY = laneY;
  const horizSpan = fx(150);
  const arcLift = fx(14);

  const finish = () => {
    if (typeof onComplete === 'function') onComplete();
  };

  useEffect(() => {
    if (!active || !effect || effect.superBomb) return undefined;
    const id = ++runId.current;
    progress.setValue(0);
    splat.setValue(0);
    dmgUp.setValue(0);
    spin.setValue(0);
    missFade.setValue(1);

    if (effect.dodged) {
      Animated.parallel([
        Animated.timing(progress, { toValue: 1, duration: 340, easing: Easing.in(Easing.quad), useNativeDriver: true }),
        Animated.timing(missFade, { toValue: 0, duration: 340, useNativeDriver: true }),
      ]).start(({ finished }) => {
        if (finished && runId.current === id) finish();
      });
      return () => {
        runId.current += 1;
      };
    }

    const flyMs = effect.critical ? 420 : 360;

    /** Loop must NOT join parallel — it never ends and onComplete never fires. */
    let spinLoop = null;
    if (projectile.spin) {
      spin.setValue(0);
      spinLoop = Animated.loop(
        Animated.timing(spin, { toValue: 1, duration: 260, easing: Easing.linear, useNativeDriver: true }),
      );
      spinLoop.start();
    }

    const safety = setTimeout(() => {
      if (runId.current === id) finish();
    }, flyMs + 1400);

    Animated.timing(progress, {
      toValue: 1,
      duration: flyMs,
      easing: Easing.inOut(Easing.cubic),
      useNativeDriver: true,
    }).start(({ finished }) => {
      if (spinLoop) spinLoop.stop();
      clearTimeout(safety);
      if (!finished || runId.current !== id) return;
      if (typeof onImpact === 'function') onImpact(defId, effect);

      const splatPeak = effect.critical ? 1.35 : effect.defended ? 0.7 : 1;
      splat.setValue(0);
      dmgUp.setValue(0);
      Animated.parallel([
        Animated.timing(splat, { toValue: splatPeak, duration: effect.critical ? 200 : 160, useNativeDriver: true }),
        Animated.timing(dmgUp, { toValue: 1, duration: 560, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      ]).start(() => {
        Animated.timing(splat, { toValue: 0, duration: 280, useNativeDriver: true }).start(() => {
          if (runId.current === id) finish();
        });
      });
    });

    return () => {
      runId.current += 1;
      if (spinLoop) spinLoop.stop();
      clearTimeout(safety);
    };
  }, [active, effect?.seq, effect?.superBomb, effect?.dodged, effect?.projectileId]);

  if (!active || !effect || effect.superBomb) return null;

  const ty = progress.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [startY, startY - arcLift, endY],
  });
  const tx = progress.interpolate({
    inputRange: [0, 1],
    outputRange: fromLeft ? [-horizSpan, horizSpan] : [horizSpan, -horizSpan],
  });
  const rotate = spin.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });
  const projSize = fx(effect.critical ? 52 : effect.defended ? 40 : 48);

  const dmgY = dmgUp.interpolate({ inputRange: [0, 1], outputRange: [0, -fx(36)] });
  const dmgOp = dmgUp.interpolate({ inputRange: [0, 0.15, 0.65, 1], outputRange: [0, 1, 1, 0] });

  const splatScale = splat.interpolate({ inputRange: [0, 1], outputRange: [0.15, 1.1] });
  const splatOp = splat.interpolate({ inputRange: [0, 0.25, 0.75, 1], outputRange: [0, 1, 0.9, 0] });

  const showDmg = !effect.dodged && typeof effect.damage === 'number' && effect.damage > 0;
  const dmgColor = effect.critical ? '#f39c12' : effect.defended ? '#48cae4' : '#e74c3c';
  const dmgLabel = effect.critical
    ? `${effect.damage}!`
    : effect.weak
      ? `${effect.damage}`
      : `${effect.damage}`;

  return (
    <View
      style={styles.layer}
      pointerEvents="none"
      onLayout={(e) => {
        const h = e.nativeEvent.layout.height;
        if (h > 80) setArenaH(h);
      }}
    >
      {effect.critical ? (
        <View style={[styles.critRibbon, { top: laneY - fx(28) }]}>
          <Text style={styles.critRibbonTxt}>CRITICAL!</Text>
        </View>
      ) : null}

      <Animated.View
        style={[
          styles.projWrap,
          fromLeft ? styles.projFromLeft : styles.projFromRight,
          {
            opacity: missFade,
            transform: [{ translateX: tx }, { translateY: ty }, { rotate }],
          },
        ]}
      >
        <Text style={[styles.projEmoji, { fontSize: projSize }]}>{projectile.emoji}</Text>
      </Animated.View>

      {!effect.dodged ? (
        <Animated.View
          style={[
            styles.splatWrap,
            styles.splatCenter,
            {
              top: endY - 6,
              opacity: splatOp,
              transform: [{ scale: splatScale }],
            },
          ]}
        >
          <Text style={[styles.splatEmoji, effect.critical && styles.splatCrit]}>{projectile.splat}</Text>
          {effect.defended ? <Text style={styles.shieldSpark}>🛡️</Text> : null}
        </Animated.View>
      ) : (
        <Animated.Text style={[styles.missLbl, { top: endY, opacity: missFade }]}>Miss!</Animated.Text>
      )}

      {showDmg ? (
        <Animated.Text
          style={[
            styles.dmgPop,
            effect.critical && styles.dmgCrit,
            effect.defended && styles.dmgDefended,
            {
              top: endY - 10,
              color: dmgColor,
              opacity: dmgOp,
              transform: [{ translateY: dmgY }],
            },
          ]}
        >
          {dmgLabel}
        </Animated.Text>
      ) : null}

      {effect.dodged ? (
        <Animated.Text style={[styles.dodgePop, { top: endY - 16, opacity: missFade }]}>Dodged!</Animated.Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  layer: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 18,
    overflow: 'hidden',
  },
  projWrap: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
    width: fx(56),
  },
  projFromLeft: {
    left: '18%',
    marginLeft: -fx(28),
  },
  projFromRight: {
    right: '18%',
    marginRight: -fx(28),
  },
  projEmoji: {
    textAlign: 'center',
    includeFontPadding: false,
  },
  splatWrap: {
    position: 'absolute',
    alignItems: 'center',
    width: fx(72),
  },
  splatCenter: {
    left: '50%',
    marginLeft: -fx(36),
  },
  splatEmoji: {
    fontSize: fx(44),
    textAlign: 'center',
  },
  splatCrit: { fontSize: fx(56) },
  shieldSpark: {
    position: 'absolute',
    fontSize: fx(20),
    top: -fx(6),
    right: -fx(4),
  },
  dmgPop: {
    position: 'absolute',
    left: '30%',
    right: '30%',
    textAlign: 'center',
    fontWeight: '900',
    fontSize: fx(32),
    textShadowColor: 'rgba(0,0,0,0.35)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  dmgCrit: { fontSize: fx(40) },
  dmgDefended: { fontSize: fx(28), color: '#2a9d8f' },
  critRibbon: {
    position: 'absolute',
    left: '10%',
    right: '10%',
    alignItems: 'center',
    zIndex: 20,
  },
  critRibbonTxt: {
    fontWeight: '900',
    fontSize: fx(22),
    color: '#e67e22',
    backgroundColor: 'rgba(255,248,220,0.92)',
    paddingHorizontal: fx(12),
    paddingVertical: fx(3),
    borderRadius: fx(8),
    borderWidth: 2,
    borderColor: '#e74c3c',
    overflow: 'hidden',
  },
  missLbl: {
    position: 'absolute',
    left: 0,
    right: 0,
    textAlign: 'center',
    fontWeight: '900',
    fontSize: fx(18),
    color: '#7f8c8d',
  },
  dodgePop: {
    position: 'absolute',
    left: 0,
    right: 0,
    textAlign: 'center',
    fontWeight: '900',
    fontSize: fx(20),
    color: '#576574',
  },
});
