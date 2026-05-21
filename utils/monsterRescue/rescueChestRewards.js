import { openLadderChestOnProfile } from '../monsterLadder/ladderRewards';
import { getMonsterLadderState, setMonsterLadderState } from '../monsterLadder/ladderProfile';
import { getMonsterRescueState } from './progress';
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
 * Sub-levels 5 and 10 drop one ladder chest per stage per weekly run (opened immediately).
 * @param {object} profile
 * @param {number} levelId Flat rescue stage 1–60
 * @param {number} subLevel 1–10 within a theme
 */
export function awardAndOpenRescueChest(profile, levelId, subLevel) {
  const kind = getRescueSubKind(subLevel);
  const chestAwarded = kind === 'miniBoss' ? 'gear' : kind === 'bigBoss' ? 'monster' : null;
  if (!chestAwarded) {
    return { chestAwarded: null, chestBlocked: false, chestDrop: null };
  }

  const mr = getMonsterRescueState(profile);
  const stageId = Math.floor(levelId || 0);
  if (mr.chestClaimedLevelIds.includes(stageId)) {
    return {
      chestAwarded,
      chestBlocked: true,
      chestDrop: null,
      chestAlreadyClaimed: true,
    };
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
