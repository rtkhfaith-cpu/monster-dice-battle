import React, { useEffect, useMemo, useRef } from 'react';
import { Animated, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import AnimatedMonster from './AnimatedMonster';
import { expToAdvanceFrom } from '../utils/expLevel';
import { getStrictLayout } from '../utils/battleLayout';
import { ELEMENT_UI } from '../utils/elements';
import { hasStatus, STATUS_LABELS } from '../utils/statusEffects';
import { ART } from '../utils/artDirection';
import { BATTLE } from '../utils/gameTheme';

function MicroBar({ ratio, color, compact }) {
  const pct = Math.max(0, Math.min(1, ratio));
  return (
    <View style={[styles.microTrack, compact && styles.microTrackCompact]}>
      <View style={[styles.microFill, { width: `${pct * 100}%`, backgroundColor: color }]} />
    </View>
  );
}

function BattlerInfoPanel({ title, fighter, active, side, panelWidth, compact }) {
  const level = fighter?.level ?? 1;
  const exp = fighter?.battleExp ?? 0;
  const expNeed = fighter?.battleExpToNext ?? expToAdvanceFrom(level);
  const maxHp = fighter?.maxHp ?? fighter?.stats?.hp ?? 0;
  const maxMp = fighter?.maxMp ?? fighter?.stats?.mp ?? 0;
  const hpRatio = maxHp ? fighter.hp / maxHp : 0;
  const mpRatio = maxMp ? fighter.mp / maxMp : 0;
  const expRatio = expNeed > 0 ? exp / expNeed : 0;
  const combo = fighter?.combo ?? 0;
  const rage = fighter?.stats?.hp && fighter.hp / fighter.stats.hp <= 0.3 && fighter.hp > 0;
  const hpColor = side === 'left' ? '#4ecdc4' : '#ff6b6b';
  const elUi = ELEMENT_UI[fighter?.element] ?? ELEMENT_UI.earth;
  const statusTag = hasStatus(fighter) ? STATUS_LABELS[fighter.status.type] : null;

  return (
    <View
      style={[
        styles.infoPanel,
        { width: panelWidth, maxWidth: panelWidth, minHeight: compact ? 92 : 118 },
        active ? styles.infoPanelActive : styles.infoPanelIdle,
        compact && styles.infoPanelCompact,
      ]}
    >
      <Text style={[styles.infoTitle, compact && styles.infoTitleCompact]} numberOfLines={1}>
        {title}
      </Text>
      <View style={styles.nameRow}>
        <Text style={[styles.elementBadge, compact && styles.elementBadgeCompact]}>{elUi.emoji}</Text>
        <Text style={[styles.monName, styles.monNameFlex, compact && styles.monNameCompact]} numberOfLines={1}>
          {fighter?.displayName || 'Monster'}
        </Text>
      </View>
      <Text style={[styles.lvLine, compact && styles.lvLineCompact]}>Lv {level}</Text>
      <Text style={[styles.statInline, compact && styles.statInlineCompact]}>
        HP {fighter.hp}/{maxHp}
      </Text>
      <MicroBar ratio={hpRatio} color={hpColor} compact={compact} />
      <Text style={[styles.statInline, compact && styles.statInlineCompact]}>
        MP {fighter.mp}/{maxMp}
      </Text>
      <MicroBar ratio={mpRatio} color="#6366f1" compact={compact} />
      {!compact ? (
        <>
          <Text style={styles.statInline}>
            EXP {exp}/{expNeed}
          </Text>
          <MicroBar ratio={expRatio} color="#ffd166" />
          <Text style={styles.statInline}>
            Combo <Text style={styles.val}>{combo}</Text>
          </Text>
        </>
      ) : null}
      {statusTag ? <Text style={styles.statusTag}>{statusTag}</Text> : null}
      {rage ? <Text style={styles.rageTag}>LOW HP</Text> : null}
    </View>
  );
}

/**
 * Strict-coordinate RPG battlefield — all combatants use absolute % positions.
 */
export default function RpgBattleArena({
  p1,
  p2,
  p1Mood,
  p2Mood,
  p1Pose,
  p2Pose,
  activeTurn,
  round,
  turnBadge = '',
  player1Label = 'You',
  player2Label = 'Foe',
  topHudExtra = null,
  battleDim,
  shakeX,
  stageZoom,
  superJumpSide,
  p1Rage,
  p2Rage,
  defendGlowP1 = false,
  defendGlowP2 = false,
  defenderFlashP1 = false,
  defenderFlashP2 = false,
  sicklyFlashP1 = false,
  sicklyFlashP2 = false,
  flyStrikeP1 = false,
  flyStrikeP2 = false,
}) {
  const p1Flash = useRef(new Animated.Value(0)).current;
  const p2Flash = useRef(new Animated.Value(0)).current;
  const shieldPulse = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!defenderFlashP1 && !sicklyFlashP1) {
      p1Flash.setValue(0);
      return undefined;
    }
    p1Flash.setValue(0);
    Animated.sequence([
      Animated.timing(p1Flash, { toValue: 1, duration: 70, useNativeDriver: true }),
      Animated.timing(p1Flash, { toValue: 0, duration: sicklyFlashP1 ? 320 : 220, useNativeDriver: true }),
    ]).start();
    return undefined;
  }, [defenderFlashP1, sicklyFlashP1, p1Flash]);

  useEffect(() => {
    if (!defenderFlashP2 && !sicklyFlashP2) {
      p2Flash.setValue(0);
      return undefined;
    }
    p2Flash.setValue(0);
    Animated.sequence([
      Animated.timing(p2Flash, { toValue: 1, duration: 70, useNativeDriver: true }),
      Animated.timing(p2Flash, { toValue: 0, duration: sicklyFlashP2 ? 320 : 220, useNativeDriver: true }),
    ]).start();
    return undefined;
  }, [defenderFlashP2, sicklyFlashP2, p2Flash]);

  const { width, height } = useWindowDimensions();
  const narrow = width < 520;
  const L = useMemo(() => getStrictLayout(width, height), [width, height]);
  const bannerW = L.hudBannerW;
  const bannerHalf = bannerW / 2;

  const p1Focus = useRef(new Animated.Value(activeTurn === 1 ? 1 : 0)).current;
  const p2Focus = useRef(new Animated.Value(activeTurn === 2 ? 1 : 0)).current;

  useEffect(() => {
    Animated.timing(p1Focus, { toValue: activeTurn === 1 ? 1 : 0, duration: 180, useNativeDriver: true }).start();
    Animated.timing(p2Focus, { toValue: activeTurn === 2 ? 1 : 0, duration: 180, useNativeDriver: true }).start();
  }, [activeTurn, p1Focus, p2Focus]);

  const p1Scale = p1Focus.interpolate({ inputRange: [0, 1], outputRange: [0.97, 1] });
  const p1Opacity = p1Focus.interpolate({ inputRange: [0, 1], outputRange: [0.95, 1] });
  const p2Scale = p2Focus.interpolate({ inputRange: [0, 1], outputRange: [0.97, 1] });
  const p2Opacity = p2Focus.interpolate({ inputRange: [0, 1], outputRange: [0.95, 1] });

  const cloudDrift = useRef(new Animated.Value(0)).current;
  const grassSway = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    cloudDrift.setValue(0);
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(cloudDrift, { toValue: 1, duration: 18000, useNativeDriver: true }),
        Animated.timing(cloudDrift, { toValue: 0, duration: 18000, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [cloudDrift]);

  useEffect(() => {
    grassSway.setValue(0);
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(grassSway, { toValue: 1, duration: 2400, useNativeDriver: true }),
        Animated.timing(grassSway, { toValue: 0, duration: 2400, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [grassSway]);

  useEffect(() => {
    if (!defendGlowP1 && !defendGlowP2) {
      shieldPulse.setValue(0);
      return undefined;
    }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(shieldPulse, { toValue: 1, duration: 520, useNativeDriver: true }),
        Animated.timing(shieldPulse, { toValue: 0, duration: 520, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [defendGlowP1, defendGlowP2, shieldPulse]);

  const cloudTx = cloudDrift.interpolate({ inputRange: [0, 1], outputRange: [0, 24] });
  const grassSkew = grassSway.interpolate({ inputRange: [0, 1], outputRange: ['-2deg', '2deg'] });
  const shieldScale = shieldPulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.06] });
  const shieldOp = shieldPulse.interpolate({ inputRange: [0, 1], outputRange: [0.75, 1] });

  const roundLabel = narrow ? `R${round}` : `Round ${round}`;
  const turnShort = turnBadge || '';

  return (
    <Animated.View
      style={[
        styles.arenaOuter,
        battleDim && styles.arenaDim,
        { transform: [{ translateX: shakeX }, { scale: stageZoom }] },
      ]}
    >
      <View style={styles.vignetteTop} pointerEvents="none" />
      <View style={styles.vignetteBottom} pointerEvents="none" />
      {/* z-index 0–1: background */}
      <View style={styles.skyGrad} />
      <View style={styles.skyFade} />
      <View style={styles.sunGlow} />
      <Animated.View style={[styles.cloudA, { transform: [{ translateX: cloudTx }] }]} />
      <Animated.View style={[styles.cloudB, { transform: [{ translateX: Animated.multiply(cloudTx, -0.5) }] }]} />
      <Animated.View style={[styles.cloudC, { transform: [{ translateX: Animated.multiply(cloudTx, 0.35) }] }]} />
      <Animated.View style={[styles.hillFar, { transform: [{ translateX: Animated.multiply(cloudTx, 0.08) }] }]} />
      <Animated.View style={[styles.hillMid, { transform: [{ translateX: Animated.multiply(cloudTx, 0.14) }] }]} />
      <Animated.View style={[styles.hillNear, { transform: [{ translateX: Animated.multiply(cloudTx, 0.2) }] }]} />
      <View style={styles.grassPatchA} />
      <View style={styles.grassPatchB} />
      <View style={styles.grassPatchC} />
      <View style={styles.bushL} />
      <View style={styles.bushR} />
      <View style={styles.bushMid} />
      <View style={styles.rockA} />
      <View style={styles.rockB} />
      <View style={styles.rockC} />
      <View style={styles.rockD} />
      <Animated.View style={[styles.grassTuftA, { transform: [{ rotate: grassSkew }] }]} />
      <Animated.View style={[styles.grassTuftB, { transform: [{ rotate: grassSkew }] }]} />
      <Animated.View style={[styles.grassTuftC, { transform: [{ rotate: grassSkew }] }]} />
      <View style={styles.flowerA} />
      <View style={styles.flowerB} />
      <View style={styles.flowerC} />
      <View style={styles.treeL} />
      <View style={styles.treeR} />
      <View style={styles.groundTexture} />
      <View style={styles.groundStrip} />
      <View style={styles.foreGrass} />
      <View style={styles.battlePlatform} />
      <View style={styles.platformEdge} pointerEvents="none" />
      <View style={styles.centerCombatZone} />
      <View style={styles.shadowP1} />
      <View style={styles.shadowP2} />

      {/* z-index 10: top HUD */}
      <View style={styles.muteSlot}>{topHudExtra}</View>
      {turnShort ? (
        <View style={[styles.turnBadge, { width: bannerW, transform: [{ translateX: -bannerHalf }] }]}>
          <Text style={styles.turnBadgeTxt} numberOfLines={2}>
            {turnShort}
          </Text>
        </View>
      ) : null}
      <View style={styles.roundBadge}>
        <Text style={styles.roundBadgeTxt}>{roundLabel}</Text>
      </View>

      {/* z-index 6: stats (above monsters) */}
      <View style={[styles.playerStats, { width: L.statsP1W }]}>
        <BattlerInfoPanel
          title={player1Label}
          fighter={p1}
          active={activeTurn === 1}
          side="left"
          panelWidth={L.statsP1W}
          compact={L.compactHud}
        />
      </View>
      <View style={[styles.enemyStats, { width: L.statsP2W }]}>
        <BattlerInfoPanel
          title={player2Label}
          fighter={p2}
          active={activeTurn === 2}
          side="right"
          panelWidth={L.statsP2W}
          compact={L.compactHud}
        />
      </View>

      {/* z-index 3: monsters */}
      <Animated.View
        style={[
          styles.playerMonster,
          { bottom: L.monsterBottom, opacity: p1Opacity, transform: [{ scale: p1Scale }] },
        ]}
      >
        <Animated.View
          pointerEvents="none"
          style={[
            styles.hitFlash,
            sicklyFlashP1 && styles.hitFlashSickly,
            { opacity: p1Flash },
          ]}
        />
        <View style={[styles.monsterWrap, { width: L.p1Monster }]}>
          {defendGlowP1 ? (
            <Animated.View
              pointerEvents="none"
              style={[
                styles.shieldRing,
                { opacity: shieldOp, transform: [{ scale: shieldScale }] },
              ]}
            />
          ) : null}
          <AnimatedMonster
            parts={p1.monsterParts}
            size={L.p1Monster}
            pose={p1Pose}
            side="left"
            mood={p1Mood}
            rage={p1Rage}
            superJump={superJumpSide === 'left'}
            flyStrike={flyStrikeP1}
          />
        </View>
      </Animated.View>

      <Animated.View
        style={[
          styles.enemyMonster,
          { bottom: L.monsterBottom, opacity: p2Opacity, transform: [{ scale: p2Scale }] },
        ]}
      >
        <Animated.View
          pointerEvents="none"
          style={[
            styles.hitFlash,
            sicklyFlashP2 && styles.hitFlashSickly,
            { opacity: p2Flash },
          ]}
        />
        <View style={[styles.faceLeft, styles.monsterWrap, { width: L.p2Monster }]}>
          {defendGlowP2 ? (
            <Animated.View
              pointerEvents="none"
              style={[
                styles.shieldRing,
                { opacity: shieldOp, transform: [{ scale: shieldScale }] },
              ]}
            />
          ) : null}
          <AnimatedMonster
            parts={p2.monsterParts}
            size={L.p2Monster}
            pose={p2Pose}
            side="right"
            mood={p2Mood}
            rage={p2Rage}
            superJump={superJumpSide === 'right'}
            flyStrike={flyStrikeP2}
          />
        </View>
      </Animated.View>

    </Animated.View>
  );
}

const styles = StyleSheet.create({
  arenaOuter: {
    flex: 1,
    width: '100%',
    minHeight: 0,
    overflow: 'hidden',
    backgroundColor: ART.skyMid,
  },
  vignetteTop: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    height: '22%',
    backgroundColor: 'rgba(45, 53, 97, 0.12)',
    zIndex: 2,
  },
  vignetteBottom: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: '18%',
    backgroundColor: 'rgba(45, 53, 97, 0.18)',
    zIndex: 2,
  },
  arenaDim: { opacity: 0.9 },

  skyGrad: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#b8e4fa',
    zIndex: 0,
  },
  skyFade: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    height: '48%',
    backgroundColor: 'rgba(255, 255, 255, 0.28)',
    zIndex: 0,
  },
  sunGlow: {
    position: 'absolute',
    top: '3%',
    right: '10%',
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(255, 244, 180, 0.65)',
    borderWidth: 3,
    borderColor: 'rgba(255, 220, 120, 0.35)',
    zIndex: 0,
  },
  cloudA: {
    position: 'absolute',
    top: '6%',
    left: '6%',
    width: 70,
    height: 26,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.85)',
    zIndex: 0,
  },
  cloudB: {
    position: 'absolute',
    top: '10%',
    right: '5%',
    width: 88,
    height: 30,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.75)',
    zIndex: 0,
  },
  cloudC: {
    position: 'absolute',
    top: '4%',
    left: '40%',
    width: 54,
    height: 22,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.65)',
    zIndex: 0,
  },
  hillFar: {
    position: 'absolute',
    left: '-12%',
    right: '-12%',
    bottom: '36%',
    height: '20%',
    backgroundColor: '#9edfc0',
    borderTopLeftRadius: 140,
    borderTopRightRadius: 140,
    opacity: 0.55,
    zIndex: 0,
  },
  hillMid: {
    position: 'absolute',
    left: '-8%',
    right: '-8%',
    bottom: '30%',
    height: '15%',
    backgroundColor: '#85d4a8',
    borderTopLeftRadius: 120,
    borderTopRightRadius: 120,
    opacity: 0.72,
    zIndex: 0,
  },
  hillNear: {
    position: 'absolute',
    left: '-4%',
    right: '-4%',
    bottom: '24%',
    height: '11%',
    backgroundColor: '#72c896',
    borderTopLeftRadius: 100,
    borderTopRightRadius: 100,
    opacity: 0.9,
    zIndex: 0,
  },
  grassPatchA: {
    position: 'absolute',
    left: '12%',
    bottom: '22%',
    width: 56,
    height: 16,
    borderRadius: 10,
    backgroundColor: '#6ecf9a',
    zIndex: 0,
  },
  grassPatchB: {
    position: 'absolute',
    right: '16%',
    bottom: '21%',
    width: 64,
    height: 18,
    borderRadius: 12,
    backgroundColor: '#7ed9a8',
    zIndex: 0,
  },
  grassPatchC: {
    position: 'absolute',
    left: '44%',
    bottom: '20%',
    width: 48,
    height: 14,
    borderRadius: 10,
    backgroundColor: '#6ecf9a',
    zIndex: 0,
  },
  bushL: {
    position: 'absolute',
    left: '18%',
    bottom: '26%',
    width: 32,
    height: 20,
    borderRadius: 14,
    backgroundColor: '#4a9e6e',
    zIndex: 0,
  },
  bushR: {
    position: 'absolute',
    right: '20%',
    bottom: '25%',
    width: 36,
    height: 22,
    borderRadius: 16,
    backgroundColor: '#3d9168',
    zIndex: 0,
  },
  bushMid: {
    position: 'absolute',
    left: '48%',
    bottom: '24%',
    width: 28,
    height: 18,
    borderRadius: 12,
    backgroundColor: '#52a87a',
    zIndex: 0,
  },
  rockA: {
    position: 'absolute',
    left: '8%',
    bottom: '18%',
    width: 24,
    height: 16,
    borderRadius: 6,
    backgroundColor: '#95a5a6',
    zIndex: 0,
  },
  rockB: {
    position: 'absolute',
    right: '10%',
    bottom: '17%',
    width: 28,
    height: 18,
    borderRadius: 7,
    backgroundColor: '#7f8c8d',
    zIndex: 0,
  },
  rockC: {
    position: 'absolute',
    left: '52%',
    bottom: '16%',
    width: 20,
    height: 12,
    borderRadius: 5,
    backgroundColor: '#bdc3c7',
    zIndex: 0,
  },
  rockD: {
    position: 'absolute',
    left: '32%',
    bottom: '19%',
    width: 16,
    height: 10,
    borderRadius: 4,
    backgroundColor: '#aab7b8',
    zIndex: 0,
  },
  grassTuftA: {
    position: 'absolute',
    left: '22%',
    bottom: '18%',
    width: 14,
    height: 10,
    borderTopLeftRadius: 8,
    borderTopRightRadius: 8,
    backgroundColor: '#5fb87a',
    zIndex: 1,
  },
  grassTuftB: {
    position: 'absolute',
    right: '28%',
    bottom: '17%',
    width: 12,
    height: 9,
    borderTopLeftRadius: 7,
    borderTopRightRadius: 7,
    backgroundColor: '#52a870',
    zIndex: 1,
  },
  grassTuftC: {
    position: 'absolute',
    left: '58%',
    bottom: '19%',
    width: 10,
    height: 8,
    borderTopLeftRadius: 6,
    borderTopRightRadius: 6,
    backgroundColor: '#5fb87a',
    zIndex: 1,
  },
  flowerA: {
    position: 'absolute',
    left: '26%',
    bottom: '20%',
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#ff6b9d',
    zIndex: 1,
  },
  flowerB: {
    position: 'absolute',
    right: '24%',
    bottom: '19%',
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: '#ffe066',
    zIndex: 1,
  },
  flowerC: {
    position: 'absolute',
    left: '62%',
    bottom: '21%',
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#c77dff',
    zIndex: 1,
  },
  treeL: {
    position: 'absolute',
    left: 4,
    bottom: '30%',
    width: 0,
    height: 0,
    borderLeftWidth: 18,
    borderRightWidth: 18,
    borderBottomWidth: 44,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderBottomColor: '#4a9e6e',
    zIndex: 0,
  },
  treeR: {
    position: 'absolute',
    right: 6,
    bottom: '29%',
    width: 0,
    height: 0,
    borderLeftWidth: 22,
    borderRightWidth: 22,
    borderBottomWidth: 52,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderBottomColor: '#3d9168',
    zIndex: 0,
  },
  groundTexture: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: '22%',
    backgroundColor: 'rgba(90, 168, 110, 0.15)',
    zIndex: 0,
  },
  groundStrip: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: '22%',
    backgroundColor: BATTLE.arenaGrass,
    borderTopWidth: 3,
    borderTopColor: BATTLE.arenaGrassDark,
    zIndex: 0,
  },
  foreGrass: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: '12%',
    backgroundColor: '#4fa868',
    opacity: 0.42,
    zIndex: 1,
  },
  battlePlatform: {
    position: 'absolute',
    left: '6%',
    right: '6%',
    bottom: '8%',
    height: '10%',
    backgroundColor: 'rgba(90, 168, 110, 0.38)',
    borderRadius: 22,
    borderWidth: 2,
    borderColor: 'rgba(58, 130, 82, 0.35)',
    zIndex: 1,
  },
  platformEdge: {
    position: 'absolute',
    left: '4%',
    right: '4%',
    bottom: '7%',
    height: '3%',
    borderRadius: 20,
    backgroundColor: 'rgba(45, 53, 97, 0.14)',
    zIndex: 1,
  },
  centerCombatZone: {
    position: 'absolute',
    left: '32%',
    right: '32%',
    bottom: '22%',
    top: '28%',
    borderRadius: 28,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    borderStyle: 'dashed',
    zIndex: 1,
  },
  shadowP1: {
    position: 'absolute',
    left: '10%',
    bottom: '9%',
    width: 120,
    height: 18,
    borderRadius: 24,
    backgroundColor: 'rgba(0,0,0,0.2)',
    zIndex: 2,
  },
  shadowP2: {
    position: 'absolute',
    right: '10%',
    bottom: '9%',
    width: 120,
    height: 18,
    borderRadius: 24,
    backgroundColor: 'rgba(0,0,0,0.2)',
    zIndex: 2,
  },

  muteSlot: {
    position: 'absolute',
    top: '2%',
    left: '1.5%',
    zIndex: 10,
  },
  turnBadge: {
    position: 'absolute',
    top: '3%',
    left: '50%',
    alignItems: 'center',
    zIndex: 10,
  },
  turnBadgeTxt: {
    fontWeight: '900',
    fontSize: 13,
    lineHeight: 17,
    color: '#1a1a2e',
    backgroundColor: 'rgba(255, 255, 255, 0.88)',
    borderWidth: 2,
    borderColor: 'rgba(45, 45, 68, 0.35)',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 6,
    overflow: 'hidden',
    textAlign: 'center',
    width: '100%',
  },
  roundBadge: {
    position: 'absolute',
    top: '2%',
    right: '1.5%',
    zIndex: 10,
    backgroundColor: 'rgba(26, 26, 46, 0.85)',
    borderWidth: 2,
    borderColor: 'rgba(255, 209, 102, 0.65)',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  roundBadgeTxt: {
    fontWeight: '900',
    fontSize: 11,
    color: '#ffeaa7',
    textTransform: 'uppercase',
  },

  playerStats: {
    position: 'absolute',
    left: '2.5%',
    top: '6%',
    zIndex: 6,
  },
  enemyStats: {
    position: 'absolute',
    right: '2.5%',
    top: '6%',
    zIndex: 6,
  },
  playerMonster: {
    position: 'absolute',
    left: '4%',
    zIndex: 3,
    alignItems: 'flex-start',
    justifyContent: 'flex-end',
  },
  enemyMonster: {
    position: 'absolute',
    right: '4%',
    zIndex: 3,
    alignItems: 'flex-end',
    justifyContent: 'flex-end',
  },

  monsterWrap: { alignItems: 'center', justifyContent: 'flex-end', overflow: 'visible' },
  faceLeft: { transform: [{ scaleX: -1 }], overflow: 'visible' },
  hitFlash: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#fff',
    borderRadius: 20,
    zIndex: 5,
  },
  hitFlashSickly: {
    backgroundColor: 'rgba(140, 230, 120, 0.55)',
  },
  shieldRing: {
    position: 'absolute',
    alignSelf: 'center',
    width: '118%',
    aspectRatio: 1,
    borderRadius: 999,
    borderWidth: 5,
    borderColor: '#74c0fc',
    backgroundColor: 'rgba(116, 192, 252, 0.28)',
    bottom: '6%',
    zIndex: 3,
    shadowColor: '#4dabf7',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.45,
    shadowRadius: 12,
  },
  infoPanel: {
    backgroundColor: 'rgba(255,255,255,0.94)',
    borderWidth: 3,
    borderColor: ART.outlineSoft,
    borderRadius: ART.radiusMd,
    paddingHorizontal: 8,
    paddingVertical: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.14,
    shadowRadius: 4,
    elevation: 5,
  },
  infoPanelActive: {
    borderColor: '#ff9f1c',
    borderWidth: 3,
    backgroundColor: 'rgba(255, 249, 230, 0.96)',
  },
  infoPanelIdle: { borderColor: '#95a5a6' },
  infoPanelCompact: {
    paddingHorizontal: 6,
    paddingVertical: 4,
  },
  infoTitle: {
    fontSize: 10,
    fontWeight: '900',
    color: '#636e72',
    textTransform: 'uppercase',
  },
  infoTitleCompact: { fontSize: 9 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 1 },
  elementBadge: { fontSize: 14 },
  elementBadgeCompact: { fontSize: 12 },
  monName: { fontSize: 12, fontWeight: '900', color: '#1a1a2e' },
  monNameCompact: { fontSize: 11 },
  monNameFlex: { flex: 1, minWidth: 0 },
  statusTag: {
    marginTop: 2,
    alignSelf: 'flex-start',
    backgroundColor: '#9b59b6',
    color: '#fff',
    fontWeight: '900',
    fontSize: 9,
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 6,
    overflow: 'hidden',
  },
  lvLine: { fontSize: 11, fontWeight: '800', color: '#c0392b' },
  lvLineCompact: { fontSize: 10 },
  statInline: { fontSize: 11, fontWeight: '800', color: '#2d3436', marginTop: 1 },
  statInlineCompact: { fontSize: 10, marginTop: 0 },
  microTrack: {
    height: 5,
    borderRadius: 4,
    backgroundColor: 'rgba(0,0,0,0.1)',
    borderWidth: 1,
    borderColor: '#2d2d44',
    overflow: 'hidden',
    marginTop: 1,
    marginBottom: 1,
  },
  microTrackCompact: { height: 4, marginTop: 0, marginBottom: 0 },
  microFill: { height: '100%', borderRadius: 3 },
  diceCombo: { fontSize: 11, fontWeight: '800', color: '#4a5568', marginTop: 2 },
  val: { fontWeight: '900', color: '#c1121f' },
  rageTag: {
    marginTop: 2,
    alignSelf: 'flex-start',
    backgroundColor: '#e74c3c',
    color: '#fff',
    fontWeight: '900',
    fontSize: 9,
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 6,
    overflow: 'hidden',
  },
});
