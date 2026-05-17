/**
 * API Gateway Lambda — Monster Battle cloud saves (DynamoDB table: MonsterBattleSaves).
 * Routes: POST /save, GET /save/{profileID}, DELETE /save/{profileID}, GET /players, POST /login
 */
const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const {
  DynamoDBDocumentClient,
  GetCommand,
  PutCommand,
  DeleteCommand,
  ScanCommand,
} = require('@aws-sdk/lib-dynamodb');
const {
  verifyPlayerKey,
  normalizePlayerKey,
  hasStoredKey,
  hashLooksValid,
  hashPlayerKey,
  profileIsProtected,
} = require('./playerKeyHash');

const TABLE_NAME = process.env.TABLE_NAME || 'MonsterBattleSaves';
const MAX_LIST = 50;
const API_SECURITY_VERSION = 'pin-auth-v2';

const ALLOWED_ORIGINS = new Set([
  'https://monster-dice-battle.rtkhfaith.com',
  'http://localhost:5173',
  'http://localhost:8081',
  'http://127.0.0.1:5173',
  'http://127.0.0.1:8081',
]);

const client = DynamoDBDocumentClient.from(new DynamoDBClient({}));

function isAllowedOrigin(origin) {
  if (!origin || typeof origin !== 'string') return false;
  if (ALLOWED_ORIGINS.has(origin)) return true;
  try {
    const host = new URL(origin).hostname.toLowerCase();
    if (host === 'localhost' || host === '127.0.0.1') return true;
    if (host.endsWith('.amplifyapp.com')) return true;
    if (host.endsWith('.rtkhfaith.com')) return true;
  } catch {
    return false;
  }
  return false;
}

function corsHeaders(event) {
  const origin = event?.headers?.origin || event?.headers?.Origin || '';
  const allowOrigin = isAllowedOrigin(origin)
    ? origin
    : 'https://monster-dice-battle.rtkhfaith.com';
  return {
    'Access-Control-Allow-Origin': allowOrigin,
    'Access-Control-Allow-Methods': 'GET,POST,DELETE,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Expose-Headers': 'X-Save-Api-Version',
    'X-Save-Api-Version': API_SECURITY_VERSION,
    'Content-Type': 'application/json',
  };
}

function respond(event, statusCode, body) {
  return {
    statusCode,
    headers: corsHeaders(event),
    body: JSON.stringify(body),
  };
}

function parseBody(event) {
  if (!event?.body) return {};
  try {
    return typeof event.body === 'string' ? JSON.parse(event.body) : event.body;
  } catch {
    return {};
  }
}

/** HTTP API v2 (rawPath) and REST API (path) — strip stage prefix e.g. /prod/players → /players */
function normalizePath(event) {
  let path =
    event.rawPath ||
    event.path ||
    event.requestContext?.http?.path ||
    event.requestContext?.resourcePath ||
    '';
  if (typeof path !== 'string') path = String(path || '');
  // /prod, /default, /dev, /stage at start of path
  path = path.replace(/^\/(prod|default|dev|stage|test)(?=\/|$)/i, '');
  if (!path || path === '') path = '/';
  if (!path.startsWith('/')) path = `/${path}`;
  if (path.length > 1 && path.endsWith('/')) path = path.slice(0, -1);
  return path;
}

function getHttpMethod(event) {
  const method =
    event.httpMethod ||
    event.requestContext?.http?.method ||
    event.requestContext?.httpMethod ||
    'GET';
  return String(method).toUpperCase();
}

function isPlayersListPath(path) {
  return path === '/players';
}

function profileIdFromPath(path) {
  const m = path.match(/^\/save\/([^/]+)\/?$/i);
  return m ? decodeURIComponent(m[1]) : null;
}

/** API Gateway often passes {profileID} here instead of embedding it in path. */
function profileIdFromEvent(event, normalizedPath) {
  const params = event.pathParameters || {};
  const fromParam = params.profileID ?? params.profileId ?? params.id ?? params.proxy;
  if (fromParam) return decodeURIComponent(String(fromParam)).trim();
  return profileIdFromPath(normalizedPath ?? normalizePath(event));
}

