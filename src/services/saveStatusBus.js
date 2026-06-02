/** @typedef {'idle'|'local_saved'|'cloud_synced'|'cloud_failed'|'cloud_blocked'|'session_superseded'|'player_created'|'player_deleted'|'cloud_delete_failed'|'player_loaded'|'cloud_list_failed'} SaveStatus */

/** @type {SaveStatus} */
let status = 'idle';

/** @type {Set<(s: SaveStatus) => void>} */
const listeners = new Set();

let hideTimer = null;
/** Monotonic — only the latest emit may drive visible status after async commits. */
let statusSeq = 0;

export function getSaveStatus() {
  return status;
}

export function getSaveStatusSeq() {
  return statusSeq;
}

/** @param {number} seq */
export function isLatestSaveStatus(seq) {
  return seq === statusSeq;
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
 * @returns {number} seq — pass to isLatestSaveStatus before showing failure UI
 */
export function emitSaveStatus(next, autoHideMs = 2800) {
  statusSeq += 1;
  const seq = statusSeq;
  status = next;
  listeners.forEach((fn) => fn(status));
  if (hideTimer) clearTimeout(hideTimer);
  if (next !== 'idle' && autoHideMs > 0) {
    hideTimer = setTimeout(() => {
      if (statusSeq !== seq) return;
      hideTimer = null;
      status = 'idle';
      listeners.forEach((fn) => fn(status));
    }, autoHideMs);
  }
  return seq;
}

/**
 * Emit only if no newer status was emitted (avoids stale "sync failed" after success).
 * @param {number} seq
 * @param {SaveStatus} next
 * @param {number} [autoHideMs]
 */
export function emitSaveStatusIfCurrent(seq, next, autoHideMs = 2800) {
  if (!isLatestSaveStatus(seq)) return false;
  emitSaveStatus(next, autoHideMs);
  return true;
}
