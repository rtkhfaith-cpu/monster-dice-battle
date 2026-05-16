import { Platform } from 'react-native';

/** Mobile-first breakpoints — lobby layout differs below 768px. */
export const BREAKPOINT_MOBILE = 768;
export const BREAKPOINT_DESKTOP = 960;

export const MOBILE_PAD = 16;
export const MOBILE_GAP = 16;
export const MOBILE_SECTION_GAP = 18;

/**
 * @param {number} width
 * @returns {'mobile'|'tablet'|'desktop'}
 */
export function getLayoutTier(width) {
  if (width < BREAKPOINT_MOBILE) return 'mobile';
  if (width < BREAKPOINT_DESKTOP) return 'tablet';
  return 'desktop';
}

export function isMobileLayout(width) {
  return width < BREAKPOINT_MOBILE;
}

export function isDesktopLayout(width) {
  return width >= BREAKPOINT_DESKTOP;
}

/** Extra bottom padding for iPhone home indicator (web + native). */
export function scrollBottomInset(extra = 24) {
  if (Platform.OS === 'web') {
    return extra + 12;
  }
  return extra + 8;
}
