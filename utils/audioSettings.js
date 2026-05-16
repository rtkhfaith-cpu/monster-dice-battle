const KEY = 'mdb_audio_settings';

const DEFAULTS = {
  muted: false,
  bgm: 0.3,
  sfx: 0.88,
  ui: 0.62,
  impact: 1,
};

export function loadAudioSettings() {
  try {
    if (typeof localStorage === 'undefined') return { ...DEFAULTS };
    const raw = localStorage.getItem(KEY);
    if (!raw) return { ...DEFAULTS };
    const parsed = JSON.parse(raw);
    return { ...DEFAULTS, ...parsed };
  } catch {
    return { ...DEFAULTS };
  }
}

export function saveAudioSettings(next) {
  try {
    if (typeof localStorage === 'undefined') return;
    localStorage.setItem(KEY, JSON.stringify({ ...loadAudioSettings(), ...next }));
  } catch {
    /* ignore */
  }
}
