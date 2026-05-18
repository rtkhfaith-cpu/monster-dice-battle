import React, { useEffect, useRef } from 'react';
import { Animated, Easing, Image, StyleSheet, Text, View } from 'react-native';
import MoveEffect from './MoveEffect';
import { ATTACK_EFFECT_SCALE, fx } from '../utils/battleEffectScale';
import { GAME_ASSETS } from '../utils/gameAssetPaths';

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

  const flyY = flyDmg.interpolate({ inputRange: [0, 1], outputRange: [fx(12), -fx(36)] });
  const burstScale = burst.interpolate({ inputRange: [0, 1], outputRange: [0.2, 1.6 * ATTACK_EFFECT_SCALE] });
  const burstOp = burst.interpolate({ inputRange: [0, 0.4, 1], outputRange: [0, 0.85, 0] });
  const flashBg = flash.interpolate({ inputRange: [0, 1], outputRange: [0, 0.55] });
  const boomScale = superZoom.interpolate({
    inputRange: [0, 1, 2],
    outputRange: [0.85 * ATTACK_EFFECT_SCALE, 1.15 * ATTACK_EFFECT_SCALE, 1.65 * ATTACK_EFFECT_SCALE],
  });

  const superPhase = ce?.superPhase || 'boom';

  if (!ce) {
    return null;
  }

  return (
    <View style={styles.wrap}>
      {ce?.critical ? (
        <Animated.View style={[styles.flashLayer, { opacity: flashBg }]} pointerEvents="none" />
      ) : null}

      {ce?.rageTag ? (
        <Text style={styles.rageLbl}>RAGE MODE!</Text>
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

      {!ce?.superBomb && !ce?.useProjectileAnim && ce?.effectType ? (
        <View style={styles.fxSlot}>
          <View style={styles.fxScale}>
            <MoveEffect effectType={ce.effectType} emoji={ce.emoji} animate rageBoost={!!ce.rageBoost} />
          </View>
        </View>
      ) : null}

      {ce?.dodged ? (
        <Image source={{ uri: GAME_ASSETS.battleActions.feedback.dodge }} style={styles.feedbackImage} resizeMode="contain" />
      ) : null}

      {!ce?.useProjectileAnim && !ce?.superBomb && !ce?.dodged && typeof ce?.damage === 'number' ? (
        <Animated.Text
          style={[
            styles.dmgLbl,
            ce.critical && styles.dmgCrit,
            ce.weak && styles.dmgWeak,
            ce.defended && styles.dmgDefended,
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

      {!ce?.useProjectileAnim && !ce?.superBomb && !ce?.dodged && typeof ce?.damage === 'number' && ce.damage > 0 ? (
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

      {!ce?.superBomb && ce?.dodgeFailed ? (
        <Image source={{ uri: GAME_ASSETS.battleActions.feedback.miss }} style={styles.feedbackImage} resizeMode="contain" />
      ) : null}

      {!ce?.useProjectileAnim && !ce?.superBomb && ce?.critical ? (
        <Image source={{ uri: GAME_ASSETS.battleActions.feedback.critical }} style={styles.feedbackImageLarge} resizeMode="contain" />
      ) : null}

      {!ce?.superBomb && ce?.weak ? (
        <Image source={{ uri: GAME_ASSETS.battleActions.feedback.hit }} style={styles.feedbackImage} resizeMode="contain" />
      ) : null}
    </View>
  );
}

const S = ATTACK_EFFECT_SCALE;

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    overflow: 'visible',
    backgroundColor: 'transparent',
  },
  flashLayer: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#fff',
    zIndex: 20,
  },
  rageLbl: {
    fontSize: fx(18),
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
    fontSize: fx(20),
    color: '#1a1a2e',
    textAlign: 'center',
    marginBottom: fx(6),
    paddingHorizontal: fx(4),
  },
  moveCrit: { fontSize: fx(24), color: '#c0392b' },
  fxSlot: {
    minHeight: fx(72),
    maxHeight: fx(100),
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'visible',
  },
  fxScale: {
    transform: [{ scale: S }],
  },
  feedbackImage: {
    width: 80,
    height: 80,
    marginVertical: 2,
  },
  feedbackImageLarge: {
    width: 96,
    height: 96,
    marginVertical: 2,
  },
  dmgLbl: {
    fontSize: fx(28),
    fontWeight: '900',
    color: '#922b21',
    marginTop: fx(2),
  },
  dmgCrit: {
    fontSize: fx(40),
    color: '#c0392b',
  },
  dmgWeak: {
    fontSize: fx(24),
    color: '#95a5a6',
  },
  dmgDefended: {
    fontSize: fx(24),
    color: '#2a9d8f',
  },
  burst: {
    position: 'absolute',
    width: fx(80),
    height: fx(80),
    borderRadius: fx(40),
    backgroundColor: '#f39c12',
    top: '38%',
  },
  bomb: {
    fontSize: fx(48),
    lineHeight: fx(52),
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
    fontSize: fx(32),
    fontWeight: '900',
    color: '#a93226',
    marginTop: 4,
  },
  superWord: {
    fontSize: fx(22),
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
