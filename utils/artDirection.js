/**
 * “Cute Cinematic Kaiju Battler” — single visual identity source.
 * Apply these tokens everywhere; do not invent one-off colours in screens.
 */

export const ART = {
  name: 'Cute Cinematic Kaiju Battler',

  /** Ink & depth */
  outline: '#2d3561',
  outlineSoft: '#4a5578',
  shadow: 'rgba(45, 53, 97, 0.28)',
  shadowDeep: 'rgba(20, 26, 48, 0.42)',
  highlight: 'rgba(255, 255, 255, 0.62)',
  rimLight: 'rgba(255, 255, 255, 0.48)',
  subsurface: 'rgba(255, 158, 181, 0.5)',

  /** Pastel arcade palette */
  skyTop: '#b8e8fc',
  skyMid: '#8ecdf5',
  skyGlow: '#fff4b0',
  grassLight: '#9ee8a8',
  grassMid: '#7ed99a',
  grassDark: '#5cb878',
  arenaPlatform: 'rgba(255, 255, 255, 0.18)',

  /** UI */
  panelFill: 'rgba(255, 255, 255, 0.94)',
  panelBorder: '#3d5a80',
  panelAccent: '#ff9f6b',
  textInk: '#1a2a3a',
  textMuted: '#5a6d82',
  coin: '#f4a261',
  hp: '#4ecdc4',
  mp: '#7b6cf6',
  danger: '#ff6b6b',
  crit: '#ffd166',

  /** Battle dock */
  dock: '#1e2438',
  dockEdge: '#ff9f6b',
  btnFight: '#ff4757',
  btnMagic: '#9b59b6',
  btnDefend: '#48cae4',
  btnRun: '#b8c5d6',

  /** Timing (ms) — game feel */
  windup: 520,
  strike: 380,
  hitStop: 85,
  hitStopCrit: 110,
  returnPose: 320,

  /** Radii — soft chunky UI */
  radiusSm: 10,
  radiusMd: 14,
  radiusLg: 20,
  radiusPill: 999,
};

/** Layered panel — avoids flat admin-card look */
export function gamePanelStyle(accent = ART.panelBorder) {
  return {
    backgroundColor: ART.panelFill,
    borderRadius: ART.radiusLg,
    borderWidth: 3,
    borderColor: accent,
    shadowColor: ART.shadowDeep,
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 6,
  };
}

export function arcadeButtonDepth(faceColor, edgeColor) {
  return {
    borderRadius: ART.radiusMd,
    paddingBottom: 5,
    backgroundColor: edgeColor,
  };
}
