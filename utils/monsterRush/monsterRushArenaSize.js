import { Platform } from 'react-native';

/**
 * Default playfield size when onLayout has not fired yet (common on RN web).
 * @param {number} winW
 * @param {number} winH
 */
export function defaultMonsterRushArenaSize(winW, winH) {
  const w = Math.max(320, Math.floor(winW || 640));
  const h = Math.max(220, Math.floor((winH || 360) - (Platform.OS === 'web' ? 8 : 48)));
  return { w, h };
}

export function mergeArenaSize(measured, winW, winH) {
  if (measured?.w > 0 && measured?.h > 0) return measured;
  return defaultMonsterRushArenaSize(winW, winH);
}
