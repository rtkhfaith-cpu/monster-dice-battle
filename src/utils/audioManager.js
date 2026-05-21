/**
 * Central game audio — file BGM + SFX from /public/audio only.
 */

import { Platform } from 'react-native';

const MENU_BGM = ['/audio/bgm/Main1.mp3', '/audio/bgm/Main 2.mp3'];
const LADDER_BGM = ['/audio/bgm/Monster_ladder1.mp3', '/audio/bgm/Monster_ladder.mp3'];
/** Relaxed fantasy arcade — main menu tracks with ladder fallbacks if missing */
const RESCUE_BGM = [
  '/audio/bgm/Main 2.mp3',
  '/audio/bgm/Main1.mp3',
  '/audio/bgm/Monster_ladder1.mp3',
  '/audio/bgm/Monster_ladder.mp3',
];
const BATTLE_BGM = ['/audio/bgm/Main_Battle_1.mp3', '/audio/bgm/Main_Battle_2.mp3'];
const MINI_BOSS_BGM = ['/audio/bgm/Mini_Boss.mp3'];
const BOSS_BGM = ['/audio/bgm/Boss.mp3'];

const SFX = {
  button: '/audio/sfx/Button.wav',
  attack: '/audio/sfx/Attack.wav',
  critical: '/audio/sfx/Critical_Hit.wav',
  dodge: '/audio/sfx/Dodge.wav',
  levelUp: '/audio/sfx/Level_Up.wav',
  shop: '/audio/sfx/Shop.wav',
  win: '/audio/sfx/You_Win.wav',
  lose: '/audio/sfx/You_Lose.wav',
};

const FADE_MS = 420;
const FADE_STEP_MS = 40;

/** @typedef {{ muted: boolean, bgmVolume: number, sfxVolume: number }} AudioSettings */

export const AUDIO_SETTINGS_KEY = 'mdb_audio_settings';

export const AUDIO_SETTINGS_DEFAULTS = {
  muted: false,
  bgmVolume: 0.3,
  sfxVolume: 0.85,
};

let settings = { ...AUDIO_SETTINGS_DEFAULTS };
let unlocked = false;
let interactionBound = false;
let activityBound = false;
let menuWanted = false;
let battleWanted = false;
/** @type {'none'|'menu'|'battle'} */
let bgmMode = 'none';
let bgmAudio = null;
let bgmTargetMode = 'none';
let bgmTargetPath = '';
let fadeTimer = null;
let duckUntil = 0;
let duckRefreshTimer = null;
/** @type {Map<string, { pool: HTMLAudioElement[], idx: number }>} */
const sfxPools = new Map();
const SFX_POOL_SIZE = 6;
let rescuePopPending = 0;
let rescuePopFlushTimer = null;
let rescuePopLastAt = 0;
let rescueComboLastAt = 0;
let rescueShootLastAt = 0;
let wheelTickLastAt = 0;
let wheelLandLastAt = 0;
let menuPick = '';
let menuMusicKind = 'menu';
let battlePick = '';
let battleMusicKind = 'normal';
let bgmPausedForInactivity = false;

function clamp01(n) {
  return Math.max(0, Math.min(1, n));
}

/** Encode filename segments for browser URLs (spaces, etc.). */
export function encodePublicPath(path) {
  const parts = path.split('/').filter(Boolean);
  return `/${parts.map((seg, i) => (i < 2 ? seg : encodeURIComponent(seg))).join('/')}`;
}

function pickRandom(list) {
  return list[Math.floor(Math.random() * list.length)];
}

function isWeb() {
  return Platform.OS === 'web' && typeof window !== 'undefined' && typeof Audio !== 'undefined';
}

function isAppAudioActive() {
  if (!isWeb()) return false;
  if (typeof document !== 'undefined' && document.hidden) return false;
  if (typeof document !== 'undefined' && document.visibilityState && document.visibilityState !== 'visible') return false;
  return true;
}

