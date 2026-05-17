/**
 * Ladder-exclusive skill sets.
 */

function phys(id, name, emoji, power = 1) {
  return { id, name, kind: 'physical', effectType: 'normal', emoji, power };
}

function mag(id, name, emoji, element, mpCost, power = 1.2, effectType = 'normal', status = null) {
  const s = {
    id, name, kind: 'magic', mpCost, element, power, effectType, emoji,
  };
  if (status) s.status = status;
  return s;
}

/** @type {Record<string, { physical: object, magic: object[] }>} */
export const LADDER_MONSTER_SKILL_SETS = {
  glitchroach_prime: {
    physical: phys('viral_skitter', 'Viral Skitter', '🪳', 1),
    magic: [
      mag('bug_spray_burst', 'Bug Spray Burst', '💨', 'earth', 12, 1.15, 'poison', { type: 'poison', chance: 0.35, turns: 2 }),
      mag('signal_bite', 'Signal Bite', '📡', 'metal', 14, 1.25, 'magic67', { type: 'atkDown', chance: 0.3, turns: 2 }),
    ],
  },
  toiletron_titan: {
    physical: phys('lid_slam', 'Lid Slam', '🚽', 1.05),
    magic: [
      mag('flush_cannon', 'Flush Cannon', '🌊', 'water', 14, 1.3, 'water'),
      mag('plumbing_shield', 'Plumbing Shield', '🛡️', 'water', 11, 1, 'normal', { type: 'defUp', chance: 1, turns: 2 }),
    ],
  },
  nugget_dragon: {
    physical: phys('crispy_bite', 'Crispy Bite', '🍗', 1),
    magic: [
      mag('sauce_fireball', 'Sauce Fireball', '🔥', 'fire', 12, 1.25, 'fire'),
      mag('oil_splash', 'Oil Splash', '🛢️', 'fire', 15, 1.2, 'fire'),
    ],
  },
  bubble_tea_hydra: {
    physical: phys('pearl_tap', 'Pearl Tap', '🧋', 0.95),
    magic: [
      mag('pearl_barrage', 'Pearl Barrage', '⚪', 'water', 16, 1.1, 'water'),
      mag('sugar_rush', 'Sugar Rush', '🍬', 'water', 13, 1.2, 'normal', { type: 'atkUp', chance: 1, turns: 2 }),
      mag('milk_tea_wave', 'Milk Tea Wave', '🌊', 'water', 18, 1.35, 'water'),
    ],
  },
  lagzilla: {
    physical: phys('buffer_roar', 'Buffer Roar', '🦖', 1),
    magic: [
      mag('freeze_frame', 'Freeze Frame', '⏸️', 'metal', 13, 1.1, 'normal', { type: 'stun', chance: 0.25, turns: 1 }),
      mag('ping_spike', 'Ping Spike', '📶', 'metal', 15, 1.28, 'magic67'),
    ],
  },
  durian_knight: {
    physical: phys('spike_smash', 'Spike Smash', '🥭', 1.1),
    magic: [
      mag('thorn_charge', 'Thorn Charge', '🌿', 'wood', 12, 1.2, 'normal'),
      mag('stink_guard', 'Stink Guard', '💨', 'earth', 11, 1, 'normal', { type: 'defUp', chance: 1, turns: 2 }),
    ],
  },
  wifi_wraith: {
    physical: phys('ghost_ping', 'Ghost Ping', '👻', 1),
    magic: [
      mag('signal_drain', 'Signal Drain', '📡', 'metal', 13, 1.15, 'magic67', { type: 'mpDown', chance: 0.4, turns: 2 }),
      mag('disconnect_curse', 'Disconnect Curse', '🚫', 'metal', 16, 1.25, 'normal', { type: 'stun', chance: 0.2, turns: 1 }),
    ],
  },
  cola_kraken: {
    physical: phys('fizzy_grab', 'Fizzy Grab', '🦑', 1),
    magic: [
      mag('soda_spray', 'Soda Spray', '🥤', 'water', 12, 1.2, 'water'),
      mag('sugar_crash', 'Sugar Crash', '💥', 'water', 15, 1.3, 'water', { type: 'defDown', chance: 0.35, turns: 2 }),
    ],
  },
  charging_cable_serpent: {
    physical: phys('plug_bite', 'Plug Bite', '🔌', 1.05),
    magic: [
      mag('static_coil', 'Static Coil', '⚡', 'metal', 11, 1.15, 'magic67'),
      mag('short_circuit', 'Short Circuit', '💥', 'metal', 14, 1.28, 'magic67', { type: 'stun', chance: 0.22, turns: 1 }),
    ],
  },
  algorithm_angel: {
    physical: phys('viral_touch', 'Viral Touch', '👼', 0.95),
    magic: [
      mag('auto_heal', 'Auto-Heal', '💚', 'water', 14, 1, 'normal', { type: 'heal', chance: 1, turns: 1 }),
      mag('viral_blessing', 'Viral Blessing', '✨', 'metal', 13, 1.1, 'normal', { type: 'atkUp', chance: 1, turns: 2 }),
      mag('rewrite_fate', 'Rewrite Fate', '📱', 'metal', 20, 1.4, 'magic67'),
    ],
  },
  trash_panda_ronin: {
    physical: phys('bin_slash', 'Bin Slash', '🗑️', 1.1),
    magic: [
      mag('sneaky_swipe', 'Sneaky Swipe', '🦝', 'earth', 12, 1.2, 'normal'),
      mag('garbage_counter', 'Garbage Counter', '♻️', 'earth', 14, 1.15, 'normal', { type: 'defUp', chance: 1, turns: 1 }),
    ],
  },
  pizza_meteor: {
    physical: phys('cheese_crash', 'Cheese Crash', '🍕', 1.1),
    magic: [
      mag('pepperoni_blast', 'Pepperoni Blast', '💥', 'fire', 13, 1.28, 'fire'),
      mag('crust_shield', 'Crust Shield', '🛡️', 'fire', 10, 1, 'normal', { type: 'defUp', chance: 1, turns: 2 }),
    ],
  },
  cloud_catfish: {
    physical: phys('mist_whisker', 'Mist Whisker', '🐟', 1),
    magic: [
      mag('rain_heal', 'Rain Heal', '🌧️', 'water', 13, 1, 'water', { type: 'heal', chance: 1, turns: 1 }),
      mag('thunder_drizzle', 'Thunder Drizzle', '⚡', 'water', 15, 1.22, 'water'),
    ],
  },
  keyboard_golem: {
    physical: phys('delete_punch', 'Delete Punch', '⌨️', 1.05),
    magic: [
      mag('ctrl_smash', 'Ctrl Smash', '💥', 'metal', 14, 1.25, 'normal'),
      mag('alt_block', 'Alt Block', '🛡️', 'metal', 11, 1, 'normal', { type: 'defUp', chance: 1, turns: 2 }),
    ],
  },
  noodle_basilisk: {
    physical: phys('spicy_stare', 'Spicy Stare', '🍜', 1),
    magic: [
      mag('broth_bind', 'Broth Bind', '🥣', 'fire', 13, 1.2, 'fire', { type: 'stun', chance: 0.2, turns: 1 }),
      mag('noodle_venom', 'Noodle Venom', '🐍', 'wood', 17, 1.35, 'poison', { type: 'poison', chance: 0.45, turns: 3 }),
    ],
  },
  sneaker_shark: {
    physical: phys('sole_dash', 'Sole Dash', '👟', 1.1),
    magic: [
      mag('aqua_bite', 'Aqua Bite', '🦈', 'water', 12, 1.22, 'water'),
      mag('lace_whip', 'Lace Whip', '👟', 'water', 14, 1.18, 'normal'),
    ],
  },
  battery_bat: {
    physical: phys('drain_bite', 'Drain Bite', '🦇', 1),
    magic: [
      mag('power_flap', 'Power Flap', '🔋', 'metal', 12, 1.15, 'magic67'),
      mag('low_battery_curse', 'Low Battery Curse', '🪫', 'metal', 14, 1.1, 'normal', { type: 'mpDown', chance: 0.4, turns: 2 }),
    ],
  },
  meme_monk: {
    physical: phys('emoji_seal', 'Emoji Seal', '😂', 1),
    magic: [
      mag('ratio_chant', 'Ratio Chant', '📉', 'fire', 13, 1.15, 'normal', { type: 'atkDown', chance: 0.35, turns: 2 }),
      mag('viral_calm', 'Viral Calm', '🧘', 'earth', 12, 1.1, 'normal', { type: 'defUp', chance: 1, turns: 2 }),
    ],
  },
  ice_cream_yeti: {
    physical: phys('cone_bash', 'Cone Bash', '🍦', 1.05),
    magic: [
      mag('brain_freeze', 'Brain Freeze', '❄️', 'water', 13, 1.2, 'water', { type: 'stun', chance: 0.25, turns: 1 }),
      mag('sprinkle_storm', 'Sprinkle Storm', '🌨️', 'water', 16, 1.28, 'water'),
    ],
  },
  microwave_mantis: {
    physical: phys('popcorn_slash', 'Popcorn Slash', '🍿', 1.1),
    magic: [
      mag('heat_ray', 'Heat Ray', '🔥', 'fire', 14, 1.32, 'fire'),
      mag('reheat_beam', 'Reheat Beam', '♨️', 'fire', 18, 1.42, 'fire'),
    ],
  },
  traffic_cone_cyclops: {
    physical: phys('safety_slam', 'Safety Slam', '🚧', 1.05),
    magic: [
      mag('cone_block', 'Cone Block', '🛡️', 'earth', 10, 1, 'normal', { type: 'defUp', chance: 1, turns: 2 }),
      mag('road_rage', 'Road Rage', '😤', 'earth', 13, 1.22, 'normal'),
    ],
  },
  bubblewrap_blob: {
    physical: phys('bubble_bounce', 'Bubble Bounce', '🫧', 1),
    magic: [
      mag('pop_guard', 'Pop Guard', '🛡️', 'water', 11, 1, 'normal', { type: 'defUp', chance: 1, turns: 2 }),
      mag('cushion_crash', 'Cushion Crash', '💥', 'water', 14, 1.2, 'normal'),
    ],
  },
  drone_goblin: {
    physical: phys('propeller_poke', 'Propeller Poke', '🛸', 1),
    magic: [
      mag('camera_flash', 'Camera Flash', '📸', 'metal', 12, 1.18, 'magic67', { type: 'stun', chance: 0.2, turns: 1 }),
      mag('air_drop', 'Air Drop', '📦', 'metal', 15, 1.26, 'normal'),
    ],
  },
  blackout_bunny: {
    physical: phys('static_hop', 'Static Hop', '🐰', 1),
    magic: [
      mag('lights_out', 'Lights Out', '🌑', 'metal', 13, 1.15, 'normal', { type: 'stun', chance: 0.28, turns: 1 }),
      mag('shadow_zap', 'Shadow Zap', '⚡', 'metal', 16, 1.3, 'magic67'),
    ],
  },
  core_feed_beast: {
    physical: phys('trend_devour', 'Trend Devour', '📱', 1.1),
    magic: [
      mag('doomscroll_beam', 'Doomscroll Beam', '📜', 'metal', 18, 1.45, 'magic67'),
      mag('feed_collapse', 'Feed Collapse', '💀', 'metal', 22, 1.55, 'magic67'),
    ],
  },
};

export function getLadderMonsterSkillSet(templateId) {
  return (
    LADDER_MONSTER_SKILL_SETS[templateId] ?? {
      physical: phys('ladder_strike', 'Ladder Strike', '⚔️', 1),
      magic: [mag('ladder_burst', 'Ladder Burst', '✨', 'metal', 12, 1.15, 'magic67')],
    }
  );
}
