/** Self-target support magic — mirrors utils/battleLogic.js for multiplayer server. */

const SUPPORT_STATUS_TYPES = new Set(['heal', 'revive', 'atkUp', 'defUp']);

function rollPercentChance(pct) {
  const p = Math.max(0, Math.min(100, pct));
  return Math.random() * 100 < p;
}

function normalizeStatuses(fighter) {
  if (!fighter) return {};
  if (fighter.statuses && typeof fighter.statuses === 'object') return fighter.statuses;
  const s = fighter.status;
  if (s && s.type && (s.turnsLeft ?? 0) > 0) return { [s.type]: s };
  return {};
}

function applyStatus(fighter, type, turns = 2, potency = 1) {
  if (!fighter) return fighter;
  const dict = { ...normalizeStatuses(fighter) };
  const cur = dict[type];
  dict[type] = {
    type,
    turnsLeft: Math.max(cur?.turnsLeft ?? 0, Math.max(1, turns)),
    potency: potency || 1,
  };
  return { ...fighter, statuses: dict, status: dict[type] };
}

function healingMultiplier(fighter) {
  const dict = normalizeStatuses(fighter);
  const burn = dict.burn;
  let mult = 1;
  if (burn && (burn.turnsLeft ?? 0) > 0) {
    const red = Math.min(80, burn.healReductionPct ?? 0);
    mult = Math.max(0, 1 - red / 100);
  }
  const healBoost = fighter?.gearModifiers?.healPowerPct ?? 0;
  if (healBoost) mult *= 1 + healBoost / 100;
  return mult;
}

function clampHealAmount(amount, fighter) {
  const maxHp = fighter?.maxHp ?? fighter?.stats?.hp ?? 100;
  const missing = Math.max(0, maxHp - (fighter?.hp ?? 0));
  return Math.min(missing, Math.max(0, Math.round(amount)));
}

function isSupportMagicSkill(skill) {
  const t = skill?.status?.type;
  return skill?.kind === 'magic' && SUPPORT_STATUS_TYPES.has(t);
}

function ensurePassiveBattleState(fighter) {
  if (!fighter.passiveBattleState) {
    return { ...fighter, passiveBattleState: { barrierConsumed: false, rageCoreShown: false, skillCooldowns: {} } };
  }
  if (!fighter.passiveBattleState.skillCooldowns) {
    return {
      ...fighter,
      passiveBattleState: { ...fighter.passiveBattleState, skillCooldowns: {} },
    };
  }
  return fighter;
}

function reviveCooldownLeft(attacker, skill) {
  const cdKey = skill?.id ?? 'revive';
  return attacker?.passiveBattleState?.skillCooldowns?.[cdKey] ?? 0;
}

function setReviveCooldown(attacker, skill, st) {
  const cdKey = skill?.id ?? 'revive';
  const state = { ...(attacker.passiveBattleState ?? {}) };
  const cooldowns = { ...(state.skillCooldowns ?? {}) };
  cooldowns[cdKey] = Math.max(1, st.cooldownTurns ?? 4);
  return {
    ...attacker,
    passiveBattleState: { ...state, skillCooldowns: cooldowns },
  };
}

function resolveSupportMagicSkill(attacker, skill, { fallenAllies = [] } = {}) {
  const st = skill?.status;
  if (!st?.type || !SUPPORT_STATUS_TYPES.has(st.type)) {
    return { attacker, healing: 0, message: null, ok: false };
  }
  if (!rollPercentChance(Math.round((st.chance ?? 1) * 100))) {
    return { attacker, healing: 0, message: null, ok: false };
  }

  let atk = ensurePassiveBattleState({ ...attacker });
  const maxHp = atk.maxHp ?? atk.stats?.hp ?? 100;
  const name = atk.displayName ?? 'Monster';

  if (st.type === 'heal') {
    const pct = st.healMaxHpPct ?? 20;
    let heal = Math.round((maxHp * pct) / 100 * healingMultiplier(atk));
    heal = clampHealAmount(heal, atk);
    if (heal <= 0) {
      return { attacker: atk, healing: 0, message: `${name} is already at full HP.`, ok: false };
    }
    atk = { ...atk, hp: Math.min(maxHp, atk.hp + heal) };
    return { attacker: atk, healing: heal, message: `${name} restored ${heal} HP!`, ok: true };
  }

  if (st.type === 'revive') {
    const cdLeft = reviveCooldownLeft(atk, skill);
    if (cdLeft > 0) {
      return {
        attacker: atk,
        healing: 0,
        message: `Revival on cooldown (${cdLeft} turn${cdLeft === 1 ? '' : 's'}).`,
        ok: false,
      };
    }
    if (atk.hp <= 0) {
      return { attacker: atk, healing: 0, message: 'Cannot cast Revival while defeated.', ok: false };
    }
    const fallen = (fallenAllies || []).filter((a) => a && ((a.hp ?? 0) <= 0 || a.alive === false));
    if (fallen.length === 0) {
      return { attacker: atk, healing: 0, message: 'No fallen allies to revive.', ok: false };
    }
    const target = fallen.sort((a, b) => (a.position ?? 99) - (b.position ?? 99))[0];
    const pct = st.reviveHpPct ?? 40;
    const targetMaxHp = target.maxHp ?? target.stats?.hp ?? 100;
    const restoredHp = Math.max(1, Math.round(targetMaxHp * (pct / 100)));
    const revivedAlly = {
      ...target,
      hp: restoredHp,
      alive: true,
      statuses: {},
      status: null,
    };
    atk = setReviveCooldown(atk, skill, st);
    const targetName = target.displayName ?? target.name ?? 'Ally';
    return {
      attacker: atk,
      revivedAlly,
      healing: restoredHp,
      message: `${name} revived ${targetName} at ${pct}% HP!`,
      ok: true,
    };
  }

  if (st.type === 'atkUp' || st.type === 'defUp') {
    atk = applyStatus(atk, st.type, st.turns ?? 2, 1);
    const label = st.type === 'atkUp' ? 'Attack Up' : 'Defense Up';
    return { attacker: atk, healing: 0, message: `${name} gained ${label}!`, ok: true };
  }

  return { attacker: atk, healing: 0, message: null, ok: false };
}

module.exports = {
  isSupportMagicSkill,
  resolveSupportMagicSkill,
  SUPPORT_STATUS_TYPES,
};
