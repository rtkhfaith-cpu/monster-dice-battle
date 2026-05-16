import { playSfx } from './gameSounds';

const SFX_MAP = {
  dice: 'dice',
  super: 'super',
  /** Reuse attack clip as generic hit */
  hit: 'attackP1',
  coin: 'dice',
};

/**
 * Central sound hook — extend with real clips later.
 * @param {'dice'|'hit'|'critical'|'super'|'dodge'|'coin'|'rage'} name
 */
export function playSound(name) {
  if (__DEV__) {
    // eslint-disable-next-line no-console
    console.log(`[playSound] ${name}`);
  }
  const key = SFX_MAP[name];
  if (key) {
    void playSfx(key, { volume: name === 'critical' ? 1 : 0.85 });
    return;
  }
  // Placeholders without files yet — no-op besides dev log
}
