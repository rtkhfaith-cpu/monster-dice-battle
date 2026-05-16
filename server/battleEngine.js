/**
 * Authoritative online battle state (server-side).
 * Damage logic inlined for Node CJS (client battleLogic uses ESM).
 */

function rollPercentChance(pct) {
  const p = Math.max(0, Math.min(100, pct));
  return Math.random() * 100 < p;
}

function statMid(range, fallback) {
  if (!range || typeof range.min !== 'number' || typeof range.max !== 'number') return fallback;
  return Math.round((range.min + range.max) / 2);
}

function resolveDiceBattleDamage({
  attacker,
  defender,
  attackerDice,
  defenderDice,
  defenseChoice,
  strikeKind = 'normal',
  rageMode = false,
}) {
  const atkDice = Math.max(1, Math.min(6, Math.floor(attackerDice || 1)));
  const defDice = Math.max(1, Math.min(6, Math.floor(defenderDice || 1)));

  if (defenseChoice === 'dodge') {
    const dodgePct = defender?.stats?.dodgePct ?? 25;
    if (rollPercentChance(dodgePct)) {
      return { damage: 0, critical: false, weak: false, dodged: true, defended: false };
    }
  }

  const atkPower =
    strikeKind === 'magic'
      ? statMid(attacker?.stats?.magic, 10)
      : statMid(attacker?.stats?.attack, 10);
  const defPower =
    strikeKind === 'magic'
      ? statMid(defender?.stats?.magicDef, 5)
      : statMid(defender?.stats?.def, 5);

  const comboBonus = (attacker?.combo ?? 0) * 2;
  const diceBonus = atkDice * 2;
  const levelBonus = Math.round((attacker?.level ?? 1) * 1.5);

  let raw = atkPower + diceBonus + comboBonus + levelBonus - defPower;

  let defended = false;
  if (defenseChoice === 'defend') {
    defended = true;
    raw *= 0.6;
    if (defDice > atkDice) raw *= 0.85;
    if (defDice === 6) raw *= 0.9;
  }

  let critical = false;
  let weak = false;
  if (atkDice === 6 && rollPercentChance(20)) {
    critical = true;
    raw *= 1.5;
  } else if (atkDice === 1 && rollPercentChance(20)) {
    weak = true;
    raw *= 0.75;
  }

  if (rageMode && raw > 0) raw *= 1.15;

  const damage = Math.max(1, Math.round(raw));
  return { damage, critical, weak, dodged: false, defended };
}

const MAGIC_COST = 10;
const SUPER_MP = 20;
const SUPER_NEED_DEFAULT = 3;

function rollDice() {
  return Math.floor(Math.random() * 6) + 1;
}

function superNeedFor(fighter) {
  const n = fighter?.superNeedThreshold;
  return typeof n === 'number' && n >= 1 ? Math.floor(n) : SUPER_NEED_DEFAULT;
}

function cloneFighter(f) {
  return JSON.parse(JSON.stringify(f));
}

function isRage(fighter) {
  if (!fighter?.stats?.hp) return false;
  return fighter.hp / fighter.stats.hp <= 0.3 && fighter.hp > 0;
}

function createBattle(fighterP1, fighterP2) {
  const p1 = cloneFighter(fighterP1);
  const p2 = cloneFighter(fighterP2);
  p1.maxHp = p1.stats.hp;
  p1.hp = p1.maxHp;
  p1.maxMp = p1.stats.mp;
  p1.mp = p1.maxMp;
  p1.combo = 0;
  p2.maxHp = p2.stats.hp;
  p2.hp = p2.maxHp;
  p2.maxMp = p2.stats.mp;
  p2.mp = p2.maxMp;
  p2.combo = 0;

  return {
    round: 1,
    phase: 'player1Dice',
    diceP1: null,
    diceP2: null,
    attackerId: null,
    strikeKind: null,
    defendMode: null,
    p1,
    p2,
    log: [],
    bannerMessage: '',
    currentEffect: null,
    winner: null,
    seq: 1,
    pendingResolve: null,
  };
}

function pushLog(battle, line) {
  battle.log = [...(battle.log || []), line].slice(-6);
}

