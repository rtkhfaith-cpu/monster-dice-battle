/** Pet skill scaling (CJS) — mirrors src/gameSystems/petSkills.js */

const PET_SKILL_SCALING = {
  heal: {
    rare: { healMaxHpPct: 6, everyTurns: 4 },
    epic: { healMaxHpPct: 9, everyTurns: 4 },
    mythic: { healMaxHpPct: 12, everyTurns: 3 },
  },
  crit_boost: {
    rare: { petCritBonusPct: 5 },
    epic: { petCritBonusPct: 8 },
    mythic: { petCritBonusPct: 12 },
  },
  dodge_boost: {
    rare: { petDodgeBonusPct: 4 },
    epic: { petDodgeBonusPct: 7 },
    mythic: { petDodgeBonusPct: 10 },
  },
  poison_bite: {
    rare: { chancePct: 15, dotMaxHpPct: 5, turns: 2 },
    epic: { chancePct: 22, dotMaxHpPct: 7, turns: 2 },
    mythic: { chancePct: 30, dotMaxHpPct: 10, turns: 3 },
  },
  fire_aura: {
    rare: { chancePct: 10, dotMaxHpPct: 6, turns: 2 },
    epic: { chancePct: 18, dotMaxHpPct: 9, turns: 2 },
    mythic: { chancePct: 25, dotMaxHpPct: 12, turns: 3 },
  },
  shield: {
    rare: { shieldMaxHpPct: 8 },
    epic: { shieldMaxHpPct: 12 },
    mythic: { shieldMaxHpPct: 18 },
  },
  energy_gain: {
    rare: { mpRestore: 8 },
    epic: { mpRestore: 12 },
    mythic: { mpRestore: 18 },
  },
  cleanse: {
    rare: { chancePct: 15 },
    epic: { chancePct: 25 },
    mythic: { chancePct: 40 },
  },
  counter_spark: {
    rare: { chancePct: 10, atkDamagePct: 20 },
    epic: { chancePct: 15, atkDamagePct: 30 },
    mythic: { chancePct: 22, atkDamagePct: 45 },
  },
  lucky_coins: {
    rare: { coinBonusPct: 5 },
    epic: { coinBonusPct: 10 },
    mythic: { coinBonusPct: 18 },
  },
  exp_boost: {
    rare: { expBonusPct: 5 },
    epic: { expBonusPct: 10 },
    mythic: { expBonusPct: 18 },
  },
};

function getPetSkillEffect(skillType, rarity) {
  const table = PET_SKILL_SCALING[skillType];
  if (!table) return {};
  return { ...(table[rarity] || table.rare) };
}

module.exports = { getPetSkillEffect };
