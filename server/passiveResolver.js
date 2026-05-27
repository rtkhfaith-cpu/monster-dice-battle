/**
 * Server-side passive skill resolution (CJS) — mirrors client passiveResolver.
 */
const { getPetCritBonus } = require('./petCombat');
const { getStatuses, applyDot } = require('./dotStatus');

function rollPercentChance(pct) {
  return Math.random() * 100 < Math.max(0, Math.min(100, pct));
}

function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }

function statMid(range, fb) {
  if (typeof range === 'number') return range;
  if (range && typeof range.min === 'number' && typeof range.max === 'number')
    return Math.round((range.min + range.max) / 2);
  return fb;
}

const SKILL_IDS = {
  BLOOD_DRAIN: 'blood_drain',
  MIRROR_SHELL: 'mirror_shell',
  REGENERATION_AURA: 'regeneration_aura',
  TOXIC_FANG: 'toxic_fang',
  INFERNO_CURSE: 'inferno_curse',
  PHANTOM_STEP: 'phantom_step',
  FATAL_INSTINCT: 'fatal_instinct',
  RAGE_CORE: 'rage_core',
  IRON_GUARD: 'iron_guard',
  MANA_BARRIER: 'mana_barrier',
};

const SCALING = {
  [SKILL_IDS.BLOOD_DRAIN]: {
    rare: { healMaxHpPct: 4 }, epic: { healMaxHpPct: 6 },
    legendary: { healMaxHpPct: 9 }, mythic: { healMaxHpPct: 13 },
  },
  [SKILL_IDS.MIRROR_SHELL]: {
    rare: { reflectAtkPct: 25 }, epic: { reflectAtkPct: 40 },
    legendary: { reflectAtkPct: 55 }, mythic: { reflectAtkPct: 75 },
  },
  [SKILL_IDS.REGENERATION_AURA]: {
    rare: { healMaxHpPct: 5 }, epic: { healMaxHpPct: 7 },
    legendary: { healMaxHpPct: 10 }, mythic: { healMaxHpPct: 14 },
  },
  [SKILL_IDS.TOXIC_FANG]: {
    rare: { dotMaxHpPct: 4, turns: 2 }, epic: { dotMaxHpPct: 6, turns: 3 },
    legendary: { dotMaxHpPct: 8, turns: 3 }, mythic: { dotMaxHpPct: 10, turns: 4 },
  },
  [SKILL_IDS.INFERNO_CURSE]: {
    rare: { dotMaxHpPct: 4, healReductionPct: 30, turns: 2 },
    epic: { dotMaxHpPct: 5, healReductionPct: 45, turns: 3 },
    legendary: { dotMaxHpPct: 7, healReductionPct: 60, turns: 3 },
    mythic: { dotMaxHpPct: 9, healReductionPct: 80, turns: 4 },
  },
  [SKILL_IDS.PHANTOM_STEP]: {
    rare: { dodgeBonusPct: 8 }, epic: { dodgeBonusPct: 12 },
    legendary: { dodgeBonusPct: 16 }, mythic: { dodgeBonusPct: 20 },
  },
  [SKILL_IDS.FATAL_INSTINCT]: {
    rare: { critBonusPct: 10 }, epic: { critBonusPct: 15 },
    legendary: { critBonusPct: 20 }, mythic: { critBonusPct: 28 },
  },
  [SKILL_IDS.RAGE_CORE]: {
    rare: { atkBonusPct: 20, hpThresholdPct: 50 },
    epic: { atkBonusPct: 30, hpThresholdPct: 50 },
    legendary: { atkBonusPct: 40, hpThresholdPct: 40 },
    mythic: { atkBonusPct: 55, hpThresholdPct: 30 },
  },
  [SKILL_IDS.IRON_GUARD]: {
    rare: { critDamageReductionPct: 25 }, epic: { critDamageReductionPct: 40 },
    legendary: { critDamageReductionPct: 55 }, mythic: { critDamageReductionPct: 70 },
  },
  [SKILL_IDS.MANA_BARRIER]: {
    rare: { damageReductionPct: 30 }, epic: { damageReductionPct: 45 },
    legendary: { damageReductionPct: 60 }, mythic: { damageReductionPct: 80 },
  },
};

const PROC_CHANCES = {
  [SKILL_IDS.TOXIC_FANG]: 35,
  [SKILL_IDS.INFERNO_CURSE]: 35,
};

const CAPS = {
  dodgePct: 40,
  critPct: 60,
  healOnHitMaxHpPct: 15,
  reflectAtkPct: 80,
  critMultiplier: 1.5,
};

function getEffect(skillId, rarity) {
  const s = SCALING[skillId];
  if (!s) return {};
  return { ...(s[rarity] || s.rare) };
}