function snapshotForClient(battle) {
  return {
    round: battle.round,
    phase: battle.phase,
    diceP1: battle.diceP1,
    diceP2: battle.diceP2,
    attackerId: battle.attackerId,
    strikeKind: battle.strikeKind,
    p1: battle.p1,
    p2: battle.p2,
    log: battle.log,
    bannerMessage: battle.bannerMessage,
    currentEffect: battle.currentEffect,
    winner: battle.winner,
    seq: battle.seq,
  };
}

function bump(battle) {
  battle.seq = (battle.seq || 0) + 1;
}

function slotToId(slot) {
  return slot === 'p1' ? 1 : 2;
}

function idToSlot(id) {
  return id === 1 ? 'p1' : 'p2';
}

function fighterAt(battle, id) {
  return id === 1 ? battle.p1 : battle.p2;
}

function setFighter(battle, id, f) {
  if (id === 1) battle.p1 = f;
  else battle.p2 = f;
}

function activeTurnFromPhase(battle) {
  if (battle.phase === 'player1Dice') return 1;
  if (battle.phase === 'player2Dice') return 2;
  if (battle.phase === 'chooseAttack') return battle.attackerId ?? 1;
  if (battle.phase === 'chooseDefense') return battle.attackerId === 1 ? 2 : 1;
  return battle.attackerId ?? 1;
}

function startNextRound(battle) {
  battle.round += 1;
  battle.diceP1 = null;
  battle.diceP2 = null;
  battle.attackerId = null;
  battle.strikeKind = null;
  battle.defendMode = null;
  battle.currentEffect = null;
  battle.phase = 'player1Dice';
  battle.bannerMessage = 'Roll your dice!';
  bump(battle);
}

function checkWinner(battle) {
  if (battle.p1.hp <= 0 && battle.p2.hp <= 0) battle.winner = 'draw';
  else if (battle.p1.hp <= 0) battle.winner = 2;
  else if (battle.p2.hp <= 0) battle.winner = 1;
  else battle.winner = null;
  if (battle.winner) {
    battle.phase = 'finished';
    pushLog(battle, battle.winner === 'draw' ? 'Draw!' : `Player ${battle.winner} wins!`);
  }
}

function resolveDefense(battle, mode) {
  const attackerId = battle.attackerId;
  const defId = attackerId === 1 ? 2 : 1;
  const atk = fighterAt(battle, attackerId);
  const def = fighterAt(battle, defId);
  const strikeKind = battle.strikeKind || 'normal';

  let atkPaid = { ...atk };
  if (strikeKind === 'magic') {
    if (atkPaid.mp < MAGIC_COST) return { error: 'Not enough MP' };
    atkPaid.mp -= MAGIC_COST;
  }

  const atkDice = attackerId === 1 ? battle.diceP1 : battle.diceP2;
  const defDice = attackerId === 1 ? battle.diceP2 : battle.diceP1;

  const resolved = resolveDiceBattleDamage({
    attacker: atkPaid,
    defender: def,
    attackerDice: atkDice ?? 1,
    defenderDice: defDice ?? 1,
    defenseChoice: mode,
    strikeKind: strikeKind === 'magic' ? 'magic' : 'normal',
    rageMode: isRage(atkPaid),
  });

  const dodged = resolved.dodged;
  const dmg = dodged ? 0 : resolved.damage;

  let nextAtk = { ...atkPaid };
  let nextDef = { ...def };

  if (dodged) nextAtk.combo = 0;
  else {
    nextAtk.combo = atkPaid.combo + 1;
    nextDef.hp = Math.max(0, def.hp - dmg);
    nextDef.combo = 0;
  }

  setFighter(battle, attackerId, nextAtk);
  setFighter(battle, defId, nextDef);

  battle.currentEffect = {
    type: strikeKind === 'magic' ? 'magic' : 'normal',
    damage: dmg,
    critical: !!resolved.critical && !dodged && dmg > 0,
    weak: !!resolved.weak && !dodged && dmg > 0,
    dodged,
    defended: mode === 'defend',
    dodgeFailed: mode === 'dodge' && !dodged,
    superBomb: false,
    useProjectileAnim: true,
    attackerId,
    defenderId: defId,
    seq: battle.seq,
  };

  if (!dodged && dmg > 0) {
    battle.bannerMessage = `${dmg} damage!`;
    pushLog(battle, `${def.displayName || 'Defender'} took ${dmg} damage!`);
  } else if (dodged) {
    battle.bannerMessage = 'Dodged!';
  }
  if (resolved.critical && !dodged && dmg > 0) {
    pushLog(battle, 'Critical hit!');
    battle.bannerMessage = 'Critical hit!';
  }

  checkWinner(battle);
  battle.phase = 'resolveAttack';
  bump(battle);
  return { ok: true };
}