function loadSettingsFromStorage() {
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
 * @param {object} raw
 * @returns {AudioSettings}
 */
export function normalizeAudioSettings(raw) {
  const base = { ...AUDIO_SETTINGS_DEFAULTS };
  if (!raw || typeof raw !== 'object') return base;

  if (typeof raw.muted === 'boolean') base.muted = raw.muted;

  const bgm = raw.bgmVolume ?? raw.bgm;
  const sfx = raw.sfxVolume ?? raw.sfx ?? raw.impact ?? raw.ui;
  if (typeof bgm === 'number' && Number.isFinite(bgm)) base.bgmVolume = clamp01(bgm);
  if (typeof sfx === 'number' && Number.isFinite(sfx)) base.sfxVolume = clamp01(sfx);

  return base;
}

export function loadAudioSettings() {
  settings = loadSettingsFromStorage();
  return { ...settings };
}

/**
 * @param {Partial<AudioSettings>} patch
 * @returns {AudioSettings}
 */
export function saveAudioSettings(patch) {
  settings = normalizeAudioSettings({ ...settings, ...patch });
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(AUDIO_SETTINGS_KEY, JSON.stringify(settings));
    }
  } catch {
    /* ignore */
  }
  return { ...settings };
}

function bgmVolumeNow() {
  let v = settings.bgmVolume;
  if (menuMusicKind === 'rescue' && bgmMode === 'menu') v *= 0.78;
  if (Date.now() < duckUntil) v *= menuMusicKind === 'rescue' ? 0.88 : 0.42;
  return clamp01(v);
}

function getPooledAudio(path) {
  const url = encodePublicPath(path);
  if (!sfxPools.has(path)) {
    const pool = [];
    for (let i = 0; i < SFX_POOL_SIZE; i++) {
      const el = new Audio(url);
      el.preload = 'auto';
      pool.push(el);
    }
    sfxPools.set(path, { pool, idx: 0 });
  }
  const entry = sfxPools.get(path);
  const el = entry.pool[entry.idx % entry.pool.length];
  entry.idx += 1;
  return el;
}

function warmSfxPool(paths) {
  if (!isWeb()) return;
  for (const path of paths) {
    getPooledAudio(path);
  }
}

/**
 * @param {string} path
 * @param {number} gain 0–1 before sfxVolume
 * @param {{ duckMs?: number, gentleDuck?: boolean }} [opts]
 */
function playOneShot(path, gain, opts = {}) {
  if (!isWeb() || settings.muted || !unlocked) return false;
  const duckMs = opts.duckMs ?? 0;
  if (duckMs > 0) duckBgm(duckMs, { gentle: opts.gentleDuck === true });

  try {
    const a = getPooledAudio(path);
    a.volume = clamp01(gain * settings.sfxVolume);
    const playPromise = a.play();
    if (playPromise?.catch) {
      void playPromise.catch(() => {});
    }
    return true;
  } catch {
    return false;
  }
}

function scheduleDuckRefresh(ms) {
  if (duckRefreshTimer) clearTimeout(duckRefreshTimer);
  duckRefreshTimer = setTimeout(() => {
    duckRefreshTimer = null;
    refreshBgmVolume();
  }, ms + 24);
}

function clearFade() {
  if (fadeTimer) {
    clearInterval(fadeTimer);
    fadeTimer = null;
  }
}

function battleTracksForKind(kind) {
  if (kind === 'miniBoss') return MINI_BOSS_BGM;
  if (kind === 'bigBoss') return BOSS_BGM;
  return BATTLE_BGM;
}

function pickBattleTrackPath(kind = battleMusicKind) {
  const tracks = battleTracksForKind(kind);
  if (battlePick && tracks.includes(battlePick)) return battlePick;
  return pickRandom(tracks);
}

function isBgmTrackActive(path, mode) {
  if (!path || !bgmAudio || bgmMode !== mode) return false;
  const pick = mode === 'battle' ? battlePick : menuPick;
  return pick === path && !bgmAudio.paused;
}

