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

/** Word badges (HIT, CRIT, DODGE, MISS) — +30% vs legacy 80px */
const FEEDBACK_IMG_SIZE = 104;
const IMPACT_IMG_SIZE = 96;
const ACTION_IMG_SIZE = 160;

const FEEDBACK_POP_IN_MS = 220;
const FEEDBACK_FADE_MS = 520;
const FEEDBACK_HOLD_MIN_MS = 1100;
const IMPACT_POP_IN_MS = 240;
const IMPACT_FADE_MS = 480;
const IMPACT_HOLD_MIN_MS = 750;

function feedbackHoldMs(effect, timing, sequenceControlled, travelMs = 0) {
  if (sequenceControlled && timing?.total != null) {
    const impactAt = timing.impactAt ?? Math.round(timing.total * 0.68);
    const afterImpact = Math.max(0, timing.total - impactAt - FEEDBACK_FADE_MS - 80);
    if (effect?.dodged) {
      return Math.max(FEEDBACK_HOLD_MIN_MS, timing.total - travelMs - FEEDBACK_FADE_MS - 120);
    }
    return Math.max(FEEDBACK_HOLD_MIN_MS, afterImpact);
  }
  if (effect?.critical) return 1400;
  if (effect?.dodged) return 1200;
  return FEEDBACK_HOLD_MIN_MS;
}

