/**
 * Web battle audio via Howler — file clips with synth fallback from battleAudio.
 */
import { Platform } from 'react-native';
import { loadAudioSettings, normalizeAudioSettings } from './audioSettings';
import {
  getTrackByField,
  VICTORY_PATH,
  DEFEAT_PATH,
  resolveBattleBgmPath,
  BATTLE_BGM_PATHS,
} from './audioCatalog';

let Howler = null;
let Howl = null;
let ready = false;
let unlocked = false;
/** @type {Record<string, import('howler').Howl>} */
const sfxPool = {};
/** @type {Record<string, import('howler').Howl>} */
const bgmPool = {};
let activeBgmKey = '';
let duckTimer = null;
let lastPlayAt = {};
/** @type {import('./audioSettings').AudioSettings|null} */
let cachedSettings = null;

function isWeb() {
  return Platform.OS === 'web' && typeof window !== 'undefined';
}

function loadHowler() {
  if (Howler && Howl) return true;
  try {
    const mod = require('howler');
    Howler = mod.Howler;
    Howl = mod.Howl;
    return true;
  } catch {
    return false;
  }
}

function settings() {
  if (!cachedSettings) cachedSettings = loadAudioSettings();
  return cachedSettings;
}

function applyMasterVolume() {
  if (!Howler) return;
  const s = settings();
  Howler.mute(!!s.muted);
  Howler.volume(s.muted ? 0 : 1);
}

function busVol(bus) {
  const s = settings();
  if (bus === 'bgm') return s.bgm;
  if (bus === 'ui') return s.ui;
  if (bus === 'impact') return s.impact;
  return s.sfx;
}

function poolKey(kind, src) {
  return `${kind}:${src}`;
}

function getOrCreateBgmSrc(src, loop) {
  if (!src || !Howl) return null;
  const key = poolKey('bgm', src);
  if (!bgmPool[key]) {
    bgmPool[key] = new Howl({
      src: [src],
      loop,
      volume: busVol('bgm'),
      html5: true,
      onloaderror: () => {
        delete bgmPool[key];
      },
    });
  }
  return bgmPool[key];
}

function getOrCreateSfxSrc(src) {
  if (!src || !Howl) return null;
  const key = poolKey('sfx', src);
  if (!sfxPool[key]) {
    sfxPool[key] = new Howl({
      src: [src],
      volume: busVol('impact'),
      preload: true,
      html5: true,
      onloaderror: () => {
        delete sfxPool[key];
      },
    });
  }
  return sfxPool[key];
}

export function invalidateHowlerPools() {
  Object.values(bgmPool).forEach((h) => {
    try {
      h?.stop();
      h?.unload();
    } catch {
      /* ignore */
    }
  });
  Object.values(sfxPool).forEach((h) => {
    try {
      h?.unload();
    } catch {
      /* ignore */
    }
  });
  Object.keys(bgmPool).forEach((k) => delete bgmPool[k]);
  Object.keys(sfxPool).forEach((k) => delete sfxPool[k]);
  activeBgmKey = '';
}

export function syncHowlerFromSettings(nextSettings) {
  const prev = cachedSettings;
  cachedSettings = normalizeAudioSettings(nextSettings || loadAudioSettings());
  applyMasterVolume();

  const tracksChanged =
    !prev
    || prev.bgmTrack !== cachedSettings.bgmTrack
    || prev.diceTrack !== cachedSettings.diceTrack
    || prev.attackTrack !== cachedSettings.attackTrack
    || prev.criticalTrack !== cachedSettings.criticalTrack
    || prev.superTrack !== cachedSettings.superTrack;

  if (tracksChanged) {
    invalidateHowlerPools();
  }

  const h = activeBgmKey ? bgmPool[activeBgmKey] : null;
  if (h) h.volume(busVol('bgm'));
}

export function howlerWebAvailable() {
  return isWeb() && loadHowler();
}

export function initHowlerWeb() {
  if (!howlerWebAvailable()) return false;
  cachedSettings = loadAudioSettings();
  ready = true;
  applyMasterVolume();
  return true;
}

export function unlockHowlerWeb() {
  if (!howlerWebAvailable()) return false;
  unlocked = true;
  applyMasterVolume();
  try {
    if (Howler.ctx && Howler.ctx.state === 'suspended') void Howler.ctx.resume();
  } catch {
    /* ignore */
  }
  return true;
}

export function isHowlerUnlocked() {
  return unlocked;
}

export function setHowlerMuted(muted) {
  cachedSettings = normalizeAudioSettings({ ...settings(), muted: !!muted });
  applyMasterVolume();
  if (muted) stopHowlerBgm();
}

export function setHowlerVolumes({ bgm, sfx, ui, impact } = {}) {
  cachedSettings = normalizeAudioSettings({
    ...settings(),
    ...(typeof bgm === 'number' ? { bgm } : {}),
    ...(typeof sfx === 'number' ? { sfx } : {}),
    ...(typeof ui === 'number' ? { ui } : {}),
    ...(typeof impact === 'number' ? { impact } : {}),
  });
  applyMasterVolume();
  const h = activeBgmKey ? bgmPool[activeBgmKey] : null;
  if (h) h.volume(busVol('bgm'));
}

