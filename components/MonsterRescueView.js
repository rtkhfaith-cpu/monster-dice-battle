import React, { useEffect, useRef, useState } from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';
import { RESCUE_COLORS } from './monsterRescue/rescueUiTheme';
import {
  applyWebCanvasTouchGuards,
  attachWebTouchGuards,
  gameSurfaceDataProps,
  WEB_GAME_TOUCH_STYLE,
} from '../utils/webGameTouch';

function hostDimensions(el, fallbackHeight, fallbackWidth) {
  const w = Math.max(
    280,
    el?.clientWidth || el?.offsetWidth || fallbackWidth || 360
  );
  const h = Math.max(280, el?.clientHeight || el?.offsetHeight || fallbackHeight || 520);
  return { w, h };
}

export default function MonsterRescueView({
  stageId = 1,
  shooterMonsterTemplateId,
  width,
  height = 520,
  onReady,
  onFinish,
  onRescued,
  onError,
}) {
  const hostRef = useRef(null);
  const gameRef = useRef(null);
  const onReadyRef = useRef(onReady);
  const onFinishRef = useRef(onFinish);
  const onRescuedRef = useRef(onRescued);
  const onErrorRef = useRef(onError);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    onReadyRef.current = onReady;
  }, [onReady]);
  useEffect(() => {
    onFinishRef.current = onFinish;
  }, [onFinish]);
  useEffect(() => {
    onRescuedRef.current = onRescued;
  }, [onRescued]);
  useEffect(() => {
    onErrorRef.current = onError;
  }, [onError]);

  useEffect(() => {
    if (Platform.OS !== 'web') return undefined;
    let disposed = false;
    let readyTimer = null;
    let waitPollId = null;
    let scenePollId = null;
    let ready = false;
    let resizeObserver = null;
    let resizeTimer = null;
    let detachTouchGuards = null;

    async function mountPhaser() {
      try {
        const PhaserModule = await import('phaser');
        const Phaser = PhaserModule.default ?? PhaserModule;
        const { createMonsterRescueScene } = await import('../src/phaser/monsterRescue/MonsterRescueScene');

        const markReady = (scene) => {
          if (disposed || ready) return;
          ready = true;
          if (readyTimer) clearTimeout(readyTimer);
          if (waitPollId != null) cancelAnimationFrame(waitPollId);
          if (scenePollId != null) cancelAnimationFrame(scenePollId);
          setLoading(false);
          setError('');
          onReadyRef.current?.(scene);
        };

        const markError = (msg) => {
          if (disposed || ready) return;
          ready = true;
          if (readyTimer) clearTimeout(readyTimer);
          if (waitPollId != null) cancelAnimationFrame(waitPollId);
          if (scenePollId != null) cancelAnimationFrame(scenePollId);
          setLoading(false);
          setError(msg);
          onErrorRef.current?.(msg);
        };

        const startGame = async () => {
          if (disposed || !hostRef.current || gameRef.current) return false;
          const el = hostRef.current;
          const { w, h } = hostDimensions(el, height, width);

          const { setRescueBootStageId, setRescueBootShooterTemplateId } = await import(
            '../src/phaser/monsterRescue/bootConfig'
          );
          setRescueBootStageId(stageId);
          if (shooterMonsterTemplateId) setRescueBootShooterTemplateId(shooterMonsterTemplateId);
          const SceneClass = createMonsterRescueScene(Phaser);

          const game = new Phaser.Game({
            type: Phaser.AUTO,
            parent: el,
            width: w,
            height: h,
            backgroundColor: '#1a1a2e',
            scene: SceneClass,
            banner: false,
            scale: {
              mode: Phaser.Scale.FIT,
              autoCenter: Phaser.Scale.CENTER_BOTH,
            },
            render: {
              antialias: false,
              pixelArt: false,
              roundPixels: true,
            },
          });

          gameRef.current = game;
          if (hostRef.current) {
            detachTouchGuards?.();
            detachTouchGuards = attachWebTouchGuards(hostRef.current);
          }
          applyWebCanvasTouchGuards(game.canvas);

          const handleReady = (scene) => markReady(scene);
          const handleFinish = (payload) => onFinishRef.current?.(payload);
          const handleBootError = (err) => {
            markError(err?.message || 'Monster Rescue failed to start.');
          };

          game.events.once('monster-rescue-ready', handleReady);
          game.events.once('monster-rescue-error', handleBootError);
          game.events.on('monster-rescue-finish', handleFinish);
          game.events.on('rescue:rescued', () => onRescuedRef.current?.());

          game._rescueCleanup = () => {
            if (readyTimer) clearTimeout(readyTimer);
            if (waitPollId != null) cancelAnimationFrame(waitPollId);
            if (scenePollId != null) cancelAnimationFrame(scenePollId);
            game.events.off('monster-rescue-finish', handleFinish);
            game.events.off('rescue:rescued');
          };

          const pollSceneReady = () => {
            if (disposed || ready) return;
            const scene = game.scene.getScene('MonsterRescueScene');
            if (scene?.sys?.isActive?.()) {
              markReady(scene);
              return;
            }
            scenePollId = requestAnimationFrame(pollSceneReady);
          };
          scenePollId = requestAnimationFrame(pollSceneReady);

          readyTimer = setTimeout(() => {
            if (disposed || ready) return;
            const scene = game.scene.getScene('MonsterRescueScene');
            if (scene?.sys?.isActive?.()) {
              markReady(scene);
              return;
            }
            markError('Monster Rescue did not start in time. Try refreshing the page.');
          }, 12000);

          return true;
        };

        if (!(await startGame())) {
          const waitForHost = () => {
            if (disposed) return;
            void startGame().then((ok) => {
              if (ok || disposed) return;
              waitPollId = requestAnimationFrame(waitForHost);
            });
          };
          waitPollId = requestAnimationFrame(waitForHost);
          if (typeof ResizeObserver !== 'undefined' && hostRef.current) {
            resizeObserver = new ResizeObserver(() => {
              if (disposed) return;
              if (resizeTimer) clearTimeout(resizeTimer);
              resizeTimer = setTimeout(() => {
                resizeTimer = null;
                if (disposed) return;
                const game = gameRef.current;
                const el = hostRef.current;
                if (game && el) {
                  const { w, h } = hostDimensions(el, height, width);
                  game.scale.resize(w, h);
                  const scene = game.scene.getScene('MonsterRescueScene');
                  scene?.relayout?.(w, h);
                  return;
                }
                void startGame();
              }, 120);
            });
            resizeObserver.observe(hostRef.current);
          }
        }
      } catch (err) {
        const msg = err?.message || 'Monster Rescue failed to load.';
        setError(msg);
        setLoading(false);
        onErrorRef.current?.(err);
      }
    }

    setLoading(true);
    setError('');
    mountPhaser();

    return () => {
      disposed = true;
      detachTouchGuards?.();
      detachTouchGuards = null;
      resizeObserver?.disconnect();
      if (readyTimer) clearTimeout(readyTimer);
      if (resizeTimer) clearTimeout(resizeTimer);
      if (waitPollId != null) cancelAnimationFrame(waitPollId);
      if (scenePollId != null) cancelAnimationFrame(scenePollId);
      if (gameRef.current) {
        gameRef.current._rescueCleanup?.();
        gameRef.current.destroy(true);
        gameRef.current = null;
      }
    };
  }, [height, width, stageId, shooterMonsterTemplateId]);

  if (Platform.OS !== 'web') {
    return (
      <View style={[styles.fallback, { height }]}>
        <Text style={styles.fallbackText}>Monster Rescue runs in the web browser.</Text>
      </View>
    );
  }

  return (
    <View style={[styles.wrap, { height }, WEB_GAME_TOUCH_STYLE]} {...gameSurfaceDataProps()}>
      {React.createElement('div', {
        ref: hostRef,
        'data-game-surface': 'true',
        style: {
          width: '100%',
          height: '100%',
          minHeight: Math.min(height, 280),
          maxHeight: '100%',
          overflow: 'hidden',
          ...WEB_GAME_TOUCH_STYLE,
        },
      })}
      {loading && !error ? (
        <View style={styles.loadingOverlay} pointerEvents="none">
          <Text style={styles.loadingText}>Loading Bubble Bay…</Text>
        </View>
      ) : null}
      {error ? (
        <View style={styles.errorOverlay}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    width: '100%',
    flex: 1,
    minHeight: 280,
    overflow: 'hidden',
    borderRadius: 10,
    backgroundColor: 'rgba(8, 12, 28, 0.35)',
  },
  fallback: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(8, 12, 28, 0.55)',
  },
  fallbackText: { color: RESCUE_COLORS.title, fontWeight: '800' },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(15, 22, 42, 0.72)',
  },
  loadingText: { color: RESCUE_COLORS.title, fontWeight: '900', fontSize: 14, letterSpacing: 0.3 },
  errorOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(15, 22, 42, 0.94)',
    padding: 16,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,224,143,0.45)',
  },
  errorText: { color: RESCUE_COLORS.lose, fontWeight: '800', textAlign: 'center' },
});
