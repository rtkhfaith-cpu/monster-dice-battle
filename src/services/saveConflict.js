/**
 * Local vs cloud save comparison (updatedAt + sync activity + peak level fallback).
 */
import { getPlayerProfile } from '../../utils/gameStorage';
import { peakMonsterLevelFromRoster } from '../../utils/trainerRankings';
import {
  cloudSyncActivityScore,
  syncActivityLabel,
  syncActivityScore,
} from '../../utils/syncActivityLevel';

const TIME_SLACK_MS = 3000;

export function parseSaveTimestamp(iso) {
  const ms = Date.parse(iso || '');
  return Number.isFinite(ms) ? ms : 0;
}

/** @param {object|null|undefined} profile */
export function profilePeakLevel(profile) {
  let peak = peakMonsterLevelFromRoster(profile?.ownedMonsters).level;
  const ladderOwned = profile?.monsterLadder?.ownedMonsters;
  if (Array.isArray(ladderOwned) && ladderOwned.length > 0) {
    const ladderPeak = peakMonsterLevelFromRoster(ladderOwned).level;
    if (ladderPeak > peak) peak = ladderPeak;
  }
  return peak;
}

/** @param {object|null|undefined} cloud */
export function cloudPeakLevel(cloud) {
  if (!cloud || typeof cloud !== 'object') return 1;
  if (typeof cloud.peakMonsterLevel === 'number' && cloud.peakMonsterLevel > 0) {
    return Math.floor(cloud.peakMonsterLevel);
  }
  return peakMonsterLevelFromRoster(cloud.monsters || cloud.ownedMonsters).level;
}

export function profileCoins(profile) {
  return typeof profile?.coins === 'number' ? profile.coins : 0;
}

export function cloudCoins(cloud) {
  return typeof cloud?.coins === 'number' ? cloud.coins : 0;
}

/** Cloud is ahead on hidden sync activity, or peak level when activity ties. */
export function cloudProgressAhead(localProfile, cloudRecord) {
  const localActivity = syncActivityScore(localProfile);
  const cloudActivity = cloudSyncActivityScore(cloudRecord);
  if (cloudActivity !== localActivity) return cloudActivity > localActivity;
  return cloudPeakLevel(cloudRecord) > profilePeakLevel(localProfile);
}

