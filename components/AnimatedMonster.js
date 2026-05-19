import React, { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, View } from 'react-native';
import MonsterPreview from './MonsterPreview';
import { getMonsterIdleProfile } from '../utils/monsterIdleMotion';
import { getMonsterImageAsset } from '../utils/monsterImageAssets';

/**
 * Personality idle (per themeBody) + battle poses + fly strike + rage.
 */
export default function AnimatedMonster({
  parts,
  size = 68,
  pose = 'idle',
  side = 'left',
  mood = 'neutral',
  rage = false,
  superJump = false,
  flyStrike = false,
}) {
  const bob = useRef(new Animated.Value(0)).current;
  const sway = useRef(new Animated.Value(0)).current;
  const twist = useRef(new Animated.Value(0)).current;
  const squash = useRef(new Animated.Value(0)).current;
  const blink = useRef(new Animated.Value(1)).current;
  const jitterX = useRef(new Animated.Value(0)).current;
  const poseTx = useRef(new Animated.Value(0)).current;
  const poseTy = useRef(new Animated.Value(0)).current;
  const poseScale = useRef(new Animated.Value(1)).current;
  const shake = useRef(new Animated.Value(0)).current;
  const dodgeOp = useRef(new Animated.Value(1)).current;
  const ragePulse = useRef(new Animated.Value(0)).current;
  const flyTx = useRef(new Animated.Value(0)).current;
  const flyTy = useRef(new Animated.Value(0)).current;

  const toward = side === 'left' ? 1 : -1;
  const profile = getMonsterIdleProfile(parts?.themeBody);
  const themed = !!parts?.themeBody;
  const usesImageSprite = !!getMonsterImageAsset(parts?.templateId);
  const actionMotionActive = pose !== 'idle' || superJump || flyStrike;
  const idleBreathingActive = pose === 'idle' && !superJump && !flyStrike;

  useEffect(() => {
    if (!actionMotionActive) {
      bob.setValue(0);
      sway.setValue(0);
      twist.setValue(0);
      return undefined;
    }

    const bobLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(bob, {
          toValue: 1,
          duration: profile.bobMs,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(bob, {
          toValue: 0,
          duration: profile.bobMs,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ]),
    );
    const swayLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(sway, {
          toValue: 1,
          duration: profile.swayMs,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(sway, {
          toValue: 0,
          duration: profile.swayMs,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ]),
    );
    const twistLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(twist, {
          toValue: 1,
          duration: profile.twistMs,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(twist, {
          toValue: 0,
          duration: profile.twistMs,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
      ]),
    );
    bobLoop.start();
    swayLoop.start();
    twistLoop.start();
    return () => {
      bobLoop.stop();
      swayLoop.stop();
      twistLoop.stop();
    };
  }, [bob, sway, twist, profile, actionMotionActive]);

  useEffect(() => {
    const breathMs = idleBreathingActive ? 1450 : profile.squashMs;
    const squashLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(squash, {
          toValue: 1,
          duration: breathMs,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(squash, {
          toValue: 0,
          duration: breathMs,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ]),
    );
    squashLoop.start();
    return () => squashLoop.stop();
  }, [squash, profile.squashMs, idleBreathingActive]);

  useEffect(() => {
    if (!profile.jitter || !actionMotionActive) {
      jitterX.setValue(0);
      return undefined;
    }
    const jMs = profile.jitterMs ?? 100;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(jitterX, { toValue: 1, duration: jMs, useNativeDriver: true }),
        Animated.timing(jitterX, { toValue: -1, duration: jMs, useNativeDriver: true }),
        Animated.timing(jitterX, { toValue: 0, duration: jMs * 0.5, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [profile, jitterX, actionMotionActive]);

  useEffect(() => {
    const blinkLoop = Animated.loop(
      Animated.sequence([
        Animated.delay(1800 + Math.random() * 1200),
        Animated.timing(blink, { toValue: 0.12, duration: 40, useNativeDriver: true }),
        Animated.timing(blink, { toValue: 1, duration: 50, useNativeDriver: true }),
        Animated.delay(1400),
      ]),
    );
    blinkLoop.start();
    return () => blinkLoop.stop();
  }, [blink]);

  useEffect(() => {
    if (!rage) {
      ragePulse.setValue(0);
      return undefined;
    }
    const r = Animated.loop(
      Animated.sequence([
        Animated.timing(ragePulse, { toValue: 1, duration: 480, useNativeDriver: true }),
        Animated.timing(ragePulse, { toValue: 0, duration: 480, useNativeDriver: true }),
      ]),
    );
    r.start();
    return () => r.stop();
  }, [rage, ragePulse]);

  useEffect(() => {
    if (!flyStrike) {
      flyTx.setValue(0);
      flyTy.setValue(0);
      return undefined;
    }
    flyTx.setValue(0);
    flyTy.setValue(0);
    const arc = toward * (size * 0.62);
    const lift = -(size * 0.12);
    const flyAnim = Animated.parallel([
      Animated.sequence([
        Animated.timing(flyTx, {
          toValue: arc,
          duration: 320,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(flyTx, { toValue: arc * 0.16, duration: 70, useNativeDriver: true }),
        Animated.spring(flyTx, { toValue: 0, friction: 6, tension: 88, useNativeDriver: true }),
      ]),
      Animated.sequence([
        Animated.timing(flyTy, {
          toValue: lift,
          duration: 180,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(flyTy, {
          toValue: 0,
          duration: 260,
          easing: Easing.in(Easing.quad),
          useNativeDriver: true,
        }),
      ]),
    ]);
    flyAnim.start();
    return () => flyAnim.stop();
  }, [flyStrike, flyTx, flyTy, toward, size]);

  useEffect(() => {
    poseTx.stopAnimation();
    poseTy.stopAnimation();
    poseScale.stopAnimation();
    shake.stopAnimation();
    dodgeOp.stopAnimation();

    if (pose === 'idle' && !superJump) {
      Animated.parallel([
        Animated.spring(poseTx, { toValue: 0, friction: 6, tension: 80, useNativeDriver: true }),
        Animated.spring(poseTy, { toValue: 0, friction: 6, tension: 80, useNativeDriver: true }),
        Animated.spring(poseScale, { toValue: 1, friction: 7, tension: 90, useNativeDriver: true }),
        Animated.timing(dodgeOp, { toValue: 1, duration: 120, useNativeDriver: true }),
        Animated.timing(shake, { toValue: 0, duration: 80, useNativeDriver: true }),
      ]).start();
      return;
    }

    const jumpExtra = superJump ? toward * 28 : 0;
    const windup = pose === 'cast' || pose === 'superWindup';
    const lungeX = toward * (pose === 'lunge' || pose === 'cast' ? (windup ? 6 : 16) : 0) + jumpExtra;
    const lungeY = windup ? -10 : pose === 'lunge' ? 2 : superJump ? -10 : 0;
    const sc = pose === 'defend' ? 0.86 : windup || superJump ? 1.12 : pose === 'lunge' ? 1.08 : 1;

    if (pose === 'hit') {
      Animated.parallel([
        Animated.sequence([
          Animated.timing(shake, { toValue: 1, duration: 35, useNativeDriver: true }),
          Animated.timing(shake, { toValue: -1, duration: 35, useNativeDriver: true }),
          Animated.timing(shake, { toValue: 0.7, duration: 30, useNativeDriver: true }),
          Animated.timing(shake, { toValue: 0, duration: 30, useNativeDriver: true }),
        ]),
        Animated.spring(poseTx, { toValue: -toward * 22, friction: 4, tension: 200, useNativeDriver: true }),
        Animated.spring(poseScale, { toValue: 0.92, friction: 5, tension: 160, useNativeDriver: true }),
      ]).start();
      return;
    }

    if (pose === 'dodge') {
      const feintX = -toward * 24;
      Animated.parallel([
        Animated.sequence([
          Animated.timing(poseTx, { toValue: feintX, duration: 110, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
          Animated.timing(poseTx, { toValue: feintX * -0.22, duration: 90, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
          Animated.spring(poseTx, { toValue: 0, friction: 6, tension: 110, useNativeDriver: true }),
        ]),
        Animated.sequence([
          Animated.timing(dodgeOp, { toValue: 0.5, duration: 70, useNativeDriver: true }),
          Animated.timing(dodgeOp, { toValue: 1, duration: 200, easing: Easing.out(Easing.quad), useNativeDriver: true }),
        ]),
        Animated.sequence([
          Animated.timing(poseTy, { toValue: -6, duration: 110, useNativeDriver: true }),
          Animated.spring(poseTy, { toValue: 0, friction: 6, tension: 120, useNativeDriver: true }),
        ]),
      ]).start();
      return;
    }

    Animated.parallel([
      Animated.spring(poseTx, { toValue: lungeX, friction: windup ? 7 : 5, tension: windup ? 100 : 130, useNativeDriver: true }),
      Animated.spring(poseTy, { toValue: lungeY, friction: 5, tension: 120, useNativeDriver: true }),
      Animated.spring(poseScale, { toValue: sc, friction: 6, tension: 140, useNativeDriver: true }),
      Animated.timing(dodgeOp, { toValue: 1, duration: 100, useNativeDriver: true }),
    ]).start();
  }, [pose, poseTx, poseTy, poseScale, shake, dodgeOp, toward, superJump]);

  const visualTier = Math.min(
    3,
    Math.max(0, Number(parts.visualFormTier ?? parts.evolutionTierIndex) || 0),
  );
  const statTier = Math.min(5, Math.max(0, Number(parts.evolutionTierIndex) || 0));
  const scaledSize = size * (1 + visualTier * 0.055 + Math.max(0, statTier - visualTier) * 0.02);
  const baseBob = (themed ? -5.4 : -4.4) - visualTier * 1.4 - Math.max(0, statTier - visualTier) * 0.5;
  const bobY = bob.interpolate({ inputRange: [0, 1], outputRange: [0, baseBob * profile.bobMul] });
  const swayMag = (themed ? 3.4 : 2.6) * profile.swayMul;
  const swayX = sway.interpolate({ inputRange: [0, 1], outputRange: [0, swayMag * toward * -1] });
  const twistDeg = profile.twistDeg;
  const swayR = twist.interpolate({
    inputRange: [0, 1],
    outputRange: [`-${twistDeg}deg`, `${twistDeg}deg`],
  });
  const jAmp = profile.jitterAmp ?? 0;
  const jitterPx = jitterX.interpolate({ inputRange: [-1, 0, 1], outputRange: [-jAmp, 0, jAmp] });
  const jolt = shake.interpolate({ inputRange: [-1, 0, 1], outputRange: [-9, 0, 11] });
  const squashX = squash.interpolate({
    inputRange: [0, 1],
    outputRange: [1, idleBreathingActive ? 1.025 : 1.06],
  });
  const squashY = squash.interpolate({
    inputRange: [0, 1],
    outputRange: [1, idleBreathingActive ? 1.045 : 0.9],
  });
  const breathLift = squash.interpolate({
    inputRange: [0, 1],
    outputRange: [0, idleBreathingActive ? -scaledSize * 0.022 : 0],
  });
  const glowOpacity = ragePulse.interpolate({ inputRange: [0, 1], outputRange: [0.4, 0.8] });

  const shadowW = scaledSize * 0.5;
  const shadowH = Math.max(6, scaledSize * 0.07);

  return (
    <View style={[styles.wrap, { minHeight: scaledSize * 1.2, minWidth: scaledSize * 1.15 }]}>
      <View
        pointerEvents="none"
        style={[
          styles.groundShadow,
          {
            width: shadowW,
            height: shadowH,
            borderRadius: shadowH,
          },
        ]}
      />
      {rage ? (
        <Animated.View
          pointerEvents="none"
          style={[
            styles.rageHalo,
            {
              opacity: glowOpacity,
              width: scaledSize * 1.38,
              height: scaledSize * 1.38,
              borderRadius: scaledSize,
            },
          ]}
        />
      ) : null}
      <Animated.View
        style={[
          styles.core,
          {
            opacity: usesImageSprite ? 1 : blink,
            transform: [
              { translateX: Animated.add(flyTx, Animated.add(jitterPx, Animated.add(swayX, Animated.add(poseTx, jolt)))) },
              { translateY: Animated.add(flyTy, Animated.add(bobY, Animated.add(poseTy, breathLift))) },
              { rotate: swayR },
              { scale: poseScale },
              { scaleX: squashX },
              { scaleY: squashY },
            ],
          },
        ]}
      >
        <Animated.View style={[styles.fadeDodge, { opacity: dodgeOp }]}>
          <MonsterPreview parts={parts} size={scaledSize} mood={mood} hideBuiltInShadow />
        </Animated.View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    justifyContent: 'flex-end',
    overflow: 'visible',
  },
  groundShadow: {
    position: 'absolute',
    bottom: 2,
    alignSelf: 'center',
    zIndex: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.28)',
  },
  core: {
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
    overflow: 'visible',
  },
  fadeDodge: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  rageHalo: {
    position: 'absolute',
    alignSelf: 'center',
    zIndex: 0,
    backgroundColor: '#ff4757',
    borderWidth: 3,
    borderColor: '#ff6b81',
  },
});
