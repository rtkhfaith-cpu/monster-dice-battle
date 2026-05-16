import { Platform } from 'react-native';
import { playSfx } from './gameSounds';

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

/** BGM ~30%, SFX ~85% — punchy arcade mix */
const SFX_BASE = 0.85;
const MUSIC_BASE = 0.31;

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
  egg: 1.25,
  metal: 1.32,
  roar: 1.2,
};

/** Cheerful cartoon battle loop — layered melody + bass */
const BGM_MELODY = [
  { f: 523, d: 0.14, t: 'triangle', v: 0.42 },
  { f: 659, d: 0.14, t: 'triangle', v: 0.38 },
  { f: 784, d: 0.14, t: 'triangle', v: 0.44 },
  { f: 659, d: 0.14, t: 'triangle', v: 0.36 },
  { f: 587, d: 0.14, t: 'triangle', v: 0.4 },
  { f: 698, d: 0.14, t: 'triangle', v: 0.38 },
  { f: 880, d: 0.16, t: 'triangle', v: 0.46 },
  { f: 698, d: 0.14, t: 'triangle', v: 0.35 },
];
const BGM_HARMONY = [
  { f: 392, d: 0.28, t: 'sine', v: 0.22 },
  { f: 494, d: 0.28, t: 'sine', v: 0.2 },
];
const BGM_BASS = [
  { f: 131, d: 0.24, t: 'triangle', v: 0.38 },
  { f: 165, d: 0.24, t: 'triangle', v: 0.34 },
  { f: 196, d: 0.24, t: 'triangle', v: 0.38 },
  { f: 165, d: 0.24, t: 'triangle', v: 0.32 },
];

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
    { f: 220, d: 0.04, type: 'square', vol: 1 },
    { f: 440, d: 0.05, type: 'square', vol: 1 },
    { f: 660, d: 0.08, type: 'square', vol: 0.9 },
    { f: 880, d: 0.1, type: 'triangle', vol: 0.75 },
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

function playProfile(name, volScale = 1, bus = 'sfx') {
  duckBgm(380);
  const steps = SFX_PROFILES[name];
  if (!steps) return;
  const boost = SFX_VOLUME_BOOST[name] ?? 1;
  steps.forEach((s, i) => {
    setTimeout(() => {
      const vol = SFX_BASE * volScale * boost * (s.vol ?? 1);
      if (s.noise) {
        synthNoise(s.d, vol * 0.35, s.filter ?? 600);
      } else {
        synthTone(s.f, s.d, s.type || 'triangle', vol, bus);
      }
    }, i * 38);
  });
}

export function duckBgm(ms = 400) {
  duckUntil = Date.now() + ms;
  updateMusicGain();
  setTimeout(updateMusicGain, ms + 20);
}

function playBgmStep() {
  if (muted || !unlocked) return;
  const mel = BGM_MELODY[musicStep % BGM_MELODY.length];
  const bass = BGM_BASS[Math.floor(musicStep / 2) % BGM_BASS.length];
  const harm = BGM_HARMONY[Math.floor(musicStep / 4) % BGM_HARMONY.length];
  updateMusicGain();
  synthTone(mel.f, mel.d, mel.t, MUSIC_BASE * mel.v, 'music');
  if (musicStep % 2 === 0) {
    synthTone(bass.f, bass.d, bass.t, MUSIC_BASE * bass.v * 0.95, 'music');
  }
  if (musicStep % 4 === 0) {
    synthTone(harm.f, harm.d, harm.t, MUSIC_BASE * harm.v, 'music');
  }
  musicStep += 1;
}

function fadeMusicIn() {
  if (!musicGain || !ctx) return;
  let step = 0;
  const steps = 12;
  if (fadeTimer) clearInterval(fadeTimer);
  fadeTimer = setInterval(() => {
    step += 1;
    musicTargetVol = (0.31 * step) / steps;
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

export function unlockBattleAudio() {
  unlocked = true;
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
  muted = !!next;
  if (muted) stopBattleMusic();
  else updateMusicGain();
}

export function isBattleMuted() {
  return muted;
}

export function toggleBattleMuted() {
  setBattleMuted(!muted);
  return muted;
}

export async function playBattleSfx(key, opts = {}) {
  if (!unlocked || muted) return;
  const vol = typeof opts.volume === 'number' ? opts.volume : 1;

  const wavKeys = {
    dice: 'dice',
    attack: 'attackP1',
    win: 'winP1',
    lose: 'winP2',
  };
  if (wavKeys[key]) {
    try {
      duckBgm(350);
      await playSfx(wavKeys[key], { volume: vol * 0.85 });
      return;
    } catch {
      /* synth fallback */
    }
  }

  const profileMap = {
    dice: 'dice',
    hit: 'hit',
    attack: 'attack',
    physical: 'attack',
    magic: 'magic',
    critical: 'critical',
    super: 'critical',
    dodge: 'dodge',
    defend: 'defend',
    shield: 'defend',
    water: 'water',
    fire: 'fire',
    poison: 'poison',
    bacteria: 'bacteria',
    stink: 'poop',
    poop: 'poop',
    milk: 'water',
    bottle: 'water',
    fly: 'fly',
    egg: 'egg',
    metal: 'metal',
    roar: 'roar',
    win: 'win',
    lose: 'lose',
    victory: 'win',
    defeat: 'lose',
    button: 'button',
    ui: 'button',
  };
  const profile = profileMap[key] || 'hit';
  playProfile(profile, vol);
}

export function playAttackSfxForEffect(effectType) {
  if (effectType === 'fire') return playBattleSfx('fire');
  if (effectType === 'water') return playBattleSfx('water');
  if (effectType === 'poison') return playBattleSfx('bacteria');
  if (effectType === 'smellySocks' || effectType === 'toiletPaper' || effectType === 'egg') return playBattleSfx('egg');
  if (effectType === 'bottle') return playBattleSfx('water');
  if (effectType === 'cactus') return playBattleSfx('metal');
  if (effectType === 'magic67') return playBattleSfx('magic');
  if (effectType === 'roar') return playBattleSfx('roar');
  return playBattleSfx('hit');
}

export function playUiSfx() {
  return playBattleSfx('button');
}

export function startBattleMusic() {
  if (!unlocked || muted || musicTimer) return;
  musicStep = 0;
  fadeMusicIn();
  const tick = () => {
    if (muted) return;
    playBgmStep();
    musicTimer = setTimeout(tick, 300);
  };
  tick();
}

export function stopBattleMusic() {
  if (musicTimer) clearTimeout(musicTimer);
  musicTimer = null;
  if (fadeTimer) clearInterval(fadeTimer);
  fadeTimer = null;
  musicTargetVol = 0;
  updateMusicGain();
}