export function formatSaveTimestamp(iso) {
  if (!iso) return 'unknown time';
  try {
    return new Intl.DateTimeFormat(undefined, {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(new Date(iso));
  } catch {
    return String(iso);
  }
}

/**
 * @param {object|null|undefined} localProfile
 * @param {object|null|undefined} cloudRecord
 */
export function compareLocalAndCloudSave(localProfile, cloudRecord) {
  const localMs = parseSaveTimestamp(localProfile?.updatedAt);
  const cloudMs = parseSaveTimestamp(cloudRecord?.updatedAt);
  const localPeak = profilePeakLevel(localProfile);
  const cloudPeak = cloudPeakLevel(cloudRecord);
  const localActivity = syncActivityScore(localProfile);
  const cloudActivity = cloudSyncActivityScore(cloudRecord);

  const base = {
    localMs,
    cloudMs,
    localPeak,
    cloudPeak,
    localActivity,
    cloudActivity,
    localUpdatedAt: localProfile?.updatedAt,
    cloudUpdatedAt: cloudRecord?.updatedAt,
  };

  if (!cloudRecord?.profileID) {
    return { ...base, resolution: 'local_only', reason: 'no_cloud' };
  }

  if (cloudMs > localMs + TIME_SLACK_MS) {
    if (cloudProgressAhead(localProfile, cloudRecord)) {
      return { ...base, resolution: 'cloud', reason: 'cloud_newer' };
    }
    return { ...base, resolution: 'local', reason: 'local_progress_ahead' };
  }

  if (localMs > cloudMs + TIME_SLACK_MS) {
    if (cloudProgressAhead(localProfile, cloudRecord)) {
      return { ...base, resolution: 'conflict', reason: 'local_newer_but_cloud_ahead' };
    }
    return { ...base, resolution: 'local', reason: 'local_newer' };
  }

  if (cloudProgressAhead(localProfile, cloudRecord)) {
    return { ...base, resolution: 'cloud', reason: 'tie_cloud_ahead' };
  }
  if (syncActivityScore(localProfile) > cloudSyncActivityScore(cloudRecord)) {
    return { ...base, resolution: 'local', reason: 'tie_local_ahead' };
  }
  if (localPeak > cloudPeak) {
    return { ...base, resolution: 'local', reason: 'tie_local_peak' };
  }
  return { ...base, resolution: 'local', reason: 'tie_equal' };
}

/** @param {ReturnType<typeof compareLocalAndCloudSave>} comparison */
export function buildSaveConflictMessage(comparison, playerName = 'Player') {
  const localAt = formatSaveTimestamp(comparison.localUpdatedAt);
  const cloudAt = formatSaveTimestamp(comparison.cloudUpdatedAt);
  return (
    `${playerName}: this device and the cloud save both changed.\n\n` +
    `This device — sync ${comparison.localActivity}, peak Lv ${comparison.localPeak}, saved ${localAt}\n` +
    `Cloud — sync ${comparison.cloudActivity}, peak Lv ${comparison.cloudPeak}, saved ${cloudAt}\n\n` +
    'Choose which save to keep. The other copy will be replaced on this device and in the cloud.'
  );
}

export function cloudChangedSinceLastSync(localProfile, cloudRecord) {
  const cloudMs = parseSaveTimestamp(cloudRecord?.updatedAt);
  const lastSyncMs = parseSaveTimestamp(localProfile?.lastCloudSyncedAt);
  return lastSyncMs > 0 && cloudMs > lastSyncMs + TIME_SLACK_MS;
}

export function cloudRevisionUnseen(localProfile, cloudRecord) {
  const cloudMs = parseSaveTimestamp(cloudRecord?.updatedAt);
  const lastKnownMs = parseSaveTimestamp(localProfile?.lastKnownCloudUpdatedAt);
  return lastKnownMs > 0 && cloudMs > lastKnownMs + TIME_SLACK_MS;
}

export function cloudProgressDiverged(localProfile, cloudRecord) {
  if (!cloudChangedSinceLastSync(localProfile, cloudRecord)) return false;
  if (syncActivityScore(localProfile) !== cloudSyncActivityScore(cloudRecord)) return true;
  if (profileCoins(localProfile) !== cloudCoins(cloudRecord)) return true;
  if (profilePeakLevel(localProfile) !== cloudPeakLevel(cloudRecord)) return true;
  return false;
}

/**
 * @param {object} gameData
 * @param {string} profileId
 * @param {object|null|undefined} cloudRecord
 * @param {{ compareProfile?: object|null }} [opts]
 */
export function isCloudUploadBlocked(gameData, profileId, cloudRecord, opts = {}) {
  const local = opts.compareProfile ?? getPlayerProfile(gameData, profileId);
  const comparison = compareLocalAndCloudSave(local, cloudRecord);
  if (comparison.resolution === 'local') return false;

  if (cloudProgressAhead(local, cloudRecord)) return true;
  if (comparison.reason === 'cloud_newer') return true;
  if (comparison.resolution === 'conflict') return true;
  if (cloudRevisionUnseen(local, cloudRecord)) return true;
  if (cloudProgressDiverged(local, cloudRecord)) return true;

  const cloudMs = parseSaveTimestamp(cloudRecord?.updatedAt);
  const lastSyncMs = parseSaveTimestamp(local?.lastCloudSyncedAt);
  if (lastSyncMs > 0 && cloudMs > lastSyncMs + TIME_SLACK_MS) return true;

  return false;
}

export function shouldApplyCloudOverLocal(comparison, localProfile = null, cloudRecord = null) {
  if (!comparison) return false;
  if (comparison.resolution === 'local') return false;
  if (localProfile && cloudRecord) {
    if (
      syncActivityScore(localProfile) > cloudSyncActivityScore(cloudRecord)
      && !cloudProgressAhead(localProfile, cloudRecord)
    ) {
      return false;
    }
  }
  if (localProfile && cloudRecord && cloudProgressAhead(localProfile, cloudRecord)) return true;
  if (comparison.reason === 'cloud_newer') return true;
  if (comparison.resolution === 'cloud') return true;
  if (comparison.resolution === 'conflict') return true;
  if (localProfile && cloudRecord && cloudProgressDiverged(localProfile, cloudRecord)) return true;
  return false;
}

export function shouldBlockStaleLocalLogin(comparison, localProfile) {
  if (!localProfile || !comparison) return false;
  if (comparison.cloudActivity > comparison.localActivity) return false;
  if (comparison.cloudPeak > comparison.localPeak) return false;
  if (
    comparison.localActivity > comparison.cloudActivity
    && comparison.localMs > comparison.cloudMs + TIME_SLACK_MS
  ) {
    return true;
  }
  if (comparison.localPeak > comparison.cloudPeak && comparison.localMs > comparison.cloudMs + TIME_SLACK_MS) {
    return true;
  }
  return false;
}

export function getStaleLocalDeviceMessage() {
  const isWeb =
    typeof window !== 'undefined'
    && typeof document !== 'undefined'
    && /html/i.test(document.documentElement?.nodeName || '');
  if (isWeb) {
    return (
      'Your device has older information. Please clear cache on your browser '
      + '(delete browsing history / site data for this game) and login again.'
    );
  }
  return (
    'Your device has older information. Please clear this app\'s stored data '
    + '(or reinstall the app) and login again.'
  );
}

export { syncActivityLabel };
