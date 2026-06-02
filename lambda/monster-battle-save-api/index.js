/**
 * API Gateway Lambda — Monster Battle cloud saves (DynamoDB table: MonsterBattleSaves).
 * Routes: POST /save, GET /save/{profileID}, DELETE /save/{profileID}, GET /players, POST /login
 * PIN: plain 4-digit playerKey on each item (no hashing).
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
  normalizePlayerKey,
  authorizeProfileAccess,
  authorizeSaveAccess,
  profileIsProtected,
} = require('./playerKeyHash');
const { sanitizeProfileItem } = require('./sanitizeProfileItem');
const { createProfileLookup } = require('./profileLookup');

const TABLE_NAME = process.env.TABLE_NAME || 'MonsterBattleSaves';
const MAX_LIST = 50;
const API_SECURITY_VERSION = 'pin-plain-v1';

const ALLOWED_ORIGINS = new Set([
  'https://monster-dice-battle.rtkhfaith.com',
  'http://localhost:5173',
  'http://localhost:8081',
  'http://127.0.0.1:5173',
  'http://127.0.0.1:8081',
]);

const client = DynamoDBDocumentClient.from(new DynamoDBClient({}));
const profileLookup = createProfileLookup(client);

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
    'Access-Control-Allow-Headers': 'Content-Type, X-Player-Key',
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

function normalizePath(event) {
  let path =
    event.rawPath ||
    event.path ||
    event.requestContext?.http?.path ||
    event.requestContext?.resourcePath ||
    '';
  if (typeof path !== 'string') path = String(path || '');
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

function profileIdFromEvent(event, normalizedPath) {
  const params = event.pathParameters || {};
  const fromParam = params.profileID ?? params.profileId ?? params.id ?? params.proxy;
  if (fromParam) return decodeURIComponent(String(fromParam)).trim();
  return profileIdFromPath(normalizedPath ?? normalizePath(event));
}

function getQueryPlayerKey(event) {
  const q = event.queryStringParameters || {};
  if (q && typeof q === 'object') {
    const raw = q.playerKey ?? q.playerkey ?? q.PlayerKey ?? '';
    if (raw) return normalizePlayerKey(raw);
  }
  const multi = event.multiValueQueryStringParameters || {};
  const mk = multi.playerKey?.[0] ?? multi.playerkey?.[0];
  if (mk) return normalizePlayerKey(mk);

  const rawQs = String(event.rawQueryString || '').trim();
  if (rawQs) {
    try {
      const params = new URLSearchParams(rawQs.startsWith('?') ? rawQs.slice(1) : rawQs);
      const fromRaw =
        params.get('playerKey') || params.get('playerkey') || params.get('PlayerKey') || '';
      if (fromRaw) return normalizePlayerKey(fromRaw);
    } catch {
      /* ignore */
    }
  }
  return '';
}

function getHeaderPlayerKey(event) {
  const h = event.headers || {};
  const raw =
    h['x-player-key'] ||
    h['X-Player-Key'] ||
    h['X-PLAYER-KEY'] ||
    h.playerkey ||
    '';
  return normalizePlayerKey(raw);
}

/** Header → query → JSON body (DELETE often drops query/body on API Gateway). */
function resolvePlayerKey(event, body = {}) {
  const fromHeader = getHeaderPlayerKey(event);
  if (fromHeader.length === 4) return fromHeader;
  const fromQuery = getQueryPlayerKey(event);
  if (fromQuery.length === 4) return fromQuery;
  return normalizePlayerKey(body.playerKey);
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
  const resolved = await profileLookup.resolveProfileLookup(profileID);
  return resolved.item;
}

/** Never return PIN in API responses. */
function stripSecrets(item) {
  const { playerKey, pinHash, playerKeyHash, pin, ...safe } = item;
  const profileID = String(safe.profileID || safe.id || '').trim();
  return profileID ? { ...safe, profileID } : safe;
}

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
  const loginInput = profileLookup.normalizeLoginIdentifier(
    body.login || body.profileID || body.playerName || body.name || '',
  );
  const playerKey = normalizePlayerKey(body.playerKey);

  if (!loginInput) return respond(event, 400, { error: 'Missing profileID' });
  if (playerKey.length !== 4) return respond(event, 401, { error: 'Missing key' });

  const lookup = await profileLookup.resolveProfileLookup(loginInput);
  profileLookup.logLookup('POST /login', 'lookup', {
    lookup_key_used: lookup.lookupKey,
    lookup_value_used: lookup.lookupValue,
    found: lookup.found,
    resolved_profile_id: lookup.resolvedProfileID,
    dynamodb_returned_item: lookup.found,
  });

  if (!lookup.found || !lookup.item) {
    return respond(event, 404, {
      error: 'Player not found',
      not_found: true,
      lookup_key_used: lookup.lookupKey,
      lookup_value_used: lookup.lookupValue,
    });
  }

  const profileID = profileLookup.canonicalProfileId(lookup.item);
  const auth = authorizeProfileAccess(profileID, playerKey, lookup.item);
  if (!auth.ok) {
    return respond(event, auth.status || 401, { error: auth.error || 'Incorrect key' });
  }

  return respond(event, 200, {
    profile: stripSecrets(auth.item),
    resolvedProfileID: profileID,
  });
}

