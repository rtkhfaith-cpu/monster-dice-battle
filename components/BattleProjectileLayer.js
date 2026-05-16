import React, { useEffect, useRef, useState } from 'react';
import { Animated, Easing, StyleSheet, Text, View } from 'react-native';
import { getProjectile } from '../utils/battleProjectiles';

/**
 * Full-arena projectile flight, splat, and floating damage popup.
 */
export default function BattleProjectileLayer({ effect, onImpact }) {
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
  const fromBottom = atkId === 1;

  const startY = arenaH * (fromBottom ? 0.58 : 0.2);
  const endY = arenaH * (fromBottom ? 0.24 : 0.52);
  const arcX = fromBottom ? 28 : -28;

  useEffect(() => {
    if (!effect || effect.superBomb) return undefined;
    const id = ++runId.current;
    progress.setValue(0);
    splat.setValue(0);
    dmgUp.setValue(0);
    spin.setValue(0);
    missFade.setValue(1);

    if (effect.dodged) {
      Animated.parallel([
        Animated.timing(progress, { toValue: 1, duration: 380, easing: Easing.in(Easing.quad), useNativeDriver: true }),
        Animated.timing(missFade, { toValue: 0, duration: 380, useNativeDriver: true }),
      ]).start();
      return undefined;
    }

    const flyMs = effect.critical ? 480 : 400;
    const projScale = effect.critical ? 1.35 : effect.defended ? 0.82 : 1;

    const anims = [
      Animated.timing(progress, { toValue: 1, duration: flyMs, easing: Easing.inOut(Easing.cubic), useNativeDriver: true }),
    ];
    if (projectile.spin) {
      anims.push(
        Animated.loop(
          Animated.timing(spin, { toValue: 1, duration: 280, easing: Easing.linear, useNativeDriver: true }),
        ),
      );
    }
    Animated.parallel(anims).start(({ finished }) => {
      if (!finished || runId.current !== id) return;
      if (typeof onImpact === 'function') onImpact(defId, effect);

      const splatScale = effect.critical ? 1.5 : effect.defended ? 0.75 : 1;
      splat.setValue(0);
      dmgUp.setValue(0);
      Animated.parallel([
        Animated.timing(splat, { toValue: splatScale, duration: effect.critical ? 240 : 180, useNativeDriver: true }),
        Animated.timing(dmgUp, { toValue: 1, duration: 720, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      ]).start();
    });

    return () => {
      runId.current += 1;
    };
  }, [effect?.seq, effect?.superBomb, effect?.dodged, effect?.projectileId]);

  if (!effect || effect.superBomb) return null;

  const ty = progress.interpolate({
    inputRange: [0, 0.45, 1],
    outputRange: [startY, (startY + endY) / 2 - 24, endY],
  });
  const tx = progress.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [0, arcX, 0],
  });
  const rotate = spin.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });
  const projSize = effect.critical ? 44 : effect.defended ? 28 : 36;

  const dmgY = dmgUp.interpolate({ inputRange: [0, 1], outputRange: [0, -52] });
  const dmgOp = dmgUp.interpolate({ inputRange: [0, 0.15, 0.7, 1], outputRange: [0, 1, 1, 0] });

  const splatScale = splat.interpolate({ inputRange: [0, 1], outputRange: [0.2, 1] });
  const splatOp = splat.interpolate({ inputRange: [0, 0.3, 1], outputRange: [0, 1, 0.85] });

  const showDmg = !effect.dodged && typeof effect.damage === 'number' && effect.damage > 0;
  const dmgColor = effect.critical ? '#f39c12' : effect.defended ? '#48cae4' : '#e74c3c';
  const dmgLabel = effect.critical
    ? `${effect.damage}!`
    : effect.weak
      ? `${effect.damage}`
      : `${effect.damage} damage!`;

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
        <View style={[styles.critRibbon, { top: arenaH * 0.38 }]}>
          <Text style={styles.critRibbonTxt}>CRITICAL HIT!</Text>
        </View>
      ) : null}

      <Animated.View
        style={[
          styles.projWrap,
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
            {
              top: endY - 8,
              opacity: splatOp,
              transform: [{ scale: splatScale }],
            },
          ]}
        >
          <Text style={[styles.splatEmoji, effect.critical && styles.splatCrit]}>
            {projectile.splat}
          </Text>
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
            effect.weak && styles.dmgWeak,
            {
              top: endY - 12,
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
        <Animated.Text style={[styles.dodgePop, { top: endY - 20, opacity: missFade }]}>Dodged!</Animated.Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  layer: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 14,
    overflow: 'visible',
  },
  projWrap: {
    position: 'absolute',
    left: '44%',
    alignItems: 'center',
    justifyContent: 'center',
    width: 48,
    marginLeft: -24,
  },
  projEmoji: {
    textAlign: 'center',
    includeFontPadding: false,
  },
  splatWrap: {
    position: 'absolute',
    left: '40%',
    alignItems: 'center',
    width: 64,
    marginLeft: -32,
  },
  splatEmoji: {
    fontSize: 40,
    textAlign: 'center',
  },
  splatCrit: { fontSize: 56 },
  shieldSpark: {
    position: 'absolute',
    fontSize: 22,
    top: -8,
    right: -4,
  },
  dmgPop: {
    position: 'absolute',
    left: '28%',
    right: '28%',
    textAlign: 'center',
    fontWeight: '900',
    fontSize: 26,
    textShadowColor: 'rgba(0,0,0,0.35)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  dmgCrit: {
    fontSize: 34,
  },
  dmgDefended: {
    fontSize: 22,
    color: '#2a9d8f',
  },
  dmgWeak: {
    fontSize: 22,
    color: '#95a5a6',
  },
  critRibbon: {
    position: 'absolute',
    left: '8%',
    right: '8%',
    alignItems: 'center',
    zIndex: 16,
  },
  critRibbonTxt: {
    fontWeight: '900',
    fontSize: 28,
    color: '#e67e22',
    backgroundColor: 'rgba(255,248,220,0.92)',
    paddingHorizontal: 14,
    paddingVertical: 4,
    borderRadius: 10,
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
    fontSize: 20,
    color: '#7f8c8d',
  },
  dodgePop: {
    position: 'absolute',
    left: 0,
    right: 0,
    textAlign: 'center',
    fontWeight: '900',
    fontSize: 22,
    color: '#576574',
  },
});
