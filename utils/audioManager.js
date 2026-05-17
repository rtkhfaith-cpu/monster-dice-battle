/**
 * Game audio — menu BGM (Main1 / Main 2) + battle BGM (Main_battle_1 / 2), rotating.
 */

import { Platform } from 'react-native';
import {
  loadAudioSettings,
  saveAudioSettings,
  normalizeAudioSettings,
} from './audioSettings';
import {
  BATTLE_BGM_PATHS,
  MENU_BGM_PATHS,
  getMenuBgmPath,
  resolveBattleBgmPath,
  shouldRotateBattleBgm,
  isBattleBgmPath,
  VICTORY_PATH,
  DEFEAT_PATH,
} from './audioCatalog';

/** @typedef {'normal'|'tension'|'danger'|'victory'|'defeat'} MusicState */
/** @typedef {'none'|'menu'|'battle'} BgmMode */

let ctx = null;
let masterGain = null;
let bgmGain = null;
let sfxGain = null;
let uiGain = null;
let impactGain = null;
let unlocked = false;
let muted = false;
let musicState = /** @type {MusicState} */ ('normal');
let bgmMode = /** @type {BgmMode} */ ('none');
let musicTimer = null;
let duckUntil = 0;
let fadeTimer = null;
let bgmTargetVol = 0.3;
let fileBgm = null;
let fileBgmSrc = '';
let battleBgmRotateIndex = 0;
let menuBgmRotateIndex = 0;
let fileBgmPlaying = false;
let menuMusicWanted = false;
/** @type {import('./audioSettings').AudioSettings|null} */
let cachedSettings = null;

const LEGACY_SFX_FILES = {
  ui_click: '/audio/sfx/ui_click.mp3',
  hit_light: '/audio/sfx/hit_light.mp3',
  hit_heavy: '/audio/sfx/hit_heavy.mp3',
  hit_crit: '/audio/sfx/hit_crit.mp3',
  defend_shield: '/audio/sfx/defend_shield.mp3',
  fly_whoosh: '/audio/sfx/fly_whoosh.mp3',
  water_splash: '/audio/sfx/water_splash.mp3',
  fire_blast: '/audio/sfx/fire_blast.mp3',
  metal_clang: '/audio/sfx/metal_clang.mp3',
  bacteria_squish: '/audio/sfx/bacteria_squish.mp3',
  egg_crack: '/audio/sfx/egg_crack.mp3',
  poop_splat: '/audio/sfx/poop_splat.mp3',
};

function settings() {
  if (!cachedSettings) cachedSettings = loadAudioSettings();
  return cachedSettings;
}

function getCtx() {
  if (Platform.OS !== 'web' || typeof window === 'undefined') return null;
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return null;
  if (!ctx) {
    ctx = new AC();
    masterGain = ctx.createGain();
    bgmGain = ctx.createGain();
    sfxGain = ctx.createGain();
    uiGain = ctx.createGain();
    impactGain = ctx.createGain();
    masterGain.gain.value = 1;
    bgmGain.gain.value = 0;
    masterGain.connect(ctx.destination);
    bgmGain.connect(masterGain);
    sfxGain.connect(masterGain);
    uiGain.connect(masterGain);
    impactGain.connect(masterGain);
  }
  return ctx;
}

function applySettingsToGains() {
  const s = settings();
  muted = !!s.muted;
  bgmTargetVol = s.bgm;
  if (sfxGain) sfxGain.gain.value = s.sfx;
  if (uiGain) uiGain.gain.value = s.ui;
  if (impactGain) impactGain.gain.value = s.impact;
  updateBgmGain();
  refreshFileBgmVolume();
}

function refreshFileBgmVolume() {
  if (fileBgm && !muted) {
    try {
      fileBgm.volume = currentBgmVolume();
    } catch {
      /* ignore */
    }
  }
}

function currentBgmVolume() {
  const now = Date.now();
  const s = settings();
  let vol = s.bgm;
  if (bgmMode === 'battle') {
    if (musicState === 'danger') vol *= 1.12;
    else if (musicState === 'tension') vol *= 1.05;
  }
  if (now < duckUntil) return vol * 0.22;
  return vol;
}

function updateBgmGain() {
  if (!bgmGain || !ctx) return;
  const t = ctx.currentTime;
  bgmGain.gain.cancelScheduledValues(t);
  bgmGain.gain.setValueAtTime(bgmGain.gain.value, t);
  bgmGain.gain.linearRampToValueAtTime(muted ? 0 : currentBgmVolume(), t + 0.08);
}

export function duckBgm(ms = 400) {
  duckUntil = Date.now() + ms;
  updateBgmGain();
  refreshFileBgmVolume();
  setTimeout(() => {
    updateBgmGain();
    refreshFileBgmVolume();
  }, ms + 30);
}

function pitchMul() {
  return 0.95 + Math.random() * 0.1;
}

