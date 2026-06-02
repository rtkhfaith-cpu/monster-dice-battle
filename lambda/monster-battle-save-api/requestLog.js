/**
 * Structured API Gateway request logging (CloudWatch).
 */

function getRequestId(event) {
  return (
    event?.requestContext?.requestId
    || event?.headers?.['x-amzn-requestid']
    || event?.headers?.['X-Amzn-Requestid']
    || event?.headers?.['x-request-id']
    || event?.headers?.['X-Request-Id']
    || 'unknown'
  );
}

function profileIdFromBody(body) {
  if (!body || typeof body !== 'object') return null;
  return (
    body.profileID
    || body.profileId
    || body.id
    || body.login
    || body.playerName
    || null
  );
}

function logInbound(event, method, path) {
  const requestId = getRequestId(event);
  console.log('[save-api] request', {
    requestId,
    method,
    path,
    origin: event?.headers?.origin || event?.headers?.Origin || null,
  });
  return requestId;
}

/**
 * @param {unknown} err
 */
function logApiError(route, requestId, err, extra = {}) {
  const e = err && typeof err === 'object' ? err : { message: String(err) };
  console.error('[save-api] route error', {
    route,
    requestId,
    errorName: e.name,
    errorMessage: e.message,
    awsMetadata: e.$metadata,
    stack: e.stack,
    ...extra,
  });
}

function logDynamoOp(op, requestId, extra = {}) {
  console.log('[save-api] dynamodb', { operation: op, requestId, ...extra });
}

function logDynamoError(op, requestId, err, extra = {}) {
  const e = err && typeof err === 'object' ? err : { message: String(err) };
  console.error('[save-api] dynamodb failed', {
    operation: op,
    requestId,
    errorName: e.name,
    errorMessage: e.message,
    awsMetadata: e.$metadata,
    stack: e.stack,
    ...extra,
  });
}

module.exports = {
  getRequestId,
  profileIdFromBody,
  logInbound,
  logApiError,
  logDynamoOp,
  logDynamoError,
};
