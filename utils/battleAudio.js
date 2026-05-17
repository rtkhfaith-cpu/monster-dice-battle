import { Platform } from 'react-native';
import { playGameSfx, playMenuSfx } from './gameSfx';
import {
  duckBgm as duckBgmChannel,
  playFileSfx,
  playFileAtPath,
  setBattleMusicIntensity,
  setAudioMuted as setGlobalAudioMuted,
  startBattleMusicLoop,
  stopBattleMusic as stopMusicChannels,
  unlockAudio,
  loadAudioSettings,
  isAudioMuted,
} from './audioManager';
import { getTrackByField } from './audioCatalog';

let unlocked = false;
let muted = false;
let ctx = null;
let masterGain = null;
let musicGain = null;
let sfxGain = null;
let musicTimer = null;
let musicStep = 0;
let duckUntil = 0;
let musicTargetVol = 0.31;
let fadeTimer = null;

function sfxBase() {
  return loadAudioSettings().sfx ?? 0.88;
}

function musicBase() {
  return loadAudioSettings().bgm ?? 0.3;
}

const SFX_VOLUME_BOOST = {
  attack: 1.2,
  hit: 1.25,
  critical: 1.45,
  defend: 1.15,
  button: 1.1,
  win: 1.25,
  lose: 1.2,
  fire: 1.3,
  water: 1.28,
  poison: 1.25,
  bacteria: 1.28,
  magic: 1.22,
  fly: 1.3,
  bite: 1.28,
  egg: 1.25,
  metal: 1.32,
  roar: 1.2,
};

/** Upbeat arcade battle loop — faster melody + punchy bass */
const BGM_MELODY = [
  { f: 587, d: 0.1, t: 'square', v: 0.32 },
  { f: 740, d: 0.1, t: 'square', v: 0.34 },
  { f: 880, d: 0.1, t: 'square', v: 0.38 },
  { f: 988, d: 0.1, t: 'square', v: 0.4 },
  { f: 880, d: 0.1, t: 'square', v: 0.36 },
  { f: 740, d: 0.1, t: 'square', v: 0.34 },
  { f: 659, d: 0.1, t: 'square', v: 0.32 },
  { f: 988, d: 0.12, t: 'square', v: 0.42 },
];
const BGM_HARMONY = [
  { f: 440, d: 0.2, t: 'triangle', v: 0.24 },
  { f: 554, d: 0.2, t: 'triangle', v: 0.22 },
  { f: 659, d: 0.2, t: 'triangle', v: 0.26 },
];
const BGM_BASS = [
  { f: 147, d: 0.16, t: 'triangle', v: 0.42 },
  { f: 175, d: 0.16, t: 'triangle', v: 0.4 },
  { f: 196, d: 0.16, t: 'triangle', v: 0.44 },
  { f: 220, d: 0.16, t: 'triangle', v: 0.4 },
];
const BGM_KICK = { f: 62, d: 0.06, t: 'square', v: 0.55 };

