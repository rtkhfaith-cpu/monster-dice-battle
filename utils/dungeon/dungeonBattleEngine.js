/**
 * Dungeon battle engine — 3 player monsters vs 1 raid boss, turn based.
 *
 * Pure logic: the UI builds initial state via `createDungeonBattle` then calls
 * `advanceDungeonStep` repeatedly. Each step processes exactly one actor in the
 * order: monster@1, monster@2, monster@3, boss, repeat. Dead / stunned / frozen
 * actors skip. Damage uses the monster's FINAL stats (base+level+gear+pet+gem+
 * skill+position+formation bonuses) so every progression system matters.
 *
 * Balance constants are intentionally grouped + commented for easy tuning.
 */
import {
  POSITION_BONUS,
  ROLE_POSITION_BONUS,
  FORMATION_BONUS,
  DEFAULT_TARGET_WEIGHTS,
  DUNGEON_EFFECTS,
  TEAM_WIDE_POSITION2_PET_SKILLS,
  getBossSkillByName,
} from './dungeonBosses';
import { hasCorrectDungeonFormation } from './dungeonRoles';
import { healingMultiplier } from '../../src/gameSystems/statusEffects';
import { getPetSkillEffect } from '../../src/gameSystems/petSkills';

/**
 * Tuning knobs — player atk is hundreds–low thousands; boss HP is 120k–500k.
 * Boss atk was 8k–15k with BOSS_DMG_SCALE 0.85 → one-shots; targets below assume
 * ~3k–12k HP monsters (level + gear + formation).
 *
 * Rough target (Death Knight, geared tank @ pos 1): main hit ~1.2k–2k, AOE ~600–900.
 */
const PLAYER_DMG_SCALE = 6;
const BOSS_DMG_SCALE = 0.2;
/** Extra trim when a skill hits every living monster (cleave / blizzard). */
const BOSS_AOE_DMG_SCALE = 0.72;
const BOSS_DEF_K = 6000;
const MON_DEF_K = 12000;
const MAX_MITIGATION = 0.78;
const MAX_DAMAGE_REDUCTION = 70;
const BOSS_CRIT_MULT_CAP = 1.35;
const BASE_CRIT_MULT = 1.5;
const MP_RECOVER_WHEN_NOT_CASTING_PCT = 8;
const MP_RECOVER_WHEN_NOT_CASTING_MIN = 4;

function defenceReduction(defStat, k) {
  return clamp(defStat / (defStat + k), 0, MAX_MITIGATION);
}

function avg(range) {
  if (range?.min != null) return (range.min + range.max) / 2;
  if (typeof range === 'number') return range;
  return 0;
}

function clamp(v, lo, hi) {
  return Math.max(lo, Math.min(hi, v));
}

function rollPct(chance) {
  return Math.random() * 100 < clamp(chance, 0, 100);
}

let stepSeq = 0;
function nextLogId() {
  stepSeq += 1;
  return `dlog_${stepSeq}`;
}

/**
 * @param {object} params
 * @param {object} params.boss boss def from dungeonBosses
 * @param {Array<{ owned: object, fighter: object, role: string, position: 1|2|3 }>} params.team
 */
export function createDungeonBattle({ boss, team }) {
  const positioned = [...team].sort((a, b) => a.position - b.position);
  const r1 = positioned.find((m) => m.position === 1)?.role;
  const r2 = positioned.find((m) => m.position === 2)?.role;
  const r3 = positioned.find((m) => m.position === 3)?.role;
  const formationCorrect = hasCorrectDungeonFormation(r1, r2, r3);

  const monsters = positioned.map((entry) => buildMonsterState(entry, formationCorrect));

  const bossState = {
    id: boss.id,
    name: boss.name,
    level: boss.level,
    element: boss.element,
    image: boss.image,
    maxHp: boss.stats.hp,
    hp: boss.stats.hp,
    stats: { ...boss.stats },
    statuses: {},
    enraged: false,
    finalBreathCd: 0,
    patternIndex: 0,
  };

  return {
    boss: bossState,
    bossDef: boss,
    monsters,
    formationCorrect,
    turn: 1,
    actorIndex: 0, // 0,1,2 = monsters; 3 = boss
    phase: 'active', // 'active' | 'win' | 'lose'
    log: [],
  };
}

