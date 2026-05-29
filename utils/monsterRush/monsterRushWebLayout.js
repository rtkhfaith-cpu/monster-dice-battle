import { Platform } from 'react-native';

const STYLE_ID = 'mdb-monster-rush-layout';

let activeCount = 0;
let orientationLock = null;

function getFullscreenElement() {
  if (typeof document === 'undefined') return null;
  return (
    document.fullscreenElement
    || document.webkitFullscreenElement
    || document.mozFullScreenElement
    || document.msFullscreenElement
    || null
  );
}

function requestAppFullscreen() {
  if (typeof document === 'undefined') return;
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
    /* ignore — browser may block without gesture */
  }
}

function exitAppFullscreen() {
  if (!getFullscreenElement()) return;
  const exit =
    document.exitFullscreen
    || document.webkitExitFullscreen
    || document.mozCancelFullScreen
    || document.msExitFullscreen;
  try {
    const p = exit?.call(document);
    if (p?.catch) void p.catch(() => {});
  } catch {
    /* ignore */
  }
}

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
      /* not supported or needs fullscreen first */
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
    }
    html[data-monster-rush-active] #root,
    html[data-monster-rush-active] #root > div {
      width: 100% !important;
      height: 100% !important;
      max-height: 100dvh !important;
      min-height: 0 !important;
      overflow: hidden !important;
    }
    @media (orientation: portrait) and (max-width: 900px) {
      html[data-monster-rush-active] #mdb-monster-rush-rotate-hint {
        display: flex !important;
      }
    }
  `;
  document.head.appendChild(tag);
}

/** Enter landscape fullscreen shell for Monster Rush (web). */
export function activateMonsterRushWebLayout() {
  if (Platform.OS !== 'web' || typeof document === 'undefined') return;
  activeCount += 1;
  if (activeCount > 1) return;

  ensureStyleTag();
  document.documentElement.setAttribute('data-monster-rush-active', 'true');
  requestAppFullscreen();
  void lockLandscape();
}

/** Leave Monster Rush web layout shell. */
export function deactivateMonsterRushWebLayout() {
  if (Platform.OS !== 'web' || typeof document === 'undefined') return;
  activeCount = Math.max(0, activeCount - 1);
  if (activeCount > 0) return;

  document.documentElement.removeAttribute('data-monster-rush-active');
  unlockOrientation();
  exitAppFullscreen();
}
