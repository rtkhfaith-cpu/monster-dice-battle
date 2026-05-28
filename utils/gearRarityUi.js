/**
 * Gear rarity colours — aligned with monster RARITY_UI.
 */
import { RARITY_UI } from './monsterTemplates';

export function gearRarityUi(rarity) {
  const ui = RARITY_UI[rarity] ?? RARITY_UI.rare;
  return {
    label: ui.label ?? rarity,
    color: ui.border,
    border: ui.border,
    chipBg: ui.chipBg,
    chipFg: ui.chipFg,
  };
}

export function gearRarityColor(rarity) {
  return gearRarityUi(rarity).color;
}
