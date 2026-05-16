import { getSkillAnimMeta } from './skillAnimations';
import { playAttackSfxForEffect, playBattleSfx, playUiSfx } from './battleAudio';

/**
 * Central sound hook — maps battle events to synth/WAV clips.
 * @param {'dice'|'hit'|'critical'|'super'|'dodge'|'coin'|'rage'|'defend'|'win'|'lose'|'victory'|'button'|'magic'|'physical'|'fly'|'egg'|'bacteria'|'metal'|'water'|'fire'|'roar'} name
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
    fly: 'fly',
    egg: 'egg',
    bacteria: 'bacteria',
    metal: 'metal',
    water: 'water',
    fire: 'fire',
    roar: 'roar',
  };
  const key = map[name];
  if (key) {
    void playBattleSfx(key, {
      volume:
        opts.volume ??
        (name === 'critical' ? 1.35 : name === 'hit' ? 1.2 : name === 'magic' ? 1.15 : 1),
    });
  }
}

/** Wind-up SFX matched to skill name / animation */
export function playSoundForSkill(skill, strikeKind = 'physical') {
  if (!skill) {
    void playBattleSfx(strikeKind === 'magic' ? 'magic' : 'attack');
    return;
  }
  const meta = getSkillAnimMeta(skill);
  void playBattleSfx(meta.sfxKey || (strikeKind === 'magic' ? 'magic' : 'attack'), { volume: 1.1 });
}

export { playUiSfx };
