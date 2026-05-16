/** @typedef {'idle'|'local_saved'|'cloud_synced'|'cloud_failed'|'player_created'|'player_deleted'|'cloud_delete_failed'|'player_loaded'|'cloud_list_failed'} SaveStatus */

/** @type {SaveStatus} */
let status = 'idle';

/** @type {Set<(s: SaveStatus) => void>} */
const listeners = new Set();

let hideTimer = null;

export function getSaveStatus() {
  return status;
}

/**
 * @param {(s: SaveStatus) => void} fn
 * @returns {() => void}
 */
export function subscribeSaveStatus(fn) {
  listeners.add(fn);
  fn(status);
  return () => listeners.delete(fn);
}

/**
 * @param {SaveStatus} next
 * @param {number} [autoHideMs]
 */
export function emitSaveStatus(next, autoHideMs = 2800) {
  status = next;
  listeners.forEach((fn) => fn(status));
  if (hideTimer) clearTimeout(hideTimer);
  if (next !== 'idle' && autoHideMs > 0) {
    hideTimer = setTimeout(() => {
      hideTimer = null;
      status = 'idle';
      listeners.forEach((fn) => fn(status));
    }, autoHideMs);
  }
}
