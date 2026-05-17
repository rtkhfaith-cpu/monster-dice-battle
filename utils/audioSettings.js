import {
  AUDIO_SETTINGS_KEY,
  AUDIO_SETTINGS_DEFAULTS,
  normalizeAudioSettings,
  loadAudioSettings,
  saveAudioSettings,
  syncAudioManagerFromSettings,
} from './audioManager';

export {
  AUDIO_SETTINGS_KEY,
  AUDIO_SETTINGS_DEFAULTS,
  normalizeAudioSettings,
  loadAudioSettings,
  saveAudioSettings,
};

/**
 * Push settings to the audio manager.
 * @param {Partial<import('./audioManager').AudioSettings>} [patch]
 */
export function applyAudioSettings(patch) {
  const settings = patch ? saveAudioSettings(patch) : loadAudioSettings();
  syncAudioManagerFromSettings(settings);
  return settings;
}

export function describeAudioSettings(settings = loadAudioSettings()) {
  const s = normalizeAudioSettings(settings);
  return {
    muted: s.muted,
    bgmVolume: s.bgmVolume,
    sfxVolume: s.sfxVolume,
  };
}