function buildMonsterState(entry, formationCorrect) {
  const { owned, fighter, role, position } = entry;
  const stats = fighter.stats;

  const tankerAt1 = position === 1 && role === 'tanker';
  const damagerAt3 = position === 3 && role === 'damager';
  const allStatsPct = formationCorrect ? FORMATION_BONUS.allStatsBonus : 0;

  let damageReduction = POSITION_BONUS[position]?.damageReduction ?? 0;
  if (tankerAt1) damageReduction += ROLE_POSITION_BONUS.tanker.damageReduction;
  if (formationCorrect) damageReduction += FORMATION_BONUS.bossDamageReduction;
  damageReduction = clamp(damageReduction, 0, MAX_DAMAGE_REDUCTION);

  let outgoingMult = 1 + (POSITION_BONUS[position]?.damageBonus ?? 0) / 100 + allStatsPct / 100;
  if (damagerAt3) outgoingMult += ROLE_POSITION_BONUS.damager.attackBonus / 100;

  const critRate = (stats.critPct ?? 5) + (damagerAt3 ? ROLE_POSITION_BONUS.damager.critRateBonus : 0);
  const critMult = BASE_CRIT_MULT + (POSITION_BONUS[position]?.critDamageBonus ?? 0) / 100;

  let maxHpMult = 1 + allStatsPct / 100;
  if (tankerAt1) maxHpMult += ROLE_POSITION_BONUS.tanker.maxHpBonus / 100;
  const maxHp = Math.round((stats.hp ?? 100) * maxHpMult);
  const maxMp = fighter.maxMp ?? stats.mp ?? 60;

  return {
    id: owned.id,
    ownedId: owned.id,
    position,
    role,
    name: fighter.displayName || owned.nickname || owned.templateId,
    monsterParts: fighter.monsterParts,
    element: fighter.element,
    stats,
    petSnapshot: fighter.equippedPet ?? null,
    gearModifiers: fighter.gearModifiers ?? null,
    magicSkills: fighter.skills?.magic ?? [],
    maxHp,
    hp: maxHp,
    maxMp,
    mp: maxMp,
    shieldHp: 0,
    alive: true,
    statuses: {},
    supportState: { reviveCooldown: 0 },
    bonus: { damageReduction, outgoingMult, critRate, critMult },
  };
}

function findMagicSupportSkill(magicSkills, type) {
  return (magicSkills || []).find((s) => s?.status?.type === type) ?? null;
}

function deadMonsters(state) {
  return state.monsters.filter((m) => !m.alive || m.hp <= 0);
}

