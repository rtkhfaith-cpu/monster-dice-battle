/**
 * Battle-screen audio aliases — all logic lives in audioManager.
 */
import {
  duckBgm,
  unlockAudio,
  startBattleMusic,
  startBattleMusicLoop,
  stopBattleMusic,
  setBattleMusicIntensity,
  isAudioMuted,
  toggleAudioMuted,
  setAudioMuted,
  syncAudioManagerFromSettings,
  playButton,
} from './audioManager';

export {
  duckBgm,
  setBattleMusicIntensity,
  startBattleMusic,
  startBattleMusicLoop,
  stopBattleMusic,
  syncAudioManagerFromSettings,
};

export function unlockBattleAudio() {
  unlockAudio();
}

export function isBattleMuted() {
  return isAudioMuted();
}

export function toggleBattleMuted() {
  return toggleAudioMuted();
}

export function setBattleMuted(muted) {
  setAudioMuted(muted);
}

export function syncBattleAudioFromSettings(settings) {
  syncAudioManagerFromSettings(settings);
}

export function playUiSfx() {
  unlockAudio();
  playButton();
}
