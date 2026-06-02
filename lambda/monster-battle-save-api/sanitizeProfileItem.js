/**
 * Server-side profile sanitization before DynamoDB Put.
 * Caps must match utils/profileCaps.js PROFILE_CAPS.
 */
const CAP = {
  coins: 999_999_999,
  gemStackCount: 999_999_999,
  ladderGold: 999_999_999,
  ladderShards: 999_999_999,
  ladderExpDust: 999_999_999,
  petExpDust: 999_999_999,
  monsterLevel: 180,
  monsterExp: 999_999_999,
  ownedMonsters: 500,
  ownedPets: 300,
  itemQuantity: 9_999_999,
  winsLosses: 9_999_999,
};

function sanitizeFiniteInt(value, opts = {}) {
  const min = opts.min ?? 0;
  const max = opts.max ?? CAP.coins;
  const fallback = opts.fallback ?? min;
  let n = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(n)) {
    return { value: fallback, fix: opts.field ? `${opts.field}_invalid` : 'invalid_number' };
  }
  n = Math.floor(n);
  if (n < min) return { value: min, fix: opts.field ? `${opts.field}_below_min` : null };
  if (n > max) return { value: max, fix: opts.field ? `${opts.field}_capped` : 'capped' };
  return { value: n, fix: null };
}

function stripUndefinedDeep(value) {
  if (value === undefined) return undefined;
  if (value === null || typeof value !== 'object') return value;
  if (Array.isArray(value)) {
    return value
      .map((entry) => stripUndefinedDeep(entry))
      .filter((entry) => entry !== undefined);
  }
  const out = {};
  for (const [key, entry] of Object.entries(value)) {
    if (entry === undefined) continue;
    const next = stripUndefinedDeep(entry);
    if (next !== undefined) out[key] = next;
  }
  return out;
}

function pushFix(fixes, code, detail) {
  if (!code) return;
  fixes.push(detail ? `${code}:${detail}` : code);
}

function sanitizeMonsterRow(om, fixes) {
  if (!om || typeof om !== 'object') return null;
  const row = { ...om };
  const lv = sanitizeFiniteInt(row.level, {
    min: 1,
    max: CAP.monsterLevel,
    field: 'monster.level',
  });
  pushFix(fixes, lv.fix, row.id || row.templateId);
  row.level = lv.value;
  const exp = sanitizeFiniteInt(row.exp, { min: 0, max: CAP.monsterExp, field: 'monster.exp' });
  pushFix(fixes, exp.fix, row.id || row.templateId);
  row.exp = exp.value;
  return row;
}

function sanitizeGemRow(g, fixes) {
  if (!g || typeof g !== 'object') return null;
  const row = { ...g };
  const count = sanitizeFiniteInt(row.count, {
    min: 0,
    max: CAP.gemStackCount,
    field: 'gem.count',
  });
  pushFix(fixes, count.fix, row.key || row.stat);
  row.count = count.value;
  if (row.count <= 0) return null;
  return row;
}

function sanitizeLadder(ml, fixes) {
  if (!ml || typeof ml !== 'object') return ml;
  const out = { ...ml };
  const gold = sanitizeFiniteInt(out.ladderGold, { max: CAP.ladderGold, field: 'ladderGold' });
  pushFix(fixes, gold.fix);
  out.ladderGold = gold.value;
  const shards = sanitizeFiniteInt(out.ladderShards, { max: CAP.ladderShards, field: 'ladderShards' });
  pushFix(fixes, shards.fix);
  out.ladderShards = shards.value;
  const dust = sanitizeFiniteInt(out.expDust, { max: CAP.ladderExpDust, field: 'ladderExpDust' });
  pushFix(fixes, dust.fix);
  out.expDust = dust.value;
  if (out.chestInventory && typeof out.chestInventory === 'object') {
    const inv = { ...out.chestInventory };
    for (const key of ['gear', 'monster']) {
      const q = sanitizeFiniteInt(inv[key], { max: CAP.itemQuantity, field: `chest.${key}` });
      pushFix(fixes, q.fix);
      inv[key] = q.value;
    }
    out.chestInventory = inv;
  }
  if (out.stats && typeof out.stats === 'object') {
    const st = { ...out.stats };
    for (const key of ['totalBattles', 'wins', 'losses', 'gearChestsOpened', 'monsterChestsOpened']) {
      const q = sanitizeFiniteInt(st[key], { max: CAP.winsLosses, field: `ladder.stats.${key}` });
      pushFix(fixes, q.fix);
      st[key] = q.value;
    }
    out.stats = st;
  }
  const monsters = Array.isArray(out.ownedMonsters)
    ? out.ownedMonsters.map((m) => sanitizeMonsterRow(m, fixes)).filter(Boolean)
    : [];
  out.ownedMonsters = monsters;
  return out;
}

/**
 * @param {object} raw
 * @returns {{ item: object, fixes: string[], bytesEstimate: number }}
 */
function sanitizeProfileItem(raw) {
  const fixes = [];
  const item = raw && typeof raw === 'object' ? { ...raw } : {};

  const coins = sanitizeFiniteInt(item.coins, { max: CAP.coins, field: 'coins' });
  pushFix(fixes, coins.fix);
  item.coins = coins.value;

  const petDust = sanitizeFiniteInt(item.petExpDust, { max: CAP.petExpDust, field: 'petExpDust' });
  pushFix(fixes, petDust.fix);
  item.petExpDust = petDust.value;

  let monsters = Array.isArray(item.monsters)
    ? item.monsters
    : Array.isArray(item.ownedMonsters)
      ? item.ownedMonsters
      : [];
  if (monsters.length > CAP.ownedMonsters) {
    fixes.push(`monsters_truncated:${monsters.length}->${CAP.ownedMonsters}`);
    monsters = monsters.slice(0, CAP.ownedMonsters);
  }
  monsters = monsters.map((m) => sanitizeMonsterRow(m, fixes)).filter(Boolean);
  item.monsters = monsters;
  delete item.ownedMonsters;

  if (Array.isArray(item.gemInventory)) {
    item.gemInventory = item.gemInventory
      .map((g) => sanitizeGemRow(g, fixes))
      .filter(Boolean);
  }

  if (Array.isArray(item.ownedPets)) {
    if (item.ownedPets.length > CAP.ownedPets) {
      fixes.push(`pets_truncated:${item.ownedPets.length}->${CAP.ownedPets}`);
      item.ownedPets = item.ownedPets.slice(0, CAP.ownedPets);
    }
  }

  if (item.battleProgress && typeof item.battleProgress === 'object') {
    const bp = { ...item.battleProgress };
    for (const key of ['totalBattles', 'winStreak', 'lossStreak']) {
      const q = sanitizeFiniteInt(bp[key], { max: CAP.winsLosses, field: `battle.${key}` });
      pushFix(fixes, q.fix);
      bp[key] = q.value;
    }
    item.battleProgress = bp;
  }

  if (item.monsterLadder) {
    item.monsterLadder = sanitizeLadder(item.monsterLadder, fixes);
  }

  const clean = stripUndefinedDeep(item);
  let bytesEstimate = 0;
  try {
    bytesEstimate = Buffer.byteLength(JSON.stringify(clean), 'utf8');
  } catch {
    bytesEstimate = 0;
  }

  return { item: clean, fixes, bytesEstimate };
}

module.exports = { sanitizeProfileItem, CAP };
