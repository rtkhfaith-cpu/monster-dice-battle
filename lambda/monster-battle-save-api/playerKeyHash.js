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

/** Profile row has any key material stored (hash or legacy pin). */
function hasStoredKey(item) {
  if (!item || typeof item !== 'object') return false;
  const saved = item.pinHash || item.playerKeyHash;
  if (saved && String(saved).trim()) return true;
  const legacy = String(item.pin || '')
    .replace(/\D/g, '')
    .slice(0, 4);
  return legacy.length === 4;
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

/** Cloud row must not be loaded/deleted without the correct key. */
function profileIsProtected(item) {
  return hasStoredKey(item) || profileHasSaveData(item);
}

function verifyPlayerKey(inputKey, item) {
  if (!item || typeof item !== 'object') return false;
  const saved = item.pinHash || item.playerKeyHash;
  if (hashLooksValid(saved)) {
    return hashPlayerKey(inputKey) === saved;
  }
  const legacy = String(item.pin || '')
    .replace(/\D/g, '')
    .padStart(4, '0')
    .slice(0, 4);
  return normalizePlayerKey(inputKey) === legacy;
}

/** First-time lock only — never call after a failed verify. */
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
  profileHasSaveData,
  profileIsProtected,
  applyKeyToItem,
};