const SFX_PROFILES = {
  attack: [
    { f: 180, d: 0.04, type: 'triangle', vol: 1 },
    { f: 120, d: 0.07, type: 'square', vol: 0.75 },
  ],
  hit: [
    { f: 200, d: 0.035, type: 'square', vol: 1 },
    { f: 95, d: 0.09, type: 'triangle', vol: 0.9 },
  ],
  fly: [
    { noise: true, d: 0.08, vol: 0.7, filter: 800 },
    { f: 140, d: 0.05, type: 'triangle', vol: 0.9 },
    { f: 80, d: 0.1, type: 'square', vol: 1 },
  ],
  bite: [
    { f: 220, d: 0.03, type: 'square', vol: 1 },
    { f: 95, d: 0.06, type: 'triangle', vol: 0.95 },
    { noise: true, d: 0.04, vol: 0.35, filter: 400 },
  ],
  magic: [
    { f: 523, d: 0.05, type: 'sine', vol: 1 },
    { f: 784, d: 0.07, type: 'sine', vol: 0.85 },
    { f: 1047, d: 0.06, type: 'triangle', vol: 0.6 },
  ],
  fire: [
    { noise: true, d: 0.06, vol: 0.55, filter: 400 },
    { f: 120, d: 0.05, type: 'sawtooth', vol: 0.85 },
    { f: 220, d: 0.08, type: 'triangle', vol: 0.7 },
  ],
  water: [
    { noise: true, d: 0.05, vol: 0.5, filter: 1200 },
    { f: 600, d: 0.06, type: 'sine', vol: 1 },
    { f: 900, d: 0.05, type: 'sine', vol: 0.7 },
    { f: 450, d: 0.1, type: 'triangle', vol: 0.45 },
  ],
  poison: [
    { f: 180, d: 0.06, type: 'triangle', vol: 1 },
    { f: 150, d: 0.08, type: 'square', vol: 0.7 },
  ],
  bacteria: [
    { f: 160, d: 0.05, type: 'triangle', vol: 1 },
    { f: 140, d: 0.07, type: 'sine', vol: 0.8 },
    { noise: true, d: 0.1, vol: 0.4, filter: 300 },
  ],
  egg: [
    { f: 280, d: 0.04, type: 'triangle', vol: 0.9 },
    { noise: true, d: 0.03, vol: 0.35, filter: 2000 },
    { f: 120, d: 0.08, type: 'square', vol: 1 },
  ],
  metal: [
    { f: 880, d: 0.05, type: 'square', vol: 1 },
    { f: 660, d: 0.08, type: 'triangle', vol: 0.85 },
    { f: 440, d: 0.1, type: 'sine', vol: 0.5 },
  ],
  poop: [
    { f: 130, d: 0.05, type: 'triangle', vol: 1 },
    { f: 85, d: 0.12, type: 'square', vol: 0.85 },
  ],
  defend: [
    { f: 440, d: 0.06, type: 'sine', vol: 1 },
    { f: 554, d: 0.1, type: 'sine', vol: 0.75 },
    { f: 659, d: 0.12, type: 'triangle', vol: 0.5 },
  ],
  critical: [
    { noise: true, d: 0.04, vol: 0.65, filter: 200 },
    { f: 180, d: 0.04, type: 'square', vol: 1 },
    { f: 330, d: 0.05, type: 'square', vol: 1 },
    { f: 523, d: 0.07, type: 'square', vol: 0.95 },
    { f: 784, d: 0.12, type: 'triangle', vol: 0.85 },
  ],
  button: [
    { f: 620, d: 0.035, type: 'triangle', vol: 0.85 },
    { f: 740, d: 0.025, type: 'triangle', vol: 0.55 },
  ],
  win: [
    { f: 523, d: 0.1, type: 'triangle', vol: 1 },
    { f: 659, d: 0.1, type: 'triangle', vol: 1 },
    { f: 784, d: 0.12, type: 'triangle', vol: 1 },
    { f: 1047, d: 0.2, type: 'triangle', vol: 0.95 },
  ],
  lose: [
    { f: 392, d: 0.14, type: 'triangle', vol: 1 },
    { f: 330, d: 0.16, type: 'triangle', vol: 0.9 },
    { f: 262, d: 0.22, type: 'triangle', vol: 0.85 },
  ],
  roar: [
    { f: 90, d: 0.12, type: 'sawtooth', vol: 1 },
    { f: 70, d: 0.14, type: 'triangle', vol: 0.8 },
  ],
  dodge: [{ f: 720, d: 0.05, type: 'sine', vol: 1 }],
  dice: [
    { f: 440, d: 0.08, type: 'triangle', vol: 0.9 },
    { f: 554, d: 0.06, type: 'triangle', vol: 0.7 },
  ],
};

function getCtx() {
  if (Platform.OS !== 'web' || typeof window === 'undefined') return null;
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return null;
  if (!ctx) {
    ctx = new AC();
    masterGain = ctx.createGain();
    musicGain = ctx.createGain();
    sfxGain = ctx.createGain();
    masterGain.gain.value = 1;
    musicGain.gain.value = 0;
    sfxGain.gain.value = 1;
    musicGain.connect(masterGain);
    sfxGain.connect(masterGain);
    masterGain.connect(ctx.destination);
  }
  return ctx;
}

function currentMusicVolume() {
  const now = Date.now();
  if (now < duckUntil) return musicTargetVol * 0.25;
  return musicTargetVol;
}

function updateMusicGain() {
  if (!musicGain || !ctx) return;
  const audio = ctx;
  const t = audio.currentTime;
  musicGain.gain.cancelScheduledValues(t);
  musicGain.gain.setValueAtTime(musicGain.gain.value, t);
  musicGain.gain.linearRampToValueAtTime(currentMusicVolume(), t + 0.06);
}

function synthNoise(durationSec, volume, filterHz = 600) {
  const audio = getCtx();
  if (!audio || muted) return;
  try {
    const bufferSize = Math.floor(audio.sampleRate * durationSec);
    const buffer = audio.createBuffer(1, bufferSize, audio.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i += 1) {
      data[i] = (Math.random() * 2 - 1) * (1 - i / bufferSize);
    }
    const src = audio.createBufferSource();
    src.buffer = buffer;
    const filter = audio.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = filterHz;
    filter.Q.value = 0.8;
    const gain = audio.createGain();
    gain.gain.value = volume;
    src.connect(filter);
    filter.connect(gain);
    gain.connect(sfxGain);
    const t = audio.currentTime;
    gain.gain.exponentialRampToValueAtTime(0.001, t + durationSec);
    src.start(t);
    src.stop(t + durationSec + 0.02);
  } catch {
    /* ignore */
  }
}

