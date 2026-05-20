import { getGear } from './cosmetics';
import { getLadderGear } from './monsterLadder/ladderGearCatalog';
import { getMonsterLadderState, setMonsterLadderState } from './monsterLadder/ladderProfile';
import { gearDuplicateShardsForRarity } from '../src/gameBalance/gearShards';

function countLadderGearCopies(ml, gearId) {
  return (ml.ownedGear || []).filter((id) => id === gearId).length;
}

function profileOwnsGearAnywhere(profile, ml, gearId) {
  const inMain = (profile.cosmeticsOwned || []).includes(gearId);
  return inMain || countLadderGearCopies(ml, gearId) > 0;
}

/**
 * Grant gear to profile, or convert duplicates into ladder shards.
 * @returns {{
 *   duplicate: boolean,
 *   shardsGained: number,
 *   gearId: string,
 *   gearName: string,
 *   rarity?: string,
 *   quantity?: number,
 *   exchangedForShards?: boolean,
 * }}
 */
export function grantGearToProfile(profile, gearId) {
  const gear = getGear(gearId);
  if (!gear || !profile) {
    return {
      duplicate: false,
      shardsGained: 0,
      gearId,
      gearName: gearId,
      error: 'Unknown gear',
    };
  }

  const ml = getMonsterLadderState(profile);
  const rarity = gear.rarity ?? (getLadderGear(gearId) ? 'common' : null);
  const shardValue = gearDuplicateShardsForRarity(rarity);
  const isLadderExclusive = !!getLadderGear(gearId);

  if (profileOwnsGearAnywhere(profile, ml, gearId)) {
    ml.ladderShards = (ml.ladderShards || 0) + shardValue;
    setMonsterLadderState(profile, ml);
    const quantity = countLadderGearCopies(ml, gearId) + ((profile.cosmeticsOwned || []).includes(gearId) ? 1 : 0);
    return {
      duplicate: true,
      shardsGained: shardValue,
      exchangedForShards: true,
      gearId,
      gearName: gear.name,
      rarity: rarity ?? undefined,
      quantity: Math.max(1, quantity),
    };
  }

  if (!Array.isArray(profile.cosmeticsOwned)) profile.cosmeticsOwned = [];
  if (!profile.cosmeticsOwned.includes(gearId)) {
    profile.cosmeticsOwned = [...profile.cosmeticsOwned, gearId];
  }

  if (isLadderExclusive) {
    if (!Array.isArray(ml.ownedGear)) ml.ownedGear = [];
    ml.ownedGear.push(gearId);
    setMonsterLadderState(profile, ml);
  }

  return {
    duplicate: false,
    shardsGained: 0,
    gearId,
    gearName: gear.name,
    rarity: rarity ?? undefined,
    quantity: 1,
  };
}

export function formatGearDuplicateMessage(result) {
  if (!result?.duplicate || !result.exchangedForShards) return null;
  return `Duplicate ${result.gearName} → +${result.shardsGained} ladder shards`;
}
