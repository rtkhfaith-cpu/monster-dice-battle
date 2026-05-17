/**
 * Central game audio — file BGM + SFX from /public/audio only.
 */

import { Platform } from 'react-native';

const MENU_BGM = ['/audio/bgm/Main1.mp3', '/audio/bgm/Main 2.mp3'];
const BATTLE_BGM = ['/audio/bgm/Main_Battle_1.mp3', '/audio/bgm/Main_Battle_2.mp3'];

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
let menuWanted = false;
let battleWanted = false;
/** @type {'none'|'menu'|'battle'} */
let bgmMode = 'none';
let bgmAudio = null;
let fadeTimer = null;
let duckUntil = 0;
let menuPick = '';
let battlePick = '';

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
  if (Date.now() < duckUntil) v *= 0.22;
  return clamp01(v);
}

function playOneShot(path, gain) {
  if (!isWeb() || settings.muted || !unlocked) return false;
  try {
    const a = new Audio(encodePublicPath(path));
    a.volume = clamp01(gain * settings.sfxVolume);
    void a.play().catch(() => {});
    return true;
  } catch {
    return false;
  }
}

function clearFade() {
  if (fadeTimer) {
    clearInterval(fadeTimer);
    fadeTimer = null;
  }
}

function stopBgmElement() {
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
}

function fadeOutBgm(onDone) {
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
      stopBgmElement();
      onDone?.();
    }
  }, FADE_STEP_MS);
}

/**
 * @param {string} path
 * @param {'menu'|'battle'} mode
 */
function startBgm(path, mode) {
  if (!path || !isWeb() || settings.muted) return false;

  const url = encodePublicPath(path);
  if (bgmAudio && bgmMode === mode) {
    const same =
      (mode === 'menu' && menuPick === path) || (mode === 'battle' && battlePick === path);
    if (same && !bgmAudio.paused) {
      refreshBgmVolume();
      return true;
    }
  }

  fadeOutBgm(() => {
    try {
      const a = new Audio(url);
      a.loop = true;
      a.volume = bgmVolumeNow();
      bgmAudio = a;
      bgmMode = mode;
      if (mode === 'menu') menuPick = path;
      else battlePick = path;

      void a.play().catch(() => {
        if (bgmAudio === a) stopBgmElement();
      });
    } catch {
      stopBgmElement();
    }
  });

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

function bindFirstInteraction() {
  if (interactionBound || typeof document === 'undefined') return;
  interactionBound = true;

  const onInteract = () => {
    unlocked = true;
    document.removeEventListener('pointerdown', onInteract, true);
    document.removeEventListener('keydown', onInteract, true);
    document.removeEventListener('click', onInteract, true);
    if (settings.muted) return;
    if (battleWanted) startBattleMusic();
    else if (menuWanted) startMenuMusic();
  };

  document.addEventListener('pointerdown', onInteract, { capture: true, once: true });
  document.addEventListener('keydown', onInteract, { capture: true, once: true });
  document.addEventListener('click', onInteract, { capture: true, once: true });
}

/** App start — load settings, request menu BGM, bind autoplay unlock. */
export function initAudio() {
  loadAudioSettings();
  bindFirstInteraction();
  menuWanted = true;
  battleWanted = false;
  if (!settings.muted) startMenuMusic();
}

export function unlockAudio() {
  unlocked = true;
  if (!settings.muted) {
    if (battleWanted) startBattleMusic();
    else if (menuWanted) startMenuMusic();
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

export function playWin() {
  return playOneShot(SFX.win, 0.9);
}

export function playLose() {
  return playOneShot(SFX.lose, 0.9);
}

export function startMenuMusic() {
  menuWanted = true;
  battleWanted = false;
  if (!unlocked || settings.muted) return;
  if (bgmMode === 'battle') fadeOutBgm(() => playMenuTrack());
  else playMenuTrack();
}

function playMenuTrack() {
  const path = menuPick && MENU_BGM.includes(menuPick) ? menuPick : pickRandom(MENU_BGM);
  menuPick = path;
  startBgm(path, 'menu');
}

export function stopMenuMusic() {
  menuWanted = false;
  if (bgmMode === 'menu') fadeOutBgm();
}

export function startBattleMusic() {
  battleWanted = true;
  menuWanted = false;
  if (!unlocked || settings.muted) return;
  if (bgmMode === 'menu') fadeOutBgm(() => playBattleTrack());
  else playBattleTrack();
}

function playBattleTrack() {
  const path = battlePick && BATTLE_BGM.includes(battlePick) ? battlePick : pickRandom(BATTLE_BGM);
  battlePick = path;
  startBgm(path, 'battle');
}

/** @deprecated use startBattleMusic */
export function startBattleMusicLoop() {
  startBattleMusic();
}

export function stopBattleMusic() {
  battleWanted = false;
  if (bgmMode === 'battle') {
    fadeOutBgm(() => {
      if (menuWanted && unlocked && !settings.muted) startMenuMusic();
    });
  } else if (menuWanted && unlocked && !settings.muted) {
    startMenuMusic();
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
  else if (battleWanted) startBattleMusic();
  else if (menuWanted) startMenuMusic();
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
  if (battleWanted) startBattleMusic();
  else if (menuWanted) startMenuMusic();
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

export function duckBgm(ms = 400) {
  duckUntil = Date.now() + ms;
  refreshBgmVolume();
  setTimeout(() => {
    refreshBgmVolume();
  }, ms + 30);
}

/** No-op — file BGM has no dynamic intensity layers. */
export function setBattleMusicIntensity() {}

export function isMenuMusicActive() {
  return bgmMode === 'menu' && !!bgmAudio;
}
