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
  resizeMonsterRushRun,
  startMonsterRushRun,
  tickMonsterRush,
  togglePauseMonsterRush,
} from '../../utils/monsterRush/monsterRushEngine';
import { clampPlayfieldToViewport, getViewportLandscapeSize } from '../../utils/monsterRush/monsterRushArenaSize';
import { MONSTER_RUSH_PHYSICS } from '../../utils/monsterRush/monsterRushConfig';
import { runnerBoxImageStyle } from '../../utils/monsterRush/monsterRushRunnerImage';

/** Mobile Safari/Chrome struggle with high-DPI canvas buffers on long runs. */
function canvasDprCap() {
  if (typeof window === 'undefined') return 1;
  const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
  return isMobile ? 1 : Math.min(1.25, window.devicePixelRatio || 1);
}
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
  const canvasCtxRef = useRef(null);
  const isMobileWebRef = useRef(false);
  const monsterImgRef = useRef(null);
  const hudRefs = useRef({ distance: null, rush: null, coins: null });
  const jumpHeldRef = useRef(false);
  const wasOnGroundRef = useRef(true);
  const lastJumpSfxRef = useRef(0);
  const tryJumpRef = useRef(null);
  const onGameOverRef = useRef(onGameOver);
  const onCoinCollectRef = useRef(onCoinCollect);
  const syncHudRef = useRef(null);
  const playfieldRef = useRef({ w: 0, h: 0 });

  const [hudSnap, setHudSnap] = useState({ distanceM: 0, rushPoints: 0, coins: 0, paused: false });
  const [, setFrame] = useState(0);
  const [playfield, setPlayfield] = useState({ w: 0, h: 0 });

  const applyPlayfieldSize = useCallback((lw, lh) => {
    const capped = clampPlayfieldToViewport(lw, lh);
    const prev = playfieldRef.current;
    if (Math.abs(prev.w - capped.w) < 4 && Math.abs(prev.h - capped.h) < 4) return;
    playfieldRef.current = capped;
    setPlayfield(capped);
  }, []);

  const onPlayfieldLayout = useCallback((e) => {
    const { width, height } = e.nativeEvent.layout;
    applyPlayfieldSize(Math.floor(width), Math.floor(height));
  }, [applyPlayfieldSize]);

  useEffect(() => {
    if (playfieldRef.current.w > 0) return undefined;
    const vp = getViewportLandscapeSize();
    playfieldRef.current = vp;
    setPlayfield(vp);
    return undefined;
  }, []);

  const vpFallback = getViewportLandscapeSize();
  const w = playfield.w > 0 ? playfield.w : Math.min(vpFallback.w, Math.floor(gameWidth || vpFallback.w));
  const h = playfield.h > 0 ? playfield.h : Math.min(vpFallback.h, Math.floor(gameHeight || vpFallback.h));

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
      if (r.distance) r.distance.textContent = `${next.distanceM}m`;
      if (r.rush) r.rush.textContent = `⚡${next.rushPoints}`;
      if (r.coins) r.coins.textContent = `🪙${next.coins}`;
      if (forceReact) setHudSnap(next);
    } else {
      setHudSnap(next);
    }
  }, []);

  const bumpReact = useCallback(() => setFrame((f) => f + 1), []);

  useEffect(() => {
    if (w < 120 || h < 120) return;
    if (!gameRef.current) {
      gameRef.current = createMonsterRushRun({ gameWidth: w, gameHeight: h });
      jumpHeldRef.current = false;
      wasOnGroundRef.current = true;
      endedRef.current = false;
      lastTsRef.current = 0;
      lastRenderRef.current = 0;
      syncHud(gameRef.current, true);
      if (!USE_CANVAS) bumpReact();
      return;
    }
    const g = gameRef.current;
    if (g.gameWidth !== w || g.gameHeight !== h) {
      resizeMonsterRushRun(g, w, h);
      if (!USE_CANVAS) bumpReact();
    }
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
    if (typeof window !== 'undefined') {
      isMobileWebRef.current = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    }
  }, []);

  useEffect(() => {
    if (!USE_CANVAS || !canvasRef.current) return undefined;
    const canvas = canvasRef.current;
    const dpr = canvasDprCap();
    const bufW = Math.floor(w * dpr);
    const bufH = Math.floor(h * dpr);
    if (canvas.width === bufW && canvas.height === bufH && canvasCtxRef.current) return undefined;
    canvas.width = bufW;
    canvas.height = bufH;
    canvas.style.width = `${w}px`;
    canvas.style.height = `${h}px`;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      canvasCtxRef.current = ctx;
    }
  }, [w, h]);

  const tryJump = useCallback(() => {
    const state = gameRef.current;
    if (!state || state.isPaused || state.isGameOver) return false;
    if (!jumpMonsterRush(state)) return false;
    const now = typeof performance !== 'undefined' ? performance.now() : Date.now();
    if (now - lastJumpSfxRef.current > 120) {
      playSound('fly');
      lastJumpSfxRef.current = now;
    }
    return true;
  }, []);

  tryJumpRef.current = tryJump;
  onGameOverRef.current = onGameOver;
  onCoinCollectRef.current = onCoinCollect;
  syncHudRef.current = syncHud;

  const onJumpPressIn = useCallback(() => {
    jumpHeldRef.current = true;
    const state = gameRef.current;
    if (state?.awaitingStart) startMonsterRushRun(state);
    tryJump();
  }, [tryJump]);

  const onJumpPressOut = useCallback(() => {
    jumpHeldRef.current = false;
  }, []);

  useEffect(() => {
    let mounted = true;
    let lastDrawTs = 0;

    const loop = (ts) => {
      if (!mounted) return;
      if (!lastTsRef.current) lastTsRef.current = ts;
      const dt = Math.min(32, ts - lastTsRef.current);
      lastTsRef.current = ts;

      const state = gameRef.current;
      if (state && !state.isGameOver && !endedRef.current) {
        const wasOnGround = wasOnGroundRef.current;

        if (!state.awaitingStart && !state.isPaused) {
          const prevCoins = state.coinsCollected;
          tickMonsterRush(state, dt);

          if (jumpHeldRef.current && state.player.isOnGround && !wasOnGround) {
            tryJumpRef.current?.();
          }

          if (state.coinsCollected > prevCoins) {
            playSound('coin');
            onCoinCollectRef.current?.();
            syncHudRef.current?.(state);
          }

          if (state.isGameOver && !endedRef.current) {
            endedRef.current = true;
            syncHudRef.current?.(state, true);
            onGameOverRef.current?.({
              distanceM: state.distanceM,
              coinsCollected: state.coinsCollected,
              rushPointsThisRun: state.rushPointsThisRun,
            });
          }
        }

        wasOnGroundRef.current = state.player.isOnGround;

        if (USE_CANVAS) {
          const runActive = !state.awaitingStart && !state.isPaused;
          const shouldDraw = runActive || state.awaitingStart || state.isPaused || ts - lastDrawTs >= 16;
          if (shouldDraw) {
            lastDrawTs = ts;
            const ctx = canvasCtxRef.current;
            if (ctx) {
              const parallaxW = state.gameWidth + 160;
              drawMonsterRushFrame(ctx, state, {
                monsterImg: monsterImgRef.current,
                scrollOffset: state.scrollPx % parallaxW,
                simpleBg: isMobileWebRef.current,
              });
            }
          }
          if (runActive && ts - lastRenderRef.current >= 500) {
            lastRenderRef.current = ts;
            syncHudRef.current?.(state);
          }
        } else if (!state.awaitingStart && ts - lastRenderRef.current >= REACT_RENDER_MS) {
          lastRenderRef.current = ts;
          syncHudRef.current?.(state);
          bumpReact();
        } else if (state.awaitingStart && !USE_CANVAS) {
          bumpReact();
        }
      }

      rafRef.current = requestAnimationFrame(loop);
    };
    rafRef.current = requestAnimationFrame(loop);
    return () => {
      mounted = false;
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [bumpReact]);

  useEffect(() => {
    if (Platform.OS !== 'web' || typeof window === 'undefined') return undefined;
    const jumpKeys = new Set(['Space', 'ArrowUp']);
    const onKeyDown = (e) => {
      if (jumpKeys.has(e.code)) {
        e.preventDefault();
        if (!jumpHeldRef.current) {
          jumpHeldRef.current = true;
          const state = gameRef.current;
          if (state?.awaitingStart) startMonsterRushRun(state);
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
        const ctx = canvasCtxRef.current;
        if (ctx) {
          drawMonsterRushFrame(ctx, state, {
            monsterImg: monsterImgRef.current,
            scrollOffset: state.scrollPx % (state.gameWidth + 160),
            simpleBg: isMobileWebRef.current,
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
        onLayout={onPlayfieldLayout}
        onPressIn={onJumpPressIn}
        onPressOut={onJumpPressOut}
      >
        <canvas
          ref={canvasRef}
          style={styles.canvasFill}
        />
        <View style={styles.hudOverlay} pointerEvents="box-none">
          <View style={styles.hudTop} pointerEvents="box-none">
            <TouchableOpacity style={styles.quitBtn} onPress={onQuit}>
              <Text style={styles.quitBtnTxt}>Quit</Text>
            </TouchableOpacity>
            <Text ref={(el) => { hudRefs.current.distance = el; }} style={styles.hudCompact}>
              {hudSnap.distanceM}m
            </Text>
            <Text ref={(el) => { hudRefs.current.rush = el; }} style={styles.hudCompact}>
              ⚡{hudSnap.rushPoints}
            </Text>
            <Text ref={(el) => { hudRefs.current.coins = el; }} style={styles.hudCompact}>
              🪙{hudSnap.coins}
            </Text>
            <TouchableOpacity style={styles.pauseBtn} onPress={togglePause}>
              <Text style={styles.pauseBtnTxt}>{hudSnap.paused ? '▶' : '⏸'}</Text>
            </TouchableOpacity>
          </View>
          <Text style={styles.hint}>
            {state.awaitingStart ? 'Tap to start' : 'Hold to jump'}
          </Text>
        </View>
      </Pressable>
    );
  }

  const scrollOffset = state.scrollPx % (w + 160);
  const groundH = Math.max(32, Math.round(h * 0.14));

  return (
    <Pressable
      style={[styles.wrap, styles.wrapFill]}
      onLayout={onPlayfieldLayout}
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

        {state.awaitingStart ? (
          <View style={styles.pauseOverlay}>
            <Text style={styles.pauseTxt}>Tap to start</Text>
            <Text style={styles.startSub}>Hold to jump</Text>
          </View>
        ) : null}
        {state.isPaused && !state.awaitingStart ? (
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
        <Text style={styles.hint}>
          {state.awaitingStart ? 'Tap to start' : 'Hold to jump · Space'}
        </Text>
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
    position: 'relative',
    overflow: 'hidden',
  },
  canvasFill: {
    position: 'absolute',
    left: 0,
    top: 0,
    width: '100%',
    height: '100%',
    display: 'block',
    touchAction: 'manipulation',
    cursor: 'pointer',
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
    position: 'relative',
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
  playerImg: runnerBoxImageStyle,
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
    paddingHorizontal: 4,
    paddingVertical: 3,
  },
  hudTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 4,
    paddingHorizontal: 2,
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
  hudCompact: {
    color: '#fff4cf',
    fontWeight: '900',
    fontSize: 10,
    minWidth: 36,
    textAlign: 'center',
    textShadowColor: 'rgba(0,0,0,0.75)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  quitBtn: {
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 6,
    backgroundColor: 'rgba(30,58,95,0.88)',
    borderWidth: 1,
    borderColor: '#93c5fd',
  },
  quitBtnTxt: { color: '#ffe08a', fontWeight: '900', fontSize: 9 },
  pauseBtn: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    backgroundColor: 'rgba(30,58,95,0.9)',
    borderWidth: 1,
    borderColor: '#93c5fd',
  },
  pauseBtnTxt: { color: '#fff', fontWeight: '900', fontSize: 11 },
  hint: {
    color: 'rgba(255,255,255,0.8)',
    fontWeight: '800',
    fontSize: 8,
    textAlign: 'center',
    marginBottom: 2,
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
  startSub: { color: '#bfdbfe', fontWeight: '800', fontSize: 13, marginTop: 8 },
});
