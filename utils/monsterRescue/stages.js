import {
  dangerRowForLevel,
  gameTimeSecForLevel,
  moveTimeSecForLevel,
  rescueLevelProgress,
  rowPushEveryForLevel,
} from './difficulty';
import { shapeLetterForLevel } from './openingShapes';

/** @typedef {'normal'|'miniBoss'|'bigBoss'} RescueSubKind */

/**
 * @typedef {{
 *   id: number,
 *   label: string,
 *   colorCount: number,
 *   bgIndex: number,
 * }} RescueThemeDef
 */

/** Six arena themes — each has 10 sub-levels. */
export const RESCUE_THEMES = [
  { id: 1, label: 'Bubble Bay', colorCount: 4, bgIndex: 0 },
  { id: 2, label: 'Coral Cave', colorCount: 4, bgIndex: 1 },
  { id: 3, label: 'Misty Marsh', colorCount: 5, bgIndex: 2 },
  { id: 4, label: 'Crystal Cliffs', colorCount: 5, bgIndex: 0 },
  { id: 5, label: 'Starfall Shrine', colorCount: 6, bgIndex: 1 },
  { id: 6, label: 'Neon Nest', colorCount: 6, bgIndex: 2 },
];

export const RESCUE_SUB_LEVELS = 10;
export const RESCUE_THEME_COUNT = RESCUE_THEMES.length;
export const RESCUE_TOTAL_LEVELS = RESCUE_THEME_COUNT * RESCUE_SUB_LEVELS;

/**
 * @typedef {{
 *   levelId: number,
 *   themeId: number,
 *   subLevel: number,
 *   label: string,
 *   themeLabel: string,
 *   colorCount: number,
 *   fillRows: number,
 *   rowPushEvery: number,
 *   gameTimeSec: number,
 *   moveTimeSec: number,
 *   dangerRow: number,
 *   bgIndex: number,
 *   subKind: RescueSubKind,
 *   openingShape: string,
 * }} RescueStageDef
 */

export function encodeRescueLevel(themeId, subLevel) {
  const t = Math.max(1, Math.min(RESCUE_THEME_COUNT, Math.floor(themeId || 1)));
  const s = Math.max(1, Math.min(RESCUE_SUB_LEVELS, Math.floor(subLevel || 1)));
  return (t - 1) * RESCUE_SUB_LEVELS + s;
}

export function decodeRescueLevel(levelId) {
  const idx = Math.max(1, Math.min(RESCUE_TOTAL_LEVELS, Math.floor(levelId || 1)));
  const themeId = Math.floor((idx - 1) / RESCUE_SUB_LEVELS) + 1;
  const subLevel = ((idx - 1) % RESCUE_SUB_LEVELS) + 1;
  return { themeId, subLevel, levelId: idx };
}

export function getRescueSubKind(subLevel) {
  const s = Math.floor(subLevel || 1);
  if (s === 5) return 'miniBoss';
  if (s === 10) return 'bigBoss';
  return 'normal';
}

export function formatRescueLabel(themeId, subLevel) {
  return `${themeId}-${subLevel}`;
}

function fillRowsForLevel(themeId, subLevel, levelId) {
  const t = rescueLevelProgress(levelId);
  const fromTheme = 3 + Math.floor((themeId - 1) * 0.35);
  const fromSub = Math.ceil(subLevel / 2);
  const blended = 3 + Math.round((fromTheme + fromSub) * 0.5 + t * 2.5);
  return Math.min(9, Math.max(3, blended));
}

/** @param {number} levelId Flat level 1–60 */
export function getRescueStage(levelId) {
  const { themeId, subLevel, levelId: id } = decodeRescueLevel(levelId);
  const theme = RESCUE_THEMES.find((t) => t.id === themeId) ?? RESCUE_THEMES[0];
  const subKind = getRescueSubKind(subLevel);
  return {
    levelId: id,
    themeId,
    subLevel,
    label: `${theme.label} · ${formatRescueLabel(themeId, subLevel)}`,
    themeLabel: theme.label,
    colorCount: theme.colorCount,
    fillRows: fillRowsForLevel(themeId, subLevel, id),
    rowPushEvery: rowPushEveryForLevel(id),
    gameTimeSec: gameTimeSecForLevel(id),
    moveTimeSec: moveTimeSecForLevel(id),
    dangerRow: dangerRowForLevel(id),
    bgIndex: theme.bgIndex,
    subKind,
    openingShape: shapeLetterForLevel(id),
  };
}

/** @deprecated Use getRescueStage — kept for flat stage list in hub */
export const RESCUE_STAGES = Array.from({ length: RESCUE_TOTAL_LEVELS }, (_, i) =>
  getRescueStage(i + 1)
);

export function rescueSubBanner(subKind) {
  if (subKind === 'miniBoss') return 'Gear chest stage';
  if (subKind === 'bigBoss') return 'Monster chest stage';
  return '';
}
