/**
 * Evolution tiers by monster level — drives visuals & celebration timing.
 */

/** @typedef {{ key: string, label: string, tierIndex: number, minLevel: number, maxLevel: number }} EvolutionStage */

/** @type {EvolutionStage[]} */
export const EVOLUTION_STAGES = [
  { key: 'baby', label: 'Baby Form', tierIndex: 0, minLevel: 1, maxLevel: 9 },
  { key: 'growing', label: 'Growing Form', tierIndex: 1, minLevel: 10, maxLevel: 24 },
  { key: 'strong', label: 'Strong Form', tierIndex: 2, minLevel: 25, maxLevel: 49 },
  { key: 'mega', label: 'Mega Form', tierIndex: 3, minLevel: 50, maxLevel: 74 },
  { key: 'ultra', label: 'Ultra Form', tierIndex: 4, minLevel: 75, maxLevel: 99 },
  { key: 'max', label: 'Max Form', tierIndex: 5, minLevel: 100, maxLevel: 999 },
];

/** @param {number} level */
export function evolutionStageFromLevel(level) {
  const lv = Math.max(1, Math.floor(level || 1));
  const hit = [...EVOLUTION_STAGES].reverse().find((s) => lv >= s.minLevel);
  return hit ?? EVOLUTION_STAGES[0];
}

/** Visual intensity 0–1 inside tier */
export function tierVisualIntensity(level, stage = evolutionStageFromLevel(level)) {
  const span = Math.max(1, stage.maxLevel - stage.minLevel + 1);
  const progress = (Math.min(stage.maxLevel, Math.max(stage.minLevel, level)) - stage.minLevel) / span;
  return Math.min(1, Math.max(0, progress));
}
