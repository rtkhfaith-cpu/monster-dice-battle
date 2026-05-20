import { getMonsterDisplayName } from './mergeSystem';

/** @typedef {{ profileID: string, playerName: string, level: number, monsterName: string, isYou?: boolean }} TrainerRankingEntry */

/**
 * Highest level among owned monsters for a profile.
 * @param {object[]} ownedMonsters
 */
export function peakMonsterLevelFromRoster(ownedMonsters = []) {
  let level = 1;
  let templateId = null;
  let nickname = '';
  for (const m of ownedMonsters || []) {
    const lv = Math.max(1, Math.floor(m?.level ?? 1));
    if (lv > level) {
      level = lv;
      templateId = m.templateId ?? null;
      nickname = m.nickname ?? '';
    }
  }
  return {
    level,
    monsterName: templateId ? getMonsterDisplayName(templateId, nickname) : 'Monster',
  };
}

/**
 * @param {Map<string, TrainerRankingEntry>} map
 * @param {TrainerRankingEntry} entry
 */
function upsertRanking(map, entry) {
  if (!entry?.profileID) return;
  const prev = map.get(entry.profileID);
  if (!prev || entry.level > prev.level) {
    map.set(entry.profileID, {
      ...entry,
      playerName: entry.playerName || prev?.playerName || 'Trainer',
      monsterName: entry.monsterName || prev?.monsterName || 'Monster',
      isYou: !!(entry.isYou || prev?.isYou),
    });
  } else if (entry.isYou) {
    prev.isYou = true;
  }
}

/**
 * Build top-10 list sorted by highest monster level (local + cloud).
 * @param {{
 *   localProfile?: object|null,
 *   localProfileId?: string|null,
 *   cloudPlayers?: object[],
 * }} opts
 * @returns {{ rows: (TrainerRankingEntry & { rank: number })[], yourRank: number|null }}
 */
export function buildTopTrainerRankings({ localProfile, localProfileId, cloudPlayers = [] }) {
  const map = new Map();

  if (localProfile && localProfileId) {
    const peak = peakMonsterLevelFromRoster(localProfile.ownedMonsters);
    upsertRanking(map, {
      profileID: localProfileId,
      playerName: localProfile.name || 'Trainer',
      level: peak.level,
      monsterName: peak.monsterName,
      isYou: true,
    });
  }

  for (const cp of cloudPlayers || []) {
    if (!cp?.profileID) continue;
    upsertRanking(map, {
      profileID: cp.profileID,
      playerName: cp.playerName || 'Player',
      level: Math.max(1, Math.floor(cp.level ?? 1)),
      monsterName: cp.monsterName || 'Monster',
      isYou: cp.profileID === localProfileId,
    });
  }

  const sorted = [...map.values()].sort(
    (a, b) => b.level - a.level || String(a.playerName).localeCompare(String(b.playerName)),
  );

  const yourRank =
    localProfileId != null
      ? sorted.findIndex((r) => r.profileID === localProfileId) + 1 || null
      : null;

  const rows = sorted.slice(0, 10).map((row, i) => ({
    ...row,
    rank: i + 1,
  }));

  return {
    rows,
    yourRank: yourRank && yourRank > 0 ? yourRank : null,
  };
}
