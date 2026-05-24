/**
 * Grant a chest-rolled monster to the player roster (main or ladder template).
 */

import { generateOwnedMonster } from './gameStorage';
import { resolveBattleMonsterId } from './rosterInventory';
import { getMonsterTemplate } from './monsterTemplates';
import {
  grantLadderMonsterToProfile,
  profileOwnsMonsterTemplate,
} from './monsterLadder/ladderProfile';
import { resolveLadderTemplateId } from './monsterLadder/ladderMonsterMigrate';

/**
 * @param {object} profile
 * @param {{ id: string, name?: string, rarity?: string }} pick
 * @returns {{ ownedId: string, duplicate: boolean }|null}
 */
export function grantChestMonsterToProfile(profile, pick) {
  if (!profile || !pick?.id) return null;

  const mainTpl = getMonsterTemplate(pick.id);
  if (mainTpl) {
    const duplicate = profileOwnsMonsterTemplate(profile, pick.id);
    const om = generateOwnedMonster(pick.id);
    if (!Array.isArray(profile.ownedMonsters)) profile.ownedMonsters = [];
    profile.ownedMonsters.push(om);
    const battleId = resolveBattleMonsterId(profile.ownedMonsters, om.id);
    if (!profile.selectedMonsterId) profile.selectedMonsterId = battleId;
    else if (!duplicate) profile.selectedMonsterId = battleId;
    return { ownedId: om.id, duplicate };
  }

  const templateId = resolveLadderTemplateId(pick.id) ?? pick.id;
  const duplicate = profileOwnsMonsterTemplate(profile, templateId);
  const row = grantLadderMonsterToProfile(profile, templateId);
  return { ownedId: row.id, duplicate };
}