function passivesOf(f) {
  return Array.isArray(f?.equippedPassives) ? f.equippedPassives : [];
}

function sumPassive(f, skillId, field) {
  return passivesOf(f)
    .filter((p) => p.skillId === skillId)
    .reduce((s, p) => s + (getEffect(p.skillId, p.rarity)[field] ?? 0), 0);
}

function hasPassive(f, skillId) {
  return passivesOf(f).some((p) => p.skillId === skillId);
}

function ensureBattleState(f) {
  if (!f.passiveBattleState) f.passiveBattleState = { barrierConsumed: false };
  return f.passiveBattleState;
}

function rageCoreMultiplier(atk) {
  const p = passivesOf(atk).find((x) => x.skillId === SKILL_IDS.RAGE_CORE);
  if (!p) return 1;
  const e = getEffect(p.skillId, p.rarity);
  const maxHp = atk.maxHp ?? atk.stats?.hp ?? 1;
  const hpPct = maxHp > 0 ? (atk.hp / maxHp) * 100 : 100;
  if (hpPct > (e.hpThresholdPct ?? 50)) return 1;
  return 1 + (e.atkBonusPct ?? 0) / 100;
}

function effectiveCritChance(atk) {
  let pct = atk?.stats?.critPct ?? 10;
  pct += sumPassive(atk, SKILL_IDS.FATAL_INSTINCT, 'critBonusPct');
  return clamp(pct, 0, CAPS.critPct);
}

function clampHeal(amount, f) {
  const maxHp = f.maxHp ?? f.stats?.hp ?? 100;
  return Math.min(Math.max(0, maxHp - f.hp), Math.max(0, Math.round(amount)));
}

function healingMultiplier(f) {
  const dict = getStatuses(f);
  const burn = dict.burn;
  if (burn && burn.healReductionPct > 0) return 1 - burn.healReductionPct / 100;
  return 1;
}

/**
 * Apply passive effects to a resolved strike.
 * Mutates nothing — returns new fighter objects and extra data.
 */
function applyPassivesToStrike(resolved, atk, def, strikeKind) {
  let a = { ...atk };
  let d = { ...def };
  ensureBattleState(a);
  ensureBattleState(d);

  let { damage, critical } = resolved;
  const log = [];

  const rageM = rageCoreMultiplier(a);
  if (rageM > 1) {
    damage = Math.max(1, Math.round(damage * rageM));
    log.push('Rage Core boosted attack!');
  }

  const critBonus = sumPassive(a, SKILL_IDS.FATAL_INSTINCT, 'critBonusPct');
  if (!critical && critBonus > 0 && rollPercentChance(critBonus)) {
    critical = true;
    damage = Math.max(1, Math.round(damage * CAPS.critMultiplier));
    log.push('Fatal Instinct — critical hit!');
  }

  if (!critical) {
    const petCrit = getPetCritBonus(a);
    if (petCrit > 0 && rollPercentChance(petCrit)) {
      critical = true;
      damage = Math.max(1, Math.round(damage * CAPS.critMultiplier));
      const pet = a.equippedPet;
      log.push(pet ? `${pet.emoji} ${pet.name} — pet critical!` : 'Pet critical hit!');
    }
  }

  const defState = ensureBattleState(d);
  if (!defState.barrierConsumed && hasPassive(d, SKILL_IDS.MANA_BARRIER) && damage > 0) {
    const e = getEffect(
      SKILL_IDS.MANA_BARRIER,
      passivesOf(d).find((x) => x.skillId === SKILL_IDS.MANA_BARRIER).rarity,
    );
    const reduced = Math.round(damage * (e.damageReductionPct ?? 0) / 100);
    damage = Math.max(0, damage - reduced);
    defState.barrierConsumed = true;
    log.push(`Mana Barrier reduced damage by ${reduced}.`);
  }

  if (critical && hasPassive(d, SKILL_IDS.IRON_GUARD)) {
    const e = getEffect(
      SKILL_IDS.IRON_GUARD,
      passivesOf(d).find((x) => x.skillId === SKILL_IDS.IRON_GUARD).rarity,
    );
    const extra = Math.round(damage * (CAPS.critMultiplier - 1) * (e.critDamageReductionPct ?? 0) / 100);
    damage = Math.max(1, damage - extra);
    log.push('Iron Guard softened the critical.');
  }

  damage = Math.max(0, Math.round(damage));
  let healing = 0;
  let reflectedDamage = 0;

  if (damage > 0) {
    d = { ...d, hp: Math.max(0, d.hp - damage) };

    const healPct = clamp(sumPassive(a, SKILL_IDS.BLOOD_DRAIN, 'healMaxHpPct'), 0, CAPS.healOnHitMaxHpPct);
    if (healPct > 0) {
      const maxHp = a.maxHp ?? a.stats?.hp ?? 100;
      healing = clampHeal(Math.round((maxHp * healPct) / 100 * healingMultiplier(a)), a);
      if (healing > 0) {
        a = { ...a, hp: Math.min(maxHp, a.hp + healing) };
        log.push(`Blood Drain healed ${healing} HP.`);
      }
    }

    const toxic = passivesOf(a).find((p) => p.skillId === SKILL_IDS.TOXIC_FANG);
    if (toxic && rollPercentChance(PROC_CHANCES[SKILL_IDS.TOXIC_FANG] ?? 35)) {
      const e = getEffect(toxic.skillId, toxic.rarity);
      d = applyDot(d, 'poison', e);
      log.push('Toxic Fang — poisoned!');
    }

    const inferno = passivesOf(a).find((p) => p.skillId === SKILL_IDS.INFERNO_CURSE);
    if (inferno && rollPercentChance(PROC_CHANCES[SKILL_IDS.INFERNO_CURSE] ?? 35)) {
      const e = getEffect(inferno.skillId, inferno.rarity);
      d = applyDot(d, 'burn', e);
      log.push('Inferno Curse — burned!');
    }

    const reflPct = clamp(sumPassive(d, SKILL_IDS.MIRROR_SHELL, 'reflectAtkPct'), 0, CAPS.reflectAtkPct);
    if (reflPct > 0) {
      const dAtk = statMid(d.stats?.attack, 10);
      const dMag = statMid(d.stats?.magic, 0);
      reflectedDamage = Math.max(1, Math.round(Math.max(dAtk, dMag) * reflPct / 100));
      a = { ...a, hp: Math.max(0, a.hp - reflectedDamage) };
      log.push(`Mirror Shell reflected ${reflectedDamage} damage.`);
    }
  }

  return { attacker: a, defender: d, damage, critical, healing, reflectedDamage, log };
}

