/**
 * Local save I/O — wraps gameStorage; single path for offline cache.
 */
import {
  loadGameData,
  saveGameData,
  getDefaultGameData,
  cloneGameData,
  SAVE_KEY,
} from '../../utils/gameStorage';
import { loadAudioSettings, applyAudioSettings } from '../../utils/audioSettings';

export { SAVE_KEY };

let autosaveTimer = null;
const AUTOSAVE_MS = 180;

/**
 * @returns {Promise<object>}
 */
export async function loadGameSave() {
  return loadGameData();
}

/**
 * @param {object} data
 */
export async function saveGameSave(data) {
  await saveGameData(data);
}

/**
 * Debounced local persist (cloud handled separately by syncCoordinator).
 * @param {string} reason
 * @param {object} data
 */
export function autosaveGame(reason, data) {
  if (autosaveTimer) clearTimeout(autosaveTimer);
  autosaveTimer = setTimeout(() => {
    autosaveTimer = null;
    void saveGameSave(data).catch(() => {
      if (typeof __DEV__ !== 'undefined' && __DEV__) {
        console.warn('[save] local autosave failed', reason);
      }
    });
  }, AUTOSAVE_MS);
}

/**
 * @returns {Promise<object[]>}
 */
export async function loadProfiles() {
  const gd = await loadGameSave();
  return Array.isArray(gd.players) ? gd.players : [];
}

/**
 * @param {object[]} profiles
 */
export async function saveProfiles(profiles) {
  const gd = await loadGameSave();
  gd.players = profiles;
  await saveGameSave(gd);
  return gd;
}

/**
 * @returns {Promise<string|null>}
 */
export async function loadSelectedProfileId() {
  const gd = await loadGameSave();
  return gd.session?.activeProfileId ?? null;
}

/**
 * @param {string|null} profileId
 */
export async function saveSelectedProfileId(profileId) {
  const gd = await loadGameSave();
  gd.session = gd.session || {};
  gd.session.activeProfileId = profileId || null;
  await saveGameSave(gd);
  return gd;
}

/**
 * @returns {Promise<string>}
 */
export async function exportSaveData() {
  const gd = await loadGameSave();
  const envelope = {
    version: 2,
    exportedAt: new Date().toISOString(),
    gameData: gd,
    audioSettings: loadAudioSettings(),
  };
  return JSON.stringify(envelope, null, 2);
}

/**
 * @param {string} saveJson
 * @returns {Promise<object>}
 */
export async function importSaveData(saveJson) {
  const parsed = JSON.parse(saveJson);
  const gd =
    parsed?.gameData && typeof parsed.gameData === 'object'
      ? cloneGameData(parsed.gameData)
      : parsed?.version === 1 && parsed.players
        ? cloneGameData(parsed)
        : getDefaultGameData();
  await saveGameSave(gd);
  if (parsed?.audioSettings && typeof parsed.audioSettings === 'object') {
    applyAudioSettings(parsed.audioSettings);
  }
  return gd;
}
