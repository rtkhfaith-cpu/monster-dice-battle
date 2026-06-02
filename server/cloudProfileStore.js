/**
 * Persist full player profiles to DynamoDB (or proxy to the save API).
 * Used by socket syncProfile when payload includes cloudDocument + playerKey.
 */
const path = require('path');

const TABLE_NAME = process.env.TABLE_NAME || process.env.DYNAMODB_TABLE || 'MonsterBattleSaves';
const SAVE_API_BASE = String(process.env.SAVE_API_URL || '').trim().replace(/\/+$/, '');

function getCloudStoreConfig() {
  const useApi = SAVE_API_BASE.length >= 8;
  return {
    tableName: TABLE_NAME,
    saveApiBase: SAVE_API_BASE || null,
    mode: useApi ? 'save_api' : 'dynamodb',
  };
}

function logAwsError(phase, err, extra = {}) {
  console.error(`[syncProfile] ${phase}`, {
    table: TABLE_NAME,
    errorName: err?.name,
    errorMessage: err?.message,
    awsMetadata: err?.$metadata,
    stack: err?.stack,
    ...extra,
  });
}

/** @type {import('@aws-sdk/lib-dynamodb').DynamoDBDocumentClient | null} */
let docClient = null;
/** @type {ReturnType<import('../lambda/monster-battle-save-api/profileLookup').createProfileLookup> | null} */
let profileLookup = null;
/** @type {object | null} */
let lambdaHelpers = null;

function lambdaRequire(name) {
  return require(path.join(__dirname, '..', 'lambda', 'monster-battle-save-api', name));
}

function getDynamoDeps() {
  if (!docClient) {
    const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
    const { DynamoDBDocumentClient, PutCommand } = require('@aws-sdk/lib-dynamodb');
    const { createProfileLookup } = lambdaRequire('profileLookup');
    const { sanitizeProfileItem } = lambdaRequire('sanitizeProfileItem');
    const { normalizePlayerKey, authorizeSaveAccess } = lambdaRequire('playerKeyHash');
    docClient = DynamoDBDocumentClient.from(new DynamoDBClient({}));
    profileLookup = createProfileLookup(docClient);
    lambdaHelpers = {
      PutCommand,
      normalizePlayerKey,
      authorizeSaveAccess,
      sanitizeProfileItem,
    };
  }
  return { doc: docClient, profileLookup, ...lambdaHelpers };
}

function profileIdFromPayload(cloudDocument) {
  return String(cloudDocument?.profileID || cloudDocument?.profileId || cloudDocument?.id || '').trim();
}

function redactCloudPayloadForLog(cloudDocument) {
  if (!cloudDocument || typeof cloudDocument !== 'object') return {};
  const { playerKey, pin, pinHash, playerKeyHash, ...safe } = cloudDocument;
  return {
    profileID: safe.profileID || safe.profileId || safe.id,
    playerName: safe.playerName,
    coins: safe.coins,
    monsterCount: Array.isArray(safe.monsters) ? safe.monsters.length : 0,
  };
}

async function saveViaSaveApi(cloudDocument, playerKey) {
  if (!SAVE_API_BASE || SAVE_API_BASE.length < 8) {
    return {
      ok: false,
      skipped: true,
      error: 'SAVE_API_URL not configured on socket server',
      details: 'Set SAVE_API_URL to your API Gateway base URL',
    };
  }

  const profileID = profileIdFromPayload(cloudDocument);
  const body = { ...cloudDocument, profileID, playerKey };
  delete body.pin;

  const res = await fetch(`${SAVE_API_BASE}/save`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify(body),
  });

  const text = await res.text().catch(() => '');
  let parsed = {};
  try {
    parsed = text ? JSON.parse(text) : {};
  } catch {
    parsed = { error: text.slice(0, 200) };
  }

  if (!res.ok) {
    return {
      ok: false,
      error: parsed.error || `HTTP ${res.status}`,
      details: parsed.code || parsed.message || text.slice(0, 200),
      status: res.status,
    };
  }

  return { ok: true, profileID: parsed.profileID || profileID, via: 'save_api' };
}

