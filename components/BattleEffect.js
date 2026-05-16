import React, { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, Text, View } from 'react-native';
import MoveEffect from './MoveEffect';

/**
 * @param {{
 *   currentEffect?: object | null,
 *   instruction: string,
 * }} props
 */
export default function BattleEffect({ currentEffect, instruction }) {
  const ce = currentEffect;
  const freezeGate = useRef(new Animated.Value(0)).current;
  const flyDmg = useRef(new Animated.Value(0)).current;
  const burst = useRef(new Animated.Value(0)).current;
  const flash = useRef(new Animated.Value(0)).current;
  const superZoom = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!ce) {
      freezeGate.setValue(0);
      return;
    }
    if (ce.superBomb) {
      flyDmg.setValue(0);
      burst.setValue(0);
      flash.setValue(0);
      freezeGate.setValue(0);
      Animated.sequence([
        Animated.delay(900),
        Animated.timing(freezeGate, { toValue: 1, duration: 50, useNativeDriver: true }),
      ]).start();
      return;
    }
    if (ce.dodged || typeof ce.damage !== 'number' || ce.damage <= 0) {
      freezeGate.setValue(1);
      flyDmg.setValue(0);
      burst.setValue(0);
      flash.setValue(0);
      return;
    }
    freezeGate.setValue(0);
    flyDmg.setValue(0);
    burst.setValue(0);
    flash.setValue(0);

    const freezeMs = ce.critical ? 120 : 85;
    Animated.sequence([
      Animated.delay(freezeMs),
      Animated.timing(freezeGate, { toValue: 1, duration: 40, useNativeDriver: true }),
    ]).start();

    Animated.sequence([
      Animated.delay(freezeMs),
      Animated.parallel([
        Animated.timing(burst, { toValue: 1, duration: ce.critical ? 220 : 160, easing: Easing.out(Easing.quad), useNativeDriver: true }),
        Animated.timing(flyDmg, { toValue: 1, duration: 520, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      ]),
    ]).start();

    if (ce.critical) {
      Animated.sequence([
        Animated.delay(freezeMs),
        Animated.timing(flash, { toValue: 1, duration: 70, useNativeDriver: true }),
        Animated.timing(flash, { toValue: 0, duration: 160, useNativeDriver: true }),
      ]).start();
    }
  }, [ce, burst, flash, flyDmg, freezeGate]);

  useEffect(() => {
    if (!ce?.superBomb) {
      superZoom.setValue(0);
      return;
    }
    superZoom.setValue(0);
    Animated.sequence([
      Animated.timing(superZoom, { toValue: 1, duration: 380, useNativeDriver: true }),
      Animated.delay(400),
      Animated.timing(superZoom, { toValue: 2, duration: 260, useNativeDriver: true }),
    ]).start();
  }, [ce?.superBomb, superZoom]);

  const flyY = flyDmg.interpolate({ inputRange: [0, 1], outputRange: [12, -36] });
  const burstScale = burst.interpolate({ inputRange: [0, 1], outputRange: [0.2, 1.6] });
  const burstOp = burst.interpolate({ inputRange: [0, 0.4, 1], outputRange: [0, 0.85, 0] });
  const flashBg = flash.interpolate({ inputRange: [0, 1], outputRange: [0, 0.55] });
  const boomScale = superZoom.interpolate({ inputRange: [0, 1, 2], outputRange: [0.85, 1.15, 1.65] });

  const superPhase = ce?.superPhase || 'boom';

  if (!ce) {
    return (
      <View style={[styles.wrap, styles.wrapIdle]}>
        <Text style={styles.instr} numberOfLines={3}>
          {instruction}
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.wrap}>
      {ce?.critical ? (
        <Animated.View style={[styles.flashLayer, { opacity: flashBg }]} pointerEvents="none" />
      ) : null}

      {ce?.rageTag ? (
        <Text style={styles.rageLbl}>RAGE MODE!</Text>
      ) : null}

      {!ce?.superBomb ? (
        <Text style={styles.instr} numberOfLines={3}>
          {instruction}
        </Text>
      ) : null}

      {ce?.superBomb ? (
        <View style={styles.superBlock}>
          {superPhase === 'windup' ? (
            <>
              <Text style={styles.superWord}>SUPER POWER!</Text>
              <Text style={styles.bomb}>💣</Text>
              <Text style={styles.superWait}>charging…</Text>
            </>
          ) : null}
          {superPhase === 'boom' ? (
            <>
              <Animated.Text style={[styles.boomWord, { transform: [{ scale: boomScale }] }]}>BOOOOM!</Animated.Text>
              <Text style={styles.bomb}>💣</Text>
              <Text style={styles.superLbl}>MEGA STRIKE!</Text>
              {typeof ce.damage === 'number' ? (
                <Animated.Text style={[styles.superDmg, { opacity: freezeGate }]}>−{ce.damage} HP</Animated.Text>
              ) : null}
            </>
          ) : null}
        </View>
      ) : null}

      {!ce?.superBomb && ce?.moveName ? (
        <Text style={[styles.moveTitle, ce.critical && styles.moveCrit]} numberOfLines={2}>
          {ce.moveName}
        </Text>
      ) : null}

      {!ce?.superBomb && ce?.effectType ? (
        <View style={styles.fxSlot}>
          <MoveEffect effectType={ce.effectType} emoji={ce.emoji} animate rageBoost={!!ce.rageBoost} />
        </View>
      ) : null}

      {!ce?.superBomb && ce?.defended ? (
        <Text style={styles.shieldLbl}>🛡️ Shield shimmer!</Text>
      ) : null}

      {ce?.dodged ? <Text style={styles.dodgeLbl}>💨 DODGED!</Text> : null}

      {!ce?.superBomb && !ce?.dodged && typeof ce?.damage === 'number' ? (
        <Animated.Text
          style={[
            styles.dmgLbl,
            ce.critical && styles.dmgCrit,
            {
              opacity: Animated.multiply(
                freezeGate,
                flyDmg.interpolate({ inputRange: [0, 0.12, 0.5, 1], outputRange: [0, 1, 1, 0.9] }),
              ),
              transform: [{ translateY: flyY }],
            },
          ]}
        >
          −{ce.damage}
        </Animated.Text>
      ) : null}

      {!ce?.superBomb && !ce?.dodged && typeof ce?.damage === 'number' && ce.damage > 0 ? (
        <Animated.View
          pointerEvents="none"
          style={[
            styles.burst,
            {
              opacity: burstOp,
              transform: [{ scale: burstScale }],
            },
          ]}
        />
      ) : null}

      {!ce?.superBomb && ce?.dodgeFailed ? <Text style={styles.failLbl}>💥 Dodge failed!</Text> : null}

      {!ce?.superBomb && ce?.critical ? (
        <View style={styles.critBurst}>
          <Text style={styles.critHuge}>CRITICAL HIT!</Text>
          <Text style={styles.critEmoji}>💥</Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    minHeight: 120,
    maxHeight: 220,
    paddingVertical: 6,
    paddingHorizontal: 6,
    alignItems: 'center',
    justifyContent: 'flex-start',
    backgroundColor: 'rgba(253,239,227,0.78)',
    borderRadius: 14,
    borderWidth: 3,
    borderColor: '#ff6b35',
    width: '100%',
    overflow: 'hidden',
  },
  wrapIdle: {
    minHeight: 56,
    maxHeight: 80,
    justifyContent: 'center',
  },
  flashLayer: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#fff',
    zIndex: 20,
  },
  rageLbl: {
    fontSize: 18,
    fontWeight: '900',
    color: '#c0392b',
    textShadowColor: '#f1c40f',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 0,
    marginBottom: 2,
  },
  instr: {
    textAlign: 'center',
    fontWeight: '800',
    fontSize: 16,
    color: '#1a1a2e',
    marginBottom: 6,
    lineHeight: 22,
    paddingHorizontal: 4,
  },
  moveTitle: {
    fontWeight: '900',
    fontSize: 20,
    color: '#1a1a2e',
    textAlign: 'center',
    marginBottom: 6,
    paddingHorizontal: 4,
  },
  moveCrit: { fontSize: 24, color: '#c0392b' },
  fxSlot: {
    minHeight: 72,
    maxHeight: 100,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  shieldLbl: {
    fontSize: 16,
    fontWeight: '800',
    color: '#1a6a8a',
    marginTop: 2,
  },
  dodgeLbl: {
    fontSize: 22,
    fontWeight: '900',
    color: '#576574',
    letterSpacing: 0.6,
    marginVertical: 2,
  },
  dmgLbl: {
    fontSize: 28,
    fontWeight: '900',
    color: '#922b21',
    marginTop: 2,
  },
  dmgCrit: {
    fontSize: 40,
    color: '#c0392b',
  },
  burst: {
    position: 'absolute',
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#f39c12',
    top: '38%',
  },
  failLbl: {
    fontWeight: '800',
    fontSize: 12,
    color: '#a04000',
    marginTop: 2,
    textAlign: 'center',
  },
  critBurst: {
    marginTop: 2,
    alignItems: 'center',
  },
  critHuge: {
    fontSize: 34,
    fontWeight: '900',
    color: '#d35400',
  },
  critEmoji: {
    fontSize: 28,
    marginTop: 0,
  },
  bomb: {
    fontSize: 48,
    lineHeight: 52,
    includeFontPadding: false,
    marginBottom: -2,
  },
  boomWord: {
    fontWeight: '900',
    color: '#922b21',
    marginVertical: 2,
  },
  superLbl: {
    fontWeight: '900',
    fontSize: 12,
    color: '#764ba2',
  },
  superDmg: {
    fontSize: 32,
    fontWeight: '900',
    color: '#a93226',
    marginTop: 4,
  },
  superWord: {
    fontSize: 22,
    fontWeight: '900',
    color: '#6c3483',
    textAlign: 'center',
  },
  superWait: {
    fontWeight: '800',
    color: '#566573',
    fontSize: 12,
  },
  superBlock: {
    alignItems: 'center',
    marginVertical: 4,
  },
});
