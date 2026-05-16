import { playAttackSfxForEffect, playBattleSfx, playUiSfx } from './battleAudio';

/**
 * Central sound hook — maps battle events to synth/WAV clips.
 * @param {'dice'|'hit'|'critical'|'super'|'dodge'|'coin'|'rage'|'defend'|'win'|'lose'|'victory'|'button'|'magic'|'physical'} name
 * @param {{ effectType?: string, volume?: number }} [opts]
 */
export function playSound(name, opts = {}) {
  if (name === 'button' || name === 'ui') {
    void playUiSfx();
    return;
  }
  if (name === 'hit' && opts.effectType) {
    void playAttackSfxForEffect(opts.effectType);
    return;
  }
  const map = {
    hit: 'hit',
    physical: 'attack',
    magic: 'magic',
    attack: 'attack',
    critical: 'critical',
    super: 'critical',
    dodge: 'dodge',
    defend: 'defend',
    shield: 'defend',
    rage: 'fire',
    coin: 'dice',
    win: 'win',
    victory: 'win',
    lose: 'lose',
    defeat: 'lose',
  };
  const key = map[name];
  if (key) {
    void playBattleSfx(key, {
      volume:
        opts.volume ??
        (name === 'critical' ? 1.4 : name === 'hit' ? 1.25 : name === 'magic' ? 1.2 : 1),
    });
  }
}

export { playUiSfx };