async function handleGetSave(event, profileID) {
  const lookup = await profileLookup.resolveProfileLookup(profileID);
  profileLookup.logLookup('GET /save', 'lookup', {
    lookup_key_used: lookup.lookupKey,
    lookup_value_used: lookup.lookupValue,
    found: lookup.found,
    resolved_profile_id: lookup.resolvedProfileID,
    dynamodb_returned_item: lookup.found,
  });
  const item = lookup.item;
  if (!item) {
    return respond(event, 404, {
      error: 'Player not found',
      not_found: true,
      lookup_key_used: lookup.lookupKey,
      lookup_value_used: lookup.lookupValue,
    });
  }
  const resolvedId = profileLookup.canonicalProfileId(item);

  const playerKey = resolvePlayerKey(event, {});
  if (playerKey.length !== 4) {
    return respond(event, 401, { error: 'Missing key' });
  }

  const auth = authorizeProfileAccess(resolvedId, playerKey, item);
  if (!auth.ok) {
    return respond(event, auth.status || 401, { error: auth.error || 'Incorrect key' });
  }

  return respond(event, 200, { profile: stripSecrets(auth.item), resolvedProfileID: resolvedId });
}

async function handlePostSave(event) {
  const body = parseBody(event);
  const loginInput = profileLookup.normalizeLoginIdentifier(
    body.profileID || body.id || body.login || '',
  );
  const playerKey = normalizePlayerKey(body.playerKey);

  if (!loginInput) return respond(event, 400, { error: 'Missing profileID' });
  if (playerKey.length !== 4) return respond(event, 400, { error: 'Missing key' });

  const lookup = await profileLookup.resolveProfileLookup(loginInput);
  const existing = lookup.item;
  profileLookup.logLookup('POST /save', 'lookup', {
    lookup_key_used: lookup.lookupKey,
    lookup_value_used: lookup.lookupValue,
    found: lookup.found,
    resolved_profile_id: lookup.resolvedProfileID,
    dynamodb_returned_item: lookup.found,
  });

  const auth = authorizeSaveAccess(playerKey, existing);
  if (!auth.ok) {
    return respond(event, auth.status || 401, { error: auth.error || 'Incorrect key' });
  }

  const canonicalProfileID = existing
    ? profileLookup.canonicalProfileId(existing)
    : loginInput;

  const now = new Date().toISOString();
  const rawItem = {
    ...body,
    profileID: canonicalProfileID,
    playerName: body.playerName ?? existing?.playerName,
    playerKey,
    updatedAt: body.updatedAt || now,
    createdAt: body.createdAt || existing?.createdAt || now,
  };

  delete rawItem.pin;

  const identity = {
    profileID: canonicalProfileID,
    playerName: existing?.playerName ?? body.playerName,
    createdAt: rawItem.createdAt,
    playerKey,
    pinHash: existing?.pinHash,
    playerKeyHash: existing?.playerKeyHash,
  };

  const { item, fixes, bytesEstimate } = sanitizeProfileItem(rawItem, identity);
  if (bytesEstimate > 380000) {
    console.error('[save-api] profile payload too large', {
      profileID: canonicalProfileID,
      bytesEstimate,
      coins: item.coins,
      coinsType: typeof item.coins,
    });
    return respond(event, 413, {
      error: 'Save too large for cloud storage. Reduce inventory size or contact support.',
      code: 'ITEM_TOO_LARGE',
    });
  }

  if (fixes.length > 0) {
    console.warn('[save-api] sanitized profile fields', {
      profileID: canonicalProfileID,
      fixes,
      coins: item.coins,
      coinsType: typeof item.coins,
    });
  }

  try {
    await client.send(
      new PutCommand({
        TableName: TABLE_NAME,
        Item: item,
      }),
    );
    console.log('[save-api] DynamoDB Put OK', { profileID: canonicalProfileID, bytesEstimate });
    return respond(event, 200, { ok: true, profileID: canonicalProfileID, sanitized: fixes.length > 0 });
  } catch (err) {
    console.error('[save-api] DynamoDB Put failed', {
      profileID: canonicalProfileID,
      name: err?.name,
      message: err?.message,
      stack: err?.stack,
    });
    return respond(event, 500, { error: 'Cloud save failed', code: 'DYNAMODB_PUT_FAILED' });
  }
}

async function handleDeleteSave(event, profileID) {
  const body = parseBody(event);
  const playerKey = resolvePlayerKey(event, body);

  const item = await getProfile(profileID);
  if (!item) return respond(event, 404, { error: 'Player not found' });

  if (playerKey.length !== 4) {
    return respond(event, 401, { error: 'Missing key' });
  }

  const auth = authorizeProfileAccess(profileID, playerKey, item);
  if (!auth.ok) {
    return respond(event, auth.status || 401, { error: auth.error || 'Incorrect key' });
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

    if (method === 'POST' && path === '/save/delete') {
      const body = parseBody(event);
      const profileID = String(body.profileID || body.profileId || '').trim();
      if (!profileID) return respond(event, 400, { error: 'Missing profileID' });
      return await handleDeleteSave(event, profileID);
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