function isBgmFadingTo(path, mode) {
  return !!fadeTimer && bgmTargetMode === mode && bgmTargetPath === path;
}

function stopBgmElement({ clearTarget = true } = {}) {
  try {
    if (bgmAudio) {
      bgmAudio.onended = null;
      bgmAudio.pause();
      bgmAudio.currentTime = 0;
    }
  } catch {
    /* ignore */
  }
  bgmAudio = null;
  bgmMode = 'none';
  if (clearTarget) {
    bgmTargetMode = 'none';
    bgmTargetPath = '';
  }
}

function fadeOutBgm(onDone, { preserveTarget = false } = {}) {
  if (!bgmAudio) {
    onDone?.();
    return;
  }
  clearFade();
  const el = bgmAudio;
  const startVol = el.volume || bgmVolumeNow();
  const steps = Math.max(1, Math.ceil(FADE_MS / FADE_STEP_MS));
  let step = 0;
  fadeTimer = setInterval(() => {
    step += 1;
    try {
      el.volume = Math.max(0, startVol * (1 - step / steps));
    } catch {
      /* ignore */
    }
    if (step >= steps) {
      clearFade();
      stopBgmElement({ clearTarget: !preserveTarget });
      onDone?.();
    }
  }, FADE_STEP_MS);
}

/**
 * @param {string} path
 * @param {'menu'|'battle'} mode
 */
function startBgm(path, mode, fallbackPath = '', moreFallbacks = []) {
  if (!path || !isWeb() || settings.muted || !isAppAudioActive()) return false;

  if (isBgmFadingTo(path, mode) || isBgmTrackActive(path, mode)) {
    refreshBgmVolume();
    return true;
  }

  const url = encodePublicPath(path);
  if (bgmAudio && bgmMode === mode) {
    const same =
      (mode === 'menu' && menuPick === path) || (mode === 'battle' && battlePick === path);
    if (same && !bgmAudio.paused) {
      refreshBgmVolume();
      return true;
    }
    // Switching within the same mode, such as main menu -> Monster Ladder,
    // should happen immediately while still inside the user gesture.
    stopBgmElement();
  } else if (bgmAudio && bgmMode !== mode) {
    // Battle entry happens from a press; do not delay the new track behind a fade.
    stopBgmElement();
  }

  bgmTargetMode = mode;
  bgmTargetPath = path;
  fadeOutBgm(() => {
    if (bgmTargetMode !== mode || bgmTargetPath !== path) return;
    try {
      const a = new Audio(url);
      a.loop = true;
      a.volume = bgmVolumeNow();
      bgmAudio = a;
      bgmMode = mode;
      if (mode === 'menu') menuPick = path;
      else battlePick = path;

      void a.play().catch(() => {
        if (bgmAudio === a) stopBgmElement({ clearTarget: false });
        if (fallbackPath && fallbackPath !== path) {
          startBgm(fallbackPath, mode, moreFallbacks[0] ?? '', moreFallbacks.slice(1));
          return;
        }
        if (moreFallbacks.length) {
          startBgm(moreFallbacks[0], mode, moreFallbacks[1] ?? '', moreFallbacks.slice(1));
        } else {
          stopBgmElement();
        }
      });
    } catch {
      stopBgmElement();
    }
  }, { preserveTarget: true });

  return true;
}

function refreshBgmVolume() {
  if (!bgmAudio || settings.muted) return;
  try {
    bgmAudio.volume = bgmVolumeNow();
  } catch {
    /* ignore */
  }
}

function resumeWantedBgm() {
  if (!unlocked || settings.muted || !isAppAudioActive()) return;
  bgmPausedForInactivity = false;
  if (bgmAudio?.paused) {
    try {
      void bgmAudio.play();
      refreshBgmVolume();
      return;
    } catch {
      /* fall through to restart wanted track */
    }
  }
  if (battleWanted) startBattleMusic({ kind: battleMusicKind });
  else if (menuWanted) startMenuMusic({ kind: menuMusicKind });
}

