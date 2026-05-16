export const CHAOS_EVENT_IDS = {
  MUMMY: 'mummy',
  RAIN: 'rain',
  TOILET: 'toilet',
  AH_MA: 'ahMa',
  HOMEWORK: 'homework',
  SNACK: 'snack',
};

/** @type {{ id: string, title: string, emoji: string, blurb: string }[]} */
export const CHAOS_EVENTS = [
  {
    id: CHAOS_EVENT_IDS.MUMMY,
    title: 'Mummy Enters Room',
    emoji: '🧕',
    blurb: 'Everyone freezes! Next hit deals −30% damage.',
  },
  {
    id: CHAOS_EVENT_IDS.RAIN,
    title: 'Rainstorm!',
    emoji: '🌧️',
    blurb: 'Water splashes harder. Fire fizzles a bit.',
  },
  {
    id: CHAOS_EVENT_IDS.TOILET,
    title: 'Toilet Explosion',
    emoji: '🚽',
    blurb: 'Plumbing chaos! Both take 10 splash damage.',
  },
  {
    id: CHAOS_EVENT_IDS.AH_MA,
    title: 'Ah Ma Appears',
    emoji: '👵',
    blurb: 'Nagging strike! Both lose 5 MP.',
  },
  {
    id: CHAOS_EVENT_IDS.HOMEWORK,
    title: 'Homework Monster',
    emoji: '📚',
    blurb: 'Due tomorrow! The attacker loses their turn.',
  },
  {
    id: CHAOS_EVENT_IDS.SNACK,
    title: 'Snack Time',
    emoji: '🍿',
    blurb: 'Both monsters munch +10 HP.',
  },
];

export function pickRandomChaosEvent() {
  return CHAOS_EVENTS[Math.floor(Math.random() * CHAOS_EVENTS.length)];
}

/**
 * Persisted modifiers for this battle round after chaos resolves.
 */
export function rulesForChaosEvent(ev) {
  switch (ev.id) {
    case CHAOS_EVENT_IDS.MUMMY:
      return { mummyNext: true };
    case CHAOS_EVENT_IDS.RAIN:
      return { rain: true };
    case CHAOS_EVENT_IDS.HOMEWORK:
      return { skipAttackerTurn: true };
    default:
      return {};
  }
}