function synthTone(freq, durationSec, type = 'triangle', volume = 0.1, bus = 'sfx') {
  const audio = getCtx();
  if (!audio || muted) return;
  try {
    const osc = audio.createOscillator();
    const gain = audio.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    gain.gain.value = volume;
    osc.connect(gain);
    const dest = bus === 'music' ? musicGain : sfxGain;
    if (!dest) return;
    gain.connect(dest);
    const t = audio.currentTime;
    gain.gain.exponentialRampToValueAtTime(0.001, t + durationSec);
    osc.start(t);
    osc.stop(t + durationSec + 0.02);
  } catch {
    /* ignore */
  }
}

const FILE_SFX_MAP = {
  fly: 'fly_whoosh',
  bite: 'hit_heavy',
  water: 'water_splash',
  fire: 'fire_blast',
  metal: 'metal_clang',
  bacteria: 'bacteria_squish',
  egg: 'egg_crack',
  poop: 'poop_splat',
  defend: 'defend_shield',
  critical: 'hit_crit',
  hit: 'hit_light',
  button: 'ui_click',
};

function playCategoryTrack(category, volScale = 1) {
  const field =
    category === 'dice' ? 'diceTrack'
    : category === 'attack' ? 'attackTrack'
    : category === 'critical' ? 'criticalTrack'
    : category === 'super' ? 'superTrack'
    : null;
  if (!field) return false;
  const s = loadAudioSettings();
  const track = getTrackByField(field, s[field]);
  duckBgmChannel(380);
  try {
    const { playHowlerCategory, howlerWebAvailable, isHowlerUnlocked } = require('./audioHowlerWeb');
    if (howlerWebAvailable() && isHowlerUnlocked() && playHowlerCategory(category, volScale)) {
      return true;
    }
  } catch {
    /* optional */
  }
  if (track.path && playFileAtPath(track.path, category === 'dice' ? 'ui' : 'impact', volScale)) {
    return true;
  }
  if (track.synth) {
    playSynthProfile(track.synth, volScale, category === 'dice' ? 'ui' : 'sfx');
    return true;
  }
  return false;
}

function playSynthProfile(name, volScale = 1, bus = 'sfx') {
  duckBgmChannel(380);
  const fileKey = FILE_SFX_MAP[name];
  if (fileKey && playFileSfx(fileKey, volScale, bus === 'music' ? 'sfx' : bus === 'ui' ? 'ui' : 'impact')) {
    return;
  }
  const steps = SFX_PROFILES[name];
  if (!steps) return;
  const boost = SFX_VOLUME_BOOST[name] ?? 1;
  const pitch = 0.95 + Math.random() * 0.1;
  const base = sfxBase();
  steps.forEach((s, i) => {
    setTimeout(() => {
      const vol = base * volScale * boost * (s.vol ?? 1);
      if (s.noise) {
        synthNoise(s.d, vol * 0.35, s.filter ?? 600);
      } else {
        synthTone((s.f || 440) * pitch, s.d, s.type || 'triangle', vol, bus);
      }
    }, i * 38);
  });
}

function playProfile(name, volScale = 1, bus = 'sfx') {
  if (name === 'dice' && playCategoryTrack('dice', volScale)) return;
  if ((name === 'attack' || name === 'hit') && playCategoryTrack('attack', volScale)) return;
  if (name === 'critical' && playCategoryTrack('critical', volScale)) return;
  playSynthProfile(name, volScale, bus);
}

export function duckBgm(ms = 400) {
  duckBgmChannel(ms);
  duckUntil = Date.now() + ms;
  updateMusicGain();
  setTimeout(updateMusicGain, ms + 20);
}

export { setBattleMusicIntensity };

function playBgmStep() {
  if (muted || !unlocked) return;
  const mel = BGM_MELODY[musicStep % BGM_MELODY.length];
  const bass = BGM_BASS[Math.floor(musicStep / 2) % BGM_BASS.length];
  const harm = BGM_HARMONY[Math.floor(musicStep / 4) % BGM_HARMONY.length];
  const base = musicBase();
  updateMusicGain();
  synthTone(mel.f, mel.d, mel.t, base * mel.v, 'music');
  if (musicStep % 2 === 0) {
    synthTone(bass.f, bass.d, bass.t, base * bass.v * 0.95, 'music');
  }
  if (musicStep % 4 === 0) {
    synthTone(harm.f, harm.d, harm.t, base * harm.v, 'music');
  }
  if (musicStep % 2 === 0) {
    synthTone(BGM_KICK.f, BGM_KICK.d, BGM_KICK.t, base * BGM_KICK.v * 0.9, 'music');
  }
  musicStep += 1;
}

