import React, { useEffect, useRef, useState } from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';

export default function PhaserBattleView({
  battleState,
  visualEvent,
  onReady,
  onVisualEventComplete,
  onError,
  height = 430,
}) {
  const hostRef = useRef(null);
  const gameRef = useRef(null);
  const sceneRef = useRef(null);
  const battleStateRef = useRef(battleState);
  const visualEventRef = useRef(visualEvent);
  const onReadyRef = useRef(onReady);
  const onVisualEventCompleteRef = useRef(onVisualEventComplete);
  const onErrorRef = useRef(onError);
  const [error, setError] = useState('');

  useEffect(() => {
    battleStateRef.current = battleState;
  }, [battleState]);

  useEffect(() => {
    visualEventRef.current = visualEvent;
  }, [visualEvent]);

  useEffect(() => {
    onReadyRef.current = onReady;
  }, [onReady]);

  useEffect(() => {
    onVisualEventCompleteRef.current = onVisualEventComplete;
  }, [onVisualEventComplete]);

  useEffect(() => {
    onErrorRef.current = onError;
  }, [onError]);

  useEffect(() => {
    if (Platform.OS !== 'web') return undefined;
    let disposed = false;
    let ready = false;
    let readyTimer = null;

    async function mountPhaser() {
      try {
        const PhaserModule = await import('phaser');
        const Phaser = PhaserModule.default ?? PhaserModule;
        const { createPhaserBattleScene } = await import('../src/phaser/PhaserBattleScene');
        if (disposed || !hostRef.current || gameRef.current) return;

        const SceneClass = createPhaserBattleScene(Phaser);
        const game = new Phaser.Game({
          type: Phaser.AUTO,
          parent: hostRef.current,
          width: 860,
          height,
          backgroundColor: '#87dfff',
          scene: SceneClass,
          scale: {
            mode: Phaser.Scale.FIT,
            autoCenter: Phaser.Scale.CENTER_BOTH,
          },
          render: {
            antialias: true,
            pixelArt: false,
          },
          physics: {
            default: 'arcade',
            arcade: { debug: false },
          },
        });

        gameRef.current = game;
        readyTimer = setTimeout(() => {
          if (disposed || ready) return;
          const msg = 'Phaser battle renderer did not start in time.';
          setError(msg);
          onErrorRef.current?.(msg);
        }, 1600);
        game.events.once('phaser-battle-ready', (scene) => {
          ready = true;
          if (readyTimer) clearTimeout(readyTimer);
          sceneRef.current = scene;
          scene.setVisualEventComplete?.((event) => onVisualEventCompleteRef.current?.(event));
          scene.updateBattleState(battleStateRef.current);
          if (visualEventRef.current) scene.playVisualEvent(visualEventRef.current);
          onReadyRef.current?.(scene);
        });
      } catch (err) {
        const msg = err?.message || 'Could not start Phaser.';
        setError(msg);
        onErrorRef.current?.(msg);
      }
    }

    mountPhaser();
    return () => {
      disposed = true;
      if (readyTimer) clearTimeout(readyTimer);
      sceneRef.current = null;
      if (gameRef.current) {
        gameRef.current.destroy(true);
        gameRef.current = null;
      }
    };
  }, [height]);

  useEffect(() => {
    sceneRef.current?.updateBattleState(battleState);
  }, [battleState]);

  useEffect(() => {
    if (visualEvent) sceneRef.current?.playVisualEvent(visualEvent);
  }, [visualEvent]);

  if (Platform.OS !== 'web') {
    return (
      <View style={[styles.fallback, { height }]}>
        <Text style={styles.fallbackTitle}>Phaser Battle Lab</Text>
        <Text style={styles.fallbackText}>The first Phaser sandbox is web/PWA only.</Text>
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
          overflow: 'hidden',
          borderRadius: 18,
        },
      })}
      {error ? (
        <View style={styles.error}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    width: '100%',
    borderRadius: 18,
    overflow: 'hidden',
    backgroundColor: '#111827',
    borderWidth: 3,
    borderColor: '#1f2937',
  },
  fallback: {
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 18,
    backgroundColor: '#111827',
    padding: 18,
  },
  fallbackTitle: { color: '#fff', fontSize: 20, fontWeight: '900' },
  fallbackText: { color: '#cbd5e1', marginTop: 8, textAlign: 'center', fontWeight: '700' },
  error: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(15, 23, 42, 0.86)',
    padding: 18,
  },
  errorText: { color: '#fecaca', fontWeight: '900', textAlign: 'center' },
});
