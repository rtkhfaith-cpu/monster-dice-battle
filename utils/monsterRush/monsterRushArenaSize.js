import { Platform } from 'react-native';

/** Typical max CSS pixels for phone landscape (long × short side). */
export const LANDSCAPE_PHONE_MAX_W = 926;
export const LANDSCAPE_PHONE_MAX_H = 428;

/**
 * Visible viewport in landscape orientation (width ≥ height).
 * Uses visualViewport when available (mobile browser chrome).
 */
export function getViewportLandscapeSize() {
  if (typeof window === 'undefined') {
    return { w: 640, h: 360 };
  }
  const vv = window.visualViewport;
  const rawW = Math.floor(vv?.width ?? window.innerWidth);
  const rawH = Math.floor(vv?.height ?? window.innerHeight);
  const w = Math.min(Math.max(rawW, rawH), LANDSCAPE_PHONE_MAX_W);
  const h = Math.min(Math.min(rawW, rawH), LANDSCAPE_PHONE_MAX_H);
  return { w: Math.max(280, w), h: Math.max(200, h) };
}

/** Clamp measured layout to the visible landscape viewport. */
export function clampPlayfieldToViewport(measuredW, measuredH) {
  const vp = getViewportLandscapeSize();
  return {
    w: Math.max(120, Math.min(measuredW, vp.w)),
    h: Math.max(120, Math.min(measuredH, vp.h)),
  };
}

export function defaultMonsterRushArenaSize(winW, winH) {
  return getViewportLandscapeSize();
}

export function mergeArenaSize(measured, winW, winH) {
  const vp = getViewportLandscapeSize();
  if (!measured?.w || !measured?.h) return vp;
  return clampPlayfieldToViewport(measured.w, measured.h);
}

/**
 * Frame size for the in-game play area (fits one landscape phone screen).
 * On wide desktop, letterbox to phone proportions; on device, fill viewport.
 */
export function getLandscapeGameFrameSize(winW, winH) {
  const vp = getViewportLandscapeSize();
  if (typeof window === 'undefined') {
    return { width: vp.w, height: vp.h, letterbox: false };
  }

  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const isDeviceLandscape = vw >= vh;
  const isNarrowViewport = vw <= LANDSCAPE_PHONE_MAX_W + 24;

  if (isDeviceLandscape && isNarrowViewport) {
    return { width: vp.w, height: vp.h, letterbox: false };
  }

  if (isDeviceLandscape) {
    return { width: Math.min(vw, vp.w), height: Math.min(vh, vp.h), letterbox: false };
  }

  const width = Math.min(vp.w, Math.floor(winW || vw) - 16);
  const height = Math.min(vp.h, Math.floor((width * 9) / 16));
  return { width: Math.max(280, width), height: Math.max(200, height), letterbox: true };
}
