/**
 * Compare deployed version.json with the build baked into this bundle.
 */

/**
 * @param {{ version?: string, build?: number }|null|undefined} live
 * @param {{ version?: string, build?: number }|null|undefined} baked
 */
export function isAppVersionOutdated(live, baked) {
  if (!live || !baked) return false;
  const liveBuild = Number(live.build) || 0;
  const bakedBuild = Number(baked.build) || 0;
  if (liveBuild > bakedBuild) return true;
  if (live.version && baked.version && live.version !== baked.version && liveBuild >= bakedBuild) {
    return true;
  }
  return false;
}

/** @returns {Promise<{ version?: string, build?: number }|null>} */
export async function fetchLiveAppVersion() {
  if (typeof fetch !== 'function') return null;
  try {
    const url = `/version.json?ts=${Date.now()}`;
    const res = await fetch(url, { cache: 'no-store' });
    if (!res.ok) return null;
    const body = await res.json();
    if (!body || typeof body !== 'object') return null;
    return body;
  } catch {
    return null;
  }
}
