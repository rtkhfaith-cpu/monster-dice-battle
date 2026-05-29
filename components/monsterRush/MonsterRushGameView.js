import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Image,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { getMonsterImageAsset } from '../../utils/monsterImageAssets';
import { WEB_DECORATIVE_IMAGE_PROPS } from '../../utils/webGameTouch';
import {
  createMonsterRushRun,
  jumpMonsterRush,
  tickMonsterRush,
  togglePauseMonsterRush,
} from '../../utils/monsterRush/monsterRushEngine';
import { MONSTER_RUSH_PHYSICS } from '../../utils/monsterRush/monsterRushConfig';
import { playSound } from '../../utils/sounds';

function PlayerBox({ templateId, jumping }) {
  const asset = getMonsterImageAsset(templateId);
  return (
    <View style={[styles.playerBox, jumping && styles.playerBoxJump]}>
      {asset?.path ? (
        <Image
          source={{ uri: asset.path }}
          style={styles.playerImg}
          resizeMode="cover"
          {...WEB_DECORATIVE_IMAGE_PROPS}
        />
      ) : (
        <Text style={styles.playerFallback}>👾</Text>
      )}
    </View>
  );
}

export default function MonsterRushGameView({
  templateId,
  gameWidth,
  gameHeight,
  onGameOver,
  onJump,
  onCoinCollect,
  onQuit,
}) {
  const gameRef = useRef(null);
  const [, setFrame] = useState(0);
  const rafRef = useRef(null);
  const lastTsRef = useRef(0);
  const endedRef = useRef(false);

  const w = Math.max(320, Math.floor(gameWidth || 640));
  const h = Math.max(200, Math.floor(gameHeight || 360));

  const bump = useCallback(() => setFrame((f) => f + 1), []);

  useEffect(() => {
    gameRef.current = createMonsterRushRun({ gameWidth: w, gameHeight: h });
    gameRef.current.nextSpawnMs = 1800;
    endedRef.current = false;
    lastTsRef.current = 0;
    bump();
  }, [w, h, bump]);

  const handleJump = useCallback(() => {
    const state = gameRef.current;
    if (!state) return;
    if (jumpMonsterRush(state)) {
      playSound('fly');
      onJump?.();
      bump();
    }
  }, [bump, onJump]);

  useEffect(() => {
    let mounted = true;
    const loop = (ts) => {
      if (!mounted) return;
      if (!lastTsRef.current) lastTsRef.current = ts;
      const dt = Math.min(32, ts - lastTsRef.current);
      lastTsRef.current = ts;
      const state = gameRef.current;
      if (state?.isRunning && !state.isPaused && !endedRef.current) {
        const prevCoins = state.coinsCollected;
        tickMonsterRush(state, dt);
        if (state.coinsCollected > prevCoins) {
          playSound('coin');
          onCoinCollect?.();
        }
        if (state.isGameOver && !endedRef.current) {
          endedRef.current = true;
          onGameOver?.({
            distanceM: state.distanceM,
            coinsCollected: state.coinsCollected,
            rushPointsThisRun: state.rushPointsThisRun,
          });
        }
        bump();
      }
      rafRef.current = requestAnimationFrame(loop);
    };
    rafRef.current = requestAnimationFrame(loop);
    return () => {
      mounted = false;
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [bump, onCoinCollect, onGameOver]);

  useEffect(() => {
    if (Platform.OS !== 'web' || typeof window === 'undefined') return undefined;
    const onKey = (e) => {
      if (e.code === 'Space' || e.code === 'ArrowUp') {
        e.preventDefault();
        handleJump();
      }
      if (e.code === 'KeyP') {
        togglePauseMonsterRush(gameRef.current);
        bump();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [bump, handleJump]);

  const state = gameRef.current;

  const scrollOffset = state ? (state.scrollPx * 0.15) % 200 : 0;
  const groundH = Math.max(32, Math.round(h * 0.14));

  if (!state) {
    return (
      <View style={[styles.wrap, styles.wrapFill]}>
        <View style={styles.bootOverlay}>
          <Text style={styles.bootTxt}>Starting run…</Text>
        </View>
      </View>
    );
  }

  return (
    <Pressable style={[styles.wrap, styles.wrapFill]} onPress={handleJump}>
      <View style={[styles.sky, styles.skyFill]}>
        <View style={[styles.hills, { bottom: groundH + 8, transform: [{ translateX: -scrollOffset }] }]} />
        <View style={[styles.hills, styles.hills2, { bottom: groundH, transform: [{ translateX: -scrollOffset * 1.4 }] }]} />

        {state.obstacles.map((obs) => (
          <View
            key={obs.id}
            style={[
              styles.obstacle,
              {
                left: obs.x,
                top: obs.y,
                width: obs.width,
                height: obs.height,
                backgroundColor: obs.color,
              },
            ]}
          >
            <Text style={styles.obsEmoji}>{obs.emoji}</Text>
          </View>
        ))}

        {state.coins.map((coin) => (
          <View key={coin.id} style={[styles.coin, { left: coin.x, top: coin.y }]}>
            <Text style={styles.coinTxt}>🪙</Text>
          </View>
        ))}

        {state.particles.map((p) => (
          <Text key={p.id} style={[styles.particle, { left: p.x, top: p.y, opacity: p.life / 400 }]}>
            {p.text}
          </Text>
        ))}

        <View style={[styles.ground, { top: state.groundSurfaceY, height: groundH }]} />

        <View style={{ position: 'absolute', left: state.player.x, top: state.player.y }}>
          <PlayerBox templateId={templateId} jumping={!state.player.isOnGround} />
        </View>

        {state.isPaused ? (
          <View style={styles.pauseOverlay}>
            <Text style={styles.pauseTxt}>Paused</Text>
          </View>
        ) : null}
      </View>

      <View style={styles.hudOverlay} pointerEvents="box-none">
        <View style={styles.hudTop} pointerEvents="box-none">
          <TouchableOpacity style={styles.quitBtn} onPress={onQuit}>
            <Text style={styles.quitBtnTxt}>← Quit</Text>
          </TouchableOpacity>
          <View style={styles.hudStats}>
            <Text style={styles.hudTxt}>Distance: {state.distanceM}m</Text>
            <Text style={styles.hudTxt}>Rush: {state.rushPointsThisRun}</Text>
            <Text style={styles.hudTxt}>Coins: {state.coinsCollected}</Text>
          </View>
          <TouchableOpacity
            style={styles.pauseBtn}
            onPress={(e) => {
              e?.stopPropagation?.();
              togglePauseMonsterRush(gameRef.current);
              bump();
            }}
          >
            <Text style={styles.pauseBtnTxt}>{state.isPaused ? '▶' : '⏸'}</Text>
          </TouchableOpacity>
        </View>
        <Text style={styles.hint}>Tap · click · Space to jump</Text>
      </View>
    </Pressable>
  );
}

const PS = MONSTER_RUSH_PHYSICS.playerSize;

const styles = StyleSheet.create({
  wrap: {
    alignSelf: 'stretch',
    width: '100%',
    height: '100%',
  },
  wrapFill: {
    flex: 1,
    minHeight: 200,
  },
  bootOverlay: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#7dd3fc',
  },
  bootTxt: { color: '#0c4a6e', fontWeight: '900', fontSize: 16 },
  sky: {
    borderRadius: Platform.OS === 'web' ? 0 : 10,
    overflow: 'hidden',
    borderWidth: Platform.OS === 'web' ? 0 : 2,
    borderColor: '#f7c948',
    backgroundColor: '#7dd3fc',
  },
  skyFill: {
    ...StyleSheet.absoluteFillObject,
  },
  hills: {
    position: 'absolute',
    left: 0,
    width: '200%',
    height: 60,
    backgroundColor: 'rgba(34,197,94,0.45)',
    borderTopLeftRadius: 80,
    borderTopRightRadius: 80,
  },
  hills2: {
    height: 40,
    backgroundColor: 'rgba(22,163,74,0.35)',
  },
  ground: {
    position: 'absolute',
    left: 0,
    right: 0,
    backgroundColor: '#92400e',
    borderTopWidth: 4,
    borderTopColor: '#fde68a',
  },
  playerBox: {
    width: PS,
    height: PS,
    borderRadius: 8,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: '#f7c948',
    backgroundColor: '#fef3c7',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#92400e',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.4,
    shadowRadius: 0,
    elevation: 4,
  },
  playerBoxJump: { transform: [{ rotate: '-8deg' }] },
  playerImg: { width: '110%', height: '110%' },
  playerFallback: { fontSize: 16 },
  obstacle: {
    position: 'absolute',
    borderRadius: 8,
    borderWidth: 2,
    borderColor: 'rgba(0,0,0,0.25)',
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingBottom: 2,
  },
  obsEmoji: { fontSize: 14, fontWeight: '900' },
  coin: {
    position: 'absolute',
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  coinTxt: { fontSize: 18 },
  particle: {
    position: 'absolute',
    color: '#fde047',
    fontWeight: '900',
    fontSize: 12,
  },
  hudOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'space-between',
    padding: 6,
  },
  hudTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 6,
  },
  hudStats: { flex: 1, alignItems: 'center', gap: 2 },
  hudTxt: {
    color: '#fff4cf',
    fontWeight: '900',
    fontSize: 11,
    textShadowColor: 'rgba(0,0,0,0.75)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  quitBtn: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: 'rgba(30,58,95,0.88)',
    borderWidth: 1,
    borderColor: '#93c5fd',
  },
  quitBtnTxt: { color: '#ffe08a', fontWeight: '900', fontSize: 10 },
  pauseBtn: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: 'rgba(30,58,95,0.9)',
    borderWidth: 1,
    borderColor: '#93c5fd',
  },
  pauseBtnTxt: { color: '#fff', fontWeight: '900', fontSize: 12 },
  hint: {
    color: 'rgba(255,255,255,0.75)',
    fontWeight: '800',
    fontSize: 9,
    textAlign: 'center',
    textShadowColor: 'rgba(0,0,0,0.6)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  pauseOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pauseTxt: { color: '#fff', fontWeight: '900', fontSize: 22 },
});
