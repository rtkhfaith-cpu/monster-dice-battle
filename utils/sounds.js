import {
  unlockAudio,
  playButton,
  playAttack,
  playCritical,
  playDodge,
  playLevelUp,
  playShop,
  playWin,
  playLose,
  playBubblePop,
  playRescueCombo,
  playBubbleShoot,
  playMonsterRescued,
} from './audioManager';

/**
 * @param {'dice'|'hit'|'critical'|'super'|'dodge'|'coin'|'rage'|'defend'|'win'|'lose'|'victory'|'defeat'|'button'|'ui'|'shop'|'levelUp'|'attack'|'magic'|'physical'} name
 */
export function playSound(name, opts = {}) {
  if (name === 'button' || name === 'ui' || name === 'dice') {
    unlockAudio();
    playButton();
    return;
  }

  if (name === 'bubblePop' || name === 'pop') {
    unlockAudio();
    playBubblePop();
    return;
  }

  if (name === 'rescueCombo' || name === 'combo') {
    unlockAudio();
    playRescueCombo(opts.combo ?? 2);
    return;
  }

  if (name === 'bubbleShoot' || name === 'shoot') {
    unlockAudio();
    playBubbleShoot();
    return;
  }

  if (name === 'rescued' || name === 'monsterRescued') {
    unlockAudio();
    playMonsterRescued();
    return;
  }

  if (name === 'coin' || name === 'shop') {
    playShop();
    return;
  }

  if (name === 'levelUp') {
    playLevelUp();
    return;
  }

  if (name === 'win' || name === 'victory') {
    playWin();
    return;
  }

  if (name === 'lose' || name === 'defeat') {
    playLose();
    return;
  }

  if (name === 'dodge') {
    playDodge();
    return;
  }

  if (name === 'critical' || name === 'super') {
    unlockAudio();
    playCritical();
    return;
  }

  if (
    name === 'hit'
    || name === 'attack'
    || name === 'physical'
    || name === 'magic'
    || name === 'defend'
    || name === 'shield'
    || name === 'fly'
    || name === 'egg'
    || name === 'bacteria'
    || name === 'metal'
    || name === 'water'
    || name === 'fire'
    || name === 'roar'
    || name === 'rage'
  ) {
    unlockAudio();
    const mul = opts.volume ?? (name === 'magic' ? 1.05 : 1);
    playAttack(mul);
  }
}

export function playSoundForSkill() {
  unlockAudio();
  playAttack(1.05);
}

export function playUiSfx() {
  unlockAudio();
  playButton();
}
