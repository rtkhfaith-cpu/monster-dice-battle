import React, { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, View } from 'react-native';
import MonsterPreview from './MonsterPreview';

/**
 * Idle bob/sway + squash-stretch + blink; battle poses; optional rage aura.
 * `superJump` bumps attacker forward for super cutscene.
 */
export default function AnimatedMonster({
  parts,
  size = 68,
  pose = 'idle',
  side = 'left',
  mood = 'neutral',
  rage = false,
  superJump = false,
}) {
  const bob = useRef(new Animated.Value(0)).current;
  const sway = useRef(new Animated.Value(0)).current;
  const twist = useRef(new Animated.Value(0)).current;
  const squash = useRef(new Animated.Value(0)).current;
  const blink = useRef(new Animated.Value(1)).current;
  const poseTx = useRef(new Animated.Value(0)).current;
  const poseTy = useRef(new Animated.Value(0)).current;
  const poseScale = useRef(new Animated.Value(1)).current;
  const shake = useRef(new Animated.Value(0)).current;
  const dodgeOp = useRef(new Animated.Value(1)).current;
  const ragePulse = useRef(new Animated.Value(0)).current;

  const toward = side === 'left' ? 1 : -1;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.parallel([
        Animated.sequence([
          Animated.timing(bob, { toValue: 1, duration: 1400, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
          Animated.timing(bob, { toValue: 0, duration: 1400, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        ]),
        Animated.sequence([
          Animated.timing(sway, { toValue: 1, duration: 1900, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
          Animated.timing(sway, { toValue: 0, duration: 1900, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        ]),
        Animated.sequence([
          Animated.timing(twist, { toValue: 1, duration: 2200, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
          Animated.timing(twist, { toValue: 0, duration: 2200, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
        ]),
        Animated.sequence([
          Animated.timing(squash, { toValue: 1, duration: 900, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
          Animated.timing(squash, { toValue: 0, duration: 900, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        ]),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [bob, sway, twist, squash]);

  useEffect(() => {
    const blinkLoop = Animated.loop(
      Animated.sequence([
        Animated.delay(2200),
        Animated.timing(blink, { toValue: 0.15, duration: 42, useNativeDriver: true }),
        Animated.timing(blink, { toValue: 1, duration: 55, useNativeDriver: true }),
        Animated.delay(1600),
      ]),
    );
    blinkLoop.start();
    return () => blinkLoop.stop();
  }, [blink]);

  useEffect(() => {
    if (!rage) {
      ragePulse.setValue(0);
      return;
    }
    const r = Animated.loop(
      Animated.sequence([
        Animated.timing(ragePulse, { toValue: 1, duration: 550, useNativeDriver: true }),
        Animated.timing(ragePulse, { toValue: 0, duration: 550, useNativeDriver: true }),
      ]),
    );
    r.start();
    return () => r.stop();
  }, [rage, ragePulse]);

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
    const lungeX = toward * (pose === 'lunge' || pose === 'cast' ? 14 : 0) + jumpExtra;
    const lungeY = pose === 'cast' || pose === 'superWindup' ? -8 : pose === 'lunge' ? 2 : superJump ? -10 : 0;
    const sc = pose === 'defend' ? 0.88 : pose === 'cast' || pose === 'superWindup' || superJump ? 1.1 : 1;

    if (pose === 'hit') {
      Animated.parallel([
        Animated.sequence([
          Animated.timing(shake, { toValue: 1, duration: 40, useNativeDriver: true }),
          Animated.timing(shake, { toValue: -1, duration: 40, useNativeDriver: true }),
          Animated.timing(shake, { toValue: 0.6, duration: 35, useNativeDriver: true }),
          Animated.timing(shake, { toValue: 0, duration: 35, useNativeDriver: true }),
        ]),
        Animated.spring(poseTx, { toValue: -toward * 18, friction: 4, tension: 180, useNativeDriver: true }),
      ]).start();
    }

    if (pose === 'dodge') {
      Animated.parallel([
        Animated.timing(poseTx, { toValue: -toward * 16, duration: 160, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
        Animated.sequence([
          Animated.timing(dodgeOp, { toValue: 0.55, duration: 70, useNativeDriver: true }),
          Animated.timing(dodgeOp, { toValue: 1, duration: 200, easing: Easing.out(Easing.quad), useNativeDriver: true }),
        ]),
        Animated.timing(poseTy, { toValue: -3, duration: 160, useNativeDriver: true }),
      ]).start();
      return;
    }

    Animated.parallel([
      Animated.spring(poseTx, { toValue: lungeX, friction: 5, tension: 120, useNativeDriver: true }),
      Animated.spring(poseTy, { toValue: lungeY, friction: 5, tension: 120, useNativeDriver: true }),
      Animated.spring(poseScale, { toValue: sc, friction: 6, tension: 140, useNativeDriver: true }),
      Animated.timing(dodgeOp, { toValue: 1, duration: 100, useNativeDriver: true }),
    ]).start();
  }, [pose, poseTx, poseTy, poseScale, shake, dodgeOp, toward, superJump]);

  const tier = Math.min(5, Math.max(0, Number(parts.evolutionTierIndex) || 0));
  const scaledSize = size * (1 + tier * 0.036);

  const bobAmp = -4.2 - tier * 1.25;
  const bobY = bob.interpolate({ inputRange: [0, 1], outputRange: [0, bobAmp] });
  const swayX = sway.interpolate({ inputRange: [0, 1], outputRange: [0, 2.5 * toward * -1] });
  const swayR = twist.interpolate({ inputRange: [0, 1], outputRange: ['-2.5deg', '2.5deg'] });
  const jolt = shake.interpolate({ inputRange: [-1, 0, 1], outputRange: [-7, 0, 9] });
  const squashX = squash.interpolate({ inputRange: [0, 1], outputRange: [1, 1.05] });
  const squashY = squash.interpolate({ inputRange: [0, 1], outputRange: [1, 0.93] });

  const glowOpacity = ragePulse.interpolate({ inputRange: [0, 1], outputRange: [0.35, 0.75] });

  return (
    <View style={styles.wrap}>
      {rage ? (
        <Animated.View
          pointerEvents="none"
          style={[
            styles.rageHalo,
            {
              opacity: glowOpacity,
              width: scaledSize * 1.35,
              height: scaledSize * 1.35,
              borderRadius: scaledSize,
              backgroundColor: '#ff1744',
            },
          ]}
        />
      ) : null}
      <Animated.View
        style={[
          styles.core,
          {
            opacity: blink,
            transform: [
              { translateX: Animated.add(swayX, Animated.add(poseTx, jolt)) },
              { translateY: Animated.add(bobY, poseTy) },
              { rotate: swayR },
              { scale: poseScale },
              { scaleX: squashX },
              { scaleY: squashY },
            ],
          },
        ]}
      >
        <Animated.View style={[styles.fadeDodge, { opacity: dodgeOp }]}>
          <MonsterPreview parts={parts} size={scaledSize} mood={mood} />
        </Animated.View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  core: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  fadeDodge: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  rageHalo: {
    position: 'absolute',
    alignSelf: 'center',
    zIndex: 0,
  },
});
