/**
 * Shared 4-digit Player Key hash — must match utils/playerKey.js in the React app.
 */

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

function storedHash(item) {
  if (!item || typeof item !== 'object') return '';
  const a = item.playerKeyHash || item.pinHash || '';
  if (hashLooksValid(a)) return a;
  if (hashLooksValid(item.pin)) return item.pin;
  return a || '';
}

/** Profile row has a stored key (hash or legacy 4-digit pin). */
function hasStoredKey(item) {
  if (!item || typeof item !== 'object') return false;
  if (hashLooksValid(storedHash(item))) return true;
  const legacy = String(item.pin || '')
    .replace(/\D/g, '')
    .slice(0, 4);
  return legacy.length === 4 && !String(item.pin || '').startsWith('pk_');
}

function profileHasSaveData(item) {
  if (!item || typeof item !== 'object') return false;
  const monsters = Array.isArray(item.monsters)
    ? item.monsters
    : Array.isArray(item.ownedMonsters)
      ? item.ownedMonsters
      : [];
  if (monsters.length > 0) return true;
  if (typeof item.coins === 'number' && item.coins > 0) return true;
  if (item.selectedMonsterId) return true;
  return false;
}

/** Any DynamoDB player row requires the correct key — no anonymous access. */
function profileIsProtected(item) {
  if (!item || typeof item !== 'object') return false;
  const id = String(item.profileID || item.id || '').trim();
  return !!id;
}

function verifyPlayerKey(inputKey, item) {
  if (!item || typeof item !== 'object') return false;

  const hash = storedHash(item);
  if (hashLooksValid(hash)) {
    return hashPlayerKey(inputKey) === hash;
  }

  const legacy = String(item.pin || '')
    .replace(/\D/g, '')
    .padStart(4, '0')
    .slice(0, 4);
  if (legacy.length !== 4 || String(item.pin || '').startsWith('pk_')) {
    return false;
  }
  return normalizePlayerKey(inputKey) === legacy;
}

module.exports = {
  normalizePlayerKey,
  hashPlayerKey,
  hashLooksValid,
  storedHash,
  verifyPlayerKey,
  hasStoredKey,
  profileHasSaveData,
  profileIsProtected,
};