function fadeMusicIn() {
  if (!musicGain || !ctx) return;
  let step = 0;
  const steps = 12;
  const target = musicBase();
  musicTargetVol = target;
  if (fadeTimer) clearInterval(fadeTimer);
  fadeTimer = setInterval(() => {
    step += 1;
    musicTargetVol = (target * step) / steps;
    updateMusicGain();
    if (step >= steps) {
      clearInterval(fadeTimer);
      fadeTimer = null;
    }
  }, 40);
}

function preloadSynthProfiles() {
  if (!unlocked || muted) return;
  Object.keys(SFX_PROFILES).forEach((key) => {
    playProfile(key, 0.01);
  });
}

export function syncBattleAudioFromSettings(nextSettings) {
  const s = nextSettings || loadAudioSettings();
  muted = !!s.muted;
  musicTargetVol = s.bgm;
  updateMusicGain();
}

export function unlockBattleAudio() {
  unlocked = true;
  unlockAudio();
  const s = loadAudioSettings();
  muted = s.muted;
  musicTargetVol = s.bgm;
  const audio = getCtx();
  if (!audio) return;
  if (audio.state === 'suspended') {
    void audio.resume().catch(() => {});
  }
  try {
    const buffer = audio.createBuffer(1, 1, 22050);
    const src = audio.createBufferSource();
    src.buffer = buffer;
    src.connect(audio.destination);
    src.start(0);
    src.stop(0.01);
  } catch {
    /* iOS unlock */
  }
  setTimeout(preloadSynthProfiles, 80);
}

export function setBattleMuted(next) {
  const on = !!next;
  muted = on;
  setGlobalAudioMuted(on);
  if (on) {
    stopBattleMusic();
  } else {
    bgmStarted = false;
    musicTargetVol = loadAudioSettings().bgm ?? musicBase();
    updateMusicGain();
    startBattleMusic();
  }
}

export function isBattleMuted() {
  return isAudioMuted();
}

export function toggleBattleMuted() {
  const next = !isAudioMuted();
  setBattleMuted(next);
  return next;
}

const BATTLE_SFX_MAP = {
  attack: 'attack',
  hit: 'attack',
  physical: 'attack',
  magic: 'attack',
  critical: 'critical',
  super: 'critical',
  dodge: 'dodge',
  win: 'win',
  victory: 'win',
  lose: 'lose',
  defeat: 'lose',
  shop: 'shop',
  coin: 'shop',
  levelUp: 'levelUp',
  button: 'button',
  ui: 'button',
  dice: 'button',
  water: 'attack',
  fire: 'attack',
  poison: 'attack',
  bacteria: 'attack',
  fly: 'attack',
  bite: 'attack',
  egg: 'attack',
  metal: 'attack',
  roar: 'attack',
  defend: 'attack',
  shield: 'attack',
};

export async function playBattleSfx(key, opts = {}) {
  if (muted) return;
  const vol = typeof opts.volume === 'number' ? opts.volume : 1;
  const kind = BATTLE_SFX_MAP[key] || 'attack';

  duckBgm(350);

  if (playGameSfx(kind, vol)) return;

  if (kind === 'attack' && playCategoryTrack('attack', vol)) return;
  if (kind === 'critical' && playCategoryTrack('critical', vol)) return;
  if (key === 'super' && playCategoryTrack('super', vol)) return;

  const profile =
    kind === 'critical' ? 'critical'
    : kind === 'dodge' ? 'dodge'
    : kind === 'win' ? 'win'
    : kind === 'lose' ? 'lose'
    : 'attack';
  playProfile(profile, vol);
}

export function playAttackSfxForEffect(_effectType) {
  return playBattleSfx('attack');
}

export function playUiSfx() {
  return playMenuSfx();
}

let bgmStarted = false;

export function startBattleMusic() {
  if (!unlocked || muted || bgmStarted) return;
  bgmStarted = true;
  musicStep = 0;
  musicTargetVol = loadAudioSettings().bgm ?? musicBase();
  updateMusicGain();
  startBattleMusicLoop(null);
}

export function stopBattleMusic() {
  bgmStarted = false;
  if (fadeTimer) clearInterval(fadeTimer);
  fadeTimer = null;
  stopMusicChannels();
  musicTargetVol = 0;
  updateMusicGain();
}
