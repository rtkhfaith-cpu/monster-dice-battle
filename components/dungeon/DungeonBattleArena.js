import React, { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  Image,
  ImageBackground,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import AnimatedMonster from '../AnimatedMonster';
import { WEB_DECORATIVE_IMAGE_PROPS } from '../../utils/webGameTouch';
import { dungeonRoleLabel, DUNGEON_ROLE_COLORS } from '../../utils/dungeon/dungeonRoles';
import { GAME_ASSETS } from '../../utils/gameAssetPaths';

const POSITION_LABEL = { 1: 'Tank', 2: 'Support', 3: 'DPS' };

function DamageFloater({ text, color, xPct, yPct, onDone }) {
  const rise = useRef(new Animated.Value(0)).current;
  const fade = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(rise, { toValue: 1, duration: 720, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      Animated.sequence([
        Animated.delay(320),
        Animated.timing(fade, { toValue: 0, duration: 420, useNativeDriver: true }),
      ]),
    ]).start(({ finished }) => {
      if (finished) onDone?.();
    });
  }, [fade, onDone, rise]);

  const ty = rise.interpolate({ inputRange: [0, 1], outputRange: [0, -42] });
  const scale = rise.interpolate({ inputRange: [0, 0.2, 1], outputRange: [0.6, 1.15, 1] });

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.floater,
        {
          left: `${xPct}%`,
          top: `${yPct}%`,
          opacity: fade,
          transform: [{ translateY: ty }, { scale }],
        },
      ]}
    >
      <Text style={[styles.floaterTxt, { color }]}>{text}</Text>
    </Animated.View>
  );
}

