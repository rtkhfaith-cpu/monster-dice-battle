/**
 * Temporary cloud/sync debug line for production diagnosis.
 */
import { getSaveApiBaseUrl } from '../../utils/saveApiConfig';
import { getSocketServerUrl } from '../../utils/socketConfig';

/** @type {{
 *   apiBase: string,
 *   socketUrl: string,
 *   requestId: string,
 *   status: string,
 *   httpStatus: number,
 *   route: string,
 *   profileId: string,
 *   kind: string,
 *   updatedAt: number,
 * }} */
let state = {
  apiBase: '',
  socketUrl: '',
  requestId: '',
  status: 'idle',
  httpStatus: 0,
  route: '',
  profileId: '',
  kind: '',
  updatedAt: Date.now(),
};

/** @type {Set<(s: typeof state) => void>} */
const listeners = new Set();

export function getSyncDebugState() {
  return { ...state };
}

/**
 * @param {(s: typeof state) => void} fn
 */
export function subscribeSyncDebug(fn) {
  listeners.add(fn);
  fn(getSyncDebugState());
  return () => listeners.delete(fn);
}

/**
 * @param {Partial<typeof state>} patch
 */
export function recordSyncDebug(patch) {
  state = {
    ...state,
    ...patch,
    updatedAt: Date.now(),
  };
  listeners.forEach((fn) => {
    try {
      fn(getSyncDebugState());
    } catch {
      /* ignore */
    }
  });
}

export function refreshSyncDebugUrls() {
  recordSyncDebug({
    apiBase: getSaveApiBaseUrl() || '(not configured)',
    socketUrl: getSocketServerUrl() || '(not configured)',
  });
}
