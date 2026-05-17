import { playGameSfx, playMenuSfx, playShopSfx } from './gameSfx';
import { unlockBattleAudio } from './battleAudio';

/**
 * Central sound hook — maps game events to public/audio/sfx WAV files.
 * @param {'dice'|'hit'|'critical'|'super'|'dodge'|'coin'|'rage'|'defend'|'win'|'lose'|'victory'|'defeat'|'button'|'ui'|'shop'|'levelUp'|'attack'|'magic'|'physical'} name
 * @param {{ effectType?: string, volume?: number }} [opts]
 */
export function playSound(name, opts = {}) {
  if (name === 'button' || name === 'ui') {
    playMenuSfx(opts.volume ?? 1);
    return;
  }

  if (name === 'coin' || name === 'shop') {
    playShopSfx(opts.volume ?? 1);
    return;
  }

  if (name === 'levelUp') {
    playGameSfx('levelUp', opts.volume ?? 1);
    return;
  }

  if (name === 'hit' || name === 'attack' || name === 'physical' || name === 'magic') {
    playGameSfx('attack', opts.volume ?? (name === 'magic' ? 1.05 : 1.1));
    return;
  }

  const map = {
    critical: 'critical',
    super: 'critical',
    dodge: 'dodge',
    defend: 'attack',
    shield: 'attack',
    win: 'win',
    victory: 'win',
    lose: 'lose',
    defeat: 'lose',
    fly: 'attack',
    egg: 'attack',
    bacteria: 'attack',
    metal: 'attack',
    water: 'attack',
    fire: 'attack',
    roar: 'attack',
    rage: 'attack',
    dice: 'button',
  };

  const kind = map[name];
  if (kind) {
    const vol =
      opts.volume ??
      (name === 'critical' || name === 'super' ? 1.2 : name === 'dodge' ? 1 : 1);
    unlockBattleAudio();
    playGameSfx(kind, vol);
  }
}

/** Wind-up SFX when a skill is used in battle. */
export function playSoundForSkill(_skill, _strikeKind = 'physical') {
  unlockBattleAudio();
  playGameSfx('attack', 1.05);
}

export function playUiSfx() {
  return playMenuSfx();
}

export { playMenuSfx, playShopSfx };
