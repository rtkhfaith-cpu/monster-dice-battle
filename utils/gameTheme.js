/**
 * Pastel handheld-style palette — lobby (cozy) vs battle (vibrant).
 */
export const LOBBY = {
  shell: '#b8d4f0',
  shellBorder: '#8eb8dc',
  panel: 'rgba(255, 255, 255, 0.94)',
  panelBorder: '#c5d5e8',
  card: '#f7f9fc',
  cardBorder: '#d8e2ef',
  cardActive: '#fff8e8',
  cardActiveBorder: '#f4c56a',
  text: '#3d4f63',
  textStrong: '#2a3544',
  textMuted: '#6b7c93',
  accent: '#7ec8a8',
  accentStrong: '#5cb88a',
  chip: '#e8f0fa',
  chipAlt: '#dceefb',
  warn: '#f5b8b0',
  coin: '#e89b4a',
  start: '#6ecf8a',
  startBorder: '#4aad6e',
  shadow: 'rgba(61, 79, 99, 0.12)',
};

export const BATTLE = {
  arenaSky: '#7ec8f5',
  arenaSkyDeep: '#5eb0e8',
  arenaGrass: '#8fd48a',
  arenaGrassDark: '#6fbf6a',
  dock: '#3d4a5c',
  dockBorder: '#2a3340',
  textLight: '#f5f0e6',
  accent: '#ff9f6b',
  diceReady: '#fff8ef',
  diceBorder: '#d4c4a8',
};

export const panelShadow = {
  shadowColor: LOBBY.shadow,
  shadowOffset: { width: 0, height: 3 },
  shadowOpacity: 1,
  shadowRadius: 6,
  elevation: 3,
};
