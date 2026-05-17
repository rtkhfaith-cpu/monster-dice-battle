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
  return !!(saved && String(saved).startsWith('pk_') && String(saved).length >= 12);
}

function hasStoredKey(item) {
  if (!item || typeof item !== 'object') return false;
  const saved = item.pinHash || item.playerKeyHash;
  if (hashLooksValid(saved)) return true;
  const legacy = String(item.pin || '')
    .replace(/\D/g, '')
    .slice(0, 4);
  return legacy.length === 4;
}

function verifyPlayerKey(inputKey, item) {
  if (!item || typeof item !== 'object') return false;
  const saved = item.pinHash || item.playerKeyHash;
  if (hashLooksValid(saved)) {
    return hashPlayerKey(inputKey) === saved;
  }
  const legacy = String(item.pin || saved || '')
    .replace(/\D/g, '')
    .padStart(4, '0')
    .slice(0, 4);
  return normalizePlayerKey(inputKey) === legacy;
}

/** Attach hashed key when cloud row was saved without one (legacy / first sync). */
function applyKeyToItem(item, inputKey) {
  const hash = hashPlayerKey(inputKey);
  if (!hash) return item;
  return {
    ...item,
    playerKeyHash: hash,
    pinHash: hash,
    pin: undefined,
  };
}

module.exports = {
  normalizePlayerKey,
  hashPlayerKey,
  hashLooksValid,
  verifyPlayerKey,
  hasStoredKey,
  applyKeyToItem,
};
