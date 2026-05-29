import { Platform } from 'react-native';

const STYLE_ID = 'mdb-monster-rush-layout';

let activeCount = 0;
let orientationLock = null;

async function lockLandscape() {
  if (typeof screen === 'undefined' || !screen.orientation?.lock) return;
  try {
    await screen.orientation.lock('landscape');
    orientationLock = 'landscape';
  } catch {
    try {
      await screen.orientation.lock('landscape-primary');
      orientationLock = 'landscape-primary';
    } catch {
      /* not supported */
    }
  }
}

function unlockOrientation() {
  if (typeof screen === 'undefined' || !screen.orientation?.unlock || !orientationLock) return;
  try {
    screen.orientation.unlock();
  } catch {
    /* ignore */
  }
  orientationLock = null;
}

function ensureStyleTag() {
  if (typeof document === 'undefined') return;
  if (document.getElementById(STYLE_ID)) return;
  const tag = document.createElement('style');
  tag.id = STYLE_ID;
  tag.textContent = `
    html[data-monster-rush-active],
    html[data-monster-rush-active] body {
      margin: 0 !important;
      padding: 0 !important;
      width: 100% !important;
      height: 100% !important;
      max-height: 100dvh !important;
      overflow: hidden !important;
      overscroll-behavior: none;
      touch-action: manipulation;
      background: #0c1224 !important;
    }
    html[data-monster-rush-active] #root {
      position: fixed !important;
      inset: 0 !important;
      width: 100% !important;
      height: 100% !important;
      max-height: 100dvh !important;
      min-height: 0 !important;
      overflow: hidden !important;
      display: flex !important;
      flex-direction: column !important;
      background: #0c1224 !important;
    }
    html[data-monster-rush-active] #root > div {
      flex: 1 !important;
      min-height: 0 !important;
      width: 100% !important;
      height: 100% !important;
      max-height: 100dvh !important;
      overflow: hidden !important;
      display: flex !important;
      flex-direction: column !important;
    }
  `;
  document.head.appendChild(tag);
}

/** Immersive layout for Monster Rush (CSS only — avoids RN-web fullscreen black screen). */
export function activateMonsterRushWebLayout() {
  if (Platform.OS !== 'web' || typeof document === 'undefined') return;
  activeCount += 1;
  if (activeCount > 1) return;

  ensureStyleTag();
  document.documentElement.setAttribute('data-monster-rush-active', 'true');
  void lockLandscape();
}

export function deactivateMonsterRushWebLayout() {
  if (Platform.OS !== 'web' || typeof document === 'undefined') return;
  activeCount = Math.max(0, activeCount - 1);
  if (activeCount > 0) return;

  document.documentElement.removeAttribute('data-monster-rush-active');
  unlockOrientation();
}

/** Optional fullscreen on Start Run (user gesture). Best-effort only. */
export function tryMonsterRushFullscreen() {
  if (Platform.OS !== 'web' || typeof document === 'undefined') return;
  const el = document.documentElement;
  const req =
    el.requestFullscreen
    || el.webkitRequestFullscreen
    || el.mozRequestFullScreen
    || el.msRequestFullscreen;
  if (!req) return;
  try {
    const p = req.call(el);
    if (p?.catch) void p.catch(() => {});
  } catch {
    /* ignore */
  }
}
