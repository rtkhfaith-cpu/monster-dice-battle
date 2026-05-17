/**
 * Selectable audio tracks — battle BGM lives in public/audio/bgm (served as /audio/bgm/…).
 */

/** @typedef {{ id: string, label: string, path: string|null, synth?: string, fileKey?: string, rotate?: boolean }} AudioTrackOption */

/** Main menu loops — alternate while on home / lobby screens. */
export const MENU_BGM_PATHS = [
  '/audio/bgm/Main1.mp3',
  '/audio/bgm/Main%202.mp3',
];

/** Main battle loops — alternate when each track ends. */
export const BATTLE_BGM_PATHS = [
  '/audio/bgm/Main_battle_1.mp3',
  '/audio/bgm/Main_battle_2.mp3',
];

export function isMenuBgmPath(path) {
  return MENU_BGM_PATHS.includes(path);
}

export function getMenuBgmPath(rotateIndex = 0) {
  const len = MENU_BGM_PATHS.length;
  const i = ((rotateIndex % len) + len) % len;
  return MENU_BGM_PATHS[i];
}

/** WAV clips in public/audio/sfx/ */
export const GAME_SFX = {
  button: '/audio/sfx/Button.wav',
  attack: '/audio/sfx/Attack.wav',
  critical: '/audio/sfx/Critical_Hit.wav',
  dodge: '/audio/sfx/Dodge.wav',
  levelUp: '/audio/sfx/Level_Up.wav',
  shop: '/audio/sfx/Shop.wav',
  win: '/audio/sfx/You_Win.wav',
  lose: '/audio/sfx/You_Lose.wav',
};

/** @type {AudioTrackOption[]} */
export const BGM_TRACK_OPTIONS = [
  {
    id: 'main_battle_rotate',
    label: 'Main Battle 1 & 2 (rotate)',
    path: null,
    rotate: true,
  },
  {
    id: 'main_battle_1',
    label: 'Main Battle 1 (loop)',
    path: BATTLE_BGM_PATHS[0],
  },
  {
    id: 'main_battle_2',
    label: 'Main Battle 2 (loop)',
    path: BATTLE_BGM_PATHS[1],
  },
];

/** @type {AudioTrackOption[]} */
export const DICE_TRACK_OPTIONS = [
  { id: 'game_button', label: 'Button (menu)', path: GAME_SFX.button },
  { id: 'game_shop', label: 'Shop', path: GAME_SFX.shop },
];

/** @type {AudioTrackOption[]} */
export const ATTACK_TRACK_OPTIONS = [
  { id: 'game_attack', label: 'Attack', path: GAME_SFX.attack },
  { id: 'synth_attack', label: 'Synth Attack', path: null, synth: 'attack' },
];

/** @type {AudioTrackOption[]} */
export const CRITICAL_TRACK_OPTIONS = [
  { id: 'game_critical', label: 'Critical Hit', path: GAME_SFX.critical },
  { id: 'synth_critical', label: 'Synth Critical', path: null, synth: 'critical' },
];

/** @type {AudioTrackOption[]} */
export const SUPER_TRACK_OPTIONS = [
  { id: 'game_critical', label: 'Critical Hit', path: GAME_SFX.critical },
  { id: 'synth_super', label: 'Synth Super', path: null, synth: 'critical' },
];

export const VICTORY_PATH = null;
export const DEFEAT_PATH = null;

const OPTION_MAP = {
  bgmTrack: BGM_TRACK_OPTIONS,
  diceTrack: DICE_TRACK_OPTIONS,
  attackTrack: ATTACK_TRACK_OPTIONS,
  criticalTrack: CRITICAL_TRACK_OPTIONS,
  superTrack: SUPER_TRACK_OPTIONS,
};

/**
 * @param {AudioTrackOption[]} options
 * @param {string} id
 */
export function findTrackOption(options, id) {
  return options.find((o) => o.id === id) || options[0];
}

/**
 * @param {'bgmTrack'|'diceTrack'|'attackTrack'|'criticalTrack'|'superTrack'} field
 * @param {string} id
 */
export function getTrackByField(field, id) {
  const list = OPTION_MAP[field] || BGM_TRACK_OPTIONS;
  return findTrackOption(list, id);
}

/**
 * @param {string} id
 */
export function getBgmTrack(id) {
  return findTrackOption(BGM_TRACK_OPTIONS, id);
}

export function labelForField(field, id) {
  return getTrackByField(field, id).label;
}

export function isBattleBgmPath(path) {
  return BATTLE_BGM_PATHS.includes(path);
}

/**
 * @param {string} bgmTrackId
 * @param {number} rotateIndex
 */
export function resolveBattleBgmPath(bgmTrackId, rotateIndex = 0) {
  const track = getBgmTrack(bgmTrackId);
  if (track.path && !track.rotate) return track.path;
  const len = BATTLE_BGM_PATHS.length;
  const i = ((rotateIndex % len) + len) % len;
  return BATTLE_BGM_PATHS[i];
}

/**
 * @param {string} bgmTrackId
 */
export function shouldRotateBattleBgm(bgmTrackId) {
  const track = getBgmTrack(bgmTrackId);
  return !!track.rotate;
}
