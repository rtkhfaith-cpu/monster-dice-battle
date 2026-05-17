import { initAudio } from './audioManager';

/** @deprecated — use initAudio from audioManager */
export function initGameSounds() {
  initAudio();
  return Promise.resolve({});
}

export async function playSfx() {
  /* legacy no-op */
}
