/**
 * Game audio architecture — BGM / SFX / UI / Impact channels.
 * File-based clips when present; synth fallback otherwise.
 */

import { Platform } from 'react-native';
import { loadAudioSettings, saveAudioSettings } from './audioSettings';

/** @typedef {'normal'|'tension'|'danger'|'victory'|'defeat'} MusicState */

let ctx = null;
let masterGain = null;
let bgmGain = null;
let sfxGain = null;
let uiGain = null;
let impactGain = null;
let unlocked = false;
let muted = false;
let musicState = /** @type {MusicState} */ ('normal');
let musicTimer = null;
let musicStep = 0;
let duckUntil = 0;
let fadeTimer = null;
let bgmTargetVol = 0.3;
let fileBgm = null;
let fileBgmSrc = '';

const MUSIC_FILES = {
  normal: '/assets/audio/music/battle_base_loop.mp3',
  tension: '/assets/audio/music/battle_tension_loop.mp3',
  danger: '/assets/audio/music/battle_danger_loop.mp3',
  victory: '/assets/audio/music/victory_sting.mp3',
  defeat: '/assets/audio/music/defeat_sting.mp3',
};

const SFX_FILES = {
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

function settings() {
  return loadAudioSettings();
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
    sfxGain.gain.value = settings().sfx;
    uiGain.gain.value = settings().ui;
    impactGain.gain.value = settings().impact;
    bgmGain.connect(masterGain);
    sfxGain.connect(masterGain);
    uiGain.connect(masterGain);
    impactGain.connect(masterGain);
    masterGain.connect(ctx.destination);
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
}

function currentBgmVolume() {
  const now = Date.now();
  if (now < duckUntil) return bgmTargetVol * 0.22;
  return bgmTargetVol;
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
  setTimeout(updateBgmGain, ms + 30);
}

function pitchMul() {
  return 0.95 + Math.random() * 0.1;
}

function tryPlayFile(path, bus = 'sfx', vol = 1) {
  if (!unlocked || muted || Platform.OS !== 'web' || typeof Audio === 'undefined') return false;
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
  const path = SFX_FILES[key];
  if (!path) return false;
  const s = settings();
  const scale = bus === 'ui' ? s.ui : bus === 'impact' ? s.impact : s.sfx;
  return tryPlayFile(path, bus, vol * scale);
}

export function unlockAudio() {
  unlocked = true;
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
}

export function setAudioMuted(next) {
  saveAudioSettings({ muted: !!next });
  applySettingsToGains();
  if (muted) stopBattleMusic();
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
  applySettingsToGains();
  void import('../src/services/syncCoordinator').then((m) => m.commitAudioSettingsSave());
}

/** Adaptive battle music — call when HP changes */
export function setBattleMusicIntensity({ playerHpRatio, opponentHpRatio }) {
  const p = playerHpRatio ?? 1;
  const o = opponentHpRatio ?? 1;
  const low = Math.min(p, o);
  let next = /** @type {MusicState} */ ('normal');
  if (p < 0.3) next = 'danger';
  else if (low < 0.5) next = 'tension';
  if (next === musicState) return;
  musicState = next;
  crossfadeMusicState(next);
}

function crossfadeMusicState(state) {
  if (!unlocked || muted) return;
  const path = MUSIC_FILES[state];
  if (path && tryStartFileBgm(path)) return;
  if (state === 'danger') bgmTargetVol = settings().bgm * 1.15;
  else if (state === 'tension') bgmTargetVol = settings().bgm * 1.05;
  else bgmTargetVol = settings().bgm;
  updateBgmGain();
}

function tryStartFileBgm(path) {
  if (fileBgmSrc === path && fileBgm && !fileBgm.paused) return true;
  stopFileBgm();
  if (Platform.OS !== 'web' || typeof Audio === 'undefined') return false;
  try {
    const a = new Audio(path);
    a.loop = musicState !== 'victory' && musicState !== 'defeat';
    a.volume = bgmTargetVol;
    fileBgm = a;
    fileBgmSrc = path;
    void a.play();
    return true;
  } catch {
    fileBgm = null;
    fileBgmSrc = '';
    return false;
  }
}

function stopFileBgm() {
  try {
    if (fileBgm) {
      fileBgm.pause();
      fileBgm.currentTime = 0;
    }
  } catch {
    /* ignore */
  }
  fileBgm = null;
  fileBgmSrc = '';
}

export function playVictoryMusic() {
  musicState = 'victory';
  stopBattleMusic();
  if (!tryPlayFile(MUSIC_FILES.victory, 'bgm', settings().bgm * 1.1)) {
    /* synth handled by battleAudio */
  }
}

export function playDefeatMusic() {
  musicState = 'defeat';
  stopBattleMusic();
  if (!tryPlayFile(MUSIC_FILES.defeat, 'bgm', settings().bgm * 1.1)) {
    /* synth handled by battleAudio */
  }
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
  stopFileBgm();
  musicState = 'normal';
  bgmTargetVol = 0;
  updateBgmGain();
}

export function startBattleMusicLoop(tickFn) {
  if (!unlocked || muted || musicTimer) return;
  musicState = 'normal';
  applySettingsToGains();
  if (!tryStartFileBgm(MUSIC_FILES.normal)) {
    let step = 0;
    if (fadeTimer) clearInterval(fadeTimer);
    fadeTimer = setInterval(() => {
      step += 1;
      bgmTargetVol = (settings().bgm * step) / 12;
      updateBgmGain();
      if (step >= 12) {
        clearInterval(fadeTimer);
        fadeTimer = null;
      }
    }, 40);
  }
  const tick = () => {
    if (muted) return;
    tickFn?.();
    musicTimer = setTimeout(tick, musicState === 'danger' ? 260 : musicState === 'tension' ? 280 : 300);
  };
  tick();
}

export { loadAudioSettings, saveAudioSettings };
