/**
 * Monster Ladder — 25 floor regions (from docs/regions).
 */

export const LADDER_FLOOR_COUNT = 25;

/** @typedef {{
 *   floor: number,
 *   id: string,
 *   name: string,
 *   boss: string,
 *   miniBoss: string,
 *   exclusive: string,
 *   corruption: string,
 *   musicStyle: string,
 *   tagline: string,
 *   coinReward: number,
 *   expBonus: number,
 *   cpuPower: number,
 * }} LadderRegion
 */

/** @type {LadderRegion[]} */
export const LADDER_REGIONS = [
  { floor: 1, id: 'glitch_alley', name: 'Glitch Alley', boss: 'The Infinite Sale', miniBoss: 'Terms & Conditions', exclusive: 'Clickbaitling', corruption: 'UI Bleed', musicStyle: 'Lo-fi glitch', tagline: 'Where the world learned polite manipulation.', coinReward: 18, expBonus: 8, cpuPower: 0.78 },
  { floor: 2, id: 'sewer_depths', name: 'Sewer Depths', boss: 'King Flush', miniBoss: 'The Clogfather', exclusive: 'Sewer Sundae', corruption: 'Bio-Feedback', musicStyle: 'Bubble techno', tagline: 'Fast-food runoff runs deep.', coinReward: 22, expBonus: 10, cpuPower: 0.81 },
  { floor: 3, id: 'fast_food_kingdom', name: 'Fast Food Kingdom', boss: 'Emperor McRot', miniBoss: 'The Upsell Angel', exclusive: 'Burgerwraith', corruption: 'Caloric Curse', musicStyle: 'Kitchen trap', tagline: 'The kingdom serves all. Literally.', coinReward: 26, expBonus: 12, cpuPower: 0.84 },
  { floor: 4, id: 'haunted_mall', name: 'Haunted Mall', boss: 'The Last Anchor Store', miniBoss: 'Refund Denied', exclusive: 'Mannequin Heart', corruption: 'Consumer Ghosting', musicStyle: 'Vapor mall pop', tagline: 'Nostalgia weaponized.', coinReward: 30, expBonus: 12, cpuPower: 0.87 },
  { floor: 5, id: 'tech_apocalypse', name: 'Tech Apocalypse Yard', boss: 'The Landfill Titan', miniBoss: 'Blue Screen Beast', exclusive: 'ROM Ghoul', corruption: 'Overheat', musicStyle: 'Industrial glitch', tagline: 'The upgrade cycle stood up.', coinReward: 34, expBonus: 14, cpuPower: 0.9 },
  { floor: 6, id: 'broken_internet', name: 'Broken Internet Realm', boss: 'The Eternal Buffer', miniBoss: 'Captcha Oracle', exclusive: 'Lagling', corruption: 'Lag', musicStyle: 'Hyperpop buffer', tagline: 'Thoughts that never load.', coinReward: 38, expBonus: 14, cpuPower: 0.93 },
  { floor: 7, id: 'frozen_dessert', name: 'Frozen Dessert Factory', boss: 'Cryo Cream Colossus', miniBoss: 'Soft Serve Pope', exclusive: 'Meltdown Pop', corruption: 'Brainfreeze', musicStyle: 'Music-box trap', tagline: 'Manufactured joy freezes hearts.', coinReward: 42, expBonus: 16, cpuPower: 0.96 },
  { floor: 8, id: 'influencer_grove', name: 'Influencer Grove', boss: 'Queen Algorithmia', miniBoss: 'Sponsored Dryad', exclusive: 'Cloutopus', corruption: 'Vanity Pollen', musicStyle: 'Tropical toxic pop', tagline: 'Beauty that bites.', coinReward: 46, expBonus: 16, cpuPower: 0.99 },
  { floor: 9, id: 'streaming_city', name: 'Abandoned Streaming City', boss: 'The Offline God', miniBoss: 'The Moderator', exclusive: 'Streamwraith', corruption: 'Parasocial Drain', musicStyle: 'Ambient chat', tagline: 'Still performing for no one.', coinReward: 50, expBonus: 18, cpuPower: 1.02 },
  { floor: 10, id: 'space_toilet', name: 'Space Toilet Station', boss: 'The Celestial Commode', miniBoss: 'Captain Hygiene', exclusive: 'Astro Plunge', corruption: 'Pressure', musicStyle: 'Space disco', tagline: 'Humanity needed a bathroom in orbit.', coinReward: 55, expBonus: 18, cpuPower: 1.05 },
  { floor: 11, id: 'bacteria_hive', name: 'Bacteria Hive Metro', boss: 'MRSA Emperor', miniBoss: 'Culture Plate King', exclusive: 'Germaine', corruption: 'Infection Spread', musicStyle: 'Microbial techno', tagline: 'The immune system became a city.', coinReward: 60, expBonus: 20, cpuPower: 1.08 },
  { floor: 12, id: 'meme_cathedral', name: 'Meme Cathedral', boss: 'Pope of Cringe', miniBoss: 'Repost Inquisitor', exclusive: 'Dank Seraph', corruption: 'Irony Poisoning', musicStyle: 'Bass-boost sacred', tagline: 'Faith replaced by virality.', coinReward: 65, expBonus: 20, cpuPower: 1.11 },
  { floor: 13, id: 'lag_dimension', name: 'Lag Dimension', boss: 'Lord of Perpetual Buffer', miniBoss: 'The Delay Monk', exclusive: 'Rubberband Rex', corruption: 'Desync', musicStyle: 'Desync EDM', tagline: 'Time awaits approval.', coinReward: 70, expBonus: 22, cpuPower: 1.14 },
  { floor: 14, id: 'doomscroll_monastery', name: 'Doomscroll Monastery', boss: 'Abbot Endless Feed', miniBoss: 'Archivist of Bad News', exclusive: 'Scroll Monk', corruption: 'Fatigue', musicStyle: 'Dark ambient', tagline: 'No bottom to the feed.', coinReward: 75, expBonus: 22, cpuPower: 1.17 },
  { floor: 15, id: 'burnout_industrial', name: 'Burnout Industrial Zone', boss: 'CEO of Restless', miniBoss: 'Performance Review', exclusive: 'Spreadsheet Beast', corruption: 'Stress Stack', musicStyle: 'Office grunge', tagline: 'The economy became a biome.', coinReward: 80, expBonus: 24, cpuPower: 1.2 },
  { floor: 16, id: 'app_graveyard', name: 'Forgotten App Graveyard', boss: 'The Last Update', miniBoss: 'Support Ticket', exclusive: 'Uninstall Angel', corruption: 'Deprecation', musicStyle: 'Broken chiptune', tagline: 'Only you remember.', coinReward: 85, expBonus: 24, cpuPower: 1.23 },
  { floor: 17, id: 'glitch_forest', name: 'Glitch Spirit Forest', boss: 'Great Render Error', miniBoss: 'Low Poly Druid', exclusive: 'Artifact Fox', corruption: 'Texture Corruption', musicStyle: 'Folktronica', tagline: 'Nature on integrated graphics.', coinReward: 90, expBonus: 26, cpuPower: 1.26 },
  { floor: 18, id: 'viral_swarm', name: 'Viral Swarm City', boss: 'Pandemic of Attention', miniBoss: 'Patient Zero Influencer', exclusive: 'Patient Trend', corruption: 'Exposure', musicStyle: 'Drill news', tagline: 'Virality feeds on eyes.', coinReward: 95, expBonus: 26, cpuPower: 1.29 },
  { floor: 19, id: 'algorithm_temple', name: 'Algorithm Temple', boss: 'Recommendation Engine Idol', miniBoss: 'Personalization Priest', exclusive: 'A/B Twins', corruption: 'Prediction', musicStyle: 'Corporate ambient', tagline: 'It wants your pattern.', coinReward: 100, expBonus: 28, cpuPower: 1.32 },
  { floor: 20, id: 'rage_arena', name: 'Rage Arena', boss: 'The Eternal Argument', miniBoss: 'Moderation Hammer', exclusive: 'Capslock Titan', corruption: 'Escalation', musicStyle: 'Metal/trap', tagline: 'Every battle is public.', coinReward: 110, expBonus: 28, cpuPower: 1.35 },
  { floor: 21, id: 'subscription_vault', name: 'Subscription Vault', boss: 'The Forever Plan', miniBoss: 'Cancellation Maze', exclusive: 'Fineprint Leviathan', corruption: 'Drain', musicStyle: 'Billing pop', tagline: 'You agreed. You don’t remember.', coinReward: 120, expBonus: 30, cpuPower: 1.38 },
  { floor: 22, id: 'emotion_dumpster', name: 'Emotion Dumpster Realm', boss: 'Feelings Tsunami', miniBoss: 'Repressed Memory', exclusive: 'Catharsis Slime', corruption: 'Mood Shift', musicStyle: 'Ballad glitch', tagline: 'Feelings composted.', coinReward: 130, expBonus: 30, cpuPower: 1.41 },
  { floor: 23, id: 'noise_border', name: 'Noise Border', boss: 'General of the Hum', miniBoss: 'Feedback Loop', exclusive: 'Null Puppy', corruption: 'Signal Loss', musicStyle: 'Harsh noise', tagline: 'The world stops pretending.', coinReward: 140, expBonus: 32, cpuPower: 1.44 },
  { floor: 24, id: 'whispering_servers', name: 'Whispering Servers', boss: 'Thermal Throttle Dragon', miniBoss: 'Root Access Demon', exclusive: 'Coolant Serpent', corruption: 'Overclock', musicStyle: 'Synth cathedral', tagline: 'Gods live in basements.', coinReward: 150, expBonus: 32, cpuPower: 1.47 },
  { floor: 25, id: 'core_feed', name: 'The Core Feed', boss: 'THE CORE FEED', miniBoss: 'Trending Gatekeeper', exclusive: 'Resonance Seed', corruption: 'Engagement Lock', musicStyle: 'Maximalist hyperpop', tagline: 'Climb because it wants you to keep climbing.', coinReward: 200, expBonus: 40, cpuPower: 1.55 },
];

export function getLadderRegion(floor) {
  const f = Math.max(1, Math.min(LADDER_FLOOR_COUNT, Math.floor(floor || 1)));
  return LADDER_REGIONS[f - 1] ?? LADDER_REGIONS[0];
}
