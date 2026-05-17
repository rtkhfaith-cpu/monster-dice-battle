/**
 * Authoritative online battle — turn-based (same flow as 1v CPU, no dice).
 */
const { resolvePhysicalBattleDamage, resolveMagicBattleDamage } = require('./battleDamage');
const { getPhysicalSkill, getMagicSkills, canAffordSkill } = require('./battleSkills');

const SKILL_ANIM = {
  fly_face: { animKind: 'fly_lunge', projectileId: 'flyBug' },
  dirty_bite: { animKind: 'bite_lunge', projectileId: 'bite' },
  spread_bacteria: { animKind: 'cloud_spread', projectileId: 'bacteria', sicklyFlash: true },
  egg_bomb: { animKind: 'egg_bomb', projectileId: 'eggBomb' },
  cold_splash: { animKind: 'water_wave', projectileId: 'waterWave' },
  crush_wave: { animKind: 'water_wave', projectileId: 'waterWave' },
  tail_slam: { animKind: 'fire_blast', projectileId: 'fireBlast' },
  spicy_noodles: { animKind: 'fire_blast', projectileId: 'fireBlast' },
  spell_burst: { animKind: 'sparkle', projectileId: 'pencil' },
  skibidi_beam: { animKind: 'water_wave', projectileId: 'waterWave' },
};

function skillAnimMeta(skill) {
  const id = skill?.id ?? '';
  if (SKILL_ANIM[id]) return { animKind: 'projectile', projectileId: 'poop', ...SKILL_ANIM[id] };
  const effectType = skill?.effectType ?? 'normal';
  if (effectType === 'water') return { animKind: 'water_wave', projectileId: 'waterWave' };
  if (effectType === 'fire') return { animKind: 'fire_blast', projectileId: 'fireBlast' };
  if (effectType === 'toiletPaper') return { animKind: 'cloud_spread', projectileId: 'toiletRoll' };
  return { animKind: 'projectile', projectileId: 'poop' };
}

function cloneFighter(f) {
  return JSON.parse(JSON.stringify(f));
}

function createBattle(fighterP1, fighterP2) {
  const p1 = cloneFighter(fighterP1);
  const p2 = cloneFighter(fighterP2);
  for (const f of [p1, p2]) {
    f.maxHp = f.stats.hp;
    f.hp = f.maxHp;
    f.maxMp = f.stats.mp;
    f.mp = f.maxMp;
    f.combo = 0;
  }

  return {
    round: 1,
    phase: 'chooseAction',
    activePlayerId: 1,
    p1,
    p2,
    log: [],
    bannerMessage: 'Player 1 — choose your move',
    currentEffect: null,
    winner: null,
    seq: 1,
  };
}

function pushLog(battle, line) {
  battle.log = [...(battle.log || []), line].slice(-6);
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
  return battle.activePlayerId ?? 1;
}

