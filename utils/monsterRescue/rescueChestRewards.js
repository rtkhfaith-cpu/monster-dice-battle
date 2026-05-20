import { openLadderChestOnProfile } from '../monsterLadder/ladderRewards';
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
 * Sub-levels 5 and 10 drop a ladder chest and open it immediately (no daily ladder limit).
 * @param {object} profile
 * @param {number} subLevel 1–10 within a theme
 */
export function awardAndOpenRescueChest(profile, subLevel) {
  const kind = getRescueSubKind(subLevel);
  const chestAwarded = kind === 'miniBoss' ? 'gear' : kind === 'bigBoss' ? 'monster' : null;
  if (!chestAwarded) {
    return { chestAwarded: null, chestBlocked: false, chestDrop: null };
  }

  const ml = getMonsterLadderState(profile);
  ensureChestInventory(ml)[chestAwarded] += 1;
  setMonsterLadderState(profile, ml);

  const opened = openLadderChestOnProfile(profile, chestAwarded);
  if (opened.error) {
    return { chestAwarded, chestBlocked: false, chestDrop: null };
  }
  return { chestAwarded, chestBlocked: false, chestDrop: opened.drop ?? null };
}