/** Position-2 healer: team heal + ally revive (high MP + cooldown). */
function resolvePosition2HealerSupport(state, monster) {
  if (monster.role !== 'healer' && monster.role !== 'support') return;

  const support = monster.supportState ?? {};
  if ((support.reviveCooldown ?? 0) > 0) {
    monster.supportState = { ...support, reviveCooldown: support.reviveCooldown - 1 };
  }

  const magic = monster.magicSkills || [];
  const healSkill = findMagicSupportSkill(magic, 'heal');
  const reviveSkill = findMagicSupportSkill(magic, 'revive');
  const healMult = healingMultiplier({ gearModifiers: monster.gearModifiers });

  if (reviveSkill && (monster.supportState?.reviveCooldown ?? 0) <= 0) {
    const mpCost = reviveSkill.mpCost ?? 30;
    const fallen = deadMonsters(state).filter((m) => m.id !== monster.id);
    if (fallen.length > 0 && (monster.mp ?? 0) >= mpCost) {
      const target = fallen.sort((a, b) => a.position - b.position)[0];
      const pct = reviveSkill.status?.reviveHpPct ?? 35;
      const cd = reviveSkill.status?.cooldownTurns ?? 5;
      target.hp = Math.max(1, Math.round(target.maxHp * (pct / 100)));
      target.alive = true;
      target.statuses = {};
      monster.mp = Math.max(0, monster.mp - mpCost);
      monster.supportState = { ...monster.supportState, reviveCooldown: cd };
      logLine(
        state,
        `${monster.name} spent ${mpCost} MP — revived ${target.name} at ${pct}% HP! (${cd}-turn cooldown)`,
        'heal',
        {
          type: 'heal',
          targetId: target.id,
          sourceId: monster.id,
          revive: true,
          amount: target.hp,
          mpCost,
          cooldownTurns: cd,
        },
      );
    }
  }

  if (healSkill) {
    const mpCost = healSkill.mpCost ?? 0;
    if ((monster.mp ?? 0) >= mpCost) {
      const pct = healSkill.status?.healMaxHpPct ?? 16;
      const allies = aliveMonsters(state);
      let totalHeal = 0;
      for (const ally of allies) {
        let heal = Math.round(ally.maxHp * (pct / 100));
        heal = Math.round(heal * healMult);
        const missing = Math.max(0, ally.maxHp - ally.hp);
        heal = Math.min(missing, heal);
        if (heal > 0) {
          ally.hp = Math.min(ally.maxHp, ally.hp + heal);
          totalHeal += heal;
        }
      }
      if (totalHeal > 0) {
        if (mpCost > 0) monster.mp = Math.max(0, monster.mp - mpCost);
        logLine(state, `${monster.name} mends the team (+${pct}% max HP each).`, 'heal', {
          type: 'heal',
          targetIds: allies.map((a) => a.id),
          sourceId: monster.id,
          teamWide: true,
          amount: totalHeal,
          mpCost,
        });
      }
    }
  }
}

function aliveMonsters(state) {
  return state.monsters.filter((m) => m.alive && m.hp > 0);
}

function logLine(state, text, kind = 'info', action = null) {
  state.log.push({ id: nextLogId(), text, kind, action });
}

function restoreMonsterMp(state, monster, pct, sourceName, minAmount = 1) {
  if (!monster?.alive || monster.hp <= 0 || (monster.maxMp ?? 0) <= 0) return 0;
  const missing = Math.max(0, monster.maxMp - (monster.mp ?? 0));
  if (missing <= 0) return 0;
  const amount = Math.min(missing, Math.max(minAmount, Math.round(monster.maxMp * (pct / 100))));
  if (amount <= 0) return 0;
  monster.mp = Math.min(monster.maxMp, (monster.mp ?? 0) + amount);
  logLine(state, `${monster.name} recovered ${amount} MP${sourceName ? ` (${sourceName})` : ''}.`, 'heal', {
    type: 'mp',
    targetId: monster.id,
    amount,
    sourceName,
  });
  return amount;
}

function grantShield(monster, amount) {
  if (!monster?.alive || monster.hp <= 0 || amount <= 0) return 0;
  const next = Math.max(monster.shieldHp ?? 0, amount);
  const gained = Math.max(0, next - (monster.shieldHp ?? 0));
  monster.shieldHp = next;
  return gained;
}

function grantTeamShield(state, source, pct, sourceName) {
  if (!pct || !source?.alive || source.hp <= 0) return;
  const allies = aliveMonsters(state);
  let total = 0;
  for (const ally of allies) {
    total += grantShield(ally, Math.round(ally.maxHp * (pct / 100)));
  }
  if (total > 0) {
    logLine(state, `${sourceName} shielded the team.`, 'heal', {
      type: 'shield',
      sourceId: source.id,
      targetIds: allies.map((a) => a.id),
      teamWide: true,
      amount: total,
    });
  }
}

