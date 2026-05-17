export const ITEM_PERCENT_RANGES = {
  common: { hp: [5, 8], mp: [5, 8], attack: [3, 5], defense: [3, 5], speed: [3, 5] },
  rare: { hp: [8, 12], mp: [8, 12], attack: [6, 9], defense: [6, 9], speed: [6, 9] },
  epic: { hp: [12, 18], mp: [12, 18], attack: [10, 14], defense: [10, 14], speed: [10, 14] },
  legendary: { hp: [18, 25], mp: [18, 25], attack: [15, 20], defense: [15, 20], speed: [15, 20] },
  mythic: { hp: [20, 30], mp: [20, 30], attack: [20, 30], defense: [20, 30], speed: [20, 30] },
};

export const SPECIAL_EFFECT_GUIDELINES = {
  common: 'No special effect or tiny bonus',
  rare: 'One small effect',
  epic: 'One useful effect',
  legendary: 'One strong effect',
  mythic: 'One unique gameplay-changing effect',
};
