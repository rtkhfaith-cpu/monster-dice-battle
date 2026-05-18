import React, { useEffect, useRef, useState } from 'react';
import { Animated, Easing, StyleSheet, Text, View } from 'react-native';
import { fx } from '../utils/battleEffectScale';
import { GAME_ASSETS } from '../utils/gameAssetPaths';

function pickFrom(list, seed = 0) {
  if (!Array.isArray(list) || list.length === 0) return null;
  return list[Math.abs(Number(seed) || 0) % list.length];
}

function feedbackFor(effect) {
  if (effect?.dodged) return GAME_ASSETS.battleActions.feedback.dodge;
  if (effect?.critical) return GAME_ASSETS.battleActions.feedback.critical;
  if (effect?.defended) return GAME_ASSETS.battleActions.feedback.guard;
  return GAME_ASSETS.battleActions.feedback.hit;
}

/**
 * Skill-matched battle VFX — timing driven by effect.actionTiming (fixed ms).
 */
export default function BattleProjectileLayer({
  effect,
  onImpact,
  onComplete,
  active = true,
  sequenceControlled = false,
}) {
  const [arenaH, setArenaH] = useState(360);
  const progress = useRef(new Animated.Value(0)).current;
  const splat = useRef(new Animated.Value(0)).current;
  const dmgUp = useRef(new Animated.Value(0)).current;
  const spin = useRef(new Animated.Value(0)).current;
  const missFade = useRef(new Animated.Value(1)).current;
  const cloudGrow = useRef(new Animated.Value(0)).current;
  const burst = useRef(new Animated.Value(0)).current;
  const calloutOp = useRef(new Animated.Value(0)).current;
  const runId = useRef(0);
  const impactFired = useRef(false);

  const atkId = effect?.attackerId ?? 1;
  const defId = effect?.defenderId ?? (atkId === 1 ? 2 : 1);
  const animKind = effect?.animKind ?? 'projectile';
  const fromLeft = atkId === 1;
  const laneY = arenaH * 0.48;
  const startY = laneY;
  const endY = laneY;
  const horizSpan = fx(animKind === 'water_wave' ? 165 : 150);
  const isLunge = animKind === 'fly_lunge' || animKind === 'bite_lunge';
  const arcLift = fx(animKind === 'egg_bomb' ? 28 : isLunge ? 10 : 14);

  const timing = effect?.actionTiming;
  const flyMs = sequenceControlled && timing?.travelMs
    ? Math.max(760, timing.travelMs + 260)
    : effect?.critical
      ? 880
      : animKind === 'cloud_spread'
        ? 920
        : animKind === 'water_wave'
          ? 860
          : isLunge
            ? 780
            : 760;

  const splatHoldMs = sequenceControlled
    ? Math.max(360, (timing?.total ?? 1200) - (timing?.impactAt ?? 700))
    : effect?.defended
      ? 620
      : 560;

  const finish = () => {
    if (sequenceControlled) return;
    if (typeof onComplete === 'function') onComplete();
  };

  const fireImpact = (id) => {
    if (impactFired.current || runId.current !== id) return;
    impactFired.current = true;
    if (!effect.dodged && typeof onImpact === 'function') onImpact(defId, effect);
    const splatPeak = effect.critical ? 1.35 : effect.defended ? 0.7 : 1;
    splat.setValue(0);
    dmgUp.setValue(0);
    burst.setValue(0);
    Animated.parallel([
      Animated.timing(splat, {
        toValue: splatPeak,
        duration: effect.critical ? 220 : 170,
        useNativeDriver: true,
      }),
      Animated.timing(burst, {
        toValue: 1,
        duration: effect.critical ? 280 : 220,
        useNativeDriver: true,
      }),
      Animated.timing(dmgUp, {
        toValue: 1,
        duration: 580,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start(() => {
      if (sequenceControlled) return;
      if (effect.defended) {
        setTimeout(() => {
          if (runId.current === id) finish();
        }, splatHoldMs);
        return;
      }
      setTimeout(() => {
        Animated.timing(splat, { toValue: 0, duration: 620, useNativeDriver: true }).start(() => {
          if (runId.current === id) finish();
        });
      }, splatHoldMs);
    });
  };

  useEffect(() => {
    if (!active || !effect || effect.superBomb) return undefined;

    const id = ++runId.current;
    impactFired.current = false;
    progress.setValue(0);
    splat.setValue(0);
    dmgUp.setValue(0);
    spin.setValue(0);
    missFade.setValue(1);
    cloudGrow.setValue(0);
    calloutOp.setValue(0);

    Animated.sequence([
      Animated.timing(calloutOp, { toValue: 1, duration: 120, useNativeDriver: true }),
      Animated.timing(calloutOp, { toValue: 0, duration: 280, delay: 340, useNativeDriver: true }),
    ]).start();

    if (effect.dodged) {
      const dodgeTravel = sequenceControlled ? flyMs : 420;
      Animated.timing(progress, {
        toValue: 1,
        duration: dodgeTravel,
        easing: Easing.in(Easing.quad),
        useNativeDriver: true,
      }).start();
      const holdT = setTimeout(() => {
        if (runId.current !== id) return;
        Animated.timing(missFade, { toValue: 0, duration: 200, useNativeDriver: true }).start();
        if (!sequenceControlled) finish();
      }, sequenceControlled ? Math.max(120, (timing?.total ?? 800) - dodgeTravel) : 1000);
      return () => {
        runId.current += 1;
        clearTimeout(holdT);
      };
    }

    let spinLoop = null;
    if (animKind === 'sparkle') {
      spin.setValue(0);
      spinLoop = Animated.loop(
        Animated.timing(spin, { toValue: 1, duration: 260, easing: Easing.linear, useNativeDriver: true }),
      );
      spinLoop.start();
    }

    const safety = setTimeout(() => {
      if (!sequenceControlled && runId.current === id) finish();
    }, flyMs + 1400);

    const onFlyDone = ({ finished }) => {
      if (spinLoop) spinLoop.stop();
      clearTimeout(safety);
      if (!finished || runId.current !== id) return;
      fireImpact(id);
    };

    if (animKind === 'cloud_spread') {
      Animated.parallel([
        Animated.timing(progress, { toValue: 1, duration: flyMs, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
        Animated.timing(cloudGrow, { toValue: 1, duration: flyMs, easing: Easing.out(Easing.quad), useNativeDriver: true }),
      ]).start(onFlyDone);
    } else {
      Animated.timing(progress, {
        toValue: 1,
        duration: flyMs,
        easing:
          animKind === 'water_wave' ? Easing.inOut(Easing.sin)
          : animKind === 'rush' ? Easing.in(Easing.cubic)
          : Easing.inOut(Easing.cubic),
        useNativeDriver: true,
      }).start(onFlyDone);
    }

    return () => {
      runId.current += 1;
      if (spinLoop) spinLoop.stop();
      clearTimeout(safety);
    };
  }, [active, effect?.seq, effect?.superBomb, effect?.dodged, effect?.projectileId, animKind, flyMs]);

  useEffect(() => {
    if (!active || !effect?.revealDamage || effect.dodged || impactFired.current) return;
    fireImpact(runId.current);
  }, [effect?.revealDamage, effect?.seq]);

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
  const dmgY = dmgUp.interpolate({ inputRange: [0, 1], outputRange: [0, -fx(36)] });
  const dmgOp = dmgUp.interpolate({ inputRange: [0, 0.15, 0.65, 1], outputRange: [0, 1, 1, 0] });

  const splatScale = splat.interpolate({ inputRange: [0, 1], outputRange: [0.15, 1.15] });
  const splatOp = splat.interpolate({ inputRange: [0, 0.15, 0.82, 1], outputRange: [0, 1, 1, 0.18] });
  const burstScale = burst.interpolate({ inputRange: [0, 1], outputRange: [0.3, 1.4] });
  const burstOp = burst.interpolate({ inputRange: [0, 0.2, 0.7, 1], outputRange: [0, 1, 0.85, 0] });

  const showDmg =
    effect.revealDamage
    && !effect.dodged
    && typeof effect.damage === 'number'
    && effect.damage > 0;
  const sickly = effect.sicklyFlash && !effect.dodged;
  const showTravel =
    !effect.dodged
    && (animKind === 'projectile' || animKind === 'fire_blast' || animKind === 'egg_bomb'
      || animKind === 'metal_slash' || animKind === 'rush' || isLunge
      || animKind === 'sparkle');
  const randomSeed = effect?.seq ?? effect?.damage ?? 0;
  const actionImageUri = effect?.actionType === 'magic' || effect?.strikeKind === 'magic'
    ? pickFrom(GAME_ASSETS.battleActions.magicVariants, randomSeed)
    : pickFrom(GAME_ASSETS.battleActions.attackVariants, randomSeed);
  const impactImageUri = effect?.defended
    ? GAME_ASSETS.battleActions.defend
    : GAME_ASSETS.battleActions.comment;
  const feedbackImageUri = feedbackFor(effect);

  return (
    <View
      style={styles.layer}
      pointerEvents="none"
      onLayout={(e) => {
        const h = e.nativeEvent.layout.height;
        if (h > 80) setArenaH(h);
      }}
    >
      {showTravel ? (
        <Animated.Image
          source={{ uri: actionImageUri }}
          style={[
            styles.actionImage,
            fromLeft ? styles.projFromLeft : styles.projFromRight,
            {
              opacity: missFade,
              transform: [{ translateX: tx }, { translateY: ty }, { rotate }, { scale: effect.critical ? 1.12 : 1 }],
            },
          ]}
          resizeMode="contain"
        />
      ) : null}

      {!effect.dodged ? (
        <>
          <Animated.View
            style={[
              styles.burstRing,
              styles.splatCenter,
              {
                top: endY - 20,
                opacity: burstOp,
                transform: [{ scale: burstScale }],
              },
            ]}
            pointerEvents="none"
          />
          <Animated.Image
            source={{ uri: impactImageUri }}
            style={[
              styles.impactImage,
              styles.splatCenter,
              sickly && styles.splatSickly,
              {
                top: endY - 6,
                opacity: splatOp,
                transform: [{ scale: splatScale }],
              },
            ]}
            resizeMode="contain"
          />
          <Animated.Image
            source={{ uri: feedbackImageUri }}
            style={[
              styles.feedbackImage,
              {
                top: endY - fx(60),
                opacity: splatOp,
                transform: [{ scale: splatScale }],
              },
            ]}
            resizeMode="contain"
          />
        </>
      ) : (
        <Animated.Image
          source={{ uri: GAME_ASSETS.battleActions.feedback.miss }}
          style={[
            styles.feedbackImage,
            {
              top: endY - fx(34),
              opacity: missFade,
            },
          ]}
          resizeMode="contain"
        />
      )}

      {showDmg ? (
        <Animated.Text
          style={[
            styles.dmgPop,
            effect.critical && styles.dmgCrit,
            effect.defended && styles.dmgDefended,
            {
              top: endY - 10,
              opacity: dmgOp,
              transform: [{ translateY: dmgY }],
            },
          ]}
        >
          {Math.max(0, Math.round(effect.damage ?? 0))}
        </Animated.Text>
      ) : null}

      {effect.dodged ? (
        <Animated.Image
          source={{ uri: GAME_ASSETS.battleActions.feedback.dodge }}
          style={[
            styles.feedbackImage,
            {
              top: endY - fx(70),
              opacity: missFade,
              transform: [{ scale: 1.08 }],
            },
          ]}
          resizeMode="contain"
        />
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
    marginLeft: -fx(80),
  },
  projFromRight: {
    right: '18%',
    marginRight: -fx(80),
  },
  actionImage: {
    position: 'absolute',
    width: 160,
    height: 160,
  },
  projEmoji: {
    textAlign: 'center',
    includeFontPadding: false,
  },
  sparkleTrail: {
    position: 'absolute',
    top: -fx(8),
    left: fx(8),
    opacity: 0.75,
  },
  sparkleTrail2: {
    position: 'absolute',
    bottom: -fx(6),
    right: fx(4),
    opacity: 0.65,
  },
  fireTrail: {
    position: 'absolute',
    width: fx(36),
    height: fx(18),
    borderRadius: fx(9),
    backgroundColor: 'rgba(255, 120, 40, 0.55)',
    left: -fx(20),
    top: '35%',
  },
  cloudWrap: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
    width: fx(90),
    height: fx(70),
  },
  cloudEmoji: { textAlign: 'center' },
  cloudEmoji2: { position: 'absolute', top: fx(8), left: fx(24), opacity: 0.85 },
  cloudEmoji3: { position: 'absolute', top: fx(20), left: fx(8), opacity: 0.75 },
  waveBand: {
    position: 'absolute',
    left: '12%',
    right: '12%',
    alignItems: 'center',
    justifyContent: 'center',
    height: fx(48),
    borderRadius: fx(24),
    backgroundColor: 'rgba(77, 171, 247, 0.35)',
    borderWidth: 2,
    borderColor: 'rgba(51, 154, 240, 0.5)',
  },
  waveEmoji: { textAlign: 'center' },
  waveShine: {
    position: 'absolute',
    top: fx(6),
    left: '20%',
    right: '20%',
    height: fx(8),
    borderRadius: fx(4),
    backgroundColor: 'rgba(255,255,255,0.45)',
  },
  splatWrap: {
    position: 'absolute',
    alignItems: 'center',
    width: fx(72),
  },
  impactImage: {
    position: 'absolute',
    width: 80,
    height: 80,
  },
  feedbackImage: {
    position: 'absolute',
    left: '50%',
    marginLeft: -fx(40),
    width: 80,
    height: 80,
    zIndex: 24,
  },
  splatCenter: {
    left: '50%',
    marginLeft: -fx(36),
  },
  splatSickly: {
    backgroundColor: 'rgba(120, 220, 100, 0.25)',
    borderRadius: fx(20),
  },
  burstRing: {
    position: 'absolute',
    width: fx(80),
    height: fx(80),
    marginLeft: -fx(40),
    borderRadius: fx(40),
    borderWidth: 4,
    borderColor: 'rgba(255, 209, 102, 0.85)',
    backgroundColor: 'rgba(255, 255, 255, 0.35)',
  },
  eggShell: {
    position: 'absolute',
    fontSize: fx(22),
    top: fx(28),
    opacity: 0.7,
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
  dmgDefended: { fontSize: fx(28), color: '#48cae4' },
});