/** Choose a single-target victim using the spec's weighted rules. */
function pickBossTarget(state) {
  const m1 = state.monsters.find((m) => m.position === 1);
  const m2 = state.monsters.find((m) => m.position === 2);
  const m3 = state.monsters.find((m) => m.position === 3);
  const a1 = m1?.alive && m1.hp > 0;
  const a2 = m2?.alive && m2.hp > 0;
  const a3 = m3?.alive && m3.hp > 0;

  let weights = [];
  if (a1 && a2 && a3) {
    weights = [[m1, 50], [m2, 25], [m3, 25]];
  } else if (!a1 && a2 && a3) {
    weights = [[m2, 50], [m3, 50]];
  } else if (a1 && !a2 && a3) {
    weights = [[m1, 65], [m3, 35]];
  } else if (a1 && a2 && !a3) {
    weights = [[m1, 65], [m2, 35]];
  } else {
    const only = [m1, m2, m3].find((m) => m?.alive && m.hp > 0);
    return only ?? null;
  }
  // Threat: a tanker@1 pulls extra aggro.
  weights = weights.map(([m, w]) => {
    if (m.position === 1 && m.role === 'tanker') return [m, w + ROLE_POSITION_BONUS.tanker.threatBonus];
    return [m, w];
  });
  const total = weights.reduce((s, [, w]) => s + w, 0);
  let roll = Math.random() * total;
  for (const [m, w] of weights) {
    if (roll < w) return m;
    roll -= w;
  }
  return weights[0][0];
}

function bossAttackStat(state, damageType) {
  const b = state.boss;
  const rageAtk = b.enraged ? 1 + (b.rageBoost?.attackIncrease ?? 0) / 100 : 1;
  const rageMag = b.enraged ? 1 + (b.rageBoost?.magicAttackIncrease ?? 0) / 100 : 1;
  if (damageType === 'magic') return b.stats.magicAttack * rageMag;
  return b.stats.attack * rageAtk;
}

function bossHitRate(state) {
  const b = state.boss;
  return b.stats.hitRate + (b.enraged ? (b.rageBoost?.hitRateIncrease ?? 0) : 0);
}

/** Boss damages one monster with a skill. Returns damage dealt. */
function bossHitMonster(state, monster, skill, { isAoe = false } = {}) {
  if (!monster?.alive || monster.hp <= 0) return 0;
  const trueDamage = skill.type === 'trueDamage';
  const damageType = skill.damageType === 'magic' ? 'magic' : 'physical';

  // Dodge (not for true damage / pure-stun fear with no damage).
  if (!trueDamage && (skill.multiplier ?? 0) > 0) {
    let dodge = monster.stats.dodge ?? monster.stats.dodgePct ?? 0;
    if (monster.statuses.freeze) dodge = 0;
    if (monster.statuses.speedDodgeDown) dodge = Math.max(0, dodge - monster.statuses.speedDodgeDown.value);
    const dodgeChance = clamp(dodge - bossHitRate(state), 0, 60);
    if (!isAoe && rollPct(dodgeChance)) {
      logLine(state, `${monster.name} dodged ${skill.name}!`, 'dodge', {
        type: 'attack',
        source: 'boss',
        targetId: monster.id,
        dodged: true,
        skillName: skill.name,
      });
      return 0;
    }
  }

  const mult = skill.multiplier ?? 1;
  let raw = bossAttackStat(state, damageType) * mult * BOSS_DMG_SCALE;
  if (isAoe) raw *= BOSS_AOE_DMG_SCALE;

  if (rollPct(state.boss.stats.critRate ?? 0)) {
    const critMult = Math.min(BOSS_CRIT_MULT_CAP, (state.boss.stats.critDamage ?? 150) / 100);
    raw *= critMult;
  }

  if (!trueDamage) {
    const defStat = damageType === 'magic' ? avg(monster.stats.magicDef) : avg(monster.stats.def);
    raw *= 1 - defenceReduction(defStat, MON_DEF_K);
    raw *= 1 - monster.bonus.damageReduction / 100;
    if (monster.statuses.freeze) raw *= 1 + DUNGEON_EFFECTS.freeze.damageTakenIncrease / 100;
    if (monster.statuses.damageTakenPct) raw *= 1 + monster.statuses.damageTakenPct.value / 100;
  }

  let dmg = Math.max(1, Math.round(raw));
  if ((monster.shieldHp ?? 0) > 0 && dmg > 0) {
    const absorbed = Math.min(monster.shieldHp, dmg);
    monster.shieldHp -= absorbed;
    dmg -= absorbed;
    logLine(state, `${monster.name}'s shield absorbed ${absorbed} damage.`, 'heal', {
      type: 'shield',
      targetId: monster.id,
      amount: absorbed,
    });
  }
  monster.hp = Math.max(0, monster.hp - dmg);
  if (monster.hp <= 0) {
    monster.alive = false;
    logLine(state, `${monster.name} was defeated!`, 'ko', { type: 'ko', targetId: monster.id });
  }
  return dmg;
}