function getQueryPlayerKey(event) {
  const q = event.queryStringParameters || {};
  const raw = q.playerKey ?? q.playerkey ?? q.PlayerKey ?? '';
  if (raw) return normalizePlayerKey(raw);
  const multi = event.multiValueQueryStringParameters || {};
  const mk = multi.playerKey?.[0] ?? multi.playerkey?.[0];
  return normalizePlayerKey(mk || '');
}

function pickLevel(item) {
  const monsters = Array.isArray(item.monsters) ? item.monsters : [];
  const sel = item.selectedMonsterId;
  const om = monsters.find((m) => m.id === sel) || monsters[0];
  return typeof om?.level === 'number' ? om.level : 1;
}

function toPublicListItem(item) {
  const profileID = String(item?.profileID || item?.id || '').trim();
  if (!profileID) return null;
  const monsters = Array.isArray(item.monsters)
    ? item.monsters
    : Array.isArray(item.ownedMonsters)
      ? item.ownedMonsters
      : [];
  const sel = item.selectedMonsterId;
  const om = monsters.find((m) => m.id === sel) || monsters[0];
  return {
    profileID,
    playerName: String(item.playerName || 'Player').slice(0, 24),
    selectedMonsterId: item.selectedMonsterId ?? null,
    monsterTemplateId: om?.templateId ?? null,
    level: pickLevel(item),
    coins: typeof item.coins === 'number' ? item.coins : 0,
    updatedAt: item.updatedAt || item.createdAt || null,
    requiresKey: profileIsProtected(item),
  };
}

async function getProfile(profileID) {
  const id = String(profileID || '').trim();
  if (!id) return null;

  const byPk = await client.send(
    new GetCommand({
      TableName: TABLE_NAME,
      Key: { profileID: id },
    }),
  );
  if (byPk.Item) return byPk.Item;

  // Rows visible in Scan (/players) but missing profileID partition key — match by attribute.
  const scan = await client.send(
    new ScanCommand({
      TableName: TABLE_NAME,
      FilterExpression: 'profileID = :id OR #idAttr = :id',
      ExpressionAttributeNames: { '#idAttr': 'id' },
      ExpressionAttributeValues: { ':id': id },
      Limit: 25,
    }),
  );
  const hit = (scan.Items || []).find(
    (row) => String(row.profileID || row.id || '').trim() === id,
  );
  if (!hit) return null;
  return { ...hit, profileID: String(hit.profileID || hit.id || id) };
}

function stripSecrets(item) {
  const { pinHash, playerKeyHash, pin, ...safe } = item;
  const profileID = String(safe.profileID || safe.id || '').trim();
  return profileID ? { ...safe, profileID } : safe;
}

/** Authorize read/login — exact key match only; never accept or overwrite keys on failure. */
function authorizeProfileAccess(profileID, playerKey, item) {
  const key = normalizePlayerKey(playerKey);
  if (key.length !== 4) return { ok: false, error: 'Invalid player key' };
  if (!profileIsProtected(item)) {
    return { ok: false, error: 'Profile not found' };
  }
  if (!verifyPlayerKey(key, item)) {
    return { ok: false, error: 'Incorrect key' };
  }
  return { ok: true, item };
}

/** GET /players — scan DynamoDB and return public profile summaries. */
async function handleListPlayers(event) {
  const scan = await client.send(
    new ScanCommand({
      TableName: TABLE_NAME,
      Limit: 200,
    }),
  );
  const players = (scan.Items || [])
    .map(toPublicListItem)
    .filter(Boolean)
    .sort((a, b) => String(b.updatedAt || '').localeCompare(String(a.updatedAt || '')))
    .slice(0, MAX_LIST);
  return respond(event, 200, { players });
}

async function handleLogin(event) {
  const body = parseBody(event);
  const profileID = String(body.profileID || '').trim();
  const playerKey = normalizePlayerKey(body.playerKey);
  if (!profileID) return respond(event, 400, { error: 'Missing profileID' });

  const item = await getProfile(profileID);
  if (!item) return respond(event, 404, { error: 'Profile not found' });

  if (playerKey.length !== 4) return respond(event, 400, { error: 'Invalid player key' });

  const auth = authorizeProfileAccess(profileID, playerKey, item);
  if (!auth.ok) {
    return respond(event, 401, { error: auth.error || 'Incorrect key' });
  }

  return respond(event, 200, { profile: stripSecrets(auth.item) });
}

