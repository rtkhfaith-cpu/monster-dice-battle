/**
 * Theme tokens — derived from art direction bible.
 */
import { ART, gamePanelStyle } from './artDirection';

export const LOBBY = {
  shell: ART.skyMid,
  shellBorder: '#6ba8d4',
  panel: ART.panelFill,
  panelBorder: '#c5d5e8',
  card: '#f7f9fc',
  cardBorder: '#d8e2ef',
  cardActive: '#fff8e8',
  cardActiveBorder: ART.coin,
  text: ART.textMuted,
  textStrong: ART.textInk,
  textMuted: '#6b7c93',
  accent: ART.grassMid,
  accentStrong: ART.grassDark,
  chip: '#e8f4ff',
  chipAlt: '#dceefb',
  warn: '#f5b8b0',
  coin: ART.coin,
  start: ART.grassMid,
  startBorder: ART.grassDark,
  shadow: ART.shadow,
};

export const BATTLE = {
  arenaSky: ART.skyMid,
  arenaSkyDeep: '#6eb8e8',
  arenaGrass: ART.grassLight,
  arenaGrassDark: ART.grassDark,
  dock: ART.dock,
  dockBorder: ART.dockEdge,
  textLight: '#fff9f0',
  accent: ART.panelAccent,
  diceReady: '#fff8ef',
  diceBorder: '#d4c4a8',
  hp: ART.hp,
  mp: ART.mp,
  crit: ART.crit,
};

export const panelShadow = {
  shadowColor: ART.shadow,
  shadowOffset: { width: 0, height: 4 },
  shadowOpacity: 1,
  shadowRadius: 8,
  elevation: 4,
};

export { ART, gamePanelStyle };