function applyControlEffect(state, monster, skill) {
  if (skill.type === 'stun' && rollPct(skill.stunChance ?? 0)) {
    monster.statuses.stun = Math.max(monster.statuses.stun ?? 0, skill.durationTurns ?? 1);
    logLine(state, `${monster.name} is stunned!`, 'status', { type: 'status', targetId: monster.id, status: 'stun' });
  }
  if (skill.type === 'freeze' && rollPct(skill.freezeChance ?? 0)) {
    monster.statuses.freeze = Math.max(monster.statuses.freeze ?? 0, skill.durationTurns ?? 1);
    logLine(state, `${monster.name} is frozen!`, 'status', { type: 'status', targetId: monster.id, status: 'freeze' });
  }
}

function applyDebuff(state, monster, skill) {
  const turns = skill.durationTurns ?? 2;
  if (skill.effect === 'increaseDamageTaken') {
    monster.statuses.damageTakenPct = { turns, value: skill.value ?? 20 };
    logLine(state, `${monster.name} is marked (+${skill.value ?? 20}% damage taken).`, 'status', {
      type: 'status',
      targetId: monster.id,
      status: 'marked',
    });
  } else if (skill.effect === 'reduceSpeedAndDodge') {
    monster.statuses.speedDodgeDown = { turns, value: skill.value ?? 25 };
    logLine(state, `${monster.name}: speed & dodge reduced.`, 'status', {
      type: 'status',
      targetId: monster.id,
      status: 'slowed',
    });
  }
}

function applyBurn(state, monster, skill) {
  const dmgPerTurn = Math.max(1, Math.round(monster.maxHp * ((skill.burnDamagePercent ?? DUNGEON_EFFECTS.burn.damagePercentOfMaxHp) / 100)));
  monster.statuses.burn = { turns: skill.durationTurns ?? DUNGEON_EFFECTS.burn.durationTurns, dmg: dmgPerTurn };
}

function pickBossSkill(state) {
  const def = state.bossDef;
  const pattern = state.boss.enraged && def.enragedPattern ? def.enragedPattern : def.pattern;
  let name = pattern[state.boss.patternIndex % pattern.length];
  let skill = getBossSkillByName(def, name);

  // Final Breath only below 20% HP and off cooldown — else substitute Dragon Claw.
  if (skill?.type === 'trueDamage') {
    const hpPct = (state.boss.hp / state.boss.maxHp) * 100;
    if (hpPct > (skill.triggerBelowHpPercent ?? 20) || state.boss.finalBreathCd > 0) {
      skill = getBossSkillByName(def, 'Dragon Claw') ?? skill;
      name = skill?.name;
    }
  }
  return skill;
}

/** Maybe enter rage phase at start of a boss turn. Returns true if just enraged. */
function maybeEnrage(state) {
  const def = state.bossDef;
  const rageSkill = (def.skills || []).find((s) => s.type === 'rage');
  if (!rageSkill || state.boss.enraged) return false;
  const hpPct = (state.boss.hp / state.boss.maxHp) * 100;
  if (hpPct > (rageSkill.triggerBelowHpPercent ?? 30)) return false;
  state.boss.enraged = true;
  state.boss.rageBoost = rageSkill.effect ?? {};
  state.boss.patternIndex = 0;
  logLine(state, `${state.boss.name} ENRAGES! ${rageSkill.description}`, 'boss', {
    type: 'skill',
    source: 'boss',
    skillName: 'Enrage',
    enrage: true,
  });
  return true;
}