/**
 * @returns {{ ok: boolean, error?: string, battle?: object }}
 */
function applyBattleAction(battle, playerSlot, action, payload = {}) {
  if (!battle || battle.winner) return { error: 'Battle ended' };

  const playerId = slotToId(playerSlot);
  const turn = activeTurnFromPhase(battle);

  if (action === 'rollDice') {
    if (battle.phase === 'player1Dice' && playerId !== 1) return { error: 'Not your turn' };
    if (battle.phase === 'player2Dice' && playerId !== 2) return { error: 'Not your turn' };
    if (battle.phase !== 'player1Dice' && battle.phase !== 'player2Dice') return { error: 'Cannot roll now' };

    const val = rollDice();
    if (battle.phase === 'player1Dice') {
      battle.diceP1 = val;
      battle.phase = 'player2Dice';
      battle.bannerMessage = 'Opponent rolls…';
      pushLog(battle, `P1 rolled ${val}`);
    } else {
      battle.diceP2 = val;
      pushLog(battle, `P2 rolled ${val}`);
      const p1Roll = Number(battle.diceP1);
      const p2Roll = Number(val);
      if (!Number.isNaN(p1Roll) && !Number.isNaN(p2Roll) && p1Roll === p2Roll) {
        battle.diceP1 = null;
        battle.diceP2 = null;
        battle.phase = 'player1Dice';
        battle.bannerMessage = 'Draw — roll again!';
        bump(battle);
        return { ok: true, battle };
      }
      const atk = p2Roll > p1Roll ? 2 : 1;
      battle.attackerId = atk;
      battle.phase = 'chooseAttack';
      battle.bannerMessage = `Player ${atk} attacks — pick Fight`;
    }
    bump(battle);
    return { ok: true, battle };
  }

  if (action === 'pickStrike') {
    if (battle.phase !== 'chooseAttack') return { error: 'Cannot attack now' };
    if (battle.attackerId !== playerId) return { error: 'Not your turn' };
    const kind = payload.kind || 'normal';
    const atk = fighterAt(battle, playerId);
    if (kind === 'magic' && atk.mp < MAGIC_COST) return { error: 'Not enough MP' };
    if (kind === 'super') {
      const need = superNeedFor(atk);
      if (atk.combo < need || atk.mp < SUPER_MP) return { error: 'Super not ready' };
    }
    battle.strikeKind = kind;
    battle.phase = 'chooseDefense';
    battle.bannerMessage = 'Defender — Defend or Dodge';
    bump(battle);
    return { ok: true, battle };
  }

  if (action === 'pickDefense') {
    if (battle.phase !== 'chooseDefense') return { error: 'Cannot defend now' };
    const defId = battle.attackerId === 1 ? 2 : 1;
    if (playerId !== defId) return { error: 'Not your turn' };
    const mode = payload.mode === 'dodge' ? 'dodge' : 'defend';
    const res = resolveDefense(battle, mode);
    if (res.error) return res;
    return { ok: true, battle, scheduleNextRound: !battle.winner };
  }

  if (action === 'advanceRound') {
    if (battle.phase !== 'resolveAttack' || battle.winner) return { error: 'Cannot advance' };
    startNextRound(battle);
    return { ok: true, battle };
  }

  if (action === 'run') {
    const winner = playerId === 1 ? 2 : 1;
    battle.winner = winner;
    battle.phase = 'finished';
    battle.bannerMessage = 'Opponent fled!';
    pushLog(battle, 'Player fled');
    bump(battle);
    return { ok: true, battle };
  }

  return { error: 'Unknown action' };
}

module.exports = {
  createBattle,
  applyBattleAction,
  snapshotForClient,
  slotToId,
  idToSlot,
  activeTurnFromPhase,
};
