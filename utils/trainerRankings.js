import { getMonsterDisplayName } from './mergeSystem';

/** @typedef {{ profileID: string, ownedMonsterId: string, playerName: string, level: number, monsterName: string, isYou?: boolean }} MonsterRankingEntry */

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
    templateId,
    nickname,
    monsterName: templateId ? getMonsterDisplayName(templateId, nickname) : 'Monster',
  };
}

/**
 * Derive Hall of Fame stats from a cloud /players row or full save document.
 * @param {object|null|undefined} row
 */
export function trainerRankingFromCloudRow(row) {
  if (!row || typeof row !== 'object') {
    return { level: 1, templateId: null, monsterName: 'Monster' };
  }

  const monsters = row.monsters ?? row.ownedMonsters;
  if (Array.isArray(monsters) && monsters.length > 0) {
    const peak = peakMonsterLevelFromRoster(monsters);
    return {
      level: peak.level,
      templateId: peak.templateId,
      monsterName: peak.monsterName,
    };
  }

  if (typeof row.peakMonsterLevel === 'number' && row.peakMonsterLevel > 0) {
    const templateId = row.peakMonsterTemplateId ?? row.monsterTemplateId ?? null;
    const nickname = row.peakMonsterNickname ?? '';
    return {
      level: Math.max(1, Math.floor(row.peakMonsterLevel)),
      templateId,
      monsterName: templateId
        ? getMonsterDisplayName(templateId, nickname)
        : row.monsterName || 'Monster',
    };
  }

  const level = Math.max(1, Math.floor(row.level ?? 1));
  const templateId = row.monsterTemplateId ?? null;
  return {
    level,
    templateId,
    monsterName: templateId
      ? getMonsterDisplayName(templateId, row.peakMonsterNickname ?? '')
      : row.monsterName || 'Monster',
  };
}

/**
 * @param {object[]} ownedMonsters
 * @param {{ profileID: string, playerName: string, isYou?: boolean }} ctx
 * @returns {MonsterRankingEntry[]}
 */
export function monsterRankingEntriesFromRoster(ownedMonsters = [], ctx) {
  const entries = [];
  for (const m of ownedMonsters || []) {
    const templateId = m?.templateId ?? null;
    const level = Math.max(1, Math.floor(m?.level ?? 1));
    const ownedMonsterId = m?.id ?? `${ctx.profileID}_${templateId ?? 'monster'}_${level}`;
    entries.push({
      profileID: ctx.profileID,
      ownedMonsterId,
      playerName: ctx.playerName || 'Trainer',
      level,
      monsterName: templateId
        ? getMonsterDisplayName(templateId, m?.nickname ?? '')
        : 'Monster',
      isYou: !!ctx.isYou,
    });
  }
  return entries;
}

/**
 * @param {object} cp
 * @param {string|null} localProfileId
 * @param {object[]|null|undefined} localMonsters
 * @returns {MonsterRankingEntry[]}
 */
function monsterRankingEntriesFromCloudPlayer(cp, localProfileId, localMonsters) {
  if (!cp?.profileID) return [];
  const isYou = cp.profileID === localProfileId;
  const playerName = cp.playerName || 'Player';

  const roster = localMonsters ?? cp.monsters ?? cp.ownedMonsters;
  if (Array.isArray(roster) && roster.length > 0) {
    return monsterRankingEntriesFromRoster(roster, {
      profileID: cp.profileID,
      playerName,
      isYou,
    });
  }

  const peak = trainerRankingFromCloudRow(cp);
  return [
    {
      profileID: cp.profileID,
      ownedMonsterId: `${cp.profileID}_${peak.templateId ?? 'peak'}_${peak.level}`,
      playerName,
      level: peak.level,
      monsterName: peak.monsterName,
      isYou,
    },
  ];
}

function compareRankingEntries(a, b) {
  return (
    b.level - a.level
    || String(a.monsterName).localeCompare(String(b.monsterName))
    || String(a.playerName).localeCompare(String(b.playerName))
    || String(a.ownedMonsterId).localeCompare(String(b.ownedMonsterId))
  );
}

/**
 * Global top 10 monsters by level — one row per monster, ranks #1–#10.
 * @param {{
 *   localProfile?: object|null,
 *   localProfileId?: string|null,
 *   allLocalProfiles?: object[],
 *   cloudPlayers?: object[],
 * }} opts
 */
export function buildTopTrainerRankings({
  localProfile,
  localProfileId,
  allLocalProfiles = [],
  cloudPlayers = [],
}) {
  const entries = [];
  const localById = new Map();
  const seenCloudIds = new Set();

  for (const p of allLocalProfiles || []) {
    if (!p?.id) continue;
    localById.set(p.id, p);
    entries.push(
      ...monsterRankingEntriesFromRoster(p.ownedMonsters, {
        profileID: p.id,
        playerName: p.name || 'Trainer',
        isYou: p.id === localProfileId,
      }),
    );
    seenCloudIds.add(p.id);
  }

  if (localProfile && localProfileId && !localById.has(localProfileId)) {
    entries.push(
      ...monsterRankingEntriesFromRoster(localProfile.ownedMonsters, {
        profileID: localProfileId,
        playerName: localProfile.name || 'Trainer',
        isYou: true,
      }),
    );
    seenCloudIds.add(localProfileId);
  }

  for (const cp of cloudPlayers || []) {
    if (!cp?.profileID || seenCloudIds.has(cp.profileID)) continue;
    const local = localById.get(cp.profileID);
    entries.push(
      ...monsterRankingEntriesFromCloudPlayer(
        cp,
        localProfileId,
        local?.ownedMonsters,
      ),
    );
  }

  const sorted = [...entries].sort(compareRankingEntries);

  const yourBestRank =
    localProfileId != null
      ? sorted.findIndex((r) => r.isYou) + 1 || null
      : null;

  const rows = sorted.slice(0, 10).map((row, i) => ({
    ...row,
    rank: i + 1,
  }));

  const yourMonstersInTopTen = rows.filter((r) => r.isYou).length;

  return {
    rows,
    yourRank: yourBestRank && yourBestRank > 0 ? yourBestRank : null,
    yourBestRank: yourBestRank && yourBestRank > 0 ? yourBestRank : null,
    yourMonstersInTopTen,
  };
}
