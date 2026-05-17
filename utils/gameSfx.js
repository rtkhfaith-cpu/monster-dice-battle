/**
 * Game SFX from public/audio/sfx/*.wav (served as /audio/sfx/…).
 */
import { Platform } from 'react-native';
import { GAME_SFX } from './audioCatalog';
import { loadAudioSettings } from './audioSettings';
import { playFileAtPath, unlockAudio, startMenuMusic } from './audioManager';

/**
 * @typedef {'button'|'attack'|'critical'|'dodge'|'levelUp'|'shop'|'win'|'lose'} GameSfxKind
 */

/**
 * @param {GameSfxKind} kind
 * @param {number} [volMul]
 */
export function playGameSfx(kind, volMul = 1) {
  const s = loadAudioSettings();
  if (s.muted) return false;

  const path = GAME_SFX[kind];
  if (!path) return false;

  const bus = kind === 'button' ? 'ui' : 'impact';
  const scale = bus === 'ui' ? s.ui : s.impact;

  if (Platform.OS === 'web' && typeof Audio !== 'undefined') {
    try {
      const a = new Audio(path);
      a.volume = Math.min(1, scale * volMul);
      void a.play();
      return true;
    } catch {
      /* fall through */
    }
  }

  return playFileAtPath(path, bus, volMul);
}

/** Unlock audio + ensure menu BGM after first user tap (browser policy). */
export function ensureMenuMusic() {
  unlockAudio();
  if (!loadAudioSettings().muted) startMenuMusic();
}

/** Main menu / lobby / setup button presses. */
export function playMenuSfx(volMul = 1) {
  ensureMenuMusic();
  return playGameSfx('button', volMul);
}

/** Shop, marts, coin rewards. */
export function playShopSfx(volMul = 1) {
  return playGameSfx('shop', volMul);
}