/** Start-of-turn upkeep for a monster (burn tick + control/debuff countdown). */
function monsterUpkeep(state, monster) {
  if (!monster.alive) return { skip: true };
  if (monster.statuses.burn) {
    const b = monster.statuses.burn;
    monster.hp = Math.max(0, monster.hp - b.dmg);
    logLine(state, `${monster.name} takes ${b.dmg} burn damage.`, 'dot', {
      type: 'dot',
      targetId: monster.id,
      damage: b.dmg,
    });
    b.turns -= 1;
    if (b.turns <= 0) delete monster.statuses.burn;
    if (monster.hp <= 0) {
      monster.alive = false;
      logLine(state, `${monster.name} burned to defeat!`, 'ko', { type: 'ko', targetId: monster.id });
      return { skip: true };
    }
  }
  // Countdown duration debuffs.
  for (const key of ['damageTakenPct', 'speedDodgeDown']) {
    if (monster.statuses[key]) {
      monster.statuses[key].turns -= 1;
      if (monster.statuses[key].turns <= 0) delete monster.statuses[key];
    }
  }
  // Gear set HP regen (Lifebloom / Eternal Bloom).
  const gearRegenPct = monster.gearModifiers?.regenHpPerTurn ?? 0;
  if (gearRegenPct > 0 && monster.hp > 0) {
    let heal = Math.round((monster.maxHp * gearRegenPct) / 100);
    heal = Math.round(heal * healingMultiplier({ ...monster, gearModifiers: monster.gearModifiers }));
    if (heal > 0) {
      monster.hp = Math.min(monster.maxHp, monster.hp + heal);
      const setName = monster.gearModifiers?.setName ?? 'Set bonus';
      logLine(state, `${monster.name} recovered ${heal} HP (${setName}).`, 'heal', {
        type: 'heal',
        targetId: monster.id,
        amount: heal,
      });
    }
  }
  const gearMpRegenPct = monster.gearModifiers?.regenMpPerTurn ?? 0;
  if (gearMpRegenPct > 0) {
    restoreMonsterMp(state, monster, gearMpRegenPct, monster.gearModifiers?.setName ?? 'Set bonus');
  }
  grantTeamShield(
    state,
    monster,
    monster.gearModifiers?.teamShieldMaxHpPct ?? 0,
    monster.gearModifiers?.setName ?? 'Set bonus',
  );
  // Stun / freeze consume the turn.
  if (monster.statuses.stun) {
    monster.statuses.stun -= 1;
    if (monster.statuses.stun <= 0) delete monster.statuses.stun;
    logLine(state, `${monster.name} is stunned and cannot act.`, 'status', {
      type: 'status',
      targetId: monster.id,
      status: 'stun',
    });
    return { skip: true };
  }
  if (monster.statuses.freeze) {
    monster.statuses.freeze -= 1;
    if (monster.statuses.freeze <= 0) delete monster.statuses.freeze;
    logLine(state, `${monster.name} is frozen and cannot act.`, 'status', {
      type: 'status',
      targetId: monster.id,
      status: 'freeze',
    });
    return { skip: true };
  }
  return { skip: false };
}

/** Team-wide / boss-targeted pet support fired by the Position 2 monster. */
function resolvePosition2PetSupport(state, monster) {
  const pet = monster.petSnapshot;
  if (!pet?.skills?.length) return;
  const allies = aliveMonsters(state);
  for (const skillType of pet.skills) {
    const teamWide = TEAM_WIDE_POSITION2_PET_SKILLS.includes(skillType);
    if (skillType === 'heal' || skillType === 'shield') {
      const petEffect = getPetSkillEffect(skillType, pet.rarity);
      const pct = skillType === 'heal' ? 8 : 0;
      if (pct > 0) {
        const healMult = healingMultiplier({ gearModifiers: monster.gearModifiers });
        for (const ally of allies) {
          let heal = Math.round(ally.maxHp * (pct / 100));
          heal = Math.round(heal * healMult);
          ally.hp = Math.min(ally.maxHp, ally.hp + heal);
        }
        logLine(state, `${pet.emoji ?? '🐾'} ${pet.name} healed the team.`, 'heal', {
          type: 'heal',
          targetIds: allies.map((a) => a.id),
          teamWide: true,
        });
      }
      if (skillType === 'shield') {
        grantTeamShield(state, monster, petEffect?.shieldMaxHpPct ?? 0, `${pet.emoji ?? '🐾'} ${pet.name}`);
      }
    } else if (skillType === 'cleanse' || skillType === 'cleanseDebuff') {
      for (const ally of allies) {
        delete ally.statuses.damageTakenPct;
        delete ally.statuses.speedDodgeDown;
      }
      logLine(state, `${pet.emoji ?? '🐾'} ${pet.name} cleansed team debuffs.`, 'heal', {
        type: 'heal',
        targetIds: allies.map((a) => a.id),
        teamWide: true,
        cleanse: true,
      });
    } else if (!teamWide) {
      // damage / poison / burn pets hit the boss only (no team-wide AOE abuse).
      // handled implicitly: no-op here; their stat bonuses already counted.
    }
  }
}