function BossSprite({ uri, enraged, attacking, hurt }) {
  const shake = useRef(new Animated.Value(0)).current;
  const flash = useRef(new Animated.Value(0)).current;
  const lunge = useRef(new Animated.Value(0)).current;
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!hurt && !attacking) return;
    shake.setValue(0);
    Animated.sequence([
      Animated.timing(shake, { toValue: 1, duration: 55, useNativeDriver: true }),
      Animated.timing(shake, { toValue: -1, duration: 55, useNativeDriver: true }),
      Animated.timing(shake, { toValue: 0, duration: 55, useNativeDriver: true }),
    ]).start();
    if (hurt) {
      flash.setValue(0.85);
      Animated.timing(flash, { toValue: 0, duration: 280, useNativeDriver: true }).start();
    }
  }, [attacking, flash, hurt, shake]);

  useEffect(() => {
    if (!attacking) {
      lunge.setValue(0);
      return;
    }
    lunge.setValue(0);
    Animated.sequence([
      Animated.timing(lunge, { toValue: 1, duration: 180, easing: Easing.out(Easing.quad), useNativeDriver: true }),
      Animated.timing(lunge, { toValue: 0, duration: 260, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
    ]).start();
  }, [attacking, lunge]);

  const tx = shake.interpolate({ inputRange: [-1, 0, 1], outputRange: [-8, 0, 8] });
  const atkTx = lunge.interpolate({ inputRange: [0, 1], outputRange: [0, -22] });
  const atkScale = lunge.interpolate({ inputRange: [0, 1], outputRange: [1, 1.08] });

  return (
    <Animated.View
      style={[
        styles.bossSpriteWrap,
        enraged && styles.bossEnraged,
        { transform: [{ translateX: tx }, { translateX: atkTx }, { scale: atkScale }] },
      ]}
    >
      <Animated.View pointerEvents="none" style={[styles.bossFlash, { opacity: flash }]} />
      {!uri || failed ? (
        <View style={[styles.bossArt, styles.bossArtFallback]} />
      ) : (
        <Image
          source={{ uri }}
          style={styles.bossArt}
          resizeMode="contain"
          onError={() => setFailed(true)}
          {...WEB_DECORATIVE_IMAGE_PROPS}
        />
      )}
    </Animated.View>
  );
}

/**
 * Visual dungeon raid arena — animated monsters vs boss with hit VFX.
 */
export default function DungeonBattleArena({ state, bossImage, battleGroundUri, vfx, bannerText }) {
  const bgUri = battleGroundUri || GAME_ASSETS.dungeonBattleGroundRescueArena;
  const [floaters, setFloaters] = useState([]);
  const [monsterPoses, setMonsterPoses] = useState({});
  const [bossHurt, setBossHurt] = useState(false);
  const [bossAttacking, setBossAttacking] = useState(false);
  const floaterKey = useRef(0);

  function addFloater(text, color, xPct, yPct) {
    const id = `f_${floaterKey.current++}`;
    setFloaters((prev) => [...prev, { id, text, color, xPct, yPct }]);
  }

  useEffect(() => {
    if (!vfx) return;

    if (vfx.type === 'banner') return;

    if (vfx.type === 'skill') {
      return;
    }

    if (vfx.type === 'attack') {
      if (vfx.source === 'monster') {
        setMonsterPoses((p) => ({ ...p, [vfx.sourceId]: 'attack' }));
        if (vfx.dodged) {
          addFloater('DODGE', '#fde047', 72, 28);
        } else {
          setBossHurt(true);
          addFloater(
            vfx.crit ? `${vfx.damage}!` : String(vfx.damage),
            vfx.crit ? '#fde047' : vfx.magic ? '#c4b5fd' : '#86efac',
            68,
            22,
          );
        }
        const t = setTimeout(() => {
          setMonsterPoses((p) => ({ ...p, [vfx.sourceId]: 'idle' }));
          setBossHurt(false);
        }, 700);
        return () => clearTimeout(t);
      }
      if (vfx.source === 'boss') {
        setBossAttacking(true);
        const target = state.monsters.find((m) => m.id === vfx.targetId);
        const pos = target?.position ?? 2;
        const xMap = { 1: 18, 2: 38, 3: 58 };
        if (vfx.dodged) {
          addFloater('DODGE', '#fde047', xMap[pos] ?? 38, 62);
        } else if (vfx.damage) {
          setMonsterPoses((p) => ({ ...p, [vfx.targetId]: 'hurt' }));
          addFloater(
            vfx.trueDamage ? `${vfx.damage}!` : String(vfx.damage),
            vfx.trueDamage ? '#f472b6' : '#fca5a5',
            xMap[pos] ?? 38,
            58,
          );
        }
        const t = setTimeout(() => {
          setBossAttacking(false);
          if (vfx.targetId) {
            setMonsterPoses((p) => ({ ...p, [vfx.targetId]: 'idle' }));
          }
        }, 750);
        return () => clearTimeout(t);
      }
    }

    if (vfx.type === 'heal') {
      const ids = vfx.targetIds ?? (vfx.targetId ? [vfx.targetId] : []);
      for (const id of ids) {
        const m = state.monsters.find((mon) => mon.id === id);
        const xMap = { 1: 18, 2: 38, 3: 58 };
        addFloater(vfx.cleanse ? 'CLEANSE' : `+${vfx.amount ?? 'HP'}`, '#6ee7b7', xMap[m?.position ?? 2] ?? 38, 58);
      }
    }

    if (vfx.type === 'dot' && vfx.damage) {
      const m = state.monsters.find((mon) => mon.id === vfx.targetId);
      const xMap = { 1: 18, 2: 38, 3: 58 };
      addFloater(`🔥${vfx.damage}`, '#fb923c', xMap[m?.position ?? 2] ?? 38, 58);
      setMonsterPoses((p) => ({ ...p, [vfx.targetId]: 'hurt' }));
      const t = setTimeout(() => {
        setMonsterPoses((p) => ({ ...p, [vfx.targetId]: 'idle' }));
      }, 500);
      return () => clearTimeout(t);
    }

    if (vfx.type === 'status') {
      const m = state.monsters.find((mon) => mon.id === vfx.targetId);
      const xMap = { 1: 18, 2: 38, 3: 58 };
      const label = vfx.status === 'stun' ? '💫' : vfx.status === 'freeze' ? '❄️' : '⚠️';
      addFloater(label, '#93c5fd', xMap[m?.position ?? 2] ?? 38, 54);
    }

    return undefined;
  }, [vfx, state.monsters]);

  const bossHpPct = Math.max(0, Math.round((state.boss.hp / state.boss.maxHp) * 100));

  return (
    <View style={styles.root}>
      <ImageBackground
        source={{ uri: bgUri }}
        style={styles.bg}
        imageStyle={styles.bgImg}
        resizeMode="cover"
      >
        <View style={styles.vignette} />

        {bannerText ? (
          <View style={styles.banner}>
            <Text style={styles.bannerTxt} numberOfLines={2}>{bannerText}</Text>
          </View>
        ) : null}

        {/* Boss side */}
        <View style={styles.bossZone}>
          <BossSprite
            uri={bossImage}
            enraged={state.boss.enraged}
            attacking={bossAttacking}
            hurt={bossHurt}
          />
          <View style={styles.bossHud}>
            <Text style={styles.bossName} numberOfLines={1}>
              {state.boss.name}{state.boss.enraged ? ' 🔴' : ''}
            </Text>
            <View style={styles.hpBarOuter}>
              <View style={[styles.hpBarInner, styles.bossHpFill, { width: `${bossHpPct}%` }]} />
            </View>
            <Text style={styles.hpTxt}>
              {Math.round(state.boss.hp).toLocaleString()} / {state.boss.maxHp.toLocaleString()}
            </Text>
          </View>
        </View>

        {/* Team row */}
        <View style={styles.teamZone}>
          {state.monsters.map((m) => {
            const hpPct = Math.max(0, Math.round((m.hp / m.maxHp) * 100));
            const poseKey = monsterPoses[m.id] ?? (m.alive ? 'idle' : 'dizzy');
            const pose = poseKey === 'attack' ? 'lunge' : poseKey === 'hurt' ? 'hit' : 'idle';
            const mood = m.alive ? (poseKey === 'attack' ? 'angry' : 'happy') : 'dizzy';
            return (
              <View key={m.id} style={[styles.monSlot, !m.alive && styles.monSlotDead]}>
                <Text style={styles.monPos}>{POSITION_LABEL[m.position]}</Text>
                <View style={styles.monsterSpriteWrap}>
                  <AnimatedMonster
                    parts={m.monsterParts}
                    size={52}
                    side="left"
                    mood={mood}
                    pose={pose}
                    flyStrike={poseKey === 'attack'}
                  />
                  {m.alive && (m.shieldHp ?? 0) > 0 ? (
                    <View pointerEvents="none" style={styles.activeShieldBubble} />
                  ) : null}
                </View>
                <Text style={styles.monName} numberOfLines={1}>{m.name}</Text>
                <Text style={[styles.monRole, { color: DUNGEON_ROLE_COLORS[m.role] }]}>
                  {dungeonRoleLabel(m.role)}
                </Text>
                <View style={styles.hpBarOuterSm}>
                  <View
                    style={[
                      styles.hpBarInner,
                      m.alive ? styles.allyHpFill : styles.deadHpFill,
                      { width: `${hpPct}%` },
                    ]}
                  />
                </View>
              </View>
            );
          })}
        </View>

        {floaters.map((f) => (
          <DamageFloater
            key={f.id}
            text={f.text}
            color={f.color}
            xPct={f.xPct}
            yPct={f.yPct}
            onDone={() => setFloaters((prev) => prev.filter((x) => x.id !== f.id))}
          />
        ))}
      </ImageBackground>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, minHeight: 220, borderRadius: 14, overflow: 'hidden', borderWidth: 2, borderColor: '#7c3aed' },
  bg: { flex: 1, justifyContent: 'space-between' },
  bgImg: { opacity: 0.72 },
  vignette: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(3,7,18,0.68)' },
  banner: {
    position: 'absolute',
    top: '38%',
    alignSelf: 'center',
    zIndex: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: 'rgba(2,8,23,0.97)',
    borderWidth: 2,
    borderColor: '#fcd34d',
    maxWidth: '88%',
  },
  bannerTxt: { color: '#fff8dd', fontWeight: '900', fontSize: 14, textAlign: 'center', textShadowColor: '#000', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 2 },
  bossZone: { alignItems: 'flex-end', paddingTop: 8, paddingRight: 10 },
  bossSpriteWrap: { marginRight: 4 },
  bossEnraged: { shadowColor: '#ef4444', shadowOpacity: 0.9, shadowRadius: 12 },
  bossFlash: { ...StyleSheet.absoluteFillObject, backgroundColor: '#fecaca', borderRadius: 12 },
  bossArt: { width: 120, height: 120 },
  bossArtFallback: { backgroundColor: 'rgba(124,58,237,0.45)', borderRadius: 12 },
  bossHud: {
    width: 172,
    marginTop: 4,
    backgroundColor: 'rgba(2,8,23,0.94)',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,224,138,0.3)',
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
  bossName: { color: '#fff8dd', fontWeight: '900', fontSize: 13, textAlign: 'right', textShadowColor: '#000', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 2 },
  hpBarOuter: { height: 12, borderRadius: 999, backgroundColor: 'rgba(15,23,42,0.95)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.3)', overflow: 'hidden', marginTop: 4 },
  hpBarOuterSm: { height: 8, borderRadius: 999, backgroundColor: 'rgba(15,23,42,0.95)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.25)', overflow: 'hidden', marginTop: 4, alignSelf: 'stretch' },
  hpBarInner: { height: '100%' },
  bossHpFill: { backgroundColor: '#ef4444' },
  allyHpFill: { backgroundColor: '#34d399' },
  deadHpFill: { backgroundColor: '#64748b' },
  hpTxt: { color: '#ffffff', fontWeight: '900', fontSize: 9, marginTop: 2, textAlign: 'right' },
  teamZone: { flexDirection: 'row', justifyContent: 'space-around', paddingHorizontal: 6, paddingBottom: 8 },
  monSlot: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 4,
    paddingHorizontal: 2,
    borderRadius: 10,
    backgroundColor: 'rgba(2,8,23,0.9)',
    borderWidth: 1,
    borderColor: 'rgba(255,224,138,0.22)',
    marginHorizontal: 2,
  },
  monSlotDead: { opacity: 0.45 },
  monsterSpriteWrap: { width: 66, height: 58, alignItems: 'center', justifyContent: 'center' },
  activeShieldBubble: {
    position: 'absolute',
    width: 62,
    height: 58,
    borderRadius: 999,
    borderWidth: 3,
    borderColor: 'rgba(186,230,253,0.92)',
    backgroundColor: 'rgba(125,211,252,0.22)',
    shadowColor: '#38bdf8',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.55,
    shadowRadius: 8,
    zIndex: 5,
  },
  monPos: { color: '#fcd34d', fontWeight: '900', fontSize: 8, textShadowColor: '#000', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 2 },
  monName: { color: '#ffffff', fontWeight: '900', fontSize: 8, marginTop: 2, maxWidth: 90, textAlign: 'center', textShadowColor: '#000', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 2 },
  monRole: { fontWeight: '900', fontSize: 7, textShadowColor: '#000', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 2 },
  floater: { position: 'absolute', zIndex: 30, marginLeft: -24 },
  floaterTxt: { fontWeight: '900', fontSize: 18, textShadowColor: '#000', textShadowRadius: 4, textShadowOffset: { width: 0, height: 1 } },
});