let howlerRotateIndex = 0;

function resolveBgmSrc(state) {
  if (state === 'victory') return VICTORY_PATH;
  if (state === 'defeat') return DEFEAT_PATH;
  return resolveBattleBgmPath(settings().bgmTrack, howlerRotateIndex);
}

export function crossfadeHowlerBgm(state, ms = 480) {
  if (!unlocked || !ready || settings().muted) return false;
  const src = resolveBgmSrc(state);
  if (!src) return false;
  const loop = state !== 'victory' && state !== 'defeat';
  const next = getOrCreateBgmSrc(src, loop);
  if (!next) return false;
  const nextKey = poolKey('bgm', src);
  const prevKey = activeBgmKey;
  const prev = prevKey ? bgmPool[prevKey] : null;
  activeBgmKey = nextKey;
  const target = busVol('bgm');
  next.volume(0);
  next.play();
  let step = 0;
  const steps = Math.max(4, Math.round(ms / 40));
  const id = setInterval(() => {
    step += 1;
    const t = step / steps;
    if (prev && prevKey !== nextKey) prev.volume(target * (1 - t));
    next.volume(target * t);
    if (step >= steps) {
      clearInterval(id);
      if (prev && prevKey !== nextKey) prev.stop();
    }
  }, 40);
  return true;
}

export function startHowlerBgm(state = 'normal') {
  return crossfadeHowlerBgm(state, 320);
}

export function stopHowlerBgm() {
  Object.values(bgmPool).forEach((h) => {
    try {
      h?.stop();
    } catch {
      /* ignore */
    }
  });
  activeBgmKey = '';
}

export function duckHowlerBgm(ms = 420) {
  const h = activeBgmKey ? bgmPool[activeBgmKey] : null;
  if (!h) return;
  const base = busVol('bgm');
  h.volume(base * 0.22);
  if (duckTimer) clearTimeout(duckTimer);
  duckTimer = setTimeout(() => {
    h.volume(base);
    duckTimer = null;
  }, ms);
}

export function playHowlerSfx(key, bus = 'impact', volMul = 1) {
  if (!unlocked || settings().muted) return false;
  const now = Date.now();
  if (now - (lastPlayAt[key] || 0) < 45) return false;
  lastPlayAt[key] = now;

  const legacy = {
    ui_click: '/assets/audio/sfx/ui_click.mp3',
    hit_light: '/assets/audio/sfx/hit_light.mp3',
    hit_heavy: '/assets/audio/sfx/hit_heavy.mp3',
    hit_crit: '/assets/audio/sfx/hit_crit.mp3',
    defend_shield: '/assets/audio/sfx/defend_shield.mp3',
    fly_whoosh: '/assets/audio/sfx/fly_whoosh.mp3',
    water_splash: '/assets/audio/sfx/water_splash.mp3',
    fire_blast: '/assets/audio/sfx/fire_blast.mp3',
    metal_clang: '/assets/audio/sfx/metal_clang.mp3',
    bacteria_squish: '/assets/audio/sfx/bacteria_squish.mp3',
    egg_crack: '/assets/audio/sfx/egg_crack.mp3',
    poop_splat: '/assets/audio/sfx/poop_splat.mp3',
  };

  const src = legacy[key];
  if (!src) return false;
  const h = getOrCreateSfxSrc(src);
  if (!h) return false;
  const scale = busVol(bus);
  const rate = 0.94 + Math.random() * 0.12;
  try {
    h.volume(Math.min(1, scale * volMul));
    h.rate(rate);
    h.play();
    return true;
  } catch {
    return false;
  }
}

/** Play path from user track selection. */
export function playHowlerPath(path, bus = 'impact', volMul = 1) {
  if (!unlocked || !ready || settings().muted || !path) return false;
  const h = getOrCreateSfxSrc(path);
  if (!h) return false;
  try {
    h.volume(Math.min(1, busVol(bus) * volMul));
    h.rate(0.94 + Math.random() * 0.12);
    h.play();
    return true;
  } catch {
    return false;
  }
}

export function playHowlerVictory() {
  stopHowlerBgm();
  const src = VICTORY_PATH;
  const h = getOrCreateBgmSrc(src, false);
  if (!h) return false;
  activeBgmKey = poolKey('bgm', src);
  h.volume(busVol('bgm') * 1.1);
  h.play();
  return true;
}

export function playHowlerDefeat() {
  stopHowlerBgm();
  const src = DEFEAT_PATH;
  const h = getOrCreateBgmSrc(src, false);
  if (!h) return false;
  activeBgmKey = poolKey('bgm', src);
  h.volume(busVol('bgm') * 1.1);
  h.play();
  return true;
}

export function playHowlerCategory(category, volMul = 1) {
  const field =
    category === 'dice' ? 'diceTrack'
    : category === 'attack' ? 'attackTrack'
    : category === 'critical' ? 'criticalTrack'
    : category === 'super' ? 'superTrack'
    : null;
  if (!field) return false;
  const track = getTrackByField(field, settings()[field]);
  if (track.path && playHowlerPath(track.path, category === 'dice' ? 'ui' : 'impact', volMul)) {
    return true;
  }
  return false;
}
