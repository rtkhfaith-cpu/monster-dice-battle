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
          resizeMode="contain"
          {...WEB_DECORATIVE_IMAGE_PROPS}
        />
      ) : (
        <Text style={styles.playerFallback}>👾</Text>
      )}
    </View>
  );
}

export default function MonsterRushGameView({ templateId, onGameOver, onJump, onCoinCollect }) {
  const gameRef = useRef(null);
  const [, setFrame] = useState(0);
  const rafRef = useRef(null);
  const lastTsRef = useRef(0);
  const endedRef = useRef(false);
  const gameW = 360;
  const gameH = 260;

  if (!gameRef.current) {
    gameRef.current = createMonsterRushRun({ gameWidth: gameW, gameHeight: gameH });
    gameRef.current.nextSpawnMs = 1800;
  }

  const bump = useCallback(() => setFrame((f) => f + 1), []);

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
  if (!state) return null;

  const scrollOffset = (state.scrollPx * 0.15) % 200;

  return (
    <Pressable style={styles.wrap} onPress={handleJump}>
      <View style={[styles.sky, { width: gameW, height: gameH }]}>
        <View style={[styles.hills, { transform: [{ translateX: -scrollOffset }] }]} />
        <View style={[styles.hills, styles.hills2, { transform: [{ translateX: -scrollOffset * 1.4 }] }]} />

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

        <View style={[styles.ground, { top: state.groundSurfaceY }]} />

        <View style={{ position: 'absolute', left: state.player.x, top: state.player.y }}>
          <PlayerBox templateId={templateId} jumping={!state.player.isOnGround} />
        </View>

        {state.isPaused ? (
          <View style={styles.pauseOverlay}>
            <Text style={styles.pauseTxt}>Paused</Text>
          </View>
        ) : null}
      </View>

      <View style={styles.hud}>
        <Text style={styles.hudTxt}>Distance: {state.distanceM}m</Text>
        <Text style={styles.hudTxt}>Rush Pts: {state.rushPointsThisRun}</Text>
        <Text style={styles.hudTxt}>Coins: {state.coinsCollected}</Text>
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
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center' },
  sky: {
    borderRadius: 14,
    overflow: 'hidden',
    borderWidth: 3,
    borderColor: '#f7c948',
    backgroundColor: '#7dd3fc',
  },
  hills: {
    position: 'absolute',
    bottom: 48,
    left: 0,
    width: 600,
    height: 60,
    backgroundColor: 'rgba(34,197,94,0.45)',
    borderTopLeftRadius: 80,
    borderTopRightRadius: 80,
  },
  hills2: {
    bottom: 40,
    height: 40,
    backgroundColor: 'rgba(22,163,74,0.35)',
  },
  ground: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 40,
    backgroundColor: '#92400e',
    borderTopWidth: 4,
    borderTopColor: '#fde68a',
  },
  playerBox: {
    width: MONSTER_RUSH_PHYSICS.playerSize,
    height: MONSTER_RUSH_PHYSICS.playerSize,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 3,
    borderColor: '#f7c948',
    backgroundColor: '#fef3c7',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#92400e',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 0,
    elevation: 4,
  },
  playerBoxJump: { transform: [{ rotate: '-8deg' }] },
  playerImg: { width: '100%', height: '100%', padding: 4 },
  playerFallback: { fontSize: 28 },
  obstacle: {
    position: 'absolute',
    borderRadius: 8,
    borderWidth: 2,
    borderColor: 'rgba(0,0,0,0.25)',
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingBottom: 2,
  },
  obsEmoji: { fontSize: 16, fontWeight: '900' },
  coin: {
    position: 'absolute',
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  coinTxt: { fontSize: 22 },
  particle: {
    position: 'absolute',
    color: '#fde047',
    fontWeight: '900',
    fontSize: 14,
  },
  hud: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  hudTxt: { color: '#fff4cf', fontWeight: '900', fontSize: 12 },
  pauseBtn: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: 'rgba(30,58,95,0.9)',
    borderWidth: 1,
    borderColor: '#93c5fd',
  },
  pauseBtnTxt: { color: '#fff', fontWeight: '900', fontSize: 12 },
  hint: { color: '#94a3b8', fontWeight: '800', fontSize: 10, marginTop: 4 },
  pauseOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pauseTxt: { color: '#fff', fontWeight: '900', fontSize: 22 },
});