function runPopHoldFade(value, { popMs, holdMs, fadeMs }) {
  value.setValue(0);
  Animated.sequence([
    Animated.timing(value, { toValue: 1, duration: popMs, easing: Easing.out(Easing.back(1.15)), useNativeDriver: true }),
    Animated.delay(holdMs),
    Animated.timing(value, { toValue: 0, duration: fadeMs, easing: Easing.in(Easing.quad), useNativeDriver: true }),
  ]).start();
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
  const [arenaW, setArenaW] = useState(360);
  const progress = useRef(new Animated.Value(0)).current;
  const splat = useRef(new Animated.Value(0)).current;
  const dmgUp = useRef(new Animated.Value(0)).current;
  const spin = useRef(new Animated.Value(0)).current;
  const missFade = useRef(new Animated.Value(1)).current;
  const cloudGrow = useRef(new Animated.Value(0)).current;
  const burst = useRef(new Animated.Value(0)).current;
  const feedbackOp = useRef(new Animated.Value(0)).current;
  const impactOp = useRef(new Animated.Value(0)).current;
  const runId = useRef(0);
  const impactFired = useRef(false);

  const atkId = effect?.attackerId ?? 1;
  const defId = effect?.defenderId ?? (atkId === 1 ? 2 : 1);
  const animKind = effect?.animKind ?? 'projectile';
  const fromLeft = atkId === 1;
  const actionHalf = ACTION_IMG_SIZE / 2;
  const leftMonsterX = arenaW * 0.24;
  const rightMonsterX = arenaW * 0.76;
  const attackerX = fromLeft ? leftMonsterX : rightMonsterX;
  const defenderX = fromLeft ? rightMonsterX : leftMonsterX;
  const monsterY = arenaH * 0.64;
  const startX = attackerX - actionHalf;
  const endX = defenderX - actionHalf;
  const startY = monsterY - actionHalf;
  const endY = monsterY - actionHalf;
  const impactX = defenderX - fx(40);
  const defenderFeedbackX = defenderX - fx(40);
  const attackerFeedbackX = attackerX - fx(40);
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
    ? Math.max(IMPACT_HOLD_MIN_MS, (timing?.total ?? 1200) - (timing?.impactAt ?? 700) - IMPACT_FADE_MS)
    : effect?.defended
      ? 820
      : IMPACT_HOLD_MIN_MS;

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
    const wordHold = feedbackHoldMs(effect, timing, sequenceControlled, flyMs);
    runPopHoldFade(feedbackOp, { popMs: FEEDBACK_POP_IN_MS, holdMs: wordHold, fadeMs: FEEDBACK_FADE_MS });
    runPopHoldFade(impactOp, { popMs: IMPACT_POP_IN_MS, holdMs: splatHoldMs, fadeMs: IMPACT_FADE_MS });

    Animated.parallel([
      Animated.timing(splat, {
        toValue: splatPeak,
        duration: effect.critical ? 280 : 220,
        useNativeDriver: true,
      }),
      Animated.timing(burst, {
        toValue: 1,
        duration: effect.critical ? 340 : 280,
        useNativeDriver: true,
      }),
      Animated.timing(dmgUp, {
        toValue: 1,
        duration: 720,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start(() => {
      if (sequenceControlled) return;
      if (effect.defended) {
        setTimeout(() => {
          if (runId.current === id) finish();
        }, splatHoldMs + IMPACT_FADE_MS);
        return;
      }
      setTimeout(() => {
        Animated.timing(splat, { toValue: 0, duration: IMPACT_FADE_MS, useNativeDriver: true }).start(() => {
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
    feedbackOp.setValue(0);
    impactOp.setValue(0);

    if (effect.dodged) {
      const dodgeTravel = sequenceControlled ? flyMs : 520;
      Animated.timing(progress, {
        toValue: 1,
        duration: dodgeTravel,
        easing: Easing.in(Easing.quad),
        useNativeDriver: true,
      }).start();
      const dodgeHold = feedbackHoldMs(effect, timing, sequenceControlled, dodgeTravel);
      runPopHoldFade(feedbackOp, { popMs: FEEDBACK_POP_IN_MS, holdMs: dodgeHold, fadeMs: FEEDBACK_FADE_MS });
      const holdT = setTimeout(() => {
        if (runId.current !== id) return;
        if (!sequenceControlled) finish();
      }, dodgeTravel + dodgeHold + FEEDBACK_FADE_MS + 80);
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
    outputRange: [startX, endX],
  });
  const rotate = spin.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });
  const dmgY = dmgUp.interpolate({ inputRange: [0, 1], outputRange: [0, -fx(36)] });
  const dmgOp = dmgUp.interpolate({ inputRange: [0, 0.15, 0.65, 1], outputRange: [0, 1, 1, 0] });

  const splatScale = splat.interpolate({ inputRange: [0, 1], outputRange: [0.2, 1.12] });
  const burstScale = burst.interpolate({ inputRange: [0, 1], outputRange: [0.3, 1.4] });
  const burstOp = burst.interpolate({ inputRange: [0, 0.2, 0.7, 1], outputRange: [0, 1, 0.85, 0] });

  const showDmg =
    effect.revealDamage
    && !effect.dodged
    && typeof effect.damage === 'number'
    && effect.damage > 0;
  const sickly = effect.sicklyFlash && !effect.dodged;
  const showTravel = !effect.dodged;
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
        const { width, height } = e.nativeEvent.layout;
        const h = height;
        if (h > 80) setArenaH(h);
        if (width > 80) setArenaW(width);
      }}
    >
      {showTravel ? (
        <Animated.Image
          source={{ uri: actionImageUri }}
          style={[
            styles.actionImage,
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
              {
                left: impactX,
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
              sickly && styles.splatSickly,
              {
                left: impactX - (IMPACT_IMG_SIZE - 80) / 2,
                top: endY - 10,
                opacity: impactOp,
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
                left: defenderFeedbackX - (FEEDBACK_IMG_SIZE - 80) / 2,
                top: endY - fx(68),
                opacity: feedbackOp,
                transform: [{ scale: splatScale }],
              },
            ]}
            resizeMode="contain"
          />
        </>
      ) : (
        <>
          <Animated.Image
            source={{ uri: GAME_ASSETS.battleActions.feedback.miss }}
            style={[
              styles.feedbackImage,
              {
                left: attackerFeedbackX - (FEEDBACK_IMG_SIZE - 80) / 2,
                top: startY - fx(52),
                opacity: feedbackOp,
              },
            ]}
            resizeMode="contain"
          />
          <Animated.Image
            source={{ uri: GAME_ASSETS.battleActions.feedback.dodge }}
            style={[
              styles.feedbackImage,
              {
                left: defenderFeedbackX - (FEEDBACK_IMG_SIZE - 80) / 2,
                top: endY - fx(78),
                opacity: feedbackOp,
                transform: [{ scale: 1.08 }],
              },
            ]}
            resizeMode="contain"
          />
        </>
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
          {`-${Math.max(0, Math.round(effect.damage ?? 0))}`}
        </Animated.Text>
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
  actionImage: {
    position: 'absolute',
    width: ACTION_IMG_SIZE,
    height: ACTION_IMG_SIZE,
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
    width: IMPACT_IMG_SIZE,
    height: IMPACT_IMG_SIZE,
    zIndex: 23,
  },
  feedbackImage: {
    position: 'absolute',
    width: FEEDBACK_IMG_SIZE,
    height: FEEDBACK_IMG_SIZE,
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
    color: '#ff4757',
    textShadowColor: 'rgba(0, 0, 0, 0.45)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 3,
  },
  dmgCrit: { fontSize: fx(40), color: '#ff2d2d' },
  dmgDefended: { fontSize: fx(28), color: '#48cae4' },
});
