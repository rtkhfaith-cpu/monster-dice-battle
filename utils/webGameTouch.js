import { Platform } from 'react-native';

const STYLE_ID = 'monster-game-touch-guard';

/** RN-web style props for surfaces that should not trigger image long-press menus. */
export const WEB_GAME_TOUCH_STYLE =
  Platform.OS === 'web'
    ? {
        userSelect: 'none',
        WebkitUserSelect: 'none',
        WebkitTouchCallout: 'none',
        touchAction: 'none',
      }
    : {};

/** dataSet for RN Web → blocks callout on descendant <img> via global CSS. */
export const WEB_GAME_SURFACE_DATASET =
  Platform.OS === 'web' ? { gameSurface: 'true', noImageCallout: 'true' } : {};

/** Spread onto View wrappers around gameplay / full-screen art. */
export function gameSurfaceDataProps() {
  return Platform.OS === 'web' ? { dataSet: WEB_GAME_SURFACE_DATASET } : {};
}

/** Merge into StyleSheet arrays for interactive play areas. */
export function withGameSurfaceStyle(...styles) {
  if (Platform.OS !== 'web') return styles;
  return [...styles, WEB_GAME_TOUCH_STYLE];
}

/** Props for decorative RN <Image> icons (chests, etc.). */
export const WEB_DECORATIVE_IMAGE_PROPS =
  Platform.OS === 'web' ? { draggable: false, accessibilityIgnoresInvertColors: true } : {};

/**
 * One-time global CSS:
 * - All app images: no iOS/Android long-press "Save image"
 * - Canvases: no context menu / callout
 * - Inputs keep text selection
 */
export function injectWebGameTouchGuard() {
  if (Platform.OS !== 'web' || typeof document === 'undefined') return;
  if (document.getElementById(STYLE_ID)) return;

  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = `
    #root img {
      pointer-events: none !important;
      -webkit-touch-callout: none !important;
      user-select: none !important;
      -webkit-user-select: none !important;
      -webkit-user-drag: none !important;
    }
    #root input,
    #root textarea,
    #root [contenteditable="true"] {
      user-select: text !important;
      -webkit-user-select: text !important;
      touch-action: manipulation !important;
    }
    canvas,
    #root canvas,
    [data-game-surface] canvas {
      touch-action: none !important;
      -webkit-touch-callout: none !important;
      user-select: none !important;
      -webkit-user-select: none !important;
    }
    [data-no-image-callout] img,
    [data-game-surface] img {
      pointer-events: none !important;
      -webkit-touch-callout: none !important;
      user-select: none !important;
      -webkit-user-select: none !important;
      -webkit-user-drag: none !important;
    }
    [data-game-surface] {
      -webkit-touch-callout: none !important;
    }
  `;
  document.head.appendChild(style);
}

function preventDefaultEvent(e) {
  e.preventDefault();
  e.stopPropagation();
}

/** Attach to a DOM host (Phaser parent div). Returns cleanup. */
export function attachWebTouchGuards(el) {
  if (Platform.OS !== 'web' || !el) return () => {};

  el.setAttribute('data-game-surface', 'true');
  Object.assign(el.style, {
    touchAction: 'none',
    WebkitTouchCallout: 'none',
    userSelect: 'none',
    WebkitUserSelect: 'none',
  });

  const onContextMenu = preventDefaultEvent;
  const onDragStart = preventDefaultEvent;
  const onSelectStart = preventDefaultEvent;

  el.addEventListener('contextmenu', onContextMenu);
  el.addEventListener('dragstart', onDragStart);
  el.addEventListener('selectstart', onSelectStart);

  return () => {
    el.removeEventListener('contextmenu', onContextMenu);
    el.removeEventListener('dragstart', onDragStart);
    el.removeEventListener('selectstart', onSelectStart);
  };
}

/** Phaser/WebGL canvas — same protections on the actual game surface. */
export function applyWebCanvasTouchGuards(canvas) {
  if (Platform.OS !== 'web' || !canvas) return;
  canvas.setAttribute('data-game-surface', 'true');
  canvas.style.touchAction = 'none';
  canvas.style.webkitTouchCallout = 'none';
  canvas.style.userSelect = 'none';
  canvas.style.webkitUserSelect = 'none';
  canvas.oncontextmenu = preventDefaultEvent;
  canvas.ondragstart = preventDefaultEvent;
}
