/**
 * DynamoDB player lookup — table MonsterBattleSaves, partition key: profileID (no sort key).
 * No GSI; name/login resolution uses paginated Scan when GetItem misses.
 */
const {
  DynamoDBDocumentClient,
  GetCommand,
  ScanCommand,
} = require('@aws-sdk/lib-dynamodb');

const TABLE_NAME = process.env.TABLE_NAME || 'MonsterBattleSaves';
const SCAN_PAGE_LIMIT = 100;
const MAX_SCAN_PAGES = 15;

/** @param {DynamoDBDocumentClient} client */
function createProfileLookup(client) {
  function normalizeLoginIdentifier(raw) {
    return String(raw || '').trim();
  }

  function normalizeNameKey(name) {
    return normalizeLoginIdentifier(name).toLowerCase();
  }

  function canonicalProfileId(item) {
    if (!item || typeof item !== 'object') return '';
    return String(item.profileID || item.id || '').trim();
  }

  function canonicalItem(item) {
    const profileID = canonicalProfileId(item);
    if (!profileID) return null;
    return { ...item, profileID };
  }

  async function getByPartitionKey(pk) {
    const id = normalizeLoginIdentifier(pk);
    if (!id) return null;
    const res = await client.send(
      new GetCommand({
        TableName: TABLE_NAME,
        Key: { profileID: id },
      }),
    );
    return res.Item ? canonicalItem(res.Item) : null;
  }

  /**
   * @param {(row: object) => boolean} matchFn
   */
  async function scanUntilMatch(matchFn) {
    let lastKey;
    for (let page = 0; page < MAX_SCAN_PAGES; page += 1) {
      const res = await client.send(
        new ScanCommand({
          TableName: TABLE_NAME,
          ExclusiveStartKey: lastKey,
          Limit: SCAN_PAGE_LIMIT,
        }),
      );
      const items = res.Items || [];
      for (const row of items) {
        if (matchFn(row)) return canonicalItem(row);
      }
      lastKey = res.LastEvaluatedKey;
      if (!lastKey) break;
    }
    return null;
  }

  /**
   * @param {string} identifier — profileID, legacy id, or trainer display name
   * @returns {Promise<{ item: object|null, found: boolean, lookupKey: string, lookupValue: string, resolvedProfileID: string|null }>}
   */
  async function resolveProfileLookup(identifier) {
    const lookupValue = normalizeLoginIdentifier(identifier);
    if (!lookupValue) {
      return {
        item: null,
        found: false,
        lookupKey: 'empty',
        lookupValue: '',
        resolvedProfileID: null,
      };
    }

    let item = await getByPartitionKey(lookupValue);
    if (item) {
      return {
        item,
        found: true,
        lookupKey: 'profileID',
        lookupValue,
        resolvedProfileID: canonicalProfileId(item),
      };
    }

    item = await scanUntilMatch((row) => {
      const pid = String(row.profileID || '').trim();
      const legacyId = String(row.id || '').trim();
      return pid === lookupValue || legacyId === lookupValue;
    });
    if (item) {
      return {
        item,
        found: true,
        lookupKey: 'id_or_profileID_field',
        lookupValue,
        resolvedProfileID: canonicalProfileId(item),
      };
    }

    const nameKey = normalizeNameKey(lookupValue);
    item = await scanUntilMatch((row) => normalizeNameKey(row.playerName) === nameKey);
    if (item) {
      return {
        item,
        found: true,
        lookupKey: 'playerName',
        lookupValue,
        resolvedProfileID: canonicalProfileId(item),
      };
    }

    return {
      item: null,
      found: false,
      lookupKey: 'playerName',
      lookupValue,
      resolvedProfileID: null,
    };
  }

  function logLookup(event, phase, detail) {
    console.log(`[save-api] ${phase}`, {
      event,
      table: TABLE_NAME,
      ...detail,
    });
  }

  return {
    TABLE_NAME,
    normalizeLoginIdentifier,
    normalizeNameKey,
    canonicalProfileId,
    canonicalItem,
    getByPartitionKey,
    resolveProfileLookup,
    logLookup,
  };
}

module.exports = { createProfileLookup, TABLE_NAME };