function pauseBgmForInactivity() {
  if (!bgmAudio) return;
  bgmPausedForInactivity = true;
  try {
    bgmAudio.pause();
  } catch {
    /* ignore */
  }
}

function syncAudioActivity() {
  if (isAppAudioActive()) {
    if (bgmPausedForInactivity) resumeWantedBgm();
    return;
  }
  pauseBgmForInactivity();
}

function bindActivityListeners() {
  if (activityBound || !isWeb()) return;
  activityBound = true;
  if (typeof document !== 'undefined') {
    document.addEventListener('visibilitychange', syncAudioActivity);
  }
  window.addEventListener('blur', pauseBgmForInactivity);
  window.addEventListener('focus', resumeWantedBgm);
  window.addEventListener('pagehide', pauseBgmForInactivity);
  window.addEventListener('pageshow', resumeWantedBgm);
}

function bindFirstInteraction() {
  if (interactionBound || typeof document === 'undefined') return;
  interactionBound = true;

  const onInteract = () => {
    unlocked = true;
    document.removeEventListener('pointerdown', onInteract, true);
    document.removeEventListener('keydown', onInteract, true);
    document.removeEventListener('click', onInteract, true);
    if (settings.muted) return;
    if (battleWanted) startBattleMusic({ kind: battleMusicKind });
    else if (menuWanted) startMenuMusic({ kind: menuMusicKind });
  };

  document.addEventListener('pointerdown', onInteract, { capture: true, once: true });
  document.addEventListener('keydown', onInteract, { capture: true, once: true });
  document.addEventListener('click', onInteract, { capture: true, once: true });
}

/** App start — load settings, request menu BGM, bind autoplay unlock. */
export function initAudio() {
  loadAudioSettings();
  bindFirstInteraction();
  bindActivityListeners();
  menuWanted = true;
  battleWanted = false;
  if (!settings.muted) startMenuMusic();
}

export function unlockAudio() {
  unlocked = true;
  bindActivityListeners();
  if (!settings.muted && isAppAudioActive()) {
    if (battleWanted) startBattleMusic({ kind: battleMusicKind });
    else if (menuWanted) startMenuMusic({ kind: menuMusicKind });
  }
}

export function playButton() {
  return playOneShot(SFX.button, 0.65);
}

export function playAttack(volMul = 1) {
  return playOneShot(SFX.attack, 0.85 * volMul);
}

export function playCritical() {
  playAttack(0.9);
  return playOneShot(SFX.critical, 0.95);
}

export function playDodge() {
  return playOneShot(SFX.dodge, 0.85);
}

export function playLevelUp() {
  return playOneShot(SFX.levelUp, 0.85);
}

export function playShop() {
  return playOneShot(SFX.shop, 0.72);
}

/** Fortune wheel — needle tick as each wedge passes the pointer. */
export function playWheelTick() {
  if (!isWeb() || settings.muted || !unlocked) return false;
  const now = Date.now();
  if (now - wheelTickLastAt < 40) return false;
  wheelTickLastAt = now;
  duckBgm(32, { gentle: true });
  return playOneShot(SFX.button, 0.42);
}

/** Fortune wheel — final needle catch when the wheel stops. */
export function playWheelLand() {
  if (!isWeb() || settings.muted || !unlocked) return false;
  const now = Date.now();
  if (now - wheelLandLastAt < 200) return false;
  wheelLandLastAt = now;
  duckBgm(100, { gentle: true });
  playOneShot(SFX.button, 0.5);
  return playOneShot(SFX.attack, 0.48);
}

export function playWin() {
  return playOneShot(SFX.win, 0.9);
}

export function playLose() {
  return playOneShot(SFX.lose, 0.9);
}

function flushRescuePopBurst() {
  rescuePopFlushTimer = null;
  const count = rescuePopPending;
  rescuePopPending = 0;
  if (count <= 0 || !isWeb() || settings.muted || !unlocked) return false;

  rescuePopLastAt = Date.now();
  duckBgm(Math.min(70, 36 + count * 2), { gentle: true });
  const gain = clamp01(0.68 + Math.min(0.22, count * 0.018));
  return playOneShot(SFX.dodge, gain);
}