function playerAttackBoss(state, monster) {
  const physAvg = avg(monster.stats.attack);
  const magAvg = avg(monster.stats.magic);
  const useMagic = magAvg > physAvg;
  const atkStat = useMagic ? magAvg : physAvg;
  const bossDef = useMagic ? state.boss.stats.magicDefence : state.boss.stats.defence;

  // Boss dodge.
  const dodgeChance = clamp((state.boss.stats.dodge ?? 0) - (monster.stats.hitRate ?? 0), 0, 60);
  if (rollPct(dodgeChance)) {
    logLine(state, `${state.boss.name} dodged ${monster.name}'s attack!`, 'dodge', {
      type: 'attack',
      source: 'monster',
      sourceId: monster.id,
      targetId: 'boss',
      dodged: true,
    });
    return;
  }

  let raw = atkStat * monster.bonus.outgoingMult * PLAYER_DMG_SCALE;
  let crit = false;
  if (rollPct(monster.bonus.critRate)) {
    raw *= monster.bonus.critMult;
    crit = true;
  }
  raw *= 1 - defenceReduction(bossDef, BOSS_DEF_K);
  const dmg = Math.max(1, Math.round(raw));
  state.boss.hp = Math.max(0, state.boss.hp - dmg);
  logLine(
    state,
    `${monster.name} hits ${state.boss.name} for ${dmg}${crit ? ' (CRIT!)' : ''}${useMagic ? ' ✨' : ''}.`,
    crit ? 'crit' : 'playerHit',
    {
      type: 'attack',
      source: 'monster',
      sourceId: monster.id,
      targetId: 'boss',
      damage: dmg,
      crit,
      magic: useMagic,
    },
  );
  if (!useMagic) {
    restoreMonsterMp(
      state,
      monster,
      MP_RECOVER_WHEN_NOT_CASTING_PCT,
      'no magic used',
      MP_RECOVER_WHEN_NOT_CASTING_MIN,
    );
  }
}

function checkOutcome(state) {
  if (state.boss.hp <= 0) {
    state.phase = 'win';
    logLine(state, 'Dungeon Cleared!', 'win', { type: 'win' });
    return true;
  }
  if (aliveMonsters(state).length === 0) {
    state.phase = 'lose';
    logLine(state, 'Dungeon Failed.', 'lose', { type: 'lose' });
    return true;
  }
  return false;
}

