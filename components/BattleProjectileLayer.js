import React, { useEffect, useRef, useState } from 'react';
import { Animated, Easing, StyleSheet, Text, View } from 'react-native';
import { fx } from '../utils/battleEffectScale';
import { getProjectile } from '../utils/battleProjectiles';
import { COMBAT_FEEDBACK_COLOR } from '../utils/battleCombatFeedback';
import { GAME_ASSETS } from '../utils/gameAssetPaths';

function MoveCallout({ moveName, emoji, laneY, calloutOp }) {
  if (!moveName && !emoji) return null;
  return (
    <Animated.View
      style={[
        styles.calloutWrap,
        { top: laneY - fx(72), opacity: calloutOp },
      ]}
      pointerEvents="none"
    >
      {emoji ? <Text style={styles.calloutEmoji}>{emoji}</Text> : null}
      {moveName ? <Text style={styles.calloutName} numberOfLines={1}>{moveName}</Text> : null}
    </Animated.View>
  );
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
  const projectile = getProjectile(effect?.projectileId || 'poop');
  const skillEmoji = effect?.displayEmoji || effect?.emoji || projectile.emoji;
  const cloudEmojis = effect?.cloudEmojis?.length >= 2
    ? effect.cloudEmojis
    : [skillEmoji, projectile.emoji !== skillEmoji ? projectile.emoji : '☁️', projectile.splat || '✨'];
  const fromLeft = atkId === 1;
  const laneY = arenaH * 0.48;
  const startY = laneY;
  const endY = laneY;
  const horizSpan = fx(animKind === 'water_wave' ? 165 : 150);
  const isLunge = animKind === 'fly_lunge' || animKind === 'bite_lunge';
  const arcLift = fx(animKind === 'egg_bomb' ? 28 : isLunge ? 10 : 14);

  const timing = effect?.actionTiming;
  const flyMs = sequenceControlled && timing?.travelMs
    ? timing.travelMs
    : effect?.critical
      ? 480
      : animKind === 'cloud_spread'
        ? 720
        : animKind === 'water_wave'
          ? 640
          : isLunge
            ? 460
            : 380;

  const splatHoldMs = sequenceControlled
    ? Math.max(80, (timing?.total ?? 900) - (timing?.impactAt ?? 600) - 80)
    : effect?.defended
      ? 320
      : 280;

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
      Animated.timing(splat, { toValue: 0, duration: 280, useNativeDriver: true }).start(() => {
        if (runId.current === id) finish();
      });
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
    if (projectile.spin || animKind === 'sparkle') {
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
  const projSize = fx(
    effect.critical ? 52
    : animKind === 'water_wave' ? 56
    : animKind === 'rush' ? 44
    : effect.defended ? 40
    : 48,
  );

  const dmgY = dmgUp.interpolate({ inputRange: [0, 1], outputRange: [0, -fx(36)] });
  const dmgOp = dmgUp.interpolate({ inputRange: [0, 0.15, 0.65, 1], outputRange: [0, 1, 1, 0] });

  const splatScale = splat.interpolate({ inputRange: [0, 1], outputRange: [0.15, 1.15] });
  const splatOp = splat.interpolate({ inputRange: [0, 0.25, 0.75, 1], outputRange: [0, 1, 0.9, 0] });
  const burstScale = burst.interpolate({ inputRange: [0, 1], outputRange: [0.3, 1.4] });
  const burstOp = burst.interpolate({ inputRange: [0, 0.2, 0.7, 1], outputRange: [0, 1, 0.85, 0] });

  const cloudScale = cloudGrow.interpolate({ inputRange: [0, 1], outputRange: [0.2, 1.35] });
  const cloudOp = cloudGrow.interpolate({ inputRange: [0, 0.3, 0.85, 1], outputRange: [0, 0.85, 0.7, 0.35] });

  const waveScaleX = progress.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0.3, 1.2, 1.5] });
  const waveOp = progress.interpolate({ inputRange: [0, 0.2, 0.8, 1], outputRange: [0, 0.9, 0.85, 0.2] });

  const sparkleOp = progress.interpolate({ inputRange: [0, 0.15, 0.85, 1], outputRange: [0, 1, 1, 0.3] });
  const sparkleScale = progress.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0.5, 1.2, 0.9] });

  const showDmg =
    effect.revealDamage
    && !effect.dodged
    && typeof effect.damage === 'number'
    && effect.damage > 0;
  const dmgColor = effect.critical ? '#f39c12' : effect.defended ? '#48cae4' : '#e74c3c';
  const dmgLabel = effect.critical ? `${effect.damage}!` : `${effect.damage}`;
  const sickly = effect.sicklyFlash && !effect.dodged;
  const moveName = effect.moveName ?? '';
  const showTravel =
    !effect.dodged
    && (animKind === 'projectile' || animKind === 'fire_blast' || animKind === 'egg_bomb'
      || animKind === 'metal_slash' || animKind === 'rush' || isLunge
      || animKind === 'sparkle');
  const actionImageUri = effect?.actionType === 'magic'
    ? GAME_ASSETS.battleActions.magic
    : GAME_ASSETS.battleActions.attack;
  const impactImageUri = effect?.defended
    ? GAME_ASSETS.battleActions.defend
    : GAME_ASSETS.battleActions.comment;

  return (
    <View
      style={styles.layer}
      pointerEvents="none"
      onLayout={(e) => {
        const h = e.nativeEvent.layout.height;
        if (h > 80) setArenaH(h);
      }}
    >
      <MoveCallout moveName={moveName} emoji={skillEmoji} laneY={laneY} calloutOp={calloutOp} />

      {effect.critical ? (
        <View style={[styles.critRibbon, { top: laneY - fx(28) }]}>
          <Text style={styles.critRibbonTxt}>CRITICAL!</Text>
        </View>
      ) : null}

      {false && animKind === 'cloud_spread' ? (
        <Animated.View
          style={[
            styles.cloudWrap,
            fromLeft ? styles.projFromLeft : styles.projFromRight,
            {
              top: laneY - fx(40),
              opacity: cloudOp,
              transform: [{ translateX: tx }, { scale: cloudScale }],
            },
          ]}
        >
          <Text style={[styles.cloudEmoji, { fontSize: fx(38) }]}>{cloudEmojis[0]}</Text>
          <Text style={[styles.cloudEmoji, styles.cloudEmoji2, { fontSize: fx(30) }]}>{cloudEmojis[1]}</Text>
          <Text style={[styles.cloudEmoji, styles.cloudEmoji3, { fontSize: fx(26) }]}>{cloudEmojis[2]}</Text>
        </Animated.View>
      ) : null}

      {false && animKind === 'water_wave' ? (
        <Animated.View
          style={[
            styles.waveBand,
            {
              top: laneY - fx(12),
              opacity: waveOp,
              transform: [{ translateX: tx }, { scaleX: waveScaleX }],
            },
          ]}
        >
          <Text style={[styles.waveEmoji, { fontSize: projSize }]}>{skillEmoji}</Text>
          <View style={styles.waveShine} />
        </Animated.View>
      ) : null}

      {false && animKind === 'sparkle' && showTravel ? (
        <Animated.View
          style={[
            styles.projWrap,
            fromLeft ? styles.projFromLeft : styles.projFromRight,
            {
              opacity: sparkleOp,
              transform: [{ translateX: tx }, { translateY: ty }, { scale: sparkleScale }, { rotate }],
            },
          ]}
        >
          <Text style={[styles.projEmoji, { fontSize: projSize }]}>{skillEmoji}</Text>
          <Text style={[styles.sparkleTrail, { fontSize: fx(22) }]}>✨</Text>
          <Text style={[styles.sparkleTrail2, { fontSize: fx(18) }]}>✨</Text>
        </Animated.View>
      ) : null}

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
        </>
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
        <Animated.Text style={[styles.combatPop, { top: endY - 24, opacity: missFade }]}>Dodged!</Animated.Text>
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
  calloutWrap: {
    position: 'absolute',
    left: '8%',
    right: '8%',
    alignItems: 'center',
    zIndex: 22,
  },
  calloutEmoji: {
    fontSize: fx(36),
    textAlign: 'center',
    marginBottom: fx(2),
  },
  calloutName: {
    fontWeight: '900',
    fontSize: fx(15),
    color: '#2c3e50',
    backgroundColor: 'rgba(255, 252, 235, 0.94)',
    paddingHorizontal: fx(14),
    paddingVertical: fx(4),
    borderRadius: fx(10),
    borderWidth: 2,
    borderColor: '#e67e22',
    overflow: 'hidden',
    maxWidth: '100%',
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
  actionImage: {
    position: 'absolute',
    width: 80,
    height: 80,
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
  splatCenter: {
    left: '50%',
    marginLeft: -fx(36),
  },
  splatSickly: {
    backgroundColor: 'rgba(120, 220, 100, 0.25)',
    borderRadius: fx(20),
  },
  splatEmoji: {
    fontSize: fx(44),
    textAlign: 'center',
  },
  splatCrit: { fontSize: fx(56) },
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
  combatPop: {
    position: 'absolute',
    left: 0,
    right: 0,
    textAlign: 'center',
    fontWeight: '900',
    fontSize: fx(38),
    color: COMBAT_FEEDBACK_COLOR,
    letterSpacing: 1,
    textShadowColor: 'rgba(120, 80, 0, 0.9)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 8,
    zIndex: 24,
  },
});
