/**
 * Client-side profile bounds — reduces corrupted saves and blocks obvious hacks from cloud sync.
 * This does NOT stop a determined player from editing localStorage in DevTools; real protection
 * requires server-side validation on POST /save and server-authoritative rewards.
 */
import { ensureGearInventory } from '../src/gameSystems/gear/inventoryGearUtils';
import { migrateProfileToNewGear } from '../src/gameSystems/gear/gearMigration';
import { ensureGemInventory } from '../src/gameSystems/gems/gemInventory';
import { MONSTER_LEVEL_MAX, reconcileMonsterLevelExp } from './expLevel';
import { getMonsterTemplate } from './monsterTemplates';
import { getLadderMonsterTemplate } from './monsterLadder/ladderMonsterCatalog';
import { defaultBattleMonsterId, resolveBattleMonsterId } from './rosterInventory';
import { ensurePassiveInventory } from '../src/gameSystems/passiveInventory';
import { getPassiveSkillDef } from '../src/gameSystems/passiveSkills';
import { ensurePetInventory } from '../src/gameSystems/petInventory';
import { normalizeMonsterLadder } from './monsterLadder/ladderProgress';
import { PROFILE_CAPS, sanitizeFiniteInt } from './profileCaps';

/** @deprecated Use PROFILE_CAPS.coins */
export const PROFILE_COINS_SOFT_CAP = PROFILE_CAPS.coins;
export const PROFILE_LEVEL_MAX = MONSTER_LEVEL_MAX;
export const PROFILE_MONSTER_CAP = PROFILE_CAPS.ownedMonsters;
export const PROFILE_NICKNAME_MAX = 24;
export const PROFILE_NAME_MAX = 24;

/** Case-insensitive key for trainer display names / login lookup. */
export function normalizeTrainerNameKey(name) {
  return String(name || '').trim().toLowerCase();
}

/**
 * Find an existing account using this trainer name (not case-sensitive).
 * @param {string} name
 * @param {{ gameData?: object, cloudPlayers?: object[], excludeProfileId?: string|null }} [ctx]
 * @returns {{ source: 'local'|'cloud', profileId: string, displayName: string }|null}
 */
export function findTrainerNameConflict(name, ctx = {}) {
  const key = normalizeTrainerNameKey(name);
  if (!key) return null;

  for (const p of ctx.gameData?.players || []) {
    if (ctx.excludeProfileId && p.id === ctx.excludeProfileId) continue;
    if (normalizeTrainerNameKey(p.name) === key || normalizeTrainerNameKey(p.id) === key) {
      return { source: 'local', profileId: p.id, displayName: p.name || p.id };
    }
  }

  for (const cp of ctx.cloudPlayers || []) {
    if (ctx.excludeProfileId && cp.profileID === ctx.excludeProfileId) continue;
    const display = cp.playerName || cp.profileID || 'Player';
    if (
      normalizeTrainerNameKey(display) === key
      || normalizeTrainerNameKey(cp.profileID) === key
    ) {
      return { source: 'cloud', profileId: cp.profileID, displayName: display };
    }
  }

  return null;
}

export function isTrainerNameTaken(name, ctx) {
  return !!findTrainerNameConflict(name, ctx);
}

export function isKnownMonsterTemplateId(templateId) {
  if (!templateId || typeof templateId !== 'string') return false;
  return !!(getMonsterTemplate(templateId) || getLadderMonsterTemplate(templateId));
}

function applyIntField(target, key, raw, caps, issues, issuePrefix) {
  const res = sanitizeFiniteInt(raw, caps);
  target[key] = res.value;
  if (res.invalid) issues.push(`${issuePrefix}_invalid`);
  else if (res.capped) issues.push(`${issuePrefix}_capped`);
}

/**
 * Clamp and strip unknown IDs. Returns issue codes for logging / cloud rejection.
 * @param {object} profile
 * @param {{ forCloud?: boolean }} [opts]
 */
