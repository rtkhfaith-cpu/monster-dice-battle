/**
 * Per-device ID and per-profile login session (single active device).
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

const DEVICE_ID_KEY = 'mdb_device_id';
const PROFILE_SESSIONS_KEY = 'mdb_profile_sessions';

function randomToken() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `sess_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 12)}`;
}

async function storageGet(key) {
  if (Platform.OS === 'web' && typeof localStorage !== 'undefined') {
    return localStorage.getItem(key);
  }
  return AsyncStorage.getItem(key);
}

async function storageSet(key, value) {
  if (Platform.OS === 'web' && typeof localStorage !== 'undefined') {
    localStorage.setItem(key, value);
    return;
  }
  await AsyncStorage.setItem(key, value);
}

async function storageRemove(key) {
  if (Platform.OS === 'web' && typeof localStorage !== 'undefined') {
    localStorage.removeItem(key);
    return;
  }
  await AsyncStorage.removeItem(key);
}

/** @returns {Promise<string>} */
export async function getDeviceId() {
  let id = await storageGet(DEVICE_ID_KEY);
  if (id && id.length >= 8) return id;
  id = randomToken();
  await storageSet(DEVICE_ID_KEY, id);
  return id;
}

/**
 * @typedef {{ deviceId: string, sessionToken: string, issuedAt: string }} ProfileLoginSession
 */

/** @returns {Promise<Record<string, ProfileLoginSession>>} */
async function readSessionMap() {
  const raw = await storageGet(PROFILE_SESSIONS_KEY);
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

async function writeSessionMap(map) {
  await storageSet(PROFILE_SESSIONS_KEY, JSON.stringify(map));
}

/** @param {string} profileId @returns {Promise<ProfileLoginSession|null>} */
export async function getProfileSession(profileId) {
  if (!profileId) return null;
  const map = await readSessionMap();
  const s = map[profileId];
  if (!s?.sessionToken || !s?.deviceId) return null;
  return s;
}

/** @param {string} profileId @param {ProfileLoginSession} session */
export async function setProfileSession(profileId, session) {
  if (!profileId || !session?.sessionToken) return;
  const map = await readSessionMap();
  map[profileId] = {
    deviceId: session.deviceId,
    sessionToken: session.sessionToken,
    issuedAt: session.issuedAt || new Date().toISOString(),
  };
  await writeSessionMap(map);
}

/** @param {string} profileId */
export async function clearProfileSession(profileId) {
  if (!profileId) return;
  const map = await readSessionMap();
  delete map[profileId];
  await writeSessionMap(map);
}

export async function clearAllProfileSessions() {
  await storageRemove(PROFILE_SESSIONS_KEY);
}

/**
 * Mint a new login session for this device (invalidates other devices on next cloud sync).
 * @param {string} profileId
 * @returns {Promise<ProfileLoginSession>}
 */
export async function registerProfileLoginSession(profileId) {
  const deviceId = await getDeviceId();
  const session = {
    deviceId,
    sessionToken: randomToken(),
    issuedAt: new Date().toISOString(),
  };
  await setProfileSession(profileId, session);
  return session;
}

/**
 * @param {ProfileLoginSession|null|undefined} localSession
 * @param {{ deviceId?: string, sessionToken?: string, issuedAt?: string }|null|undefined} cloudSession
 */
export function isCloudSessionNewerThanLocal(localSession, cloudSession) {
  if (!cloudSession?.sessionToken) return false;
  if (!localSession?.sessionToken) return true;
  if (cloudSession.sessionToken === localSession.sessionToken) return false;
  const cloudMs = Date.parse(cloudSession.issuedAt || '');
  const localMs = Date.parse(localSession.issuedAt || '');
  if (Number.isFinite(cloudMs) && Number.isFinite(localMs)) {
    return cloudMs > localMs;
  }
  return cloudSession.sessionToken !== localSession.sessionToken;
}

export const SESSION_SUPERSEDED_CODE = 'SESSION_SUPERSEDED';
export const SESSION_SUPERSEDED_MESSAGE =
  'This account was opened on another device. Please log in again on this device.';

/** @param {string|number|undefined} status @param {string} [errorText] */
export function isSessionSupersededError(status, errorText = '') {
  const text = String(errorText || '');
  if (status === 409 && /SESSION_SUPERSEDED/i.test(text)) return true;
  if (/SESSION_SUPERSEDED/i.test(text)) return true;
  if (/another device/i.test(text)) return true;
  return false;
}
