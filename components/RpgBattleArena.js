import React, { useEffect, useMemo, useRef } from 'react';
import { Animated, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import AnimatedMonster from './AnimatedMonster';
import { expToAdvanceFrom } from '../utils/expLevel';
import { BATTLE } from '../utils/gameTheme';

function MicroBar({ ratio, color }) {
  const pct = Math.max(0, Math.min(1, ratio));
  return (
    <View style={styles.microTrack}>
      <View style={[styles.microFill, { width: `${pct * 100}%`, backgroundColor: color }]} />
    </View>
  );
}

function BattlerInfoPanel({ title, fighter, diceValue, combo, active, isPlayer }) {
  const level = fighter?.level ?? 1;
  const exp = fighter?.battleExp ?? 0;
  const expNeed = fighter?.battleExpToNext ?? expToAdvanceFrom(level);
  const hpRatio = fighter?.stats?.hp ? fighter.hp / fighter.stats.hp : 0;
  const mpRatio = fighter?.stats?.mp ? fighter.mp / fighter.stats.mp : 0;
  const expRatio = expNeed > 0 ? exp / expNeed : 0;
  const diceLabel = diceValue == null ? '—' : String(diceValue);
  const rage = fighter?.stats?.hp && fighter.hp / fighter.stats.hp <= 0.3 && fighter.hp > 0;

  return (
    <View style={[styles.infoPanel, active ? styles.infoPanelActive : styles.infoPanelIdle]}>
      <Text style={styles.infoTitle} numberOfLines={1}>
        {title}
      </Text>
      <Text style={styles.monName} numberOfLines={1}>
        {fighter?.displayName || 'Monster'}
      </Text>
      <Text style={styles.lvLine}>Lv {level}</Text>
      <Text style={styles.statInline}>
        HP {fighter.hp}/{fighter.stats.hp}
      </Text>
      <MicroBar ratio={hpRatio} color={isPlayer ? '#4ecdc4' : '#ff6b6b'} />
      {isPlayer ? (
        <>
          <Text style={styles.statInline}>
            MP {fighter.mp}/{fighter.stats.mp}
          </Text>
          <MicroBar ratio={mpRatio} color="#6366f1" />
          <Text style={styles.statInline}>
            EXP {exp}/{expNeed}
          </Text>
          <MicroBar ratio={expRatio} color="#ffd166" />
        </>
      ) : null}
      <Text style={styles.diceCombo}>
        Dice <Text style={styles.val}>{diceLabel}</Text> · Cmb <Text style={styles.val}>{combo ?? 0}</Text>
      </Text>
      {rage ? <Text style={styles.rageTag}>RAGE</Text> : null}
    </View>
  );
}

/**
 * Single-screen RPG battle field — enemy top, ally bottom, turn focus.
 */
export default function RpgBattleArena({
  p1,
  p2,
  p1Mood,
  p2Mood,
  p1Pose,
  p2Pose,
  p1Bubble,
  p2Bubble,
  diceP1,
  diceP2,
  activeTurn,
  round,
  turnLabel,
  battleDim,
  shakeX,
  stageZoom,
  superJumpSide,
  p1Rage,
  p2Rage,
  /** Share of viewport height used by arena field (rest is action dock inside frame). */
  fieldHeightRatio = 0.58,
}) {
  const { width, height } = useWindowDimensions();
  const short = height < 680;
  const narrow = width < 520;
  const fieldH = height * fieldHeightRatio;

  const monsterSize = useMemo(() => {
    const byH = Math.floor(fieldH * (short ? 0.34 : 0.4));
    const byW = Math.floor(width * (narrow ? 0.44 : 0.4));
    const cap = short ? 180 : 220;
    const floor = short ? 96 : 112;
    return Math.max(floor, Math.min(cap, byH, byW));
  }, [width, fieldH, short, narrow]);

  const p1Focus = useRef(new Animated.Value(activeTurn === 1 ? 1 : 0)).current;
  const p2Focus = useRef(new Animated.Value(activeTurn === 2 ? 1 : 0)).current;

  useEffect(() => {
    const dur = short ? 160 : 220;
    Animated.timing(p1Focus, { toValue: activeTurn === 1 ? 1 : 0, duration: dur, useNativeDriver: true }).start();
    Animated.timing(p2Focus, { toValue: activeTurn === 2 ? 1 : 0, duration: dur, useNativeDriver: true }).start();
  }, [activeTurn, p1Focus, p2Focus, short]);

  const p1Scale = p1Focus.interpolate({ inputRange: [0, 1], outputRange: [0.88, 1] });
  const p1Opacity = p1Focus.interpolate({ inputRange: [0, 1], outputRange: [0.7, 1] });
  const p1Ty = p1Focus.interpolate({ inputRange: [0, 1], outputRange: [6, 0] });
  const p2Scale = p2Focus.interpolate({ inputRange: [0, 1], outputRange: [0.88, 1] });
  const p2Opacity = p2Focus.interpolate({ inputRange: [0, 1], outputRange: [0.7, 1] });
  const p2Ty = p2Focus.interpolate({ inputRange: [0, 1], outputRange: [-4, 0] });

  return (
    <Animated.View
      style={[
        styles.arenaOuter,
        battleDim && styles.arenaDim,
        { transform: [{ translateX: shakeX }, { scale: stageZoom }] },
      ]}
    >
      <View style={styles.sky} />
      <View style={styles.cloudA} />
      <View style={styles.cloudB} />
      <View style={styles.cloudC} />
      <View style={styles.hillBack} />
      <View style={styles.hillFront} />
      <View style={styles.treeL} />
      <View style={styles.treeR} />
      <View style={styles.grass} />

      <View style={styles.turnRibbon}>
        <Text style={styles.roundTxt}>R{round}</Text>
        <Text style={styles.turnTxt} numberOfLines={1}>
          {turnLabel}
        </Text>
      </View>

      <View style={styles.topZone}>
        <BattlerInfoPanel
          title="Foe"
          fighter={p2}
          diceValue={diceP2}
          combo={p2.combo}
          active={activeTurn === 2}
          isPlayer={false}
        />
        <Animated.View
          style={[
            styles.monsterCell,
            { opacity: p2Opacity, transform: [{ scale: p2Scale }, { translateY: p2Ty }] },
          ]}
        >
          {p2Bubble ? (
            <Text style={styles.bubble} numberOfLines={1}>
              {p2Bubble}
            </Text>
          ) : null}
          <View style={styles.faceLeft}>
            <AnimatedMonster
              parts={p2.monsterParts}
              size={monsterSize}
              pose={p2Pose}
              side="right"
              mood={p2Mood}
              rage={p2Rage}
              superJump={superJumpSide === 'right'}
            />
          </View>
        </Animated.View>
      </View>

      <View style={styles.midSpacer} />

      <View style={styles.bottomZone}>
        <Animated.View
          style={[
            styles.monsterCell,
            { opacity: p1Opacity, transform: [{ scale: p1Scale }, { translateY: p1Ty }] },
          ]}
        >
          {p1Bubble ? (
            <Text style={styles.bubble} numberOfLines={1}>
              {p1Bubble}
            </Text>
          ) : null}
          <AnimatedMonster
            parts={p1.monsterParts}
            size={monsterSize}
            pose={p1Pose}
            side="left"
            mood={p1Mood}
            rage={p1Rage}
            superJump={superJumpSide === 'left'}
          />
        </Animated.View>
        <BattlerInfoPanel
          title="You"
          fighter={p1}
          diceValue={diceP1}
          combo={p1.combo}
          active={activeTurn === 1}
          isPlayer
        />
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  arenaOuter: {
    flex: 1,
    width: '100%',
    minHeight: 0,
    overflow: 'hidden',
    backgroundColor: BATTLE.arenaSky,
  },
  arenaDim: { opacity: 0.88 },
  sky: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: BATTLE.arenaSky,
  },
  cloudA: {
    position: 'absolute',
    top: '8%',
    left: '12%',
    width: 56,
    height: 22,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.75)',
  },
  cloudB: {
    position: 'absolute',
    top: '14%',
    right: '10%',
    width: 72,
    height: 26,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.65)',
  },
  cloudC: {
    position: 'absolute',
    top: '6%',
    left: '48%',
    width: 44,
    height: 18,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.55)',
  },
  hillBack: {
    position: 'absolute',
    left: '-8%',
    right: '-8%',
    bottom: '28%',
    height: '22%',
    backgroundColor: '#6ecf9a',
    borderTopLeftRadius: 120,
    borderTopRightRadius: 120,
    opacity: 0.85,
  },
  hillFront: {
    position: 'absolute',
    left: '-5%',
    right: '-5%',
    bottom: '22%',
    height: '18%',
    backgroundColor: '#7ed9a8',
    borderTopLeftRadius: 100,
    borderTopRightRadius: 100,
  },
  treeL: {
    position: 'absolute',
    left: 8,
    bottom: '34%',
    width: 0,
    height: 0,
    borderLeftWidth: 14,
    borderRightWidth: 14,
    borderBottomWidth: 36,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderBottomColor: '#4a9e6e',
  },
  treeR: {
    position: 'absolute',
    right: 12,
    bottom: '32%',
    width: 0,
    height: 0,
    borderLeftWidth: 18,
    borderRightWidth: 18,
    borderBottomWidth: 44,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderBottomColor: '#3d9168',
  },
  grass: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: '36%',
    backgroundColor: BATTLE.arenaGrass,
    borderTopWidth: 2,
    borderTopColor: BATTLE.arenaGrassDark,
  },
  turnRibbon: {
    position: 'absolute',
    top: 4,
    left: 6,
    right: 6,
    zIndex: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(255,248,220,0.96)',
    borderWidth: 2,
    borderColor: '#2d2d44',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  roundTxt: { fontWeight: '900', fontSize: 14, color: '#c0392b' },
  turnTxt: {
    fontWeight: '900',
    fontSize: 14,
    color: '#1a1a2e',
    flex: 1,
    textAlign: 'right',
    marginLeft: 6,
  },
  topZone: {
    flex: 0.4,
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    paddingTop: 28,
    paddingHorizontal: 2,
    minHeight: 0,
  },
  midSpacer: { flex: 0.06, minHeight: 2 },
  bottomZone: {
    flex: 0.38,
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    paddingHorizontal: 2,
    paddingBottom: 2,
    minHeight: 0,
  },
  monsterCell: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-end',
    maxWidth: '58%',
    minHeight: 0,
    minWidth: 0,
    zIndex: 2,
  },
  faceLeft: { transform: [{ scaleX: -1 }] },
  bubble: {
    backgroundColor: '#fff',
    borderWidth: 2,
    borderColor: '#2d2d44',
    borderRadius: 8,
    paddingHorizontal: 6,
    paddingVertical: 2,
    fontWeight: '800',
    fontSize: 11,
    color: '#4a2800',
    marginBottom: 2,
    maxWidth: '100%',
    textAlign: 'center',
  },
  infoPanel: {
    backgroundColor: 'rgba(255,255,255,0.94)',
    borderWidth: 2,
    borderRadius: 10,
    paddingHorizontal: 5,
    paddingVertical: 3,
    maxWidth: '38%',
    width: '38%',
    minWidth: 88,
    flexShrink: 1,
    zIndex: 4,
    alignSelf: 'flex-start',
  },
  infoPanelActive: {
    borderColor: '#ffd166',
    backgroundColor: '#fffef5',
  },
  infoPanelIdle: {
    borderColor: '#95a5a6',
    opacity: 0.9,
  },
  infoTitle: {
    fontSize: 10,
    fontWeight: '900',
    color: '#636e72',
    textTransform: 'uppercase',
  },
  monName: {
    fontSize: 14,
    fontWeight: '900',
    color: '#1a1a2e',
    marginTop: 1,
  },
  lvLine: {
    fontSize: 12,
    fontWeight: '800',
    color: '#c0392b',
  },
  statInline: {
    fontSize: 12,
    fontWeight: '800',
    color: '#2d3436',
    marginTop: 2,
  },
  microTrack: {
    height: 6,
    borderRadius: 4,
    backgroundColor: 'rgba(0,0,0,0.12)',
    borderWidth: 1,
    borderColor: '#2d2d44',
    overflow: 'hidden',
    marginTop: 1,
    marginBottom: 2,
  },
  microFill: { height: '100%', borderRadius: 3 },
  diceCombo: {
    fontSize: 12,
    fontWeight: '800',
    color: '#4a5568',
    marginTop: 2,
  },
  val: { fontWeight: '900', color: '#c1121f' },
  rageTag: {
    marginTop: 2,
    alignSelf: 'flex-start',
    backgroundColor: '#e74c3c',
    color: '#fff',
    fontWeight: '900',
    fontSize: 10,
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 6,
    overflow: 'hidden',
  },
});
