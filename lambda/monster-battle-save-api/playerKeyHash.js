/**
 * Plain 4-digit playerKey — stored as text in DynamoDB (no hashing).
 */

const OLD_FORMAT_MSG = 'Old save format. Please re-save this profile to update PIN format.';

function normalizePlayerKey(raw) {
  return String(raw || '')
    .replace(/\D/g, '')
    .slice(0, 4);
}

function hashPlayerKey(key) {
  const digits = normalizePlayerKey(key);
  if (digits.length !== 4) return '';
  let h = 5381;
  for (let i = 0; i < digits.length; i++) {
    h = (h * 33) ^ digits.charCodeAt(i);
  }
  return `pk_${(h >>> 0).toString(16)}`;
}

function hashLooksValid(saved) {
  const s = String(saved || '');
  return s.startsWith('pk_') && s.length >= 10;
}

/** Plain PIN on item — playerKey field, or legacy 4-digit pin attribute. */
function storedPlainKey(item) {
  if (!item || typeof item !== 'object') return '';
  const fromField = normalizePlayerKey(item.playerKey);
  if (fromField.length === 4) return fromField;
  const legacy = String(item.pin || '')
    .replace(/\D/g, '')
    .slice(0, 4);
  if (legacy.length === 4 && !String(item.pin || '').startsWith('pk_')) {
    return legacy;
  }
  return '';
}

function hasLegacyHashOnly(item) {
  if (!item || typeof item !== 'object') return false;
  if (storedPlainKey(item).length === 4) return false;
  const h = item.playerKeyHash || item.pinHash || '';
  if (hashLooksValid(h)) return true;
  const legacy = String(item.pin || '')
    .replace(/\D/g, '')
    .slice(0, 4);
  return legacy.length === 4 && !String(item.pin || '').startsWith('pk_');
}

function legacyHashValue(item) {
  if (!item || typeof item !== 'object') return '';
  const h = item.playerKeyHash || item.pinHash || '';
  if (hashLooksValid(h)) return h;
  return '';
}

/** One-time verify for POST /save migration from hash-only rows. */
function verifyLegacyHash(inputKey, item) {
  const hash = legacyHashValue(item);
  if (hash) return hashPlayerKey(inputKey) === hash;
  const legacy = String(item.pin || '')
    .replace(/\D/g, '')
    .padStart(4, '0')
    .slice(0, 4);
  if (legacy.length === 4 && !String(item.pin || '').startsWith('pk_')) {
    return normalizePlayerKey(inputKey) === legacy;
  }
  return false;
}

function profileIsProtected(item) {
  if (!item || typeof item !== 'object') return false;
  return !!String(item.profileID || item.id || '').trim();
}

/**
 * Read/login/delete — plain playerKey only.
 * @returns {{ ok: boolean, item?: object, error?: string, status?: number }}
 */
function authorizeProfileAccess(profileID, playerKey, item) {
  if (!item) {
    return { ok: false, error: 'Player not found', status: 404 };
  }

  const key = normalizePlayerKey(playerKey);
  if (key.length !== 4) {
    return { ok: false, error: 'Missing key', status: 401 };
  }

  const stored = storedPlainKey(item);
  if (stored.length !== 4) {
    return { ok: false, error: OLD_FORMAT_MSG, status: 401 };
  }

  if (stored !== key) {
    return { ok: false, error: 'Incorrect key', status: 401 };
  }

  return { ok: true, item };
}

/**
 * POST /save — allow migration when row only has legacy hash.
 */
function authorizeSaveAccess(playerKey, existing) {
  const key = normalizePlayerKey(playerKey);
  if (key.length !== 4) {
    return { ok: false, error: 'Missing key', status: 400 };
  }
  if (!existing) {
    return { ok: true };
  }

  const stored = storedPlainKey(existing);
  if (stored.length === 4) {
    if (stored !== key) {
      return { ok: false, error: 'Incorrect key', status: 401 };
    }
    return { ok: true };
  }

  if (hasLegacyHashOnly(existing)) {
    if (!verifyLegacyHash(key, existing)) {
      return { ok: false, error: 'Incorrect key', status: 401 };
    }
    return { ok: true, migrate: true };
  }

  return { ok: true };
}

module.exports = {
  normalizePlayerKey,
  storedPlainKey,
  authorizeProfileAccess,
  authorizeSaveAccess,
  profileIsProtected,
  OLD_FORMAT_MSG,
  hashPlayerKey,
  hashLooksValid,
};