async function saveViaDynamo(cloudDocument, playerKey) {
  const { doc, PutCommand, normalizePlayerKey, authorizeSaveAccess, sanitizeProfileItem, profileLookup: lookup } =
    getDynamoDeps();

  const loginInput = lookup.normalizeLoginIdentifier(profileIdFromPayload(cloudDocument));
  const key = normalizePlayerKey(playerKey || cloudDocument.playerKey);

  if (!loginInput) {
    return { ok: false, error: 'Missing profileID', details: 'cloudDocument.profileID is required' };
  }
  if (key.length !== 4) {
    return { ok: false, error: 'Missing key', details: '4-digit playerKey required for cloud save' };
  }

  const resolved = await lookup.resolveProfileLookup(loginInput);
  const existing = resolved.item;
  const auth = authorizeSaveAccess(key, existing);
  if (!auth.ok) {
    return {
      ok: false,
      error: auth.error || 'Save not authorized',
      details: `status ${auth.status || 401}`,
    };
  }

  const canonicalProfileID = existing
    ? lookup.canonicalProfileId(existing)
    : loginInput;

  const now = new Date().toISOString();
  const rawItem = {
    ...cloudDocument,
    profileID: canonicalProfileID,
    playerName: cloudDocument.playerName ?? existing?.playerName,
    playerKey: key,
    updatedAt: cloudDocument.updatedAt || now,
    createdAt: cloudDocument.createdAt || existing?.createdAt || now,
  };
  delete rawItem.pin;

  const identity = {
    profileID: canonicalProfileID,
    playerName: existing?.playerName ?? cloudDocument.playerName,
    createdAt: rawItem.createdAt,
    playerKey: key,
    pinHash: existing?.pinHash,
    playerKeyHash: existing?.playerKeyHash,
  };

  const { item, fixes, bytesEstimate } = sanitizeProfileItem(rawItem, identity);
  if (bytesEstimate > 380000) {
    return {
      ok: false,
      error: 'Save too large for cloud storage',
      details: `bytesEstimate=${bytesEstimate}`,
      code: 'ITEM_TOO_LARGE',
    };
  }

  console.log('[syncProfile] DynamoDB Put started', {
    table: TABLE_NAME,
    operation: 'PutItem',
    profileID: canonicalProfileID,
    bytesEstimate,
    fixes: fixes.length ? fixes : undefined,
  });

  try {
    await doc.send(
      new PutCommand({
        TableName: TABLE_NAME,
        Item: item,
      }),
    );
  } catch (err) {
    logAwsError('DynamoDB Put failed', err, { profileID: canonicalProfileID, operation: 'PutItem' });
    return {
      ok: false,
      error: err?.name || 'DynamoDB Put failed',
      details: err?.message || String(err),
      errorName: err?.name,
      awsMetadata: err?.$metadata,
    };
  }

  console.log('[syncProfile] DynamoDB Put success', { table: TABLE_NAME, profileID: canonicalProfileID });
  return { ok: true, profileID: canonicalProfileID, via: 'dynamodb', table: TABLE_NAME, fixes };
}

/**
 * @param {object} cloudDocument — full cloud row (from toCloudProfile)
 * @param {string} playerKey — 4-digit PIN (never logged)
 */
async function persistCloudProfile(cloudDocument, playerKey) {
  const profileID = profileIdFromPayload(cloudDocument);
  console.log('[syncProfile] cloud persist requested', redactCloudPayloadForLog(cloudDocument));

  try {
    if (SAVE_API_BASE.length >= 8) {
      console.log('[syncProfile] using save API', { base: `${SAVE_API_BASE.slice(0, 40)}…`, profileID });
      return saveViaSaveApi(cloudDocument, playerKey);
    }
    console.log('[syncProfile] using direct DynamoDB', { table: TABLE_NAME, profileID });
    return saveViaDynamo(cloudDocument, playerKey);
  } catch (err) {
    logAwsError('cloud persist failed', err, { profileID });
    return {
      ok: false,
      error: err?.name || 'Cloud save failed',
      details: err?.message || String(err),
      errorName: err?.name,
      awsMetadata: err?.$metadata,
    };
  }
}

function hasCloudSavePayload(payload) {
  const doc = payload?.cloudDocument;
  if (!doc || typeof doc !== 'object') return false;
  const id = profileIdFromPayload(doc);
  if (!id) return false;
  const key = String(payload?.playerKey || doc.playerKey || '')
    .replace(/\D/g, '')
    .slice(0, 4);
  return key.length === 4;
}

module.exports = {
  persistCloudProfile,
  hasCloudSavePayload,
  redactCloudPayloadForLog,
  getCloudStoreConfig,
  TABLE_NAME,
};
