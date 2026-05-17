/**
 * Web battle audio via Howler — file clips with synth fallback from battleAudio.
 */
import { Platform } from 'react-native';
import { loadAudioSettings, saveAudioSettings } from './audioSettings';

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

const MUSIC = {
  normal: '/assets/audio/music/battle_base_loop.mp3',
  tension: '/assets/audio/music/battle_tension_loop.mp3',
  danger: '/assets/audio/music/battle_danger_loop.mp3',
  victory: '/assets/audio/music/victory_sting.mp3',
  defeat: '/assets/audio/music/defeat_sting.mp3',
};

const SFX = {
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

function applyMasterVolume() {
  if (!Howler) return;
  const s = loadAudioSettings();
  Howler.mute(!!s.muted);
  Howler.volume(s.muted ? 0 : 1);
}

function busVol(bus) {
  const s = loadAudioSettings();
  if (bus === 'bgm') return s.bgm;
  if (bus === 'ui') return s.ui;
  if (bus === 'impact') return s.impact;
  return s.sfx;
}

function getOrCreateBgm(key) {
  const src = MUSIC[key];
  if (!src || !Howl) return null;
  if (!bgmPool[key]) {
    bgmPool[key] = new Howl({
      src: [src],
      loop: key !== 'victory' && key !== 'defeat',
      volume: busVol('bgm'),
      html5: true,
      onloaderror: () => {
        bgmPool[key] = null;
      },
    });
  }
  return bgmPool[key];
}

function getOrCreateSfx(key) {
  const src = SFX[key];
  if (!src || !Howl) return null;
  if (!sfxPool[key]) {
    sfxPool[key] = new Howl({
      src: [src],
      volume: busVol('impact'),
      preload: true,
      html5: true,
      onloaderror: () => {
        sfxPool[key] = null;
      },
    });
  }
  return sfxPool[key];
}

export function howlerWebAvailable() {
  return isWeb() && loadHowler();
}

export function initHowlerWeb() {
  if (!howlerWebAvailable()) return false;
  ready = true;
  applyMasterVolume();
  Object.keys(SFX).forEach((k) => getOrCreateSfx(k));
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
  saveAudioSettings({ muted: !!muted });
  applyMasterVolume();
  if (muted) stopHowlerBgm();
}

export function setHowlerVolumes({ bgm, sfx, ui, impact } = {}) {
  const patch = {};
  if (typeof bgm === 'number') patch.bgm = bgm;
  if (typeof sfx === 'number') patch.sfx = sfx;
  if (typeof ui === 'number') patch.ui = ui;
  if (typeof impact === 'number') patch.impact = impact;
  saveAudioSettings(patch);
  applyMasterVolume();
  const h = bgmPool[activeBgmKey];
  if (h) h.volume(busVol('bgm'));
}

export function crossfadeHowlerBgm(state, ms = 480) {
  if (!unlocked || !ready || loadAudioSettings().muted) return false;
  const next = getOrCreateBgm(state);
  if (!next) return false;
  const prevKey = activeBgmKey;
  const prev = prevKey ? bgmPool[prevKey] : null;
  activeBgmKey = state;
  const target = busVol('bgm');
  next.volume(0);
  next.play();
  let step = 0;
  const steps = Math.max(4, Math.round(ms / 40));
  const id = setInterval(() => {
    step += 1;
    const t = step / steps;
    if (prev) prev.volume(target * (1 - t));
    next.volume(target * t);
    if (step >= steps) {
      clearInterval(id);
      if (prev && prevKey !== state) prev.stop();
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
  const h = bgmPool[activeBgmKey];
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
  if (!unlocked || loadAudioSettings().muted) return false;
  const now = Date.now();
  if (now - (lastPlayAt[key] || 0) < 45) return false;
  lastPlayAt[key] = now;
  const h = getOrCreateSfx(key);
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

export function playHowlerVictory() {
  stopHowlerBgm();
  const h = getOrCreateBgm('victory');
  if (!h) return false;
  activeBgmKey = 'victory';
  h.volume(busVol('bgm') * 1.1);
  h.play();
  return true;
}

export function playHowlerDefeat() {
  stopHowlerBgm();
  const h = getOrCreateBgm('defeat');
  if (!h) return false;
  activeBgmKey = 'defeat';
  h.volume(busVol('bgm') * 1.1);
  h.play();
  return true;
}

export { MUSIC as HOWLER_MUSIC, SFX as HOWLER_SFX };
