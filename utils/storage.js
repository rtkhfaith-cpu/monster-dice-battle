/**
 * Legacy shim — cosmetics strip UI reads coins + cosmetic arrays here.
 * Source of truth is gameStorage.loadGameData().
 */
import { activeWallet, loadGameData, saveGameData } from './gameStorage';

export function defaultProgress() {
  return {
    coins: 0,
    owned: [],
    equippedP1: [],
    equippedP2: [],
  };
}

/** @returns {Promise<{ coins: number, owned: string[], equippedP1: string[], equippedP2: string[] }>} */
export async function loadProgress() {
  try {
    const gd = await loadGameData();
    const w = activeWallet(gd);
    return {
      coins: typeof w.coins === 'number' ? w.coins : 0,
      owned: Array.isArray(w.cosmeticsOwned) ? w.cosmeticsOwned.filter((x) => typeof x === 'string') : [],
      equippedP1: Array.isArray(w.cosmeticEquippedP1) ? w.cosmeticEquippedP1.slice(0, 8) : [],
      equippedP2: Array.isArray(w.cosmeticEquippedP2) ? w.cosmeticEquippedP2.slice(0, 8) : [],
    };
  } catch {
    return defaultProgress();
  }
}

/**
 * @param {{ coins: number, owned: string[], equippedP1: string[], equippedP2: string[] }} data
 */
export async function saveProgress(data) {
  const gd = await loadGameData();
  const w = activeWallet(gd);
  w.coins = Math.max(0, typeof data.coins === 'number' ? data.coins : w.coins);
  w.cosmeticsOwned = [...new Set((data.owned || []).filter((x) => typeof x === 'string'))];
  w.cosmeticEquippedP1 = (data.equippedP1 || []).slice(0, 8);
  w.cosmeticEquippedP2 = (data.equippedP2 || []).slice(0, 8);
  await saveGameData(gd);
}
