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
  applyKeyToItem,
} = require('./playerKeyHash');

const TABLE_NAME = process.env.TABLE_NAME || 'MonsterBattleSaves';
const MAX_LIST = 50;

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

function normalizePath(event) {
  let path = event.path || event.rawPath || event.requestContext?.http?.path || '';
  path = path.replace(/^\/prod/, '');
  return path;
}

function profileIdFromPath(path) {
  const m = path.match(/^\/save\/([^/]+)\/?$/);
  return m ? decodeURIComponent(m[1]) : null;
}

function pickLevel(item) {
  const monsters = Array.isArray(item.monsters) ? item.monsters : [];
  const sel = item.selectedMonsterId;
  const om = monsters.find((m) => m.id === sel) || monsters[0];
  return typeof om?.level === 'number' ? om.level : 1;
}

function toPublicListItem(item) {
  if (!item?.profileID) return null;
  const monsters = Array.isArray(item.monsters) ? item.monsters : [];
  const sel = item.selectedMonsterId;
  const om = monsters.find((m) => m.id === sel) || monsters[0];
  return {
    profileID: String(item.profileID),
    playerName: String(item.playerName || 'Player').slice(0, 24),
    selectedMonsterId: item.selectedMonsterId ?? null,
    monsterTemplateId: om?.templateId ?? null,
    level: pickLevel(item),
    coins: typeof item.coins === 'number' ? item.coins : 0,
    updatedAt: item.updatedAt || item.createdAt || null,
  };
}

async function getProfile(profileID) {
  const id = String(profileID || '').trim();
  if (!id) return null;
  const res = await client.send(
    new GetCommand({
      TableName: TABLE_NAME,
      Key: { profileID: id },
    }),
  );
  return res.Item || null;
}

function stripSecrets(item) {
  const { pinHash, playerKeyHash, pin, ...safe } = item;
  const profileID = String(safe.profileID || safe.id || '').trim();
  return profileID ? { ...safe, profileID } : safe;
}

async function verifyKeyOrRepair(profileID, playerKey, item) {
  if (verifyPlayerKey(playerKey, item)) {
    return { ok: true, item };
  }
  if (!hasStoredKey(item)) {
    const updated = applyKeyToItem({ ...item, profileID: String(profileID) }, playerKey);
    await client.send(
      new PutCommand({
        TableName: TABLE_NAME,
        Item: updated,
      }),
    );
    return { ok: true, item: updated, repaired: true };
  }
  return { ok: false };
}

async function handleListPlayers(event) {
  const scan = await client.send(
    new ScanCommand({
      TableName: TABLE_NAME,
      Limit: 200,
    }),
  );
  const items = (scan.Items || [])
    .map(toPublicListItem)
    .filter(Boolean)
    .sort((a, b) => String(b.updatedAt || '').localeCompare(String(a.updatedAt || '')))
    .slice(0, MAX_LIST);
  return respond(event, 200, { players: items });
}

async function handleLogin(event) {
  const body = parseBody(event);
  const profileID = String(body.profileID || '').trim();
  const playerKey = normalizePlayerKey(body.playerKey);
  if (!profileID) return respond(event, 400, { error: 'Missing profileID' });
  if (playerKey.length !== 4) return respond(event, 400, { error: 'Invalid player key' });

  const item = await getProfile(profileID);
  if (!item) return respond(event, 404, { error: 'Profile not found' });

  const auth = await verifyKeyOrRepair(profileID, playerKey, item);
  if (!auth.ok) {
    return respond(event, 401, { error: 'Incorrect key' });
  }

  return respond(event, 200, { profile: stripSecrets(auth.item) });
}

async function handleGetSave(event, profileID) {
  const item = await getProfile(profileID);
  if (!item) return respond(event, 404, { error: 'Not found' });

  const qk = normalizePlayerKey(
    event.queryStringParameters?.playerKey || event.queryStringParameters?.playerkey || '',
  );
  if (qk.length === 4) {
    const auth = await verifyKeyOrRepair(profileID, qk, item);
    if (!auth.ok) {
      return respond(event, 401, { error: 'Incorrect key' });
    }
    return respond(event, 200, stripSecrets(auth.item));
  }

  const publicItem = toPublicListItem(item);
  if (publicItem) return respond(event, 200, publicItem);
  return respond(event, 200, stripSecrets(item));
}

async function handlePostSave(event) {
  const body = parseBody(event);
  const profileID = String(body.profileID || '').trim();
  if (!profileID) return respond(event, 400, { error: 'Missing profileID' });

  const now = new Date().toISOString();
  const keyHash = String(body.playerKeyHash || body.pinHash || '').trim();
  const item = {
    ...body,
    profileID,
    updatedAt: body.updatedAt || now,
    createdAt: body.createdAt || now,
  };
  if (keyHash) {
    item.playerKeyHash = keyHash;
    item.pinHash = keyHash;
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
  if (playerKey.length !== 4) return respond(event, 400, { error: 'Invalid player key' });

  const item = await getProfile(profileID);
  if (!item) return respond(event, 404, { error: 'Not found' });

  if (!verifyPlayerKey(playerKey, item)) {
    return respond(event, 401, { error: 'Incorrect key' });
  }

  await client.send(
    new DeleteCommand({
      TableName: TABLE_NAME,
      Key: { profileID: String(profileID) },
    }),
  );
  return respond(event, 200, { ok: true, profileID });
}

exports.handler = async (event) => {
  const method = (event.httpMethod || event.requestContext?.http?.method || 'GET').toUpperCase();
  const path = normalizePath(event);

  if (method === 'OPTIONS') {
    return { statusCode: 204, headers: corsHeaders(event), body: '' };
  }

  try {
    if (method === 'GET' && (path === '/players' || path === '/players/')) {
      return await handleListPlayers(event);
    }

    if (method === 'POST' && (path === '/login' || path === '/login/')) {
      return await handleLogin(event);
    }

    if (method === 'POST' && (path === '/save' || path === '/save/')) {
      return await handlePostSave(event);
    }

    const profileID = profileIdFromPath(path);
    if (profileID) {
      if (method === 'GET') return await handleGetSave(event, profileID);
      if (method === 'DELETE') return await handleDeleteSave(event, profileID);
    }

    return respond(event, 404, { error: 'Not found', path, method });
  } catch (err) {
    console.error('[save-api]', err?.message || err);
    return respond(event, 500, { error: 'Internal server error' });
  }
};
