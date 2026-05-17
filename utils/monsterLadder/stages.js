import { LADDER_MAIN_LEVELS, LADDER_SUB_LEVELS, LADDER_TOTAL_STAGES } from './ladderConstants';

/** @typedef {'normal'|'hard'|'miniBoss'|'bigBoss'} StageKind */

export function encodeStage(mainLevel, subLevel) {
  const m = Math.max(1, Math.min(LADDER_MAIN_LEVELS, Math.floor(mainLevel || 1)));
  const s = Math.max(1, Math.min(LADDER_SUB_LEVELS, Math.floor(subLevel || 1)));
  return (m - 1) * LADDER_SUB_LEVELS + s;
}

export function decodeStage(stageIndex) {
  const idx = Math.max(1, Math.min(LADDER_TOTAL_STAGES, Math.floor(stageIndex || 1)));
  const mainLevel = Math.floor((idx - 1) / LADDER_SUB_LEVELS) + 1;
  const subLevel = ((idx - 1) % LADDER_SUB_LEVELS) + 1;
  return { mainLevel, subLevel, stageIndex: idx };
}

/** @param {number} subLevel */
export function getStageKind(subLevel) {
  const s = Math.floor(subLevel || 1);
  if (s === 5) return 'miniBoss';
  if (s === 10) return 'bigBoss';
  if (s >= 6) return 'hard';
  return 'normal';
}

export function formatStageLabel(mainLevel, subLevel) {
  return `${mainLevel}-${subLevel}`;
}

export function cpuPowerForStage(stageIndex) {
  const { mainLevel, subLevel } = decodeStage(stageIndex);
  const kind = getStageKind(subLevel);
  let power = 0.72 + mainLevel * 0.028 + subLevel * 0.012;
  if (kind === 'hard') power += 0.06;
  if (kind === 'miniBoss') power += 0.1;
  if (kind === 'bigBoss') power += 0.18;
  return Math.min(1.65, power);
}
