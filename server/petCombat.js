/**
 * Server-side pet combat (CJS) — mirrors src/gameSystems/petCombat.js
 */
const { getPetSkillEffect } = require('./petSkills');
const { applyDot } = require('./dotStatus');

function rollPct(chance) {
  return Math.random() * 100 < Math.max(0, Math.min(100, chance));
}

function ensurePetBattleState(fighter) {
  if (!fighter.petBattleState) {
    fighter.petBattleState = { turnCounter: 0, shieldHp: 0, lastHealTurn: 0 };
  }
  return fighter.petBattleState;
}

function getPetCritBonus(fighter) {
  return fighter?.petCombatModifiers?.petCritBonusPct ?? 0;
}

function getPetDodgeBonus(fighter) {
  return fighter?.petCombatModifiers?.petDodgeBonusPct ?? 0;
}

function resolvePetStartOfTurn(fighter) {
  const pet = fighter.equippedPet;
  if (!pet?.skills?.length) return { fighter, log: [], healing: 0 };

  const state = ensurePetBattleState(fighter);
  state.turnCounter = (state.turnCounter ?? 0) + 1;
  const log = [];
  let f = { ...fighter };
  let healing = 0;

  for (const skillType of pet.skills) {
    if (skillType === 'heal') {
      const e = getPetSkillEffect('heal', pet.rarity);
      const every = e.everyTurns ?? 4;
      if (state.turnCounter % every !== 0) continue;
      const maxHp = f.maxHp ?? f.stats?.hp ?? 100;
      const heal = Math.max(1, Math.round((maxHp * (e.healMaxHpPct ?? 0)) / 100));
      const missing = Math.max(0, maxHp - f.hp);
      const applied = Math.min(missing, heal);
      if (applied > 0) {
        f = { ...f, hp: f.hp + applied };
        healing += applied;
        log.push(`${pet.emoji} ${pet.name} healed ${applied} HP!`);
      }
    }
    if (skillType === 'energy_gain') {
      const e = getPetSkillEffect('energy_gain', pet.rarity);
      const maxMp = f.maxMp ?? f.stats?.mp ?? 0;
      const gain = Math.min(maxMp - f.mp, e.mpRestore ?? 0);
      if (gain > 0) {
        f = { ...f, mp: f.mp + gain };
        log.push(`${pet.emoji} ${pet.name} restored ${gain} MP!`);
      }
    }
    if (skillType === 'cleanse') {
      const e = getPetSkillEffect('cleanse', pet.rarity);
      if (rollPct(e.chancePct ?? 0) && f.statuses && Object.keys(f.statuses).length) {
        f = { ...f, statuses: {}, status: null };
        log.push(`${pet.emoji} ${pet.name} cleansed debuffs!`);
      }
    }
  }

  f.petBattleState = state;
  return { fighter: f, log, healing };
}

function resolvePetOnAttackHit(attacker, defender, { damageDealt = 0 } = {}) {
  const pet = attacker.equippedPet;
  if (!pet || damageDealt <= 0) return { attacker, defender, log: [] };

  const log = [];
  let atk = { ...attacker };
  let def = { ...defender };

  for (const skillType of pet.skills) {
    if (skillType === 'poison_bite') {
      const e = getPetSkillEffect('poison_bite', pet.rarity);
      if (rollPct(e.chancePct ?? 0)) {
        def = applyDot(def, 'poison', {
          dotMaxHpPct: e.dotMaxHpPct ?? 5,
          turns: e.turns ?? 2,
          source: 'pet',
        });
        log.push(`${pet.emoji} ${pet.name} triggered Poison Bite!`);
      }
    }
    if (skillType === 'fire_aura') {
      const e = getPetSkillEffect('fire_aura', pet.rarity);
      if (rollPct(e.chancePct ?? 0)) {
        def = applyDot(def, 'burn', {
          dotMaxHpPct: e.dotMaxHpPct ?? 6,
          turns: e.turns ?? 2,
          source: 'pet',
        });
        log.push(`${pet.emoji} ${pet.name} triggered Fire Aura!`);
      }
    }
    if (skillType === 'shield') {
      const e = getPetSkillEffect('shield', pet.rarity);
      const maxHp = atk.maxHp ?? atk.stats?.hp ?? 100;
      const shield = Math.round((maxHp * (e.shieldMaxHpPct ?? 0)) / 100);
      const state = ensurePetBattleState(atk);
      if (shield > 0 && (state.shieldHp ?? 0) <= 0) {
        state.shieldHp = shield;
        atk.petBattleState = state;
        log.push(`${pet.emoji} ${pet.name} granted a shield (${shield} HP)!`);
      }
    }
  }

  return { attacker: atk, defender: def, log };
}

function resolvePetOnDefenderHit(attacker, defender, { damage = 0 } = {}) {
  let def = { ...defender };
  let atk = { ...attacker };
  let dmg = damage;
  const log = [];

  const defPet = def.equippedPet;
  if (defPet?.skills?.includes('counter_spark') && dmg > 0) {
    const e = getPetSkillEffect('counter_spark', defPet.rarity);
    if (rollPct(e.chancePct ?? 0)) {
      const atkStat = def.stats?.attack?.max ?? def.stats?.attack ?? 10;
      const counter = Math.max(1, Math.round((atkStat * (e.atkDamagePct ?? 20)) / 100));
      atk = { ...atk, hp: Math.max(0, atk.hp - counter) };
      log.push(`${defPet.emoji} ${defPet.name} Counter Spark for ${counter} damage!`);
    }
  }

  const state = def.petBattleState;
  if (state?.shieldHp > 0 && dmg > 0) {
    const absorbed = Math.min(state.shieldHp, dmg);
    state.shieldHp -= absorbed;
    dmg -= absorbed;
    def = { ...def, petBattleState: { ...state } };
    if (absorbed > 0) log.push(`Pet shield absorbed ${absorbed} damage!`);
  }

  return { attacker: atk, defender: def, damage: dmg, log };
}

function absorbDamageWithPetShield(defender, damage) {
  const state = defender.petBattleState;
  if (!state?.shieldHp || damage <= 0) return { defender, damage };
  const absorbed = Math.min(state.shieldHp, damage);
  return {
    defender: {
      ...defender,
      petBattleState: { ...state, shieldHp: state.shieldHp - absorbed },
    },
    damage: damage - absorbed,
  };
}

module.exports = {
  getPetCritBonus,
  getPetDodgeBonus,
  resolvePetStartOfTurn,
  resolvePetOnAttackHit,
  resolvePetOnDefenderHit,
  absorbDamageWithPetShield,
};
