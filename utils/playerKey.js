/**
 * 4-digit Player Key — plain text locally and in cloud (no hashing).
 * Never log keys.
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

/** @deprecated Cloud/local saves use plain pin — kept for any legacy references. */
export function hashPlayerKey(key) {
  return normalizePlayerKey(key);
}

/** @deprecated Use verifyPlayerKeyForProfile. */
export function verifyPlayerKey(inputKey, savedPin) {
  return normalizePlayerKey(inputKey) === normalizePlayerKey(savedPin);
}

/**
 * @param {{ pin?: string, playerKey?: string }|null|undefined} profile
 */
export function profileHasPlayerKey(profile) {
  return normalizePlayerKey(profile?.pin || profile?.playerKey).length === 4;
}

/**
 * @param {object|null|undefined} profile
 */
export function profileNeedsPlayerKeyMigration(profile) {
  if (!profile) return true;
  return !profileHasPlayerKey(profile);
}

/**
 * @param {object} profile
 * @param {string} inputKey
 */
export function verifyPlayerKeyForProfile(profile, inputKey) {
  if (!profile) return false;
  const stored = normalizePlayerKey(profile.pin || profile.playerKey);
  if (stored.length !== 4) return false;
  return stored === normalizePlayerKey(inputKey);
}