export function sanitizePlayerProfile(profile, opts = {}) {
  const issues = [];
  if (!profile || typeof profile !== 'object') {
    return { profile, issues: ['invalid_profile'] };
  }

  profile.name = String(profile.name || 'Player').slice(0, PROFILE_NAME_MAX);

  applyIntField(profile, 'coins', profile.coins, { max: PROFILE_CAPS.coins }, issues, 'coins');

  if (!Array.isArray(profile.ownedMonsters)) profile.ownedMonsters = [];
  if (profile.ownedMonsters.length > PROFILE_CAPS.ownedMonsters) {
    profile.ownedMonsters = profile.ownedMonsters.slice(0, PROFILE_CAPS.ownedMonsters);
    issues.push('monsters_truncated');
  }

  profile.ownedMonsters = profile.ownedMonsters.filter((om) => {
    if (!om || typeof om !== 'object') {
      issues.push('monster_invalid');
      return false;
    }
    if (!isKnownMonsterTemplateId(om.templateId)) {
      issues.push('monster_unknown_template');
      return false;
    }
    om.nickname = String(om.nickname ?? '').slice(0, PROFILE_NICKNAME_MAX);
    const reconciled = reconcileMonsterLevelExp({
      level: Math.floor(Number(om.level) || 1),
      exp: Math.floor(Number(om.exp) || 0),
    });
    om.level = reconciled.level;
    const expRes = sanitizeFiniteInt(reconciled.exp, {
      min: 0,
      max: PROFILE_CAPS.monsterExp,
    });
    om.exp = expRes.value;
    if (expRes.capped) issues.push('monster_exp_capped');
    return true;
  });

  if (profile.selectedMonsterId && !profile.ownedMonsters.some((m) => m.id === profile.selectedMonsterId)) {
    profile.selectedMonsterId = defaultBattleMonsterId(profile);
    issues.push('selected_monster_reset');
  } else if (profile.selectedMonsterId) {
    profile.selectedMonsterId = resolveBattleMonsterId(profile.ownedMonsters, profile.selectedMonsterId);
  }

  ensurePassiveInventory(profile);
  profile.passiveSkillBooksOwned = (profile.passiveSkillBooksOwned || []).filter((b) =>
    getPassiveSkillDef(b?.skillId),
  );

  migrateProfileToNewGear(profile);
  ensureGearInventory(profile);
  ensureGemInventory(profile);

  if (Array.isArray(profile.gemInventory)) {
    profile.gemInventory = profile.gemInventory
      .map((g) => {
        if (!g || typeof g !== 'object') return null;
        const countRes = sanitizeFiniteInt(g.count, {
          min: 0,
          max: PROFILE_CAPS.gemStackCount,
        });
        if (countRes.invalid || countRes.capped) issues.push('gem_count_capped');
        return { ...g, count: countRes.value };
      })
      .filter((g) => g && g.count > 0);
  }

  applyIntField(
    profile,
    'petExpDust',
    profile.petExpDust,
    { max: PROFILE_CAPS.petExpDust },
    issues,
    'pet_exp_dust',
  );

  ensurePetInventory(profile);
  if (Array.isArray(profile.ownedPets) && profile.ownedPets.length > PROFILE_CAPS.ownedPets) {
    profile.ownedPets = profile.ownedPets.slice(0, PROFILE_CAPS.ownedPets);
    issues.push('pets_truncated');
  }

  if (profile.battleProgress && typeof profile.battleProgress === 'object') {
    const bp = profile.battleProgress;
    for (const key of ['totalBattles', 'winStreak', 'lossStreak']) {
      applyIntField(bp, key, bp[key], { max: PROFILE_CAPS.winsLosses }, issues, `battle_${key}`);
    }
  }

  if (profile.monsterLadder) {
    profile.monsterLadder = normalizeMonsterLadder(profile.monsterLadder, profile.ladderProgress);
    delete profile.ladderProgress;
  }

  return { profile, issues };
}

/** True when cloud upload should be refused (keeps hacked saves local-only). */
export function profileBlockedForCloudSync(profile) {
  const { issues } = sanitizePlayerProfile(profile, { forCloud: true });
  const severe = issues.filter((c) =>
    c === 'monster_unknown_template' || c === 'invalid_profile',
  );
  return severe.length > 0;
}
