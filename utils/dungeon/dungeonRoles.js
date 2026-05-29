/**
 * Dungeon role classification + team power estimation.
 *
 * Existing monsters only carry combat roles (tank/mage/brawler/...). We derive a
 * dungeon role (tanker/healer/support/damager/hybrid) so formation bonuses and
 * the team-builder UI can guide players without changing the monster data model.
 */
import { getMonsterTemplate } from '../monsterTemplates';
import { getLadderMonsterTemplate } from '../monsterLadder/ladderMonsterCatalog';
import { fighterFromOwned } from '../fighterFromOwned';
import { powerScoreFromBundle } from '../statsCalc';

/** @typedef {'tanker'|'healer'|'support'|'damager'|'hybrid'} DungeonRole */

const ROLE_MAP = {
  tank: 'tanker',
  tank_mage: 'tanker',
  mage: 'healer',
  healer: 'healer',
  trickster: 'support',
  debuffer: 'support',
  brawler: 'damager',
  speedster: 'damager',
  balanced: 'hybrid',
  mythic: 'hybrid',
};

export const DUNGEON_ROLE_LABELS = {
  tanker: 'Tanker',
  healer: 'Healer',
  support: 'Support',
  damager: 'Damager',
  hybrid: 'Hybrid',
};

export const DUNGEON_ROLE_COLORS = {
  tanker: '#60a5fa',
  healer: '#34d399',
  support: '#c084fc',
  damager: '#f87171',
  hybrid: '#fcd34d',
};

/** Ideal position for each dungeon role. */
export const ROLE_IDEAL_POSITION = { tanker: 1, healer: 2, support: 2, damager: 3, hybrid: null };

function baseRoleForTemplate(templateId) {
  const tpl = getMonsterTemplate(templateId) ?? getLadderMonsterTemplate(templateId);
  return tpl?.role ?? 'balanced';
}

/** @returns {DungeonRole} */
export function dungeonRoleForTemplate(templateId) {
  return ROLE_MAP[baseRoleForTemplate(templateId)] ?? 'hybrid';
}

export function dungeonRoleForOwned(owned) {
  return owned ? dungeonRoleForTemplate(owned.templateId) : 'hybrid';
}

export function dungeonRoleLabel(role) {
  return DUNGEON_ROLE_LABELS[role] ?? 'Hybrid';
}

/**
 * Correct formation = tanker@1, healer/support@2, damager@3.
 * @param {DungeonRole} r1 @param {DungeonRole} r2 @param {DungeonRole} r3
 */
export function hasCorrectDungeonFormation(r1, r2, r3) {
  return r1 === 'tanker' && (r2 === 'healer' || r2 === 'support') && r3 === 'damager';
}

/** Power score for one owned monster including gear, pets, gems and skills. */
export function monsterPower(owned, profile) {
  if (!owned) return 0;
  try {
    const fighter = fighterFromOwned(owned, profile);
    return Math.round(powerScoreFromBundle(fighter.stats));
  } catch {
    return 0;
  }
}

/** Sum of the 3 chosen monsters' power (gear/pet/gem inclusive). */
export function estimateTeamPower(team, profile) {
  return (team || []).reduce((sum, owned) => sum + monsterPower(owned, profile), 0);
}
