import React, { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  Image,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { DAILY_SPIN_SEGMENTS, dailySpinSegmentIndex } from '../utils/dailyLoginSpin';
import { RESCUE_COLORS, rescueWebShadow } from './monsterRescue/rescueUiTheme';
import { GAME_ASSETS } from '../utils/gameAssetPaths';
import { gameSurfaceDataProps, WEB_DECORATIVE_IMAGE_PROPS } from '../utils/webGameTouch';
import { playButton, playLevelUp, playShop, playWin, unlockAudio } from '../utils/audioManager';
import DailySpinWheel from './DailySpinWheel';

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
  const pulse = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (!visible) {
      setStep('intro');
      setSpinning(false);
      setResult(null);
      rotation.setValue(0);
      rotationDeg.current = 0;
      return undefined;
    }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1.04, duration: 900, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 1, duration: 900, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [visible, rotation, pulse]);

  const SEGMENT_DEG = 360 / DAILY_SPIN_SEGMENTS.length;

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
      duration: 4400,
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
    inputRange: [0, 7200],
    outputRange: ['0deg', '7200deg'],
  });

  if (!visible) return null;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onLater}>
      <View style={styles.backdrop}>
        <Animated.View style={[styles.cardGlow, { transform: [{ scale: pulse }] }]} />
        <View style={[styles.card, step === 'intro' && styles.cardIntro]} {...gameSurfaceDataProps()}>
          <View style={styles.cardShine} pointerEvents="none" />

          {step === 'intro' ? (
            <>
              <Text style={styles.kicker}>Evening login bonus</Text>
              <Text style={styles.title}>Fortune Wheel</Text>
              <Text style={styles.sub}>
                {playerName ? `Hey ${playerName}! ` : ''}
                One free spin after 6PM Singapore time. Chest prizes open instantly.
              </Text>
              <View style={styles.heroRow}>
                <Image
                  source={{ uri: GAME_ASSETS.chestClosed }}
                  style={styles.chestHero}
                  resizeMode="contain"
                  {...WEB_DECORATIVE_IMAGE_PROPS}
                />
                <View style={styles.heroBadge}>
                  <Text style={styles.heroBadgeTxt}>★ Daily ★</Text>
                </View>
              </View>
              <Pressable
                style={styles.primaryBtn}
                onPress={() => {
                  unlockAudio();
                  playButton();
                  setStep('wheel');
                }}
              >
                <Text style={styles.primaryBtnTxt}>Spin the wheel</Text>
              </Pressable>
              <Pressable style={styles.ghostBtn} onPress={onLater}>
                <Text style={styles.ghostBtnTxt}>Maybe later</Text>
              </Pressable>
            </>
          ) : null}

          {step === 'wheel' || step === 'result' ? (
            <>
              <Text style={styles.kicker}>Lucky spin</Text>
              <Text style={styles.title}>
                {result ? 'Congratulations!' : spinning ? 'Good luck…' : 'Tap to spin'}
              </Text>

              <DailySpinWheel segments={DAILY_SPIN_SEGMENTS} rotate={rotateInterpolate} />

              {result ? (
                <View style={styles.resultBox}>
                  <Text style={styles.resultEmoji}>
                    {result.segment?.emoji ?? (result.grant?.opensChest ? '📦' : '🎉')}
                  </Text>
                  <Text style={styles.resultMain}>{result.grant?.message ?? 'Reward saved!'}</Text>
                  {result.grant?.opensChest ? (
                    <Text style={styles.resultSub}>Your chest is opening now…</Text>
                  ) : result.grant?.coinsTotal != null ? (
                    <Text style={styles.resultSub}>Gold added to your wallet.</Text>
                  ) : result.grant?.ladderShardsTotal != null ? (
                    <Text style={styles.resultSub}>{`Ladder shards: ${result.grant.ladderShardsTotal}`}</Text>
                  ) : null}
                </View>
              ) : (
                <Text style={styles.hint}>
                  Gold · Shards · Gear chest · Monster chest · Mythic jackpot
                </Text>
              )}

              {result ? (
                <Pressable
                  style={styles.primaryBtn}
                  onPress={() => {
                    playButton();
                    (onCollect ?? onLater)?.();
                  }}
                >
                  <Text style={styles.primaryBtnTxt}>
                    {result.grant?.opensChest ? 'Open chest' : 'Collect reward'}
                  </Text>
                </Pressable>
              ) : (
                <Pressable
                  style={[styles.primaryBtn, spinning && styles.primaryBtnOff]}
                  disabled={spinning}
                  onPress={runSpin}
                >
                  <Text style={styles.primaryBtnTxt}>{spinning ? 'Spinning…' : 'Spin now'}</Text>
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
    backgroundColor: 'rgba(4, 6, 18, 0.92)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  cardGlow: {
    position: 'absolute',
    width: 340,
    height: 340,
    borderRadius: 170,
    backgroundColor: 'rgba(251, 191, 36, 0.12)',
  },
  card: {
    backgroundColor: 'rgba(12, 18, 38, 0.98)',
    borderRadius: 24,
    borderWidth: 3,
    borderColor: RESCUE_COLORS.panelBorder,
    padding: 22,
    alignItems: 'center',
    maxWidth: 420,
    width: '100%',
    overflow: 'hidden',
    ...rescueWebShadow,
  },
  cardIntro: { paddingVertical: 26 },
  cardShine: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 120,
    backgroundColor: 'rgba(255, 230, 163, 0.06)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 230, 163, 0.15)',
  },
  kicker: {
    fontWeight: '900',
    fontSize: 11,
    color: RESCUE_COLORS.kicker,
    textTransform: 'uppercase',
    letterSpacing: 2.2,
  },
  title: {
    marginTop: 6,
    fontWeight: '900',
    fontSize: 26,
    color: RESCUE_COLORS.title,
    textAlign: 'center',
    letterSpacing: 0.5,
  },
  sub: {
    marginTop: 10,
    fontWeight: '700',
    fontSize: 14,
    color: RESCUE_COLORS.body,
    textAlign: 'center',
    lineHeight: 20,
    paddingHorizontal: 8,
  },
  heroRow: {
    marginVertical: 16,
    alignItems: 'center',
  },
  chestHero: { width: 96, height: 96 },
  heroBadge: {
    marginTop: 8,
    paddingHorizontal: 14,
    paddingVertical: 5,
    borderRadius: 20,
    backgroundColor: 'rgba(251, 191, 36, 0.2)',
    borderWidth: 1,
    borderColor: 'rgba(255, 230, 163, 0.5)',
  },
  heroBadgeTxt: {
    color: RESCUE_COLORS.title,
    fontWeight: '900',
    fontSize: 12,
    letterSpacing: 1,
  },
  hint: {
    marginTop: 4,
    marginBottom: 4,
    fontWeight: '700',
    fontSize: 12,
    color: RESCUE_COLORS.sub,
    textAlign: 'center',
    lineHeight: 16,
    paddingHorizontal: 6,
  },
  primaryBtn: {
    marginTop: 14,
    width: '100%',
    paddingVertical: 15,
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
    fontSize: 15,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  ghostBtn: { marginTop: 10, padding: 8 },
  ghostBtnTxt: { color: RESCUE_COLORS.sub, fontWeight: '800', fontSize: 13 },
  resultBox: {
    marginTop: 10,
    padding: 14,
    borderRadius: 14,
    backgroundColor: 'rgba(48, 129, 66, 0.18)',
    borderWidth: 2,
    borderColor: 'rgba(134, 239, 172, 0.45)',
    width: '100%',
    alignItems: 'center',
  },
  resultEmoji: { fontSize: 32, marginBottom: 6 },
  resultMain: {
    color: RESCUE_COLORS.win,
    fontWeight: '900',
    fontSize: 17,
    textAlign: 'center',
  },
  resultSub: {
    marginTop: 6,
    color: RESCUE_COLORS.sub,
    fontWeight: '700',
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
  },
});
