import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  Image,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { DAILY_SPIN_SEGMENTS, dailySpinSegmentIndex } from '../utils/dailyLoginSpin';
import { RESCUE_COLORS } from './monsterRescue/rescueUiTheme';
import { GAME_ASSETS } from '../utils/gameAssetPaths';
import { gameSurfaceDataProps, WEB_DECORATIVE_IMAGE_PROPS } from '../utils/webGameTouch';
import { playButton, playLevelUp, playShop, playWin, unlockAudio } from '../utils/audioManager';

const SEGMENT_COUNT = DAILY_SPIN_SEGMENTS.length;
const SEGMENT_DEG = 360 / SEGMENT_COUNT;

function segmentGradientStops() {
  let acc = 0;
  const step = 100 / SEGMENT_COUNT;
  return DAILY_SPIN_SEGMENTS.map((seg) => {
    const start = acc;
    acc += step;
    return `${seg.color} ${start}% ${acc}%`;
  }).join(', ');
}

export default function DailyLuckySpinModal({
  visible,
  playerName,
  onPrepareSpin,
  onClaimSpin,
  onLater,
  onCollect,
}) {
  const [step, setStep] = useState('intro');
  const [spinning, setSpinning] = useState(false);
  const [result, setResult] = useState(null);
  const rotation = useRef(new Animated.Value(0)).current;
  const rotationDeg = useRef(0);

  useEffect(() => {
    if (!visible) {
      setStep('intro');
      setSpinning(false);
      setResult(null);
      rotation.setValue(0);
      rotationDeg.current = 0;
    }
  }, [visible, rotation]);

  const wheelBg = useMemo(() => {
    if (Platform.OS === 'web') {
      return { backgroundImage: `conic-gradient(from -90deg, ${segmentGradientStops()})` };
    }
    return { backgroundColor: '#4c1d95' };
  }, []);

  function runSpin() {
    if (spinning || result) return;
    const prepared = onPrepareSpin?.();
    const segmentId = prepared?.segmentId;
    if (!segmentId) return;

    unlockAudio();
    playShop();
    setSpinning(true);
    setStep('wheel');

    const idx = dailySpinSegmentIndex(segmentId);
    const segmentCenter = idx * SEGMENT_DEG + SEGMENT_DEG / 2;
    const spins = 5 + Math.floor(Math.random() * 2);
    const targetMod = (360 - segmentCenter + SEGMENT_DEG / 2) % 360;
    const currentMod = ((rotationDeg.current % 360) + 360) % 360;
    let delta = targetMod - currentMod;
    if (delta < 0) delta += 360;
    const totalRotate = rotationDeg.current + spins * 360 + delta;

    Animated.timing(rotation, {
      toValue: totalRotate,
      duration: 4200,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start(() => {
      rotationDeg.current = totalRotate;
      setSpinning(false);
      const claimed = onClaimSpin?.(segmentId);
      setResult(claimed ?? null);
      if (claimed?.segment?.kind === 'mythic_monster') playLevelUp();
      else playWin();
      setStep('result');
    });
  }

  const rotateInterpolate = rotation.interpolate({
    inputRange: [0, 3600],
    outputRange: ['0deg', '3600deg'],
  });

  if (!visible) return null;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onLater}>
      <View style={styles.backdrop}>
        <View style={[styles.card, step === 'intro' && styles.cardIntro]} {...gameSurfaceDataProps()}>
          {step === 'intro' ? (
            <>
              <Text style={styles.kicker}>Daily login</Text>
              <Text style={styles.title}>Lucky spin is ready!</Text>
              <Text style={styles.sub}>
                {playerName ? `Welcome back, ${playerName}. ` : ''}
                Your free spin unlocks after 6PM Singapore time — once per day.
              </Text>
              <Image
                source={{ uri: GAME_ASSETS.chestClosed }}
                style={styles.chestHero}
                resizeMode="contain"
                {...WEB_DECORATIVE_IMAGE_PROPS}
              />
              <Pressable
                style={styles.primaryBtn}
                onPress={() => {
                  unlockAudio();
                  playButton();
                  setStep('wheel');
                }}
              >
                <Text style={styles.primaryBtnTxt}>Spin now</Text>
              </Pressable>
              <Pressable style={styles.ghostBtn} onPress={onLater}>
                <Text style={styles.ghostBtnTxt}>Later</Text>
              </Pressable>
            </>
          ) : null}

          {step === 'wheel' || step === 'result' ? (
            <>
              <Text style={styles.kicker}>Lucky spin</Text>
              <Text style={styles.title}>{result ? 'You won!' : 'Spin the wheel'}</Text>
              <View style={styles.wheelWrap}>
                <View style={styles.pointer} />
                <Animated.View
                  style={[
                    styles.wheel,
                    wheelBg,
                    { transform: [{ rotate: rotateInterpolate }] },
                  ]}
                >
                  {DAILY_SPIN_SEGMENTS.map((seg, i) => {
                    const ang = ((i + 0.5) * SEGMENT_DEG - 90) * (Math.PI / 180);
                    const r = 92;
                    const x = 110 + r * Math.cos(ang);
                    const y = 110 + r * Math.sin(ang);
                    return (
                      <View
                        key={`lbl_${seg.id}`}
                        style={[styles.segLabel, { left: x - 28, top: y - 16 }]}
                        pointerEvents="none"
                      >
                        <Text style={styles.segLabelMain}>{seg.label}</Text>
                        <Text style={styles.segLabelSub}>{seg.sublabel}</Text>
                      </View>
                    );
                  })}
                </Animated.View>
                <View style={styles.wheelHub}>
                  <Text style={styles.hubTxt}>★</Text>
                </View>
              </View>

              {result ? (
                <View style={styles.resultBox}>
                  <Text style={styles.resultMain}>{result.grant?.message ?? 'Reward claimed!'}</Text>
                  {result.grant?.duplicate ? (
                    <Text style={styles.resultSub}>Stored for merging on your roster.</Text>
                  ) : null}
                </View>
              ) : (
                <Text style={styles.sub}>Tap spin — prizes from 10 coins to mythic monsters.</Text>
              )}

              {result ? (
                <Pressable
                  style={styles.primaryBtn}
                  onPress={() => {
                    playButton();
                    (onCollect ?? onLater)?.();
                  }}
                >
                  <Text style={styles.primaryBtnTxt}>Collect</Text>
                </Pressable>
              ) : (
                <Pressable
                  style={[styles.primaryBtn, spinning && styles.primaryBtnOff]}
                  disabled={spinning}
                  onPress={runSpin}
                >
                  <Text style={styles.primaryBtnTxt}>{spinning ? 'Spinning…' : 'Spin!'}</Text>
                </Pressable>
              )}
            </>
          ) : null}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(6, 8, 20, 0.88)',
    justifyContent: 'center',
    padding: 20,
  },
  card: {
    backgroundColor: 'rgba(15, 22, 42, 0.98)',
    borderRadius: 22,
    borderWidth: 3,
    borderColor: RESCUE_COLORS.panelBorder,
    padding: 20,
    alignItems: 'center',
    maxWidth: 400,
    alignSelf: 'center',
    width: '100%',
  },
  cardIntro: { paddingVertical: 24 },
  kicker: {
    fontWeight: '900',
    fontSize: 11,
    color: RESCUE_COLORS.kicker,
    textTransform: 'uppercase',
    letterSpacing: 1.8,
  },
  title: {
    marginTop: 6,
    fontWeight: '900',
    fontSize: 22,
    color: RESCUE_COLORS.title,
    textAlign: 'center',
  },
  sub: {
    marginTop: 8,
    fontWeight: '700',
    fontSize: 13,
    color: RESCUE_COLORS.body,
    textAlign: 'center',
    lineHeight: 18,
  },
  chestHero: { width: 88, height: 88, marginVertical: 14 },
  primaryBtn: {
    marginTop: 16,
    width: '100%',
    paddingVertical: 14,
    borderRadius: 14,
    backgroundColor: 'rgba(48, 129, 66, 0.96)',
    borderWidth: 2,
    borderColor: '#efd17a',
    borderBottomWidth: 5,
    borderBottomColor: '#31551f',
    alignItems: 'center',
  },
  primaryBtnOff: { opacity: 0.55 },
  primaryBtnTxt: {
    color: '#fff6d6',
    fontWeight: '900',
    fontSize: 16,
    textTransform: 'uppercase',
  },
  ghostBtn: { marginTop: 10, padding: 8 },
  ghostBtnTxt: { color: RESCUE_COLORS.sub, fontWeight: '800', fontSize: 13 },
  wheelWrap: {
    width: 220,
    height: 220,
    marginTop: 16,
    marginBottom: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  wheel: {
    width: 220,
    height: 220,
    borderRadius: 110,
    borderWidth: 4,
    borderColor: '#ffe6a3',
    overflow: 'hidden',
    position: 'relative',
  },
  segLabel: {
    position: 'absolute',
    width: 56,
    alignItems: 'center',
  },
  segLabelMain: { color: '#0f172a', fontWeight: '900', fontSize: 11, textAlign: 'center' },
  segLabelSub: { color: '#1e293b', fontWeight: '800', fontSize: 8, textAlign: 'center' },
  wheelHub: {
    position: 'absolute',
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#1a1a2e',
    borderWidth: 3,
    borderColor: '#ffe6a3',
    alignItems: 'center',
    justifyContent: 'center',
  },
  hubTxt: { color: '#ffe6a3', fontWeight: '900', fontSize: 18 },
  pointer: {
    position: 'absolute',
    top: -4,
    width: 0,
    height: 0,
    borderLeftWidth: 12,
    borderRightWidth: 12,
    borderBottomWidth: 22,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderBottomColor: '#ffe6a3',
    zIndex: 5,
  },
  resultBox: {
    marginTop: 8,
    padding: 12,
    borderRadius: 12,
    backgroundColor: 'rgba(48, 129, 66, 0.2)',
    borderWidth: 1,
    borderColor: 'rgba(134, 239, 172, 0.45)',
    width: '100%',
  },
  resultMain: {
    color: RESCUE_COLORS.win,
    fontWeight: '900',
    fontSize: 16,
    textAlign: 'center',
  },
  resultSub: {
    marginTop: 4,
    color: RESCUE_COLORS.sub,
    fontWeight: '700',
    fontSize: 12,
    textAlign: 'center',
  },
});