function tryPlayFile(path, vol = 1) {
  if (!path || !unlocked || muted || Platform.OS !== 'web' || typeof Audio === 'undefined') return false;
  try {
    const a = new Audio(path);
    a.volume = Math.min(1, vol);
    void a.play();
    return true;
  } catch {
    return false;
  }
}

export function playFileSfx(key, vol = 1, bus = 'impact') {
  const s = settings();
  const scale = bus === 'ui' ? s.ui : bus === 'impact' ? s.impact : s.sfx;
  try {
    const { playHowlerSfx, howlerWebAvailable, isHowlerUnlocked } = require('./audioHowlerWeb');
    if (howlerWebAvailable() && isHowlerUnlocked() && playHowlerSfx(key, bus, vol * scale)) {
      return true;
    }
  } catch {
    /* howler optional */
  }
  const path = LEGACY_SFX_FILES[key];
  if (!path) return false;
  return tryPlayFile(path, vol * scale);
}

export function playFileAtPath(path, bus = 'impact', vol = 1) {
  if (!path) return false;
  const s = settings();
  const scale = bus === 'ui' ? s.ui : bus === 'impact' ? s.impact : s.sfx;
  return tryPlayFile(path, vol * scale);
}

function handleBgmEnded() {
  if (muted || !fileBgmPlaying) return;

  if (bgmMode === 'menu') {
    menuBgmRotateIndex = (menuBgmRotateIndex + 1) % MENU_BGM_PATHS.length;
    const next = getMenuBgmPath(menuBgmRotateIndex);
    if (next) tryStartFileBgm(next, 'menu');
    return;
  }

  if (bgmMode === 'battle') {
    if (musicState === 'victory' || musicState === 'defeat') return;
    const s = settings();
    if (!shouldRotateBattleBgm(s.bgmTrack)) return;
    battleBgmRotateIndex = (battleBgmRotateIndex + 1) % BATTLE_BGM_PATHS.length;
    const next = resolveBattleBgmPath(s.bgmTrack, battleBgmRotateIndex);
    if (next) tryStartFileBgm(next, 'battle');
  }
}

/**
 * @param {string} path
 * @param {'menu'|'battle'} mode
 */
function tryStartFileBgm(path, mode) {
  if (!path) return false;
  if (fileBgmSrc === path && fileBgm && !fileBgm.paused && bgmMode === mode) return true;
  stopFileBgm();
  if (Platform.OS !== 'web' || typeof Audio === 'undefined') return false;

  const s = settings();
  const isBattle = isBattleBgmPath(path);
  const rotateMenu = mode === 'menu';
  const rotateBattle = isBattle && shouldRotateBattleBgm(s.bgmTrack);
  const loopSingle = mode === 'battle' && isBattle && !rotateBattle;

  try {
    const a = new Audio(path);
    bgmMode = mode;
    a.loop = loopSingle || (musicState === 'victory' || musicState === 'defeat');
    a.volume = currentBgmVolume();
    if (rotateMenu || rotateBattle) {
      a.onended = handleBgmEnded;
    } else {
      a.onended = null;
    }
    fileBgm = a;
    fileBgmSrc = path;
    fileBgmPlaying = true;
    void a.play().catch(() => {
      fileBgmPlaying = false;
      fileBgm = null;
      fileBgmSrc = '';
      bgmMode = 'none';
    });
    return true;
  } catch {
    fileBgm = null;
    fileBgmSrc = '';
    fileBgmPlaying = false;
    bgmMode = 'none';
    return false;
  }
}

function stopFileBgm() {
  try {
    if (fileBgm) {
      fileBgm.onended = null;
      fileBgm.pause();
      fileBgm.currentTime = 0;
    }
  } catch {
    /* ignore */
  }
  fileBgm = null;
  fileBgmSrc = '';
  fileBgmPlaying = false;
  bgmMode = 'none';
}

/** Lobby / home screens — Main1.mp3 ↔ Main 2.mp3 */
export function startMenuMusic() {
  menuMusicWanted = true;
  if (!unlocked || muted) return;
  if (bgmMode === 'menu' && fileBgmPlaying) return;

  cachedSettings = loadAudioSettings();
  applySettingsToGains();
  menuBgmRotateIndex = 0;
  const path = getMenuBgmPath(menuBgmRotateIndex);
  tryStartFileBgm(path, 'menu');
}

export function stopMenuMusic() {
  menuMusicWanted = false;
  if (bgmMode === 'menu') stopFileBgm();
}

export function isMenuMusicActive() {
  return bgmMode === 'menu' && fileBgmPlaying;
}

