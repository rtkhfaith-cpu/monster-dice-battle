import React, { useEffect, useRef, useState } from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';

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

    async function mount() {
      try {
        const PhaserModule = await import('phaser');
        const Phaser = PhaserModule.default ?? PhaserModule;
        const { createMonsterRescueScene } = await import('../src/phaser/monsterRescue/MonsterRescueScene');
        const { setRescueBootStageId } = await import('../src/phaser/monsterRescue/bootConfig');
        if (disposed || !hostRef.current || gameRef.current) return;

        setRescueBootStageId(stageId);
        const SceneClass = createMonsterRescueScene(Phaser);
        const game = new Phaser.Game({
          type: Phaser.AUTO,
          parent: hostRef.current,
          width: 390,
          height,
          backgroundColor: '#5ec8ff',
          scene: SceneClass,
          scale: {
            mode: Phaser.Scale.FIT,
            autoCenter: Phaser.Scale.CENTER_BOTH,
          },
        });

        gameRef.current = game;

        const handleReady = (scene) => onReadyRef.current?.(scene);
        const handleFinish = (payload) => onFinishRef.current?.(payload);
        const handlePop = () => onPopRef.current?.();
        const handleCombo = (combo) => onComboRef.current?.(combo);
        const handleShoot = () => onShootRef.current?.();
        const handleRescued = () => onRescuedRef.current?.();

        game.events.on('monster-rescue-ready', handleReady);
        game.events.on('monster-rescue-finish', handleFinish);
        game.events.on('rescue:pop', handlePop);
        game.events.on('rescue:combo', handleCombo);
        game.events.on('rescue:shoot', handleShoot);
        game.events.on('rescue:rescued', handleRescued);

        return () => {
          game.events.off('monster-rescue-ready', handleReady);
          game.events.off('monster-rescue-finish', handleFinish);
          game.events.off('rescue:pop', handlePop);
          game.events.off('rescue:combo', handleCombo);
          game.events.off('rescue:shoot', handleShoot);
          game.events.off('rescue:rescued', handleRescued);
        };
      } catch (err) {
        const msg = err?.message || 'Monster Rescue failed to load.';
        setError(msg);
        onErrorRef.current?.(err);
      }
    }

    const cleanupPromise = mount();
    return () => {
      disposed = true;
      cleanupPromise?.then?.((cleanup) => cleanup?.());
      if (gameRef.current) {
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
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <View ref={hostRef} style={styles.canvasHost} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { width: '100%', overflow: 'hidden', borderRadius: 16 },
  canvasHost: { width: '100%', height: '100%' },
  fallback: { alignItems: 'center', justifyContent: 'center', backgroundColor: '#5ec8ff' },
  fallbackText: { color: '#0f172a', fontWeight: '700' },
  error: { position: 'absolute', zIndex: 2, color: '#b91c1c', padding: 8 },
});
