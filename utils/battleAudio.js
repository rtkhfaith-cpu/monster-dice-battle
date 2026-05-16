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
let musicTargetVol = 0.22;
let fadeTimer = null;

const SFX_BASE = 0.42;
const MUSIC_BASE = 0.22;

const SFX_VOLUME_BOOST = {
  attack: 1.35,
  hit: 1.4,
  critical: 1.55,
  defend: 1.2,
  button: 1.15,
  win: 1.3,
  lose: 1.25,
  fire: 1.35,
  water: 1.3,
  poison: 1.28,
  magic: 1.32,
};

/** Upbeat handheld-style battle loop (C major pentatonic arpeggio + bass) */
const BGM_MELODY = [
  { f: 523, d: 0.12, t: 'square', v: 0.5 },
  { f: 659, d: 0.12, t: 'square', v: 0.45 },
  { f: 784, d: 0.12, t: 'square', v: 0.5 },
  { f: 659, d: 0.12, t: 'square', v: 0.4 },
  { f: 587, d: 0.12, t: 'square', v: 0.48 },
  { f: 698, d: 0.12, t: 'square', v: 0.45 },
  { f: 880, d: 0.14, t: 'square', v: 0.52 },
  { f: 698, d: 0.12, t: 'square', v: 0.4 },
];
const BGM_BASS = [
  { f: 131, d: 0.22, t: 'triangle', v: 0.35 },
  { f: 165, d: 0.22, t: 'triangle', v: 0.32 },
  { f: 196, d: 0.22, t: 'triangle', v: 0.35 },
  { f: 165, d: 0.22, t: 'triangle', v: 0.3 },
];

const SFX_PROFILES = {
  attack: [
    { f: 140, d: 0.05, type: 'square', vol: 1 },
    { f: 90, d: 0.08, type: 'square', vol: 0.7 },
  ],
  hit: [
    { f: 180, d: 0.04, type: 'square', vol: 1 },
    { f: 120, d: 0.07, type: 'triangle', vol: 0.85 },
  ],
  magic: [
    { f: 440, d: 0.06, type: 'sine', vol: 1 },
    { f: 660, d: 0.08, type: 'sine', vol: 0.8 },
  ],
  fire: [
    { f: 110, d: 0.04, type: 'sawtooth', vol: 1 },
    { f: 85, d: 0.1, type: 'sawtooth', vol: 0.9 },
    { f: 200, d: 0.05, type: 'square', vol: 0.6 },
  ],
  water: [
    { f: 520, d: 0.05, type: 'sine', vol: 1 },
    { f: 780, d: 0.06, type: 'sine', vol: 0.75 },
    { f: 400, d: 0.1, type: 'triangle', vol: 0.5 },
  ],
  poison: [
    { f: 160, d: 0.06, type: 'triangle', vol: 1 },
    { f: 140, d: 0.08, type: 'square', vol: 0.7 },
    { f: 120, d: 0.1, type: 'triangle', vol: 0.5 },
  ],
  poop: [
    { f: 130, d: 0.05, type: 'triangle', vol: 1 },
    { f: 85, d: 0.12, type: 'square', vol: 0.85 },
  ],
  defend: [
    { f: 280, d: 0.08, type: 'sine', vol: 1 },
    { f: 350, d: 0.1, type: 'sine', vol: 0.7 },
  ],
  critical: [
    { f: 220, d: 0.05, type: 'square', vol: 1 },
    { f: 440, d: 0.06, type: 'square', vol: 1 },
    { f: 660, d: 0.1, type: 'square', vol: 0.85 },
  ],
  button: [
    { f: 520, d: 0.04, type: 'square', vol: 0.8 },
    { f: 620, d: 0.03, type: 'square', vol: 0.5 },
  ],
  win: [
    { f: 523, d: 0.1, type: 'square', vol: 1 },
    { f: 659, d: 0.1, type: 'square', vol: 1 },
    { f: 784, d: 0.14, type: 'square', vol: 1 },
    { f: 1047, d: 0.18, type: 'square', vol: 0.9 },
  ],
  lose: [
    { f: 392, d: 0.12, type: 'triangle', vol: 1 },
    { f: 330, d: 0.14, type: 'triangle', vol: 0.9 },
    { f: 262, d: 0.2, type: 'triangle', vol: 0.8 },
  ],
  dodge: [{ f: 620, d: 0.05, type: 'sine', vol: 1 }],
  dice: [
    { f: 420, d: 0.08, type: 'square', vol: 0.9 },
    { f: 520, d: 0.06, type: 'square', vol: 0.7 },
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
  if (now < duckUntil) return musicTargetVol * 0.28;
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

function synthTone(freq, durationSec, type = 'square', volume = 0.1, bus = 'sfx') {
  const audio = getCtx();
  if (!audio || muted) return;
  try {
    const osc = audio.createOscillator();
    const gain = audio.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    const peak = volume;
    gain.gain.value = peak;
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
      synthTone(s.f, s.d, s.type || 'square', SFX_BASE * volScale * boost * (s.vol ?? 1), bus);
    }, i * 42);
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
  updateMusicGain();
  synthTone(mel.f, mel.d, mel.t, MUSIC_BASE * mel.v, 'music');
  if (musicStep % 2 === 0) {
    synthTone(bass.f, bass.d, bass.t, MUSIC_BASE * bass.v * 0.9, 'music');
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
    musicTargetVol = (0.22 * step) / steps;
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
    bacteria: 'poison',
    stink: 'poop',
    poop: 'poop',
    milk: 'water',
    bottle: 'water',
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
  if (effectType === 'poison') return playBattleSfx('poison');
  if (effectType === 'smellySocks' || effectType === 'toiletPaper' || effectType === 'egg') return playBattleSfx('poop');
  if (effectType === 'bottle') return playBattleSfx('water');
  if (effectType === 'cactus') return playBattleSfx('defend');
  if (effectType === 'magic67') return playBattleSfx('magic');
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
    musicTimer = setTimeout(tick, 280);
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
