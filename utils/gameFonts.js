import { Platform } from 'react-native';

const FONTS_LINK_ID = 'monster-fight-game-fonts';
const GOOGLE_FONTS_URL =
  'https://fonts.googleapis.com/css2?family=Bangers&family=Black+Ops+One&display=swap';

let fontsRequested = false;

/** Load Bangers + Black Ops One on web (battle callouts / HUD). */
export function loadGameFonts() {
  if (fontsRequested || Platform.OS !== 'web' || typeof document === 'undefined') return;
  fontsRequested = true;
  if (document.getElementById(FONTS_LINK_ID)) return;
  const link = document.createElement('link');
  link.id = FONTS_LINK_ID;
  link.rel = 'stylesheet';
  link.href = GOOGLE_FONTS_URL;
  document.head.appendChild(link);
}

/** Big combat feedback (“CRITICAL!”, damage quips). */
export const FONT_BATTLE_COMBAT = Platform.select({
  web: 'Bangers',
  default: undefined,
});

/** Turn hints (“Choose your move”, status lines). */
export const FONT_BATTLE_COMMENT = Platform.select({
  web: 'Black Ops One',
  default: undefined,
});
