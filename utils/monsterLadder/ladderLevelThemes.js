/**
 * 25 main ladder themes — mini boss (sub 5) & big boss (sub 10).
 */

/** @type {Array<{ mainLevel: number, id: string, name: string, miniBoss: string, bigBoss: string, featuredMonsterId: string, gruntPool: string[] }>} */
export const LADDER_LEVEL_THEMES = [
  { mainLevel: 1, id: 'sewer_signal', name: 'Sewer Signal', miniBoss: 'Pipe Screecher', bigBoss: 'King Flush Node', featuredMonsterId: 'glitchroach_prime', gruntPool: ['charging_cable_serpent', 'battery_bat'] },
  { mainLevel: 2, id: 'fast_food_kingdom', name: 'Fast Food Kingdom', miniBoss: 'Grease Lieutenant', bigBoss: 'Emperor McRot Jr.', featuredMonsterId: 'nugget_dragon', gruntPool: ['pizza_meteor', 'cola_kraken'] },
  { mainLevel: 3, id: 'broken_wifi_forest', name: 'Broken WiFi Forest', miniBoss: 'Dead Zone Druid', bigBoss: 'Router Rex', featuredMonsterId: 'lagzilla', gruntPool: ['wifi_wraith', 'drone_goblin'] },
  { mainLevel: 4, id: 'haunted_shopping_mall', name: 'Haunted Shopping Mall', miniBoss: 'Refund Wraith', bigBoss: 'Anchor Store Titan', featuredMonsterId: 'durian_knight', gruntPool: ['trash_panda_ronin', 'bubblewrap_blob'] },
  { mainLevel: 5, id: 'toxic_playground', name: 'Toxic Playground', miniBoss: 'Slime Prefect', bigBoss: 'Rust Slide Colossus', featuredMonsterId: 'cola_kraken', gruntPool: ['traffic_cone_cyclops', 'battery_bat'] },
  { mainLevel: 6, id: 'frozen_dessert_factory', name: 'Frozen Dessert Factory', miniBoss: 'Soft-Serve Pope', bigBoss: 'Cryo Cream Unit', featuredMonsterId: 'ice_cream_yeti', gruntPool: ['bubble_tea_hydra', 'cloud_catfish'] },
  { mainLevel: 7, id: 'cyber_school_zone', name: 'Cyber School Zone', miniBoss: 'Detention Drone', bigBoss: 'Principal Firewall', featuredMonsterId: 'keyboard_golem', gruntPool: ['charging_cable_serpent', 'meme_monk'] },
  { mainLevel: 8, id: 'bubble_tea_swamp', name: 'Bubble Tea Swamp', miniBoss: 'Tapioca Tyrant', bigBoss: 'Pearl Overlord', featuredMonsterId: 'bubble_tea_hydra', gruntPool: ['cola_kraken', 'cloud_catfish'] },
  { mainLevel: 9, id: 'abandoned_arcade', name: 'Abandoned Arcade', miniBoss: 'Token Goblin King', bigBoss: 'Insert Coin God', featuredMonsterId: 'meme_monk', gruntPool: ['drone_goblin', 'pizza_meteor'] },
  { mainLevel: 10, id: 'traffic_cone_highway', name: 'Traffic Cone Highway', miniBoss: 'Cone Sergeant', bigBoss: 'Highway Cyclops Prime', featuredMonsterId: 'traffic_cone_cyclops', gruntPool: ['sneaker_shark', 'trash_panda_ronin'] },
  { mainLevel: 11, id: 'plastic_ocean', name: 'Plastic Ocean', miniBoss: 'Bottle Leviathan Spawn', bigBoss: 'Great Pacific Golem', featuredMonsterId: 'bubblewrap_blob', gruntPool: ['cola_kraken', 'cloud_catfish'] },
  { mainLevel: 12, id: 'glitch_library', name: 'Glitch Library', miniBoss: 'Index Phantom', bigBoss: 'Render Error Archivist', featuredMonsterId: 'glitchroach_prime', gruntPool: ['wifi_wraith', 'lagzilla'] },
  { mainLevel: 13, id: 'meme_temple', name: 'Meme Temple', miniBoss: 'Ratio Acolyte', bigBoss: 'Pope of Cringe Lite', featuredMonsterId: 'meme_monk', gruntPool: ['trash_panda_ronin', 'drone_goblin'] },
  { mainLevel: 14, id: 'space_toilet_station', name: 'Space Toilet Station', miniBoss: 'Captain Hygiene', bigBoss: 'Celestial Commode Mk2', featuredMonsterId: 'toiletron_titan', gruntPool: ['bubblewrap_blob', 'battery_bat'] },
  { mainLevel: 15, id: 'battery_graveyard', name: 'Battery Graveyard', miniBoss: 'Corrosion Priest', bigBoss: 'MRSA Emperor Cell', featuredMonsterId: 'battery_bat', gruntPool: ['charging_cable_serpent', 'blackout_bunny'] },
  { mainLevel: 16, id: 'cloud_kitchen_skyland', name: 'Cloud Kitchen Skyland', miniBoss: 'Delivery Angel', bigBoss: 'Sky Fryer Titan', featuredMonsterId: 'cloud_catfish', gruntPool: ['pizza_meteor', 'nugget_dragon'] },
  { mainLevel: 17, id: 'doomscroll_desert', name: 'Doomscroll Desert', miniBoss: 'Scroll Monk', bigBoss: 'Abbot of Bad News', featuredMonsterId: 'lagzilla', gruntPool: ['wifi_wraith', 'meme_monk'] },
  { mainLevel: 18, id: 'keyboard_mountain', name: 'Keyboard Mountain', miniBoss: 'Capslock Hermit', bigBoss: 'Delete Key Titan', featuredMonsterId: 'keyboard_golem', gruntPool: ['charging_cable_serpent', 'glitchroach_prime'] },
  { mainLevel: 19, id: 'sneaker_reef', name: 'Sneaker Reef', miniBoss: 'Lace Kraken', bigBoss: 'Sole Emperor', featuredMonsterId: 'sneaker_shark', gruntPool: ['cola_kraken', 'cloud_catfish'] },
  { mainLevel: 20, id: 'microwave_volcano', name: 'Microwave Volcano', miniBoss: 'Popcorn Shaman', bigBoss: 'Heat Dome Mantis', featuredMonsterId: 'microwave_mantis', gruntPool: ['pizza_meteor', 'nugget_dragon'] },
  { mainLevel: 21, id: 'viral_hospital', name: 'Viral Hospital', miniBoss: 'Patient Zero Nurse', bigBoss: 'Pandemic Idol', featuredMonsterId: 'meme_monk', gruntPool: ['battery_bat', 'wifi_wraith'] },
  { mainLevel: 22, id: 'blackout_city', name: 'Blackout City', miniBoss: 'Fuse Fiend', bigBoss: 'Grid Collapse Beast', featuredMonsterId: 'blackout_bunny', gruntPool: ['traffic_cone_cyclops', 'charging_cable_serpent'] },
  { mainLevel: 23, id: 'algorithm_cathedral', name: 'Algorithm Cathedral', miniBoss: 'A/B Twins', bigBoss: 'Recommendation Idol', featuredMonsterId: 'algorithm_angel', gruntPool: ['wifi_wraith', 'lagzilla'] },
  { mainLevel: 24, id: 'final_feed_gateway', name: 'Final Feed Gateway', miniBoss: 'Trending Gatekeeper', bigBoss: 'Null Puppy Alpha', featuredMonsterId: 'noodle_basilisk', gruntPool: ['meme_monk', 'drone_goblin'] },
  { mainLevel: 25, id: 'core_feed_tower', name: 'Core Feed Tower', miniBoss: 'Thermal Throttle Wyrm', bigBoss: 'THE CORE FEED', featuredMonsterId: 'core_feed_beast', gruntPool: ['algorithm_angel', 'blackout_bunny'] },
];

export function getLadderTheme(mainLevel) {
  const lv = Math.max(1, Math.min(25, Math.floor(mainLevel || 1)));
  return LADDER_LEVEL_THEMES[lv - 1] ?? LADDER_LEVEL_THEMES[0];
}
