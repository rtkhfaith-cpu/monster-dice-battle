/**
 * Per-monster visual identity — themed SVG body, aura, palette, archetype.
 * `themeBody` selects a silhouette in components/monsters/bodies/.
 */

/** @typedef {'kaiju'|'mech'|'alien'|'hybrid'} MonsterArchetype */
/** @typedef {{ base: string, light: string, dark: string, accent: string, glow: string }} MonsterPalette */

/** @type {Record<string, { emoji: string, aura: string, label: string, colorIdx: number, themeBody: string, archetype: MonsterArchetype, palette: MonsterPalette }>} */
export const MONSTER_THEMES = {
  cockroachsaurus: {
    emoji: '🪳',
    aura: '#8d6e63',
    label: 'Cockroach',
    colorIdx: 5,
    themeBody: 'cockroach',
    archetype: 'kaiju',
    palette: { base: '#6d4c41', light: '#a1887f', dark: '#4e342e', accent: '#bcaaa4', glow: '#d7ccc8' },
  },
  chickenzilla: {
    emoji: '🐔',
    aura: '#ffeaa7',
    label: 'Chicken',
    colorIdx: 3,
    themeBody: 'chicken',
    archetype: 'kaiju',
    palette: { base: '#fff8e8', light: '#fffef5', dark: '#f5d6a8', accent: '#e74c3c', glow: '#f39c12' },
  },
  water_bottle_beast: {
    emoji: '💧',
    aura: '#48cae4',
    label: 'Water bottle',
    colorIdx: 6,
    themeBody: 'water_bottle',
    archetype: 'hybrid',
    palette: { base: '#81d4fa', light: '#e3f7ff', dark: '#4fc3f7', accent: '#0984e3', glow: '#48cae4' },
  },
  crocs_goblin: {
    emoji: '🩴',
    aura: '#00b894',
    label: 'Crocs goblin',
    colorIdx: 6,
    themeBody: 'crocs',
    archetype: 'alien',
    palette: { base: '#00b894', light: '#55efc4', dark: '#00896f', accent: '#ffeaa7', glow: '#81ecec' },
  },
  iphone_warrior: {
    emoji: '📱',
    aura: '#b2bec3',
    label: 'iPhone warrior',
    colorIdx: 4,
    themeBody: 'iphone',
    archetype: 'mech',
    palette: { base: '#636e72', light: '#b2bec3', dark: '#2d3436', accent: '#74b9ff', glow: '#ffd166' },
  },
  lunchbox_dragon: {
    emoji: '🍱',
    aura: '#e17055',
    label: 'Lunchbox',
    colorIdx: 2,
    themeBody: 'lunchbox',
    archetype: 'kaiju',
    palette: { base: '#e17055', light: '#fab1a0', dark: '#c0392b', accent: '#f39c12', glow: '#e74c3c' },
  },
  pencil_shark: {
    emoji: '✏️',
    aura: '#fdcb6e',
    label: 'Pencil shark',
    colorIdx: 1,
    themeBody: 'pencil',
    archetype: 'kaiju',
    palette: { base: '#fdcb6e', light: '#ffeaa7', dark: '#e17055', accent: '#e84393', glow: '#f8c291' },
  },
  homework_troll: {
    emoji: '📚',
    aura: '#6c5ce7',
    label: 'Homework',
    colorIdx: 7,
    themeBody: 'homework',
    archetype: 'alien',
    palette: { base: '#6c5ce7', light: '#a29bfe', dark: '#4834d4', accent: '#fd79a8', glow: '#ffeaa7' },
  },
  toilet_paper_ninja: {
    emoji: '🧻',
    aura: '#ecf0f1',
    label: 'Toilet roll',
    colorIdx: 0,
    themeBody: 'toilet_paper',
    archetype: 'alien',
    palette: { base: '#f5f5f5', light: '#ffffff', dark: '#dfe6e9', accent: '#2d3436', glow: '#b2bec3' },
  },
  schoolbag_golem: {
    emoji: '🎒',
    aura: '#e84393',
    label: 'School bag',
    colorIdx: 4,
    themeBody: 'schoolbag',
    archetype: 'mech',
    palette: { base: '#e84393', light: '#fd79a8', dark: '#c0392b', accent: '#ffd166', glow: '#ff6b6b' },
  },
  t_rex: {
    emoji: '🦖',
    aura: '#27ae60',
    label: 'T-Rex',
    colorIdx: 3,
    themeBody: 'trex',
    archetype: 'kaiju',
    palette: { base: '#27ae60', light: '#58d68d', dark: '#1e8449', accent: '#f39c12', glow: '#2ecc71' },
  },
  tablet_wizard: {
    emoji: '📱',
    aura: '#a29bfe',
    label: 'Tablet wizard',
    colorIdx: 7,
    themeBody: 'tablet',
    archetype: 'hybrid',
    palette: { base: '#a29bfe', light: '#dfe6e9', dark: '#6c5ce7', accent: '#48cae4', glow: '#ffeaa7' },
  },
  skibidi_bot: {
    emoji: '🚽',
    aura: '#636e72',
    label: 'Skibidi bot',
    colorIdx: 5,
    themeBody: 'skibidi',
    archetype: 'mech',
    palette: { base: '#f5f5f5', light: '#ffffff', dark: '#b2bec3', accent: '#ffeaa7', glow: '#4fc3f7' },
  },
  bubble_tea_slime: {
    emoji: '🧋',
    aura: '#ff85e4',
    label: 'Bubble tea',
    colorIdx: 7,
    themeBody: 'bubble_tea',
    archetype: 'alien',
    palette: { base: '#ff85e4', light: '#ffc8f0', dark: '#e84393', accent: '#2d3436', glow: '#fd79a8' },
  },
  sixtyseven_rex: {
    emoji: '67',
    aura: '#fd79a8',
    label: '67 Rex',
    colorIdx: 5,
    themeBody: 'sixtyseven',
    archetype: 'kaiju',
    palette: { base: '#fd79a8', light: '#ffb8d0', dark: '#e84393', accent: '#2d3436', glow: '#ffd166' },
  },
};

export function getMonsterTheme(templateId) {
  return (
    MONSTER_THEMES[templateId] ?? {
      emoji: '👾',
      aura: '#a29bfe',
      label: 'Monster',
      themeBody: null,
      archetype: 'kaiju',
      palette: { base: '#a29bfe', light: '#dfe6e9', dark: '#6c5ce7', accent: '#fdcb6e', glow: '#ffeaa7' },
    }
  );
}

/** Merge theme into monster parts for previews and battle. */
export function applyMonsterTheme(templateId, parts, templateMeta = null) {
  const theme = getMonsterTheme(templateId);
  const base = parts && typeof parts === 'object' ? { ...parts } : {};
  const rarity = templateMeta?.rarity ?? base.rarity ?? null;
  return {
    ...base,
    templateId,
    rarity,
    themeEmoji: theme.emoji,
    themeAura: theme.aura,
    themeLabel: theme.label,
    themeBody: theme.themeBody ?? null,
    themeArchetype: theme.archetype ?? 'kaiju',
    themePalette: theme.palette ?? null,
    colorIdx: theme.colorIdx ?? base.colorIdx ?? 0,
  };
}
