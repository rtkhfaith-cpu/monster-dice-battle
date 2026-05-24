/**
 * Client-side profile bounds — reduces corrupted saves and blocks obvious hacks from cloud sync.
 * This does NOT stop a determined player from editing localStorage in DevTools; real protection
 * requires server-side validation on POST /save and server-authoritative rewards.
 */
import { getGear } from './cosmetics';
import { MONSTER_LEVEL_MAX, reconcileMonsterLevelExp } from './expLevel';
import { getMonsterTemplate } from './monsterTemplates';
import { getLadderMonsterTemplate } from './monsterLadder/ladderMonsterCatalog';
import { defaultBattleMonsterId, resolveBattleMonsterId } from './rosterInventory';
import { ensurePassiveInventory } from '../src/gameSystems/passiveInventory';
import { getPassiveSkillDef } from '../src/gameSystems/passiveSkills';

/** Soft cap — legitimate play should stay far below this. */
export const PROFILE_COINS_SOFT_CAP = 250_000;
export const PROFILE_LEVEL_MAX = MONSTER_LEVEL_MAX;
export const PROFILE_MONSTER_CAP = 80;
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

  if (typeof profile.coins !== 'number' || !Number.isFinite(profile.coins) || profile.coins < 0) {
    profile.coins = 0;
    issues.push('coins_invalid');
  } else if (profile.coins > PROFILE_COINS_SOFT_CAP) {
    issues.push('coins_over_cap');
    if (!opts.forCloud) profile.coins = PROFILE_COINS_SOFT_CAP;
  }

  if (!Array.isArray(profile.ownedMonsters)) profile.ownedMonsters = [];
  if (profile.ownedMonsters.length > PROFILE_MONSTER_CAP) {
    profile.ownedMonsters = profile.ownedMonsters.slice(0, PROFILE_MONSTER_CAP);
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
    om.exp = reconciled.exp;
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
  const seenSkills = new Set();
  profile.passiveSkillBooksOwned = profile.passiveSkillBooksOwned.filter((b) => {
    if (seenSkills.has(b.skillId)) return false;
    seenSkills.add(b.skillId);
    return true;
  });

  const gearBefore = (profile.cosmeticsOwned || []).length;
  profile.cosmeticsOwned = (profile.cosmeticsOwned || []).filter((id) => {
    const ok = typeof id === 'string' && !!getGear(id);
    if (!ok) issues.push('gear_unknown');
    return ok;
  });
  if (profile.cosmeticsOwned.length < gearBefore) issues.push('gear_stripped');

  return { profile, issues };
}

/** True when cloud upload should be refused (keeps hacked saves local-only). */
export function profileBlockedForCloudSync(profile) {
  const { issues } = sanitizePlayerProfile(profile, { forCloud: true });
  if (issues.includes('coins_over_cap')) return true;
  const severe = issues.filter((c) =>
    c === 'monster_unknown_template' || c === 'gear_unknown' || c === 'invalid_profile',
  );
  return severe.length > 0;
}