/** Phantom Step dodge bonus for the defender. */
function phantomDodgeBonus(defender) {
  return sumPassive(defender, SKILL_IDS.PHANTOM_STEP, 'dodgeBonusPct');
}

/** Extra dodge roll for Phantom Step (called after normal dodge check fails). */
function rollPhantomDodge(defender) {
  const bonus = phantomDodgeBonus(defender);
  if (bonus <= 0) return false;
  return rollPercentChance(bonus);
}

/** Start-of-turn regen + DoT ticks for one fighter. */
function resolveStartOfTurn(fighter) {
  let f = { ...fighter };
  ensureBattleState(f);
  const log = [];
  const maxHp = f.maxHp ?? f.stats?.hp ?? 100;

  const regen = passivesOf(f).find((p) => p.skillId === SKILL_IDS.REGENERATION_AURA);
  if (regen) {
    const e = getEffect(regen.skillId, regen.rarity);
    let heal = Math.round((maxHp * (e.healMaxHpPct ?? 0)) / 100 * healingMultiplier(f));
    heal = clampHeal(heal, f);
    if (heal > 0) {
      f = { ...f, hp: f.hp + heal };
      log.push(`Regeneration Aura healed ${heal} HP.`);
    }
  }

  const dict = { ...getStatuses(f) };
  for (const dotType of ['poison', 'burn']) {
    const dot = dict[dotType];
    if (!dot || dot.turnsLeft <= 0) continue;
    const tick = Math.max(1, Math.round(maxHp * (dot.dotMaxHpPct ?? 0) / 100));
    f = { ...f, hp: Math.max(0, f.hp - tick) };
    const newTurns = dot.turnsLeft - 1;
    if (newTurns > 0) dict[dotType] = { ...dot, turnsLeft: newTurns };
    else delete dict[dotType];
    log.push(`${dotType === 'poison' ? 'Poison' : 'Burn'} dealt ${tick} damage. (${newTurns} turns left)`);
  }
  for (const buffType of ['atkDown', 'defDown']) {
    const s = dict[buffType];
    if (!s || s.turnsLeft <= 0) continue;
    const newTurns = s.turnsLeft - 1;
    if (newTurns > 0) dict[buffType] = { ...s, turnsLeft: newTurns };
    else delete dict[buffType];
  }
  f.statuses = dict;
  f.status = Object.values(dict)[0] || null;

  return { fighter: f, log };
}

module.exports = {
  applyPassivesToStrike,
  rollPhantomDodge,
  resolveStartOfTurn,
  effectiveCritChance,
  phantomDodgeBonus,
  SKILL_IDS,
};
