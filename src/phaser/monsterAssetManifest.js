export const NORMAL_MONSTER_ASSETS = {
  skibidi_bot: {
    key: 'monster-normal-skibidi-bot',
    path: '/assets/monsters/normal/skibidi-bot/idle.png',
    mirrorSafe: false,
  },
  bubble_tea_slime: {
    key: 'monster-normal-bubble-tea-slime',
    path: '/assets/monsters/normal/bubble-tea-slime/idle.png',
    mirrorSafe: false,
  },
  sixtyseven_rex: {
    key: 'monster-normal-67-rex',
    path: '/assets/monsters/normal/67-rex/idle.png',
    mirrorSafe: false,
  },
  schoolbag_golem: {
    key: 'monster-normal-schoolbag-golem',
    path: '/assets/monsters/normal/schoolbag-golem/idle.png',
    mirrorSafe: false,
  },
  t_rex: {
    key: 'monster-normal-t-rex',
    path: '/assets/monsters/normal/t-rex/idle.png',
    mirrorSafe: false,
  },
  tablet_wizard: {
    key: 'monster-normal-tablet-wizard',
    path: '/assets/monsters/normal/tablet-wizard/idle.png',
    mirrorSafe: false,
  },
  pencil_shark: {
    key: 'monster-normal-pencil-shark',
    path: '/assets/monsters/normal/pencil-shark/idle.png',
    mirrorSafe: false,
  },
  homework_troll: {
    key: 'monster-normal-homework-troll',
    path: '/assets/monsters/normal/homework-troll/idle.png',
    mirrorSafe: false,
  },
  toilet_paper_ninja: {
    key: 'monster-normal-toilet-paper-ninja',
    path: '/assets/monsters/normal/toilet-paper-ninja/idle.png',
    mirrorSafe: false,
  },
  crocs_goblin: {
    key: 'monster-normal-crocs-goblin',
    path: '/assets/monsters/normal/crocs-goblin/idle.png',
    mirrorSafe: false,
  },
  iphone_warrior: {
    key: 'monster-normal-iphone-warrior',
    path: '/assets/monsters/normal/iphone-warrior/idle.png',
    mirrorSafe: false,
  },
  lunchbox_dragon: {
    key: 'monster-normal-lunchbox-dragon',
    path: '/assets/monsters/normal/lunchbox-dragon/idle.png',
    mirrorSafe: false,
  },
  cockroachsaurus: {
    key: 'monster-normal-cockroachsaurus',
    path: '/assets/monsters/normal/cockroachsaurus/idle.png',
    mirrorSafe: false,
  },
  chickenzilla: {
    key: 'monster-normal-chickenzilla',
    path: '/assets/monsters/normal/chickenzilla/idle.png',
    mirrorSafe: false,
  },
  water_bottle_beast: {
    key: 'monster-normal-water-bottle-beast',
    path: '/assets/monsters/normal/water-bottle-beast/idle.png',
    mirrorSafe: false,
  },
};

export function getNormalMonsterAsset(templateId) {
  return NORMAL_MONSTER_ASSETS[templateId] ?? null;
}
