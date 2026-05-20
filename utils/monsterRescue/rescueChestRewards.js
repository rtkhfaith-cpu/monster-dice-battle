import { getMonsterLadderState, setMonsterLadderState } from '../monsterLadder/ladderProfile';
import { getRescueSubKind } from './stages';

function ensureChestInventory(ml) {
  if (!ml.chestInventory || typeof ml.chestInventory !== 'object') {
    ml.chestInventory = { gear: 0, monster: 0 };
  }
  ml.chestInventory.gear = Math.max(0, Math.floor(ml.chestInventory.gear || 0));
  ml.chestInventory.monster = Math.max(0, Math.floor(ml.chestInventory.monster || 0));
  return ml.chestInventory;
}

/**
 * Award ladder chest inventory on rescue sub-level clear (same rules as Monster Ladder).
 * @param {object} profile
 * @param {number} subLevel 1–10 within a theme
 */
export function awardRescueSubChest(profile, subLevel) {
  const ml = getMonsterLadderState(profile);
  const kind = getRescueSubKind(subLevel);
  let chestAwarded = null;
  let chestBlocked = false;

  if (kind === 'miniBoss') {
    if (!ml.gearChestClaimedToday) {
      ensureChestInventory(ml).gear += 1;
      ml.gearChestClaimedToday = true;
      chestAwarded = 'gear';
    } else {
      chestBlocked = true;
    }
  } else if (kind === 'bigBoss') {
    if (!ml.monsterChestClaimedToday) {
      ensureChestInventory(ml).monster += 1;
      ml.monsterChestClaimedToday = true;
      chestAwarded = 'monster';
    } else {
      chestBlocked = true;
    }
  }

  setMonsterLadderState(profile, ml);
  return { chestAwarded, chestBlocked };
}
