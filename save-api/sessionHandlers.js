/**
 * Reference session logic for the cloud save API (API Gateway + DynamoDB).
 * Wire into POST /login and POST /save handlers on your backend.
 */

export const SESSION_SUPERSEDED_CODE = 'SESSION_SUPERSEDED';

/**
 * @param {object|null|undefined} record DynamoDB item
 * @param {string} requestToken sessionToken from client body
 */
export function assertSaveSessionAllowed(record, requestToken) {
  const active = record?.activeSession;
  if (!active?.sessionToken) return { ok: true };
  const token = String(requestToken || '').trim();
  if (!token || token !== active.sessionToken) {
    return {
      ok: false,
      status: 409,
      error: SESSION_SUPERSEDED_CODE,
      message: 'This account was opened on another device.',
    };
  }
  return { ok: true };
}

/**
 * @param {object} item existing or new Dynamo item
 * @param {{ deviceId: string, sessionToken: string }} session
 */
export function applyLoginSession(item, session) {
  const now = new Date().toISOString();
  return {
    ...item,
    activeSession: {
      deviceId: String(session.deviceId || ''),
      sessionToken: String(session.sessionToken || ''),
      issuedAt: now,
    },
    updatedAt: now,
  };
}

/**
 * Express-style handler sketch for POST /login
 *
 * export async function handleLogin(req, res) {
 *   const { profileID, playerKey, deviceId, sessionToken } = req.body;
 *   const item = await loadProfile(profileID);
 *   if (!verifyKey(item, playerKey)) return res.status(401).json({ error: 'Incorrect key' });
 *   const session = {
 *     deviceId: deviceId || 'unknown',
 *     sessionToken: sessionToken || crypto.randomUUID(),
 *   };
 *   const next = applyLoginSession(item, session);
 *   await putProfile(next);
 *   return res.json({ profile: next, sessionToken: next.activeSession.sessionToken });
 * }
 */