async function handleGetSave(event, profileID) {
  const item = await getProfile(profileID);
  if (!item) return respond(event, 404, { error: 'Profile not found' });

  const qk = getQueryPlayerKey(event);

  if (qk.length !== 4) {
    return respond(event, 401, { error: 'Player key required' });
  }

  const auth = authorizeProfileAccess(profileID, qk, item);
  if (!auth.ok) {
    return respond(event, 401, { error: auth.error || 'Incorrect key' });
  }
  return respond(event, 200, { profile: stripSecrets(auth.item) });
}

async function handlePostSave(event) {
  const body = parseBody(event);
  const profileID = String(body.profileID || body.id || '').trim();
  if (!profileID) return respond(event, 400, { error: 'Missing profileID' });

  const existing = await getProfile(profileID);
  const verifyKey = normalizePlayerKey(body.playerKey);
  const incomingHash = String(body.playerKeyHash || body.pinHash || '').trim();

  if (existing && profileIsProtected(existing)) {
    if (verifyKey.length === 4) {
      if (!verifyPlayerKey(verifyKey, existing)) {
        return respond(event, 401, { error: 'Incorrect key' });
      }
    } else if (incomingHash && hashLooksValid(incomingHash)) {
      const saved = existing.playerKeyHash || existing.pinHash || '';
      if (incomingHash !== saved) {
        return respond(event, 401, { error: 'Player key required to update save' });
      }
    } else {
      return respond(event, 401, { error: 'Player key required to update save' });
    }
  } else if (!existing) {
    if (verifyKey.length !== 4 && !hashLooksValid(incomingHash)) {
      return respond(event, 400, { error: 'Player key required for new save' });
    }
  }

  const now = new Date().toISOString();
  const item = {
    ...body,
    profileID,
    updatedAt: body.updatedAt || now,
    createdAt: body.createdAt || (existing?.createdAt || now),
  };
  delete item.playerKey;

  let keyHash = incomingHash;
  if (verifyKey.length === 4) {
    keyHash = hashPlayerKey(verifyKey);
  } else if (existing && hasStoredKey(existing)) {
    keyHash = String(existing.pinHash || existing.playerKeyHash || '').trim();
  }

  if (keyHash && hashLooksValid(keyHash)) {
    item.playerKeyHash = keyHash;
    item.pinHash = keyHash;
    delete item.pin;
  } else if (existing && hasStoredKey(existing)) {
    item.playerKeyHash = existing.playerKeyHash || existing.pinHash;
    item.pinHash = item.playerKeyHash;
    delete item.pin;
  }

  await client.send(
    new PutCommand({
      TableName: TABLE_NAME,
      Item: item,
    }),
  );
  return respond(event, 200, { ok: true, profileID });
}

async function handleDeleteSave(event, profileID) {
  const body = parseBody(event);
  const playerKey = normalizePlayerKey(body.playerKey);

  const item = await getProfile(profileID);
  if (!item) return respond(event, 404, { error: 'Not found' });

  if (playerKey.length !== 4) return respond(event, 400, { error: 'Invalid player key' });

  if (!verifyPlayerKey(playerKey, item)) {
    return respond(event, 401, { error: 'Incorrect key' });
  }

  const pk = String(item.profileID || profileID).trim();
  await client.send(
    new DeleteCommand({
      TableName: TABLE_NAME,
      Key: { profileID: pk },
    }),
  );
  return respond(event, 200, { ok: true, profileID: pk });
}

exports.handler = async (event) => {
  const method = getHttpMethod(event);
  const path = normalizePath(event);

  if (method === 'OPTIONS') {
    return { statusCode: 204, headers: corsHeaders(event), body: '' };
  }

  try {
    if (method === 'GET' && isPlayersListPath(path)) {
      return await handleListPlayers(event);
    }

    if (method === 'POST' && path === '/login') {
      return await handleLogin(event);
    }

    if (method === 'POST' && path === '/save') {
      return await handlePostSave(event);
    }

    const profileID = profileIdFromEvent(event, path);
    if (profileID) {
      if (method === 'GET') return await handleGetSave(event, profileID);
      if (method === 'DELETE') return await handleDeleteSave(event, profileID);
    }

    return respond(event, 404, { error: 'Not found', path, method });
  } catch (err) {
    console.error('[save-api]', err?.message || err, { path, method });
    return respond(event, 500, { error: 'Internal server error' });
  }
};
