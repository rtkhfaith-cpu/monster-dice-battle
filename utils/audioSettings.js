import {
  BGM_TRACK_OPTIONS,
  DICE_TRACK_OPTIONS,
  ATTACK_TRACK_OPTIONS,
  CRITICAL_TRACK_OPTIONS,
  SUPER_TRACK_OPTIONS,
  labelForField,
} from './audioCatalog';

export const AUDIO_SETTINGS_KEY = 'mdb_audio_settings';

/** @typedef {{
 *   muted: boolean,
 *   bgm: number,
 *   sfx: number,
 *   ui: number,
 *   impact: number,
 *   bgmTrack: string,
 *   diceTrack: string,
 *   attackTrack: string,
 *   criticalTrack: string,
 *   superTrack: string,
 * }} AudioSettings
 */

/** @type {AudioSettings} */
export const AUDIO_SETTINGS_DEFAULTS = {
  muted: false,
  bgm: 0.3,
  sfx: 0.88,
  ui: 0.62,
  impact: 1,
  bgmTrack: 'main_battle_rotate',
  diceTrack: 'game_button',
  attackTrack: 'game_attack',
  criticalTrack: 'game_critical',
  superTrack: 'game_critical',
};

const TRACK_FIELDS = ['bgmTrack', 'diceTrack', 'attackTrack', 'criticalTrack', 'superTrack'];
const VOLUME_FIELDS = ['bgm', 'sfx', 'ui', 'impact'];

/**
 * @param {object} raw
 * @returns {AudioSettings}
 */
export function normalizeAudioSettings(raw) {
  const base = { ...AUDIO_SETTINGS_DEFAULTS };
  if (!raw || typeof raw !== 'object') return base;

  if (typeof raw.muted === 'boolean') base.muted = raw.muted;

  for (const key of VOLUME_FIELDS) {
    if (typeof raw[key] === 'number' && Number.isFinite(raw[key])) {
      base[key] = Math.max(0, Math.min(1, raw[key]));
    }
  }

  for (const key of TRACK_FIELDS) {
    if (typeof raw[key] === 'string' && raw[key]) {
      base[key] = raw[key];
    }
  }

  if (!BGM_TRACK_OPTIONS.some((o) => o.id === base.bgmTrack)) {
    base.bgmTrack = BGM_TRACK_OPTIONS[0].id;
  }
  if (!DICE_TRACK_OPTIONS.some((o) => o.id === base.diceTrack)) {
    base.diceTrack = DICE_TRACK_OPTIONS[0].id;
  }
  if (!ATTACK_TRACK_OPTIONS.some((o) => o.id === base.attackTrack)) {
    base.attackTrack = ATTACK_TRACK_OPTIONS[0].id;
  }
  if (!CRITICAL_TRACK_OPTIONS.some((o) => o.id === base.criticalTrack)) {
    base.criticalTrack = CRITICAL_TRACK_OPTIONS[0].id;
  }
  if (!SUPER_TRACK_OPTIONS.some((o) => o.id === base.superTrack)) {
    base.superTrack = SUPER_TRACK_OPTIONS[0].id;
  }

  return base;
}

export function loadAudioSettings() {
  try {
    if (typeof localStorage === 'undefined') return { ...AUDIO_SETTINGS_DEFAULTS };
    const raw = localStorage.getItem(AUDIO_SETTINGS_KEY);
    if (!raw) return { ...AUDIO_SETTINGS_DEFAULTS };
    return normalizeAudioSettings(JSON.parse(raw));
  } catch {
    return { ...AUDIO_SETTINGS_DEFAULTS };
  }
}

/**
 * Merge patch into stored settings (does not apply to audio engines).
 * @param {Partial<AudioSettings>} patch
 * @returns {AudioSettings}
 */
export function saveAudioSettings(patch) {
  const next = normalizeAudioSettings({ ...loadAudioSettings(), ...patch });
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(AUDIO_SETTINGS_KEY, JSON.stringify(next));
    }
  } catch {
    /* ignore */
  }
  return next;
}

/**
 * Push settings to audio engines (BGM pools, gains, mute).
 * @param {Partial<AudioSettings>} [patch]
 * @returns {AudioSettings}
 */
export function applyAudioSettings(patch) {
  const settings = patch ? saveAudioSettings(patch) : loadAudioSettings();

  try {
    const { syncAudioManagerFromSettings } = require('./audioManager');
    syncAudioManagerFromSettings(settings);
  } catch {
    /* optional */
  }

  try {
    const { syncHowlerFromSettings } = require('./audioHowlerWeb');
    syncHowlerFromSettings(settings);
  } catch {
    /* optional */
  }

  try {
    const { syncBattleAudioFromSettings } = require('./battleAudio');
    syncBattleAudioFromSettings(settings);
  } catch {
    /* optional */
  }

  return settings;
}

/** Human-readable summary for UI. */
export function describeAudioSettings(settings = loadAudioSettings()) {
  const s = normalizeAudioSettings(settings);
  return {
    muted: s.muted,
    bgmTrackLabel: labelForField('bgmTrack', s.bgmTrack),
    diceTrackLabel: labelForField('diceTrack', s.diceTrack),
    attackTrackLabel: labelForField('attackTrack', s.attackTrack),
    criticalTrackLabel: labelForField('criticalTrack', s.criticalTrack),
    superTrackLabel: labelForField('superTrack', s.superTrack),
  };
}
