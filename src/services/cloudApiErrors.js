/**
 * Classify cloud save HTTP errors for UI and logging.
 */

/**
 * @param {number} [status]
 * @param {string} [message]
 * @returns {{ kind: string, userMessage: string, status: number, raw: string }}
 */
export function classifyCloudHttpError(status = 0, message = '') {
  const raw = String(message || '').trim();
  const lower = raw.toLowerCase();
  const s = Number(status) || 0;

  if (s === 401 || lower.includes('incorrect key') || lower.includes('missing key')) {
    return {
      kind: 'auth',
      userMessage: s === 401 ? 'Authentication failed — check PIN and API URL.' : raw || 'Incorrect PIN.',
      status: s,
      raw,
    };
  }

  if (
    s === 404
    || lower.includes('player not found')
    || lower.includes('profile not found')
    || lower.includes('not_found')
  ) {
    return {
      kind: 'not_found',
      userMessage: 'Player not found — check trainer name or profile ID.',
      status: s || 404,
      raw,
    };
  }

  if (
    s === 0
    || lower.includes('abort')
    || lower.includes('timeout')
    || lower.includes('timed out')
    || lower.includes('did not respond')
  ) {
    return {
      kind: 'timeout',
      userMessage: 'Cloud request timed out. Try again.',
      status: s,
      raw,
    };
  }

  if (s >= 500 || lower.includes('internal server error')) {
    return {
      kind: 'server',
      userMessage: raw || 'Server error — check API deploy and CloudWatch logs.',
      status: s || 500,
      raw,
    };
  }

  if (lower.includes('failed to fetch') || lower.includes('network')) {
    return {
      kind: 'network',
      userMessage: raw || 'Could not reach cloud API (network/CORS).',
      status: s,
      raw,
    };
  }

  return {
    kind: 'failed',
    userMessage: raw || `Request failed (${s || 'unknown'})`,
    status: s,
    raw,
  };
}
