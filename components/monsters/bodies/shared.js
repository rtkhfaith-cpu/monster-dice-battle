/** @typedef {import('../../../art/monsters/monsterRig').MonsterPalette} MonsterPalette */

export const FALLBACK_PALETTE = {
  base: '#a29bfe',
  light: '#dfe6e9',
  dark: '#6c5ce7',
  accent: '#fdcb6e',
  glow: '#ffeaa7',
};

/** @param {MonsterPalette | null | undefined} palette */
export function resolvePalette(palette) {
  return palette && palette.base ? palette : FALLBACK_PALETTE;
}