/** One pop sound per cluster (not per bubble). */
export function playRescuePopBurst(count = 1) {
  if (!isWeb() || settings.muted || !unlocked) return false;
  const n = Math.max(1, Math.floor(count || 1));
  rescuePopPending += n;

  const now = Date.now();
  if (now - rescuePopLastAt < 48) {
    if (!rescuePopFlushTimer) {
      rescuePopFlushTimer = setTimeout(flushRescuePopBurst, 52);
    }
    return false;
  }
  return flushRescuePopBurst();
}

/** @deprecated — use playRescuePopBurst */
export function playBubblePop() {
  return playRescuePopBurst(1);
}

/** Combo accent — throttled so it does not fight pops. */
export function playRescueCombo(combo = 2) {
  if (!isWeb() || settings.muted || !unlocked) return false;
  const now = Date.now();
  if (now - rescueComboLastAt < 380) return false;
  if (combo < 2) return false;
  rescueComboLastAt = now;
  duckBgm(90, { gentle: true });
  return playOneShot(SFX.critical, clamp01(0.78 + combo * 0.03));
}

/** Launcher — light duck, rate-limited. */
export function playRescueShoot() {
  if (!isWeb() || settings.muted || !unlocked) return false;
  const now = Date.now();
  if (now - rescueShootLastAt < 70) return false;
  rescueShootLastAt = now;
  duckBgm(48, { gentle: true });
  return playOneShot(SFX.attack, 0.88);
}

/** @deprecated */
export function playBubbleShoot() {
  return playRescueShoot();
}

/** Monster freed from bubble */
export function playMonsterRescued() {
  duckBgm(180, { gentle: true });
  return playOneShot(SFX.levelUp, 0.82);
}

function normalizeMenuMusicKind(input) {
  const raw = typeof input === 'string' ? input : input?.kind ?? input?.phase;
  if (raw === 'ladder') return 'ladder';
  if (raw === 'rescue') return 'rescue';
  return 'menu';
}

export function startMenuMusic(options) {
  const kind = normalizeMenuMusicKind(options);
  menuWanted = true;
  menuMusicKind = kind;
  battleWanted = false;
  if (!unlocked || settings.muted) return;
  if (bgmMode === 'battle') fadeOutBgm(() => playMenuTrack(kind));
  else playMenuTrack(kind);
}

export function startLadderMusic() {
  startMenuMusic({ kind: 'ladder' });
}

export function startRescueMusic() {
  warmSfxPool([SFX.dodge, SFX.attack, SFX.critical]);
  startMenuMusic({ kind: 'rescue' });
}

function playMenuTrack(kind = menuMusicKind) {
  const tracks =
    kind === 'ladder' ? LADDER_BGM : kind === 'rescue' ? RESCUE_BGM : MENU_BGM;
  const path = menuPick && tracks.includes(menuPick) ? menuPick : pickRandom(tracks);
  const fallbacks = tracks.filter((t) => t !== path);
  startBgm(path, 'menu', fallbacks[0] ?? '', fallbacks.slice(1));
}

export function stopMenuMusic() {
  menuWanted = false;
  if (bgmMode === 'menu') fadeOutBgm();
}

function normalizeBattleMusicKind(input) {
  const raw = typeof input === 'string' ? input : input?.kind ?? input?.stageKind ?? input?.ladderStageKind;
  if (raw === 'miniBoss' || input?.mainMiniBoss) return 'miniBoss';
  if (raw === 'bigBoss' || raw === 'boss') return 'bigBoss';
  return 'normal';
}