export function unlockAudio() {
  unlocked = true;
  cachedSettings = loadAudioSettings();
  try {
    const { initHowlerWeb, unlockHowlerWeb } = require('./audioHowlerWeb');
    initHowlerWeb();
    unlockHowlerWeb();
  } catch {
    /* howler optional */
  }
  applySettingsToGains();
  const audio = getCtx();
  if (!audio) return;
  if (audio.state === 'suspended') void audio.resume().catch(() => {});
  try {
    const buffer = audio.createBuffer(1, 1, 22050);
    const src = audio.createBufferSource();
    src.buffer = buffer;
    src.connect(audio.destination);
    src.start(0);
    src.stop(0.01);
  } catch {
    /* mobile unlock */
  }
  if (menuMusicWanted && !muted) startMenuMusic();
}

export function syncAudioManagerFromSettings(nextSettings) {
  const prev = cachedSettings;
  cachedSettings = normalizeAudioSettings(nextSettings || loadAudioSettings());
  applySettingsToGains();

  if (muted) {
    stopMenuMusic();
    stopBattleMusic();
    return;
  }

  if (bgmMode === 'menu' && fileBgmPlaying) {
    refreshFileBgmVolume();
    return;
  }

  const trackChanged =
    !prev
    || prev.bgmTrack !== cachedSettings.bgmTrack
    || prev.bgm !== cachedSettings.bgm;

  if (trackChanged && bgmMode === 'battle' && fileBgmPlaying) {
    stopFileBgm();
    battleBgmRotateIndex = 0;
    const path = resolveBattleBgmPath(cachedSettings.bgmTrack, battleBgmRotateIndex);
    if (path) tryStartFileBgm(path, 'battle');
  } else if (menuMusicWanted && bgmMode !== 'battle') {
    startMenuMusic();
  }
}

export function setAudioMuted(next) {
  saveAudioSettings({ muted: !!next });
  cachedSettings = loadAudioSettings();
  applySettingsToGains();
  if (muted) {
    stopMenuMusic();
    stopBattleMusic();
  } else if (menuMusicWanted) {
    startMenuMusic();
  }
  void import('../src/services/syncCoordinator').then((m) => m.commitAudioSettingsSave());
}

export function toggleAudioMuted() {
  const s = loadAudioSettings();
  setAudioMuted(!s.muted);
  return loadAudioSettings().muted;
}

export function isAudioMuted() {
  return loadAudioSettings().muted;
}

export function setAudioVolumes({ bgm, sfx, ui, impact } = {}) {
  const patch = {};
  if (typeof bgm === 'number') patch.bgm = bgm;
  if (typeof sfx === 'number') patch.sfx = sfx;
  if (typeof ui === 'number') patch.ui = ui;
  if (typeof impact === 'number') patch.impact = impact;
  saveAudioSettings(patch);
  cachedSettings = loadAudioSettings();
  applySettingsToGains();
  void import('../src/services/syncCoordinator').then((m) => m.commitAudioSettingsSave());
}

export function setBattleMusicIntensity({ playerHpRatio, opponentHpRatio }) {
  if (bgmMode !== 'battle') return;
  const p = playerHpRatio ?? 1;
  const o = opponentHpRatio ?? 1;
  const low = Math.min(p, o);
  let next = /** @type {MusicState} */ ('normal');
  if (p < 0.3) next = 'danger';
  else if (low < 0.5) next = 'tension';
  if (next === musicState) return;
  musicState = next;
  refreshFileBgmVolume();
  updateBgmGain();
}

export function playVictoryMusic() {
  musicState = 'victory';
  stopFileBgm();
  if (VICTORY_PATH) tryPlayFile(VICTORY_PATH, settings().bgm * 1.1);
}

export function playDefeatMusic() {
  musicState = 'defeat';
  stopFileBgm();
  if (DEFEAT_PATH) tryPlayFile(DEFEAT_PATH, settings().bgm * 1.1);
}

export function getMusicState() {
  return musicState;
}

export function getAudioContext() {
  return { ctx, bgmGain, sfxGain, uiGain, impactGain, pitchMul, updateBgmGain, currentBgmVolume };
}

export function stopBattleMusic() {
  if (musicTimer) clearTimeout(musicTimer);
  musicTimer = null;
  if (fadeTimer) clearInterval(fadeTimer);
  fadeTimer = null;
  if (bgmMode === 'battle') stopFileBgm();
  musicState = 'normal';
  battleBgmRotateIndex = 0;
  updateBgmGain();
  if (menuMusicWanted && unlocked && !muted) startMenuMusic();
}

export function startBattleMusicLoop(_tickFn) {
  if (!unlocked || muted) return;
  stopMenuMusic();
  cachedSettings = loadAudioSettings();
  musicState = 'normal';
  battleBgmRotateIndex = 0;
  applySettingsToGains();

  if (fadeTimer) clearInterval(fadeTimer);
  fadeTimer = null;

  const path = resolveBattleBgmPath(settings().bgmTrack, battleBgmRotateIndex);
  tryStartFileBgm(path, 'battle');

  if (musicTimer) clearTimeout(musicTimer);
  musicTimer = null;
}

export { loadAudioSettings, saveAudioSettings };
