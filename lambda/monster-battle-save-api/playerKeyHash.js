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

function verifyPlayerKey(inputKey, item) {
  if (!item || typeof item !== 'object') return false;
  const saved = item.pinHash || item.playerKeyHash;
  if (saved && String(saved).startsWith('pk_')) {
    return hashPlayerKey(inputKey) === saved;
  }
  const legacy = String(item.pin || saved || '')
    .replace(/\D/g, '')
    .padStart(4, '0')
    .slice(0, 4);
  return normalizePlayerKey(inputKey) === legacy;
}

module.exports = { normalizePlayerKey, hashPlayerKey, verifyPlayerKey };