function bossTurn(state) {
  logLine(state, `— ${state.boss.name}'s turn —`, 'turnBanner', {
    type: 'turn',
    actor: 'boss',
    name: state.boss.name,
  });
  maybeEnrage(state);
  const skill = pickBossSkill(state);
  if (!skill) {
    state.boss.patternIndex += 1;
    return;
  }
  logLine(state, `${state.boss.name} uses ${skill.name}.`, 'boss', {
    type: 'skill',
    source: 'boss',
    skillName: skill.name,
    aoe: skill.type === 'aoeAttack' || skill.target === 'all',
  });

  if (skill.type === 'aoeAttack') {
    for (const m of aliveMonsters(state)) {
      const dmg = bossHitMonster(state, m, skill, { isAoe: true });
      if (dmg > 0) {
        logLine(state, `${skill.name} hits ${m.name} for ${dmg}.`, 'bossHit', {
          type: 'attack',
          source: 'boss',
          targetId: m.id,
          damage: dmg,
          skillName: skill.name,
          aoe: true,
        });
      }
      if (skill.effect === 'burn' && m.alive) applyBurn(state, m, skill);
    }
  } else if (skill.type === 'stun' && skill.target === 'all') {
    // Dragon Fear: chance to stun each (may also have 0 damage).
    for (const m of aliveMonsters(state)) {
      if ((skill.multiplier ?? 0) > 0) {
        const dmg = bossHitMonster(state, m, skill, { isAoe: true });
        if (dmg > 0) {
          logLine(state, `${skill.name} hits ${m.name} for ${dmg}.`, 'bossHit', {
            type: 'attack',
            source: 'boss',
            targetId: m.id,
            damage: dmg,
            skillName: skill.name,
            aoe: true,
          });
        }
      }
      applyControlEffect(state, m, skill);
    }
  } else if (skill.type === 'debuff' && skill.target === 'all') {
    for (const m of aliveMonsters(state)) applyDebuff(state, m, skill);
  } else if (skill.type === 'trueDamage') {
    for (const m of aliveMonsters(state)) {
      const dmg = bossHitMonster(state, m, skill, { isAoe: true });
      logLine(state, `${skill.name} deals ${dmg} TRUE damage to ${m.name}.`, 'bossHit', {
        type: 'attack',
        source: 'boss',
        targetId: m.id,
        damage: dmg,
        skillName: skill.name,
        aoe: true,
        trueDamage: true,
      });
    }
    state.boss.finalBreathCd = skill.cooldownTurns ?? 4;
  } else {
    // single-target family: singleAttack, stun(single), freeze, debuff(single)
    const target = pickBossTarget(state);
    if (target) {
      if ((skill.multiplier ?? 0) > 0) {
        const dmg = bossHitMonster(state, target, skill);
        if (dmg > 0) {
          logLine(state, `${skill.name} hits ${target.name} for ${dmg}.`, 'bossHit', {
            type: 'attack',
            source: 'boss',
            targetId: target.id,
            damage: dmg,
            skillName: skill.name,
          });
        }
      }
      if (skill.type === 'stun' || skill.type === 'freeze') applyControlEffect(state, target, skill);
      if (skill.type === 'debuff') applyDebuff(state, target, skill);
    }
  }

  if (state.boss.finalBreathCd > 0 && skill.type !== 'trueDamage') {
    state.boss.finalBreathCd = Math.max(0, state.boss.finalBreathCd - 1);
  }
  state.boss.patternIndex += 1;
}

/**
 * Process one actor and return the same (mutated) state plus the new log slice.
 * Caller should treat the returned object as the next state.
 */
export function advanceDungeonStep(state) {
  if (state.phase !== 'active') return { state, done: true };
  const logStart = state.log.length;

  if (state.actorIndex < 3) {
    const monster = state.monsters.find((m) => m.position === state.actorIndex + 1);
    if (monster && monster.alive && monster.hp > 0) {
      const up = monsterUpkeep(state, monster);
      if (!up.skip) {
        if (monster.position === 2) {
          resolvePosition2HealerSupport(state, monster);
          resolvePosition2PetSupport(state, monster);
        }
        playerAttackBoss(state, monster);
      }
    }
    state.actorIndex += 1;
  } else {
    bossTurn(state);
    state.actorIndex = 0;
    state.turn += 1;
  }

  checkOutcome(state);
  return {
    state,
    done: state.phase !== 'active',
    newLog: state.log.slice(logStart),
  };
}

/** Convenience snapshot for the UI. */
export function dungeonSnapshot(state) {
  return {
    phase: state.phase,
    turn: state.turn,
    boss: {
      name: state.boss.name,
      hp: state.boss.hp,
      maxHp: state.boss.maxHp,
      enraged: state.boss.enraged,
    },
    monsters: state.monsters.map((m) => ({
      position: m.position,
      name: m.name,
      hp: m.hp,
      maxHp: m.maxHp,
      alive: m.alive,
      shieldHp: m.shieldHp ?? 0,
      statuses: { ...m.statuses },
    })),
  };
}
