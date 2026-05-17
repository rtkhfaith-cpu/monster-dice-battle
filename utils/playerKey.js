/**
 * 4-digit Player Key — local protection (not banking-grade).
 * Never log keys. Store only hashes on profiles.
 */

/**
 * @param {string} raw
 * @returns {string} four digits or ''
 */
export function normalizePlayerKey(raw) {
  return String(raw || '')
    .replace(/\D/g, '')
    .slice(0, 4);
}

/**
 * @param {string} key
 * @returns {string|null} error message or null if valid
 */
export function validatePlayerKeyInput(key) {
  const digits = normalizePlayerKey(key);
  if (!digits) return 'Enter your 4-digit Player Key.';
  if (digits.length !== 4) return 'Player Key must be exactly 4 digits.';
  return null;
}

/**
 * @param {string} key
 * @param {string} confirm
 * @returns {string|null}
 */
export function validatePlayerKeyPair(key, confirm) {
  const err = validatePlayerKeyInput(key);
  if (err) return err;
  if (normalizePlayerKey(key) !== normalizePlayerKey(confirm)) {
    return 'Player Keys do not match. Try again.';
  }
  return null;
}

/**
 * @param {string} key
 * @returns {string}
 */
export function hashPlayerKey(key) {
  const digits = normalizePlayerKey(key);
  if (digits.length !== 4) return '';
  let h = 5381;
  for (let i = 0; i < digits.length; i++) {
    h = (h * 33) ^ digits.charCodeAt(i);
  }
  return `pk_${(h >>> 0).toString(16)}`;
}

/**
 * @param {string} inputKey
 * @param {string} savedHash
 */
export function verifyPlayerKey(inputKey, savedHash) {
  if (!savedHash || typeof savedHash !== 'string') return false;
  return hashPlayerKey(inputKey) === savedHash;
}

/**
 * Profile has a proper hashed key (not legacy-only).
 * @param {{ playerKeyHash?: string, pin?: string }|null|undefined} profile
 */
export function profileHasPlayerKey(profile) {
  const h = profile?.playerKeyHash;
  return !!(h && String(h).startsWith('pk_') && String(h).length >= 10);
}

/**
 * Old saves used plain pin — require migration before play.
 * @param {object|null|undefined} profile
 */
export function profileNeedsPlayerKeyMigration(profile) {
  if (!profile) return true;
  return !profileHasPlayerKey(profile);
}

/**
 * Verify key against profile (hash or legacy pin during migration window).
 * @param {object} profile
 * @param {string} inputKey
 */
function storedHashOnProfile(profile) {
  if (!profile) return '';
  const a = profile.playerKeyHash || profile.pinHash || '';
  if (a && String(a).startsWith('pk_') && String(a).length >= 10) return a;
  if (profile.pin && String(profile.pin).startsWith('pk_') && String(profile.pin).length >= 10) {
    return profile.pin;
  }
  return a;
}

export function verifyPlayerKeyForProfile(profile, inputKey) {
  if (!profile) return false;
  const hash = storedHashOnProfile(profile);
  if (hash && String(hash).startsWith('pk_')) {
    return verifyPlayerKey(inputKey, hash);
  }
  const digits = normalizePlayerKey(inputKey);
  const legacy = String(profile.pin || '')
    .replace(/\D/g, '')
    .padStart(4, '0')
    .slice(0, 4);
  if (legacy.length !== 4 || String(profile.pin || '').startsWith('pk_')) {
    return false;
  }
  return digits.length === 4 && digits === legacy;
}