function snapshotForClient(battle) {
  return {
    round: battle.round,
    phase: battle.phase,
    activePlayerId: battle.activePlayerId,
    p1: battle.p1,
    p2: battle.p2,
    log: battle.log,
    bannerMessage: battle.bannerMessage,
    currentEffect: battle.currentEffect,
    winner: battle.winner,
    seq: battle.seq,
  };
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

function pickSkill(fighter, strikeKind, skillId) {
  if (strikeKind === 'magic') {
    const list = fighter.skills?.magic ?? getMagicSkills(fighter.monsterTemplateId);
    const found = list.find((s) => s.id === skillId);
    return found || list[0] || null;
  }
  return fighter.skills?.physical ?? getPhysicalSkill(fighter.monsterTemplateId);
}

function buildEffect(skill, resolved, attackerId, defenderId, strikeKind) {
  const anim = skillAnimMeta(skill);
  return {
    type: strikeKind === 'magic' ? 'magic' : 'normal',
    moveName: skill?.name ?? 'Attack',
    effectType: skill?.effectType ?? 'normal',
    emoji: skill?.emoji,
    skillId: skill?.id,
    animKind: anim.animKind,
    sicklyFlash: !!anim.sicklyFlash,
    critical: resolved.critical,
    weak: resolved.weak,
    dodged: false,
    defended: resolved.defended,
    damage: resolved.damage,
    attackerId,
    defenderId,
    projectileId: anim.projectileId,
    useProjectileAnim: true,
    seq: 0,
  };
}

function resolveStrike(battle, attackerId, defenderId, strikeKind, skill, defending) {
  const atk = { ...fighterAt(battle, attackerId) };
  const def = { ...fighterAt(battle, defenderId) };

  if (!skill) return { error: 'Unknown skill' };
  if (strikeKind === 'magic' && !canAffordSkill(atk, skill)) {
    return { error: 'Not enough MP' };
  }

  const resolved =
    strikeKind === 'magic'
      ? resolveMagicBattleDamage({
          attacker: atk,
          defender: def,
          defending,
          skill,
          atkElement: skill.element ?? atk.element,
          defElement: def.element,
        })
      : resolvePhysicalBattleDamage({ attacker: atk, defender: def, defending, skill });

  const mpCost = strikeKind === 'magic' ? skill.mpCost ?? 0 : 0;
  atk.mp = Math.max(0, atk.mp - mpCost);
  def.hp = Math.max(0, def.hp - resolved.damage);

  setFighter(battle, attackerId, atk);
  setFighter(battle, defenderId, def);

  battle.currentEffect = buildEffect(skill, resolved, attackerId, defenderId, strikeKind);
  battle.currentEffect.seq = battle.seq;

  if (resolved.critical) battle.bannerMessage = 'Critical hit!';
  else if (resolved.damage > 0) battle.bannerMessage = `${resolved.damage} damage!`;
  else battle.bannerMessage = 'No damage!';

  pushLog(
    battle,
    `${atk.displayName || 'Attacker'} used ${skill.name} (${resolved.damage} dmg)`,
  );

  checkWinner(battle);
  battle.phase = 'resolveAttack';
  bump(battle);
  return { ok: true };
}

function endTurnAfterResolve(battle) {
  if (battle.winner) return;
  if (battle.phase !== 'resolveAttack') return { error: 'Cannot end turn now' };

  battle.currentEffect = null;
  battle.activePlayerId = battle.activePlayerId === 1 ? 2 : 1;
  battle.phase = 'chooseAction';
  battle.round += 1;
  battle.bannerMessage = `Player ${battle.activePlayerId} — choose your move`;
  bump(battle);
  return { ok: true, battle };
}

/**
 * @returns {{ ok?: boolean, error?: string, battle?: object, scheduleEndTurn?: boolean }}
 */
function applyBattleAction(battle, playerSlot, action, payload = {}) {
  if (!battle || battle.winner) return { error: 'Battle ended' };

  const playerId = slotToId(playerSlot);
  const act = action === 'pickStrike' && payload.kind === 'magic' ? 'magic' : action;

  if (act === 'endTurn' || act === 'advanceRound') {
    const res = endTurnAfterResolve(battle);
    if (res.error) return res;
    return { ok: true, battle };
  }

  if (battle.phase !== 'chooseAction') {
    return { error: 'Wait for the attack to finish' };
  }

  if (playerId !== battle.activePlayerId) {
    return { error: 'Not your turn' };
  }

  if (act === 'run') {
    battle.winner = playerId === 1 ? 2 : 1;
    battle.phase = 'finished';
    battle.bannerMessage = 'Opponent fled!';
    pushLog(battle, 'Player fled');
    bump(battle);
    return { ok: true, battle };
  }

  if (act === 'fight' || (act === 'pickStrike' && payload.kind !== 'magic')) {
    const defenderId = playerId === 1 ? 2 : 1;
    const skill = pickSkill(fighterAt(battle, playerId), 'physical', null);
    const res = resolveStrike(battle, playerId, defenderId, 'physical', skill, false);
    if (res.error) return res;
    return { ok: true, battle, scheduleEndTurn: !battle.winner };
  }

  if (act === 'magic' || (act === 'pickStrike' && payload.kind === 'magic')) {
    const defenderId = playerId === 1 ? 2 : 1;
    const skill = pickSkill(fighterAt(battle, playerId), 'magic', payload.skillId);
    if (!skill) return { error: 'Unknown magic skill' };
    const res = resolveStrike(battle, playerId, defenderId, 'magic', skill, false);
    if (res.error) return res;
    return { ok: true, battle, scheduleEndTurn: !battle.winner };
  }

  if (act === 'defend') {
    const attackerId = playerId === 1 ? 2 : 1;
    const skill = pickSkill(fighterAt(battle, attackerId), 'physical', null);
    battle.bannerMessage = `Player ${playerId} is defending!`;
    const res = resolveStrike(battle, attackerId, playerId, 'physical', skill, true);
    if (res.error) return res;
    return { ok: true, battle, scheduleEndTurn: !battle.winner };
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
  endTurnAfterResolve,
};
