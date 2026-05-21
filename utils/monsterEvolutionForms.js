/**
 * Named evolution forms per monster — visual tiers at levels 1, 10, 25, 50.
 */

/** @typedef {{ tier: number, name: string, tagline: string }} MonsterEvolutionForm */

/** @type {Record<string, MonsterEvolutionForm[]>} */
export const MONSTER_EVOLUTION_FORMS = {
  cockroachsaurus: [
    { tier: 0, name: 'Larvach', tagline: 'Tiny skitter, big appetite' },
    { tier: 1, name: 'Roachling', tagline: 'Wing buds and chrome spots' },
    { tier: 2, name: 'Plaguewing', tagline: 'Armored shell, buzzing wings' },
    { tier: 3, name: 'Chromosaurus', tagline: 'Mega bug-kaiju apex' },
  ],
  chickenzilla: [
    { tier: 0, name: 'Peepzilla', tagline: 'Fluffy chaos egg' },
    { tier: 1, name: 'Cluckling', tagline: 'Sharper beak, longer legs' },
    { tier: 2, name: 'Thundercluck', tagline: 'Crest flare and iron feathers' },
    { tier: 3, name: 'Megachicken', tagline: 'Sky-dominating barnyard titan' },
  ],
  water_bottle_beast: [
    { tier: 0, name: 'Driplet', tagline: 'Half-full optimism' },
    { tier: 1, name: 'Splashling', tagline: 'Crackle cap and wave arms' },
    { tier: 2, name: 'Tidal Flask', tagline: 'Reinforced bottle armor' },
    { tier: 3, name: 'Hydro Colossus', tagline: 'Tsunami in a cylinder' },
  ],
  crocs_goblin: [
    { tier: 0, name: 'Goblinette', tagline: 'Squeaky sole gremlin' },
    { tier: 1, name: 'Stride Goblin', tagline: 'Dual-strap swagger' },
    { tier: 2, name: 'Croc Commander', tagline: 'Spiked charms and horns' },
    { tier: 3, name: 'Footlord', tagline: 'Legendary comfort tyrant' },
  ],
  iphone_warrior: [
    { tier: 0, name: 'Apprentice v1', tagline: 'Cracked screen courage' },
    { tier: 1, name: 'Soldier OS', tagline: 'Camera bump blade guard' },
    { tier: 2, name: 'Pro Max Knight', tagline: 'Titanium plates online' },
    { tier: 3, name: 'Titan Phone', tagline: '5G fortress mode' },
  ],
  lunchbox_dragon: [
    { tier: 0, name: 'Snackling', tagline: 'Lid barely closed' },
    { tier: 1, name: 'Bento Drake', tagline: 'Steam vents and spork tail' },
    { tier: 2, name: 'Thermo Wyrm', tagline: 'Insulated scale plates' },
    { tier: 3, name: 'Cafeteria King', tagline: 'Legendary lunch aura' },
  ],
  pencil_shark: [
    { tier: 0, name: 'Graphite Pup', tagline: 'Dull tip, sharp attitude' },
    { tier: 1, name: 'Shark Lead', tagline: 'Eraser fin and stripe hide' },
    { tier: 2, name: 'No.2 Ravager', tagline: 'Metal ferrule jaws' },
    { tier: 3, name: 'Marksman Leviathan', tagline: 'Draws blood in ink' },
  ],
  homework_troll: [
    { tier: 0, name: 'Doodle Imp', tagline: 'One page of dread' },
    { tier: 1, name: 'Essay Troll', tagline: 'Stapled armor stacks' },
    { tier: 2, name: 'Midterm Beast', tagline: 'Red-pen horns' },
    { tier: 3, name: 'Final Boss Binder', tagline: 'Due date apocalypse' },
  ],
  toilet_paper_ninja: [
    { tier: 0, name: 'Single Ply', tagline: 'Quiet but deadly' },
    { tier: 1, name: 'Roll Shinobi', tagline: 'Twin scroll arms' },
    { tier: 2, name: 'Ultra Quilt', tagline: 'Layered soft armor' },
    { tier: 3, name: 'Charmin Grandmaster', tagline: 'Unroll the heavens' },
  ],
  schoolbag_golem: [
    { tier: 0, name: 'Zipling', tagline: 'One strap, many regrets' },
    { tier: 1, name: 'Pack Golem', tagline: 'Extra pockets bulge' },
    { tier: 2, name: 'Locker Titan', tagline: 'Reinforced buckle plates' },
    { tier: 3, name: 'Backpack Colossus', tagline: 'Carries entire semesters' },
  ],
  t_rex: [
    { tier: 0, name: 'Rexlet', tagline: 'Tiny arms, huge dreams' },
    { tier: 1, name: 'Chomp Rex', tagline: 'Jaw widens, tail spikes' },
    { tier: 2, name: 'Fossil King', tagline: 'Bone ridges and lava scars' },
    { tier: 3, name: 'Tyrant Megarex', tagline: 'Jurassic nightmare form' },
  ],
  tablet_wizard: [
    { tier: 0, name: 'Apprentice Pad', tagline: 'Low battery spells' },
    { tier: 1, name: 'Arcane Slate', tagline: 'Floating glyph ring' },
    { tier: 2, name: 'Runescribe', tagline: 'Crystal stylus horns' },
    { tier: 3, name: 'Archmage Display', tagline: 'Reality bends at 120Hz' },
  ],
  skibidi_bot: [
    { tier: 0, name: 'Flushling', tagline: 'Bowl-born mischief' },
    { tier: 1, name: 'Head Cam Unit', tagline: 'Extra pipe limbs' },
    { tier: 2, name: 'Skibidi Prime', tagline: 'Chrome lid crown' },
    { tier: 3, name: 'Titan Toilet', tagline: 'City-shaking flush' },
  ],
  bubble_tea_slime: [
    { tier: 0, name: 'Boba Blob', tagline: 'Chewy and chaotic' },
    { tier: 1, name: 'Pearl Slime', tagline: 'Tapioca armor pearls' },
    { tier: 2, name: 'Milkwave', tagline: 'Swirl crown and wide cup' },
    { tier: 3, name: 'Emperor Boba', tagline: 'Legendary sweetness tsunami' },
  ],
  sixtyseven_rex: [
    { tier: 0, name: 'Sixling', tagline: 'Meme hatchling' },
    { tier: 1, name: 'Seven Rex', tagline: 'Numbers glow brighter' },
    { tier: 2, name: 'Sixty Champ', tagline: 'Neon ridge plates' },
    { tier: 3, name: '67 Overlord', tagline: 'Peak internet evolution' },
  ],
  goldzilla: [
    { tier: 0, name: 'Bullion Hatch', tagline: 'Pocket change kaiju' },
    { tier: 1, name: 'Market Rex', tagline: 'Charts glow green' },
    { tier: 2, name: 'Titan Tycoon', tagline: 'Gold plating thickens' },
    { tier: 3, name: 'Goldzilla Prime', tagline: 'Peak billionaire evolution' },
  ],
};

const DEFAULT_FORMS = [
  { tier: 0, name: 'Baby Form', tagline: 'Just hatched' },
  { tier: 1, name: 'Growing Form', tagline: 'Level 10 growth spurt' },
  { tier: 2, name: 'Strong Form', tagline: 'Level 25 power-up' },
  { tier: 3, name: 'Mega Form', tagline: 'Level 50 ascension' },
];

/** @param {string} templateId */
/** @param {number} visualTier 0–3 */
export function evolutionFormForMonster(templateId, visualTier = 0) {
  const forms = MONSTER_EVOLUTION_FORMS[templateId] ?? DEFAULT_FORMS;
  const tier = Math.min(3, Math.max(0, Math.floor(visualTier || 0)));
  return forms.find((f) => f.tier === tier) ?? forms[0] ?? DEFAULT_FORMS[0];
}
