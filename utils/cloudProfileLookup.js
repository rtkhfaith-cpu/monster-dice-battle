/**
 * Resolve trainer login input → cloud profileID before API calls.
 */
export function normalizeLoginIdentifier(raw) {
  return String(raw || '').trim();
}

export function normalizeTrainerNameKey(name) {
  return normalizeLoginIdentifier(name).toLowerCase();
}

/**
 * @param {string} identifier
 * @param {{ gameData?: object, cloudPlayers?: object[] }} ctx
 */
export function resolveCloudProfileIdForLogin(identifier, ctx = {}) {
  const lookupValue = normalizeLoginIdentifier(identifier);
  if (!lookupValue) {
    return {
      profileID: null,
      lookupKey: 'empty',
      lookupValue: '',
      source: null,
    };
  }

  const query = normalizeTrainerNameKey(lookupValue);

  for (const p of ctx.gameData?.players || []) {
    const id = String(p.id || '').trim();
    const nameKey = normalizeTrainerNameKey(p.name);
    if (id.toLowerCase() === query || nameKey === query) {
      return {
        profileID: id,
        lookupKey: id.toLowerCase() === query ? 'local_profileId' : 'local_playerName',
        lookupValue,
        source: 'local',
      };
    }
  }

  for (const cp of ctx.cloudPlayers || []) {
    const pid = String(cp.profileID || '').trim();
    const nameKey = normalizeTrainerNameKey(cp.playerName);
    if (pid.toLowerCase() === query || nameKey === query) {
      return {
        profileID: pid,
        lookupKey: pid.toLowerCase() === query ? 'cloud_profileID' : 'cloud_playerName',
        lookupValue,
        source: 'cloud_list',
      };
    }
  }

  const trimmed = lookupValue;
  if (/^pl_[a-z0-9_]+$/i.test(trimmed)) {
    return {
      profileID: trimmed,
      lookupKey: 'profileID',
      lookupValue,
      source: 'profileId_guess',
    };
  }

  return {
    profileID: trimmed,
    lookupKey: 'login_identifier',
    lookupValue,
    source: 'server_resolve',
  };
}

/**
 * @param {object|null|undefined} body
 */
export function cloudNotFoundDebugFromBody(body) {
  if (!body || typeof body !== 'object') return null;
  if (!body.not_found && body.error !== 'Player not found') return null;
  return {
    lookup_key_used: body.lookup_key_used ?? body.lookupKey ?? null,
    lookup_value_used: body.lookup_value_used ?? body.lookupValue ?? null,
    resolved_profile_id: body.resolved_profile_id ?? null,
    not_found: true,
  };
}
