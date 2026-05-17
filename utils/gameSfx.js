/** @deprecated — prefer audioManager / sounds.js */
import {
  playButton,
  playShop,
  playAttack,
  playCritical,
  playDodge,
  playLevelUp,
  playWin,
  playLose,
  unlockAudio,
  startMenuMusic,
  loadAudioSettings,
} from './audioManager';

export function playGameSfx(kind) {
  switch (kind) {
    case 'button':
      return playButton();
    case 'attack':
      return playAttack();
    case 'critical':
      return playCritical();
    case 'dodge':
      return playDodge();
    case 'levelUp':
      return playLevelUp();
    case 'shop':
      return playShop();
    case 'win':
      return playWin();
    case 'lose':
      return playLose();
    default:
      return false;
  }
}

export const playMenuSfx = playButton;
export const playShopSfx = playShop;

export function ensureMenuMusic() {
  unlockAudio();
  if (!loadAudioSettings().muted) startMenuMusic();
}