export function startBattleMusic(options) {
  const kind = normalizeBattleMusicKind(options);
  const kindChanged = battleMusicKind !== kind;
  battleWanted = true;
  menuWanted = false;
  battleMusicKind = kind;

  if (!unlocked || settings.muted) return;

  const path = pickBattleTrackPath(kind);

  if (!kindChanged && (isBgmTrackActive(path, 'battle') || isBgmFadingTo(path, 'battle'))) {
    refreshBgmVolume();
    return;
  }

  if (!kindChanged && bgmMode === 'battle' && bgmAudio?.paused) {
    try {
      void bgmAudio.play();
      refreshBgmVolume();
      return;
    } catch {
      /* restart below */
    }
  }

  if (kindChanged) {
    const tracks = battleTracksForKind(kind);
    if (!tracks.includes(battlePick)) battlePick = '';
  }

  playBattleTrack(kind);
}

function playBattleTrack(kind = battleMusicKind) {
  const path = pickBattleTrackPath(kind);
  battlePick = path;
  // If mini-boss file is missing, fall back to normal battle music (not boss theme).
  const fallback = kind === 'miniBoss' ? BATTLE_BGM[0] : '';
  startBgm(path, 'battle', fallback);
}

/** @deprecated use startBattleMusic */
export function startBattleMusicLoop() {
  startBattleMusic({ kind: battleMusicKind });
}

export function stopBattleMusic() {
  battleWanted = false;
  if (bgmMode === 'battle') {
    fadeOutBgm(() => {
      if (menuWanted && unlocked && !settings.muted) startMenuMusic({ kind: menuMusicKind });
    });
  } else if (menuWanted && unlocked && !settings.muted) {
    startMenuMusic({ kind: menuMusicKind });
  }
}

export function stopMusic() {
  menuWanted = false;
  battleWanted = false;
  fadeOutBgm();
}

export function setMuted(muted) {
  saveAudioSettings({ muted: !!muted });
  if (settings.muted) stopMusic();
  else if (battleWanted) startBattleMusic({ kind: battleMusicKind });
  else if (menuWanted) startMenuMusic({ kind: menuMusicKind });
}

export function setVolumes({ bgmVolume, sfxVolume } = {}) {
  const patch = {};
  if (typeof bgmVolume === 'number') patch.bgmVolume = bgmVolume;
  if (typeof sfxVolume === 'number') patch.sfxVolume = sfxVolume;
  saveAudioSettings(patch);
  refreshBgmVolume();
}

export function syncAudioManagerFromSettings(next) {
  settings = normalizeAudioSettings(next || loadSettingsFromStorage());
  if (settings.muted) {
    stopMusic();
    return;
  }
  refreshBgmVolume();
  if (battleWanted) startBattleMusic({ kind: battleMusicKind });
  else if (menuWanted) startMenuMusic({ kind: menuMusicKind });
}

export function setAudioMuted(muted) {
  setMuted(muted);
  void import('../services/syncCoordinator').then((m) => m.commitAudioSettingsSave?.());
}

export function toggleAudioMuted() {
  setMuted(!settings.muted);
  return settings.muted;
}

export function isAudioMuted() {
  return loadAudioSettings().muted;
}

/** Legacy alias */
export function setAudioVolumes({ bgm, sfx, bgmVolume, sfxVolume } = {}) {
  setVolumes({
    bgmVolume: typeof bgmVolume === 'number' ? bgmVolume : bgm,
    sfxVolume: typeof sfxVolume === 'number' ? sfxVolume : sfx,
  });
  void import('../services/syncCoordinator').then((m) => m.commitAudioSettingsSave?.());
}

/**
 * @param {number} ms
 * @param {{ gentle?: boolean }} [opts]
 */
export function duckBgm(ms = 400, opts = {}) {
  const gentle = opts.gentle && menuMusicKind === 'rescue';
  const duration = gentle ? Math.min(ms, 90) : ms;
  duckUntil = Math.max(duckUntil, Date.now() + duration);
  refreshBgmVolume();
  scheduleDuckRefresh(duration);
}

/** No-op — file BGM has no dynamic intensity layers. */
export function setBattleMusicIntensity() {}

export function isMenuMusicActive() {
  return bgmMode === 'menu' && !!bgmAudio;
}
