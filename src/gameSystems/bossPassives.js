/**
 * Auto-equip passive skills on mini bosses and big bosses (CPU / ladder enemies).
 */
import {
  getPassiveSkillDef,
  PASSIVE_SKILL_IDS,
  PASSIVE_SKILL_BOOK_SHOP,
} from './passiveSkills';
import { normalizeEquippedPassiveRow } from './passiveInventory';

const ALL_SKILL_IDS = Object.values(PASSIVE_SKILL_IDS);

function hashSeed(seed) {
  const s = String(seed ?? 'boss');
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** Deterministic shuffle so the same stage + template keeps the same boss passives. */
function seededShuffle(ids, seed) {
  const arr = [...ids];
  let h = hashSeed(seed);
  for (let i = arr.length - 1; i > 0; i--) {
    h = Math.imul(h ^ (h >>> 13), 16777619) >>> 0;
    const j = h % (i + 1);
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function passiveBookRarityForBoss(stageKind, encounterRarity) {
  if (stageKind === 'bigBoss') {
    return encounterRarity === 'mythic' ? 'mythic' : 'legendary';
  }
  return 'epic';
}

/** At least 1 passive; big bosses scale with encounter tier (legendary 2, mythic 3). */
function passiveCountForBoss(stageKind, encounterRarity) {
  if (stageKind === 'bigBoss') {
    return encounterRarity === 'mythic' ? 3 : 2;
  }
  return 1;
}

/**
 * @param {{ stageKind: 'miniBoss'|'bigBoss', encounterRarity?: string, seedKey?: string }} opts
 * @returns {import('./passiveInventory').EquippedPassiveRow[]}
 */
export function buildBossEquippedPassives({ stageKind, encounterRarity, seedKey }) {
  if (stageKind !== 'miniBoss' && stageKind !== 'bigBoss') return [];

  const rarity = passiveBookRarityForBoss(stageKind, encounterRarity);
  const count = Math.max(1, passiveCountForBoss(stageKind, encounterRarity));
  const ordered = seededShuffle(ALL_SKILL_IDS, seedKey || `${stageKind}_${rarity}`);
  const equippedAt = new Date().toISOString();

  return ordered
    .slice(0, count)
    .map((skillId, i) =>
      normalizeEquippedPassiveRow({
        skillId,
        rarity,
        equippedAt,
        instanceId: `boss_${stageKind}_${skillId}_${i}`,
      }),
    )
    .filter(Boolean);
}

export const BOSS_PASSIVE_BATTLE_STATE = { barrierConsumed: false, rageCoreShown: false };

const PASSIVE_EMOJI = Object.fromEntries(
  PASSIVE_SKILL_BOOK_SHOP.map((entry) => [entry.skillId, entry.emoji]),
);

/** Labels for boss intro overlay (emoji + name + book rarity). */
export function formatBossPassiveIntroLines(fighter) {
  const passives = fighter?.equippedPassives;
  if (!Array.isArray(passives) || passives.length === 0) return [];

  return passives.map((p, index) => {
    const def = getPassiveSkillDef(p.skillId);
    const emoji = PASSIVE_EMOJI[p.skillId] ?? '✦';
    const rarity =
      typeof p.rarity === 'string'
        ? p.rarity.charAt(0).toUpperCase() + p.rarity.slice(1)
        : '';
    return {
      key: p.instanceId ?? `${p.skillId}_${index}`,
      text: `${emoji} ${def?.name ?? p.skillId}${rarity ? ` · ${rarity}` : ''}`,
    };
  });
}
