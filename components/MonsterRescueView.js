import React, { useEffect, useRef, useState } from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';

function hostDimensions(el, fallbackHeight) {
  const w = Math.max(320, el?.clientWidth || el?.offsetWidth || 320);
  const h = Math.max(280, el?.clientHeight || el?.offsetHeight || fallbackHeight || 520);
  return { w, h };
}

export default function MonsterRescueView({
  stageId = 1,
  height = 520,
  onReady,
  onFinish,
  onPop,
  onCombo,
  onShoot,
  onRescued,
  onError,
}) {
  const hostRef = useRef(null);
  const gameRef = useRef(null);
  const onReadyRef = useRef(onReady);
  const onFinishRef = useRef(onFinish);
  const onPopRef = useRef(onPop);
  const onComboRef = useRef(onCombo);
  const onShootRef = useRef(onShoot);
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
    onPopRef.current = onPop;
  }, [onPop]);
  useEffect(() => {
    onComboRef.current = onCombo;
  }, [onCombo]);
  useEffect(() => {
    onShootRef.current = onShoot;
  }, [onShoot]);
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

    async function mountPhaser() {
      try {
        const PhaserModule = await import('phaser');
        const Phaser = PhaserModule.default ?? PhaserModule;
        const { createMonsterRescueScene } = await import('../src/phaser/monsterRescue/MonsterRescueScene');
        const { setRescueBootStageId } = await import('../src/phaser/monsterRescue/bootConfig');

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

        const startGame = () => {
          if (disposed || !hostRef.current || gameRef.current) return false;
          const el = hostRef.current;
          const { w, h } = hostDimensions(el, height);

          setRescueBootStageId(stageId);
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
              antialias: true,
              pixelArt: false,
            },
          });

          gameRef.current = game;

          const handleReady = (scene) => markReady(scene);
          const handleFinish = (payload) => onFinishRef.current?.(payload);
          const handleBootError = (err) => {
            markError(err?.message || 'Monster Rescue failed to start.');
          };

          game.events.once('monster-rescue-ready', handleReady);
          game.events.once('monster-rescue-error', handleBootError);
          game.events.on('monster-rescue-finish', handleFinish);
          game.events.on('rescue:pop', () => onPopRef.current?.());
          game.events.on('rescue:combo', (combo) => onComboRef.current?.(combo));
          game.events.on('rescue:shoot', () => onShootRef.current?.());
          game.events.on('rescue:rescued', () => onRescuedRef.current?.());

          game._rescueCleanup = () => {
            if (readyTimer) clearTimeout(readyTimer);
            if (waitPollId != null) cancelAnimationFrame(waitPollId);
            if (scenePollId != null) cancelAnimationFrame(scenePollId);
            game.events.off('monster-rescue-finish', handleFinish);
            game.events.off('rescue:pop');
            game.events.off('rescue:combo');
            game.events.off('rescue:shoot');
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

        if (!startGame()) {
          const waitForHost = () => {
            if (disposed || startGame()) return;
            waitPollId = requestAnimationFrame(waitForHost);
          };
          waitPollId = requestAnimationFrame(waitForHost);
          if (typeof ResizeObserver !== 'undefined' && hostRef.current) {
            resizeObserver = new ResizeObserver(() => {
              if (!disposed) startGame();
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
      resizeObserver?.disconnect();
      if (readyTimer) clearTimeout(readyTimer);
      if (waitPollId != null) cancelAnimationFrame(waitPollId);
      if (scenePollId != null) cancelAnimationFrame(scenePollId);
      if (gameRef.current) {
        gameRef.current._rescueCleanup?.();
        gameRef.current.destroy(true);
        gameRef.current = null;
      }
    };
  }, [height, stageId]);

  if (Platform.OS !== 'web') {
    return (
      <View style={[styles.fallback, { height }]}>
        <Text style={styles.fallbackText}>Monster Rescue runs in the web browser.</Text>
      </View>
    );
  }

  return (
    <View style={[styles.wrap, { height }]}>
      {React.createElement('div', {
        ref: hostRef,
        style: {
          width: '100%',
          height: '100%',
          minHeight: height,
          overflow: 'hidden',
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
    borderRadius: 12,
    backgroundColor: '#1a1a2e',
    borderWidth: 2,
    borderColor: '#4a5568',
  },
  fallback: { alignItems: 'center', justifyContent: 'center', backgroundColor: '#1a1a2e' },
  fallbackText: { color: '#ffe6a3', fontWeight: '700' },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(15, 23, 42, 0.55)',
  },
  loadingText: { color: '#ffe6a3', fontWeight: '800', fontSize: 14 },
  errorOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(15, 23, 42, 0.9)',
    padding: 16,
  },
  errorText: { color: '#fecaca', fontWeight: '800', textAlign: 'center' },
});
