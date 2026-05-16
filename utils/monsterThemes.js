/**
 * Per-monster visual identity — themed SVG body, aura, and palette.
 * `themeBody` selects a silhouette in themedMonsterBodies.js.
 */
export const MONSTER_THEMES = {
  cockroachsaurus: {
    emoji: '🪳',
    aura: '#8d6e63',
    label: 'Cockroach',
    colorIdx: 5,
    themeBody: 'cockroach',
  },
  chickenzilla: {
    emoji: '🐔',
    aura: '#ffeaa7',
    label: 'Chicken',
    colorIdx: 3,
    themeBody: 'chicken',
  },
  water_bottle_beast: {
    emoji: '💧',
    aura: '#48cae4',
    label: 'Water bottle',
    colorIdx: 6,
    themeBody: 'water_bottle',
  },
  crocs_goblin: {
    emoji: '🩴',
    aura: '#00b894',
    label: 'Crocs goblin',
    colorIdx: 6,
    themeBody: 'crocs',
  },
  iphone_warrior: {
    emoji: '📱',
    aura: '#b2bec3',
    label: 'iPhone warrior',
    colorIdx: 4,
    themeBody: 'iphone',
  },
  lunchbox_dragon: {
    emoji: '🍱',
    aura: '#e17055',
    label: 'Lunchbox',
    colorIdx: 2,
    themeBody: 'lunchbox',
  },
  pencil_shark: {
    emoji: '✏️',
    aura: '#fdcb6e',
    label: 'Pencil shark',
    colorIdx: 1,
    themeBody: 'pencil',
  },
  homework_troll: {
    emoji: '📚',
    aura: '#6c5ce7',
    label: 'Homework',
    colorIdx: 7,
    themeBody: 'homework',
  },
  toilet_paper_ninja: {
    emoji: '🧻',
    aura: '#ecf0f1',
    label: 'Toilet roll',
    colorIdx: 0,
    themeBody: 'toilet_paper',
  },
  schoolbag_golem: {
    emoji: '🎒',
    aura: '#e84393',
    label: 'School bag',
    colorIdx: 4,
    themeBody: 'schoolbag',
  },
  t_rex: {
    emoji: '🦖',
    aura: '#27ae60',
    label: 'T-Rex',
    colorIdx: 3,
    themeBody: 'trex',
  },
  tablet_wizard: {
    emoji: '📱',
    aura: '#a29bfe',
    label: 'Tablet wizard',
    colorIdx: 7,
    themeBody: 'tablet',
  },
  skibidi_bot: {
    emoji: '🚽',
    aura: '#636e72',
    label: 'Skibidi bot',
    colorIdx: 5,
    themeBody: 'skibidi',
  },
  bubble_tea_slime: {
    emoji: '🧋',
    aura: '#ff85e4',
    label: 'Bubble tea',
    colorIdx: 7,
    themeBody: 'bubble_tea',
  },
  sixtyseven_rex: {
    emoji: '67',
    aura: '#fd79a8',
    label: '67 Rex',
    colorIdx: 5,
    themeBody: 'sixtyseven',
  },
};

export function getMonsterTheme(templateId) {
  return MONSTER_THEMES[templateId] ?? { emoji: '👾', aura: '#a29bfe', label: 'Monster', themeBody: null };
}

/** Merge theme into monster parts for previews and battle. */
export function applyMonsterTheme(templateId, parts) {
  const theme = getMonsterTheme(templateId);
  const base = parts && typeof parts === 'object' ? { ...parts } : {};
  return {
    ...base,
    templateId,
    themeEmoji: theme.emoji,
    themeAura: theme.aura,
    themeLabel: theme.label,
    themeBody: theme.themeBody ?? null,
    colorIdx: theme.colorIdx ?? base.colorIdx ?? 0,
  };
}
