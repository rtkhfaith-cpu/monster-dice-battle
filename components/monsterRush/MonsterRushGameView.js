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
import { drawMonsterRushFrame } from '../../utils/monsterRush/monsterRushCanvas';
import {
  createMonsterRushRun,
  jumpMonsterRush,
  tickMonsterRush,
  togglePauseMonsterRush,
} from '../../utils/monsterRush/monsterRushEngine';
import { MONSTER_RUSH_PHYSICS } from '../../utils/monsterRush/monsterRushConfig';
import { playSound } from '../../utils/sounds';

const USE_CANVAS = Platform.OS === 'web' && typeof document !== 'undefined';
/** React fallback render rate (native / no canvas). */
const REACT_RENDER_MS = 1000 / 15;

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
  const rafRef = useRef(null);
  const lastTsRef = useRef(0);
  const lastRenderRef = useRef(0);
  const endedRef = useRef(false);
  const canvasRef = useRef(null);
  const monsterImgRef = useRef(null);
  const hudRefs = useRef({ distance: null, rush: null, coins: null });
  const jumpHeldRef = useRef(false);
  const lastJumpSfxRef = useRef(0);

  const [hudSnap, setHudSnap] = useState({ distanceM: 0, rushPoints: 0, coins: 0, paused: false });
  const [, setFrame] = useState(0);

  const w = Math.max(320, Math.floor(gameWidth || 640));
  const h = Math.max(200, Math.floor(gameHeight || 360));

  const syncHud = useCallback((state, forceReact = false) => {
    if (!state) return;
    const next = {
      distanceM: state.distanceM,
      rushPoints: state.rushPointsThisRun,
      coins: state.coinsCollected,
      paused: state.isPaused,
    };
    if (USE_CANVAS) {
      const r = hudRefs.current;
      if (r.distance) r.distance.textContent = `Distance: ${next.distanceM}m`;
      if (r.rush) r.rush.textContent = `Rush: ${next.rushPoints}`;
      if (r.coins) r.coins.textContent = `Coins: ${next.coins}`;
      if (forceReact) setHudSnap(next);
    } else {
      setHudSnap(next);
    }
  }, []);

  const bumpReact = useCallback(() => setFrame((f) => f + 1), []);

  useEffect(() => {
    gameRef.current = createMonsterRushRun({ gameWidth: w, gameHeight: h });
    jumpHeldRef.current = false;
    endedRef.current = false;
    lastTsRef.current = 0;
    lastRenderRef.current = 0;
    syncHud(gameRef.current, true);
    if (!USE_CANVAS) bumpReact();
  }, [w, h, bumpReact, syncHud]);

  useEffect(() => {
    if (!USE_CANVAS) return undefined;
    const asset = getMonsterImageAsset(templateId);
    if (!asset?.path) {
      monsterImgRef.current = null;
      return undefined;
    }
    // Must use DOM Image — `Image` from react-native is a component, not a constructor.
    const img = document.createElement('img');
    img.decoding = 'async';
    img.src = asset.path;
    img.onload = () => {
      monsterImgRef.current = img;
    };
    return () => {
      monsterImgRef.current = null;
    };
  }, [templateId]);

  useEffect(() => {
    if (!USE_CANVAS || !canvasRef.current) return undefined;
    const canvas = canvasRef.current;
    const dpr = typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1;
    canvas.width = Math.floor(w * dpr);
    canvas.height = Math.floor(h * dpr);
    canvas.style.width = `${w}px`;
    canvas.style.height = `${h}px`;
    const ctx = canvas.getContext('2d');
    if (ctx) ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }, [w, h]);

  const tryJump = useCallback(() => {
    const state = gameRef.current;
    if (!state || state.isPaused || state.isGameOver) return false;
    if (!jumpMonsterRush(state)) return false;
    const now = typeof performance !== 'undefined' ? performance.now() : Date.now();
    if (now - lastJumpSfxRef.current > 60) {
      playSound('fly');
      lastJumpSfxRef.current = now;
    }
    onJump?.();
    return true;
  }, [onJump]);

  const onJumpPressIn = useCallback(() => {
    jumpHeldRef.current = true;
    tryJump();
  }, [tryJump]);

  const onJumpPressOut = useCallback(() => {
    jumpHeldRef.current = false;
  }, []);

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

        if (jumpHeldRef.current) {
          tryJump();
        }

        if (state.coinsCollected > prevCoins) {
          playSound('coin');
          onCoinCollect?.();
          syncHud(state);
        }

        if (state.isGameOver && !endedRef.current) {
          endedRef.current = true;
          syncHud(state, true);
          onGameOver?.({
            distanceM: state.distanceM,
            coinsCollected: state.coinsCollected,
            rushPointsThisRun: state.rushPointsThisRun,
          });
        }

        if (USE_CANVAS) {
          const canvas = canvasRef.current;
          const ctx = canvas?.getContext?.('2d');
          if (ctx) {
            drawMonsterRushFrame(ctx, state, {
              monsterImg: monsterImgRef.current,
              scrollOffset: (state.scrollPx * 0.15) % 200,
            });
          }
          if (ts - lastRenderRef.current >= 250) {
            lastRenderRef.current = ts;
            syncHud(state);
          }
        } else if (ts - lastRenderRef.current >= REACT_RENDER_MS) {
          lastRenderRef.current = ts;
          syncHud(state);
          bumpReact();
        }
      } else if (USE_CANVAS && state?.isPaused) {
        const ctx = canvasRef.current?.getContext?.('2d');
        if (ctx) {
          drawMonsterRushFrame(ctx, state, {
            monsterImg: monsterImgRef.current,
            scrollOffset: (state.scrollPx * 0.15) % 200,
          });
        }
      }

      rafRef.current = requestAnimationFrame(loop);
    };
    rafRef.current = requestAnimationFrame(loop);
    return () => {
      mounted = false;
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [bumpReact, onCoinCollect, onGameOver, syncHud, tryJump]);

  useEffect(() => {
    if (Platform.OS !== 'web' || typeof window === 'undefined') return undefined;
    const jumpKeys = new Set(['Space', 'ArrowUp']);
    const onKeyDown = (e) => {
      if (jumpKeys.has(e.code)) {
        e.preventDefault();
        if (!jumpHeldRef.current) {
          jumpHeldRef.current = true;
          tryJump();
        }
      }
      if (e.code === 'KeyP') {
        const state = gameRef.current;
        if (state) {
          togglePauseMonsterRush(state);
          syncHud(state, !USE_CANVAS);
        }
      }
    };
    const onKeyUp = (e) => {
      if (jumpKeys.has(e.code)) {
        jumpHeldRef.current = false;
      }
    };
    const releaseHold = () => {
      jumpHeldRef.current = false;
    };
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    window.addEventListener('blur', releaseHold);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('blur', releaseHold);
    };
  }, [tryJump, syncHud]);

  const togglePause = (e) => {
    e?.stopPropagation?.();
    const state = gameRef.current;
    if (state) {
      togglePauseMonsterRush(state);
      syncHud(state, !USE_CANVAS);
      if (USE_CANVAS) {
        const ctx = canvasRef.current?.getContext?.('2d');
        if (ctx) {
          drawMonsterRushFrame(ctx, state, {
            monsterImg: monsterImgRef.current,
            scrollOffset: (state.scrollPx * 0.15) % 200,
          });
        }
      } else {
        bumpReact();
      }
    }
  };

  const state = gameRef.current;

  if (!state) {
    return (
      <View style={[styles.wrap, styles.wrapFill]}>
        <View style={styles.bootOverlay}>
          <Text style={styles.bootTxt}>Starting run…</Text>
        </View>
      </View>
    );
  }

  if (USE_CANVAS) {
    return (
      <Pressable
        style={[styles.wrap, styles.wrapFill]}
        onPressIn={onJumpPressIn}
        onPressOut={onJumpPressOut}
      >
        <canvas
          ref={canvasRef}
          style={{
            width: w,
            height: h,
            display: 'block',
            touchAction: 'manipulation',
            cursor: 'pointer',
          }}
        />
        <View style={styles.hudOverlay} pointerEvents="box-none">
          <View style={styles.hudTop} pointerEvents="box-none">
            <TouchableOpacity style={styles.quitBtn} onPress={onQuit}>
              <Text style={styles.quitBtnTxt}>← Quit</Text>
            </TouchableOpacity>
            <View style={styles.hudStats}>
              <Text ref={(el) => { hudRefs.current.distance = el; }} style={styles.hudTxt}>
                Distance: {hudSnap.distanceM}m
              </Text>
              <Text ref={(el) => { hudRefs.current.rush = el; }} style={styles.hudTxt}>
                Rush: {hudSnap.rushPoints}
              </Text>
              <Text ref={(el) => { hudRefs.current.coins = el; }} style={styles.hudTxt}>
                Coins: {hudSnap.coins}
              </Text>
            </View>
            <TouchableOpacity style={styles.pauseBtn} onPress={togglePause}>
              <Text style={styles.pauseBtnTxt}>{hudSnap.paused ? '▶' : '⏸'}</Text>
            </TouchableOpacity>
          </View>
          <Text style={styles.hint}>Hold to jump · Space</Text>
        </View>
      </Pressable>
    );
  }

  const scrollOffset = (state.scrollPx * 0.15) % 200;
  const groundH = Math.max(32, Math.round(h * 0.14));

  return (
    <Pressable
      style={[styles.wrap, styles.wrapFill]}
      onPressIn={onJumpPressIn}
      onPressOut={onJumpPressOut}
    >
      <View style={[styles.sky, styles.skyFill]}>
        <View style={[styles.hills, { bottom: groundH + 8, transform: [{ translateX: -scrollOffset }] }]} />
        <View style={[styles.hills, styles.hills2, { bottom: groundH, transform: [{ translateX: -scrollOffset * 1.4 }] }]} />

        {(state.gaps ?? []).map((gap) => (
          <View
            key={gap.id}
            style={[
              styles.gapPit,
              { left: gap.x, top: state.groundSurfaceY, width: gap.width, height: groundH + 20 },
            ]}
          />
        ))}

        {(state.platforms ?? []).map((plat) => (
          <View
            key={plat.id}
            style={[
              styles.platform,
              {
                left: plat.x,
                top: plat.y,
                width: plat.width,
                height: plat.height,
                backgroundColor: plat.color || '#65a30d',
              },
            ]}
          />
        ))}

        {(state.hazards ?? []).map((hz) => (
          <View
            key={hz.id}
            style={[
              styles.obstacle,
              {
                left: hz.x,
                top: hz.y,
                width: hz.width,
                height: hz.height,
                backgroundColor: hz.color,
              },
            ]}
          />
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
            <Text style={styles.hudTxt}>Distance: {hudSnap.distanceM}m</Text>
            <Text style={styles.hudTxt}>Rush: {hudSnap.rushPoints}</Text>
            <Text style={styles.hudTxt}>Coins: {hudSnap.coins}</Text>
          </View>
          <TouchableOpacity style={styles.pauseBtn} onPress={togglePause}>
            <Text style={styles.pauseBtnTxt}>{hudSnap.paused ? '▶' : '⏸'}</Text>
          </TouchableOpacity>
        </View>
        <Text style={styles.hint}>Hold to jump · Space</Text>
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
  gapPit: { position: 'absolute', backgroundColor: '#1c1917' },
  platform: { position: 'absolute', borderRadius: 4, borderWidth: 2, borderColor: '#3f6212' },
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
