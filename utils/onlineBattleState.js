/**
 * Normalize server battle snapshots for turn-based multiplayer UI.
 * Handles legacy dice-era phases from older deployed socket servers.
 */

const DEV = typeof __DEV__ !== 'undefined' && __DEV__;

export function devOnlineBattleLog(...args) {
  if (DEV) console.log('[online-battle]', ...args);
}

/**
 * @param {object|null|undefined} snap
 * @returns {object|null}
 */
export function normalizeOnlineBattleSnapshot(snap) {
  if (!snap || typeof snap !== 'object') return null;

  const s = { ...snap };

  if (typeof s.activePlayerId !== 'number') {
    if (s.phase === 'player1Dice') s.activePlayerId = 1;
    else if (s.phase === 'player2Dice') s.activePlayerId = 2;
    else if (s.phase === 'chooseAttack' && typeof s.attackerId === 'number') s.activePlayerId = s.attackerId;
    else if (s.phase === 'chooseDefense' && typeof s.attackerId === 'number') {
      s.activePlayerId = s.attackerId === 1 ? 2 : 1;
    } else {
      s.activePlayerId = 1;
    }
  }

  const legacyDice =
    s.phase === 'player1Dice' ||
    s.phase === 'player2Dice' ||
    s.phase === 'chooseAttack' ||
    s.phase === 'chooseDefense';

  if (legacyDice) {
    s.phase = 'chooseAction';
  }

  if (s.winner) {
    s.phase = 'finished';
  }

  if (s.phase === 'finished' || s.winner) {
    s.battleState = 'finished';
  } else if (s.phase === 'resolveAttack') {
    s.battleState = 'animating';
  } else if (s.phase === 'chooseAction') {
    s.battleState = 'active';
  } else {
    s.battleState = 'preparing';
  }

  if (/roll your dice/i.test(String(s.bannerMessage || ''))) {
    s.bannerMessage = `Player ${s.activePlayerId} — choose your move`;
  }

  return s;
}

/** Map UI / legacy client action names to server battle engine actions. */
export function mapClientBattleAction(action, payload = {}) {
  const a = String(action || '').trim();
  if (a === 'submit_action') {
    const move = payload.move || payload.kind || payload.type || 'fight';
    if (move === 'magic' || payload.skillId) {
      return { action: 'magic', skillId: payload.skillId, kind: payload.kind };
    }
    if (move === 'defend') return { action: 'defend' };
    if (move === 'run') return { action: 'run' };
    return { action: 'fight' };
  }
  if (a === 'pickStrike') {
    if (payload.kind === 'magic') return { action: 'magic', skillId: payload.skillId, kind: 'magic' };
    return { action: 'fight' };
  }
  if (a === 'pickDefense') return { action: 'defend' };
  if (a === 'rollDice') return { action: 'fight' };
  return { action: a, ...payload };
}
