const DEBUG_ANIMATIONS = typeof __DEV__ !== 'undefined' ? __DEV__ : false;

const TIMING = {
  anticipation: 190,
  physicalTravel: 720,
  magicTravel: 860,
  impact: 260,
  recovery: 360,
  dodgeTotal: 380,
  turn: 520,
};

const ELEMENT_COLORS = {
  fire: 0xfb923c,
  water: 0x38bdf8,
  electric: 0xfacc15,
  poison: 0x86efac,
  bacteria: 0x86efac,
  tech: 0x22d3ee,
  glitch: 0x22d3ee,
  earth: 0xa16207,
  metal: 0xe5e7eb,
  food: 0xf97316,
  shadow: 0xa78bfa,
  normal: 0xffffff,
};

const ACTION_IMAGE_KEYS = {
  attack: ['action_attack', 'action_attack1', 'action_attack2'],
  magic: ['action_magic', 'action1_magic', 'action_magic2'],
  defend: 'action_defend',
  run: 'action_run',
  comment: 'action_comment',
  critical: 'feedback_critical',
  dodge: 'feedback_dodge',
  guard: 'feedback_guard',
  ko: 'feedback_ko',
  hit: 'feedback_hit',
};

function wait(scene, ms) {
  return new Promise((resolve) => scene.time.delayedCall(ms, resolve));
}

function tween(scene, config) {
  return new Promise((resolve) => {
    const onComplete = config.onComplete;
    scene.tweens.add({
      ...config,
      onComplete: (...args) => {
        onComplete?.(...args);
        resolve();
      },
    });
  });
}

function actorKey(id) {
  if (id === 'player' || id === 1 || id === '1') return 'player';
  if (id === 'enemy' || id === 2 || id === '2' || id === 'cpu') return 'enemy';
  return id;
}

function actionElement(result) {
  return result.element || result.skillElement || result.effectType || 'normal';
}

function visualTier(actor) {
  return actor?.visualTier ?? 0;
}

function pickActionKey(keys, seed = 0) {
  if (!Array.isArray(keys)) return keys;
  return keys[Math.abs(Number(seed) || 0) % keys.length];
}

export default class BattleAnimationController {
  constructor(scene, Phaser) {
    this.scene = scene;
    this.Phaser = Phaser;
    this.currentRun = 0;
  }

  log(message, payload = {}) {
    if (!DEBUG_ANIMATIONS) return;
    console.debug(`[battle-animation] ${message}`, {
      type: payload.actionType,
      damage: payload.damage,
      crit: !!payload.crit,
      dodged: !!payload.dodged,
      defended: !!payload.defended,
    });
  }

  async play(result = {}) {
    const runId = ++this.currentRun;
    this.scene.isAnimatingAction = true;
    this.log('animation started', result);

    try {
      if (result.kind === 'turn' || result.actionType === 'turn') {
        await this.playTurnTransition(result);
        return;
      }
      if (result.actionType === 'defend') {
        await this.playDefend(result);
        return;
      }
      if (result.actionType === 'run') {
        await this.playRun(result);
        return;
      }
      await this.playAttack(result, runId);
    } finally {
      if (this.currentRun === runId) {
        this.scene.isAnimatingAction = false;
        this.log('animation completed', result);
        this.scene.notifyVisualEventComplete?.(result);
      }
    }
  }

  async playTurnTransition(result) {
    const activeKey = actorKey(result.activeId ?? result.attackerId ?? 'player');
    const inactiveKey = activeKey === 'player' ? 'enemy' : 'player';
    this.scene.actors[activeKey]?.setActiveGlow(true);
    this.scene.actors[inactiveKey]?.setDimmed(true);
    this.scene.showTurnText(result.text || (activeKey === 'player' ? 'Your Turn' : "Enemy's Turn"));
    await wait(this.scene, TIMING.turn);
    this.scene.actors[inactiveKey]?.setDimmed(false);
  }

  async playDefend(result) {
    const defender = this.scene.actors[actorKey(result.defenderId ?? result.target ?? 'player')];
    if (!defender) return;
    this.log('defend animation type', result);
    defender.defend();
    this.spawnActionPicture(defender.x, defender.y - 48, ACTION_IMAGE_KEYS.defend, {
      depth: defender.depth + 14,
      startScale: 0.76,
      endScale: 1.12,
      duration: 980,
    });
    this.scene.showTurnText(result.text || 'Guard Up');
    await wait(this.scene, 760);
  }

  async playRun(result) {
    const runner = this.scene.actors[actorKey(result.attackerId ?? result.activeId ?? result.target ?? 'player')];
    if (!runner) return;
    this.spawnActionPicture(runner.x, runner.y - 48, ACTION_IMAGE_KEYS.run, {
      depth: runner.depth + 16,
      startScale: 0.86,
      endScale: 1.2,
      duration: 980,
      driftY: -42,
    });
    this.scene.showTurnText(result.text || 'Run!');
    await wait(this.scene, 760);
  }

  async playAttack(result, runId) {
    const attackerKey = actorKey(result.attackerId ?? result.attacker ?? 'player');
    const defenderKey = actorKey(result.defenderId ?? result.defender ?? (attackerKey === 'player' ? 'enemy' : 'player'));
    const attacker = this.scene.actors[attackerKey];
    const defender = this.scene.actors[defenderKey];
    if (!attacker || !defender) return;

    const isMagic = result.actionType === 'magic' || result.kind === 'magic';
    const element = actionElement(result);
    this.log(isMagic ? 'magic attack animation type' : 'normal attack animation type', result);

    attacker.setActiveGlow(true);
    defender.setDimmed(false);
    if (typeof result.mpAfter === 'number') this.scene.animateHudTo(attackerKey, { mp: result.mpAfter });
    await this.anticipation(attacker, isMagic, element);

    if (result.dodged) {
      await this.playDodgeMiss(attacker, defender, result, isMagic, element);
      return;
    }

    if (isMagic) {
      await this.playMagicTravel(attacker, defender, result, element);
    } else {
      await Promise.all([
        attacker.attack(),
        this.playActionPictureTravel(attacker, defender, result, pickActionKey(ACTION_IMAGE_KEYS.attack, result.seq ?? result.damage)),
      ]);
    }

    if (this.currentRun !== runId) return;
    await this.impact(defender, result, element);
    await this.recover(attacker, defender, result);
  }

  async anticipation(attacker, isMagic, element) {
    attacker.anticipate(isMagic);
    await wait(this.scene, TIMING.anticipation);
  }

  async playDodgeMiss(attacker, defender, result, isMagic, element) {
    const miss = isMagic
      ? this.playMagicTravel(attacker, defender, { ...result, missOnly: true }, element)
      : attacker.attack();
    await wait(this.scene, 90);
    defender.dodge();
    await miss;
    this.spawnActionPicture(defender.x, defender.y - 118, ACTION_IMAGE_KEYS.dodge, {
      depth: defender.depth + 18,
      startScale: 0.9,
      endScale: 1.18,
      duration: 980,
    });
    this.scene.playDodgeEffect(defender);
    await wait(this.scene, TIMING.dodgeTotal);
  }

  async playMagicTravel(attacker, defender, result, element) {
    const tier = visualTier(attacker);
    const duration = Math.max(700, (result.crit ? TIMING.magicTravel - 70 : TIMING.magicTravel) - tier * 35);
    this.scene.cameras.main.zoomTo(1.035 + tier * 0.025, 150, 'Sine.easeOut');
    await this.playActionPictureTravel(attacker, defender, result, pickActionKey(ACTION_IMAGE_KEYS.magic, result.seq ?? result.damage), {
      duration,
      yOffset: -28,
      targetYOffset: -22,
      startScale: 0.82,
      endScale: (result.crit ? 1.28 : 1.08) + tier * 0.1,
      angle: element === 'metal' ? 100 : 24 * attacker.facing,
    });
    this.scene.cameras.main.zoomTo(1, 180, 'Sine.easeInOut');
  }

  playActionPictureTravel(attacker, defender, result, textureKey, options = {}) {
    const x = attacker.x + 44 * attacker.facing;
    const y = attacker.y + (options.yOffset ?? -36);
    const tier = visualTier(attacker);
    const projectile = this.createActionPicture(x, y, textureKey, {
      depth: options.depth ?? 38,
      startScale: options.startScale ?? 0.86,
    });
    if (!projectile) return wait(this.scene, options.duration ?? TIMING.physicalTravel);

    projectile.setFlipX(attacker.facing < 0);
    projectile.setAngle(options.angle ?? 12 * attacker.facing);

    return tween(this.scene, {
      targets: projectile,
      x: defender.x - 46 * attacker.facing,
      y: defender.y + (options.targetYOffset ?? -24),
      scale: options.endScale ?? ((result.crit ? 1.22 : 1.02) + tier * 0.08),
      angle: -(options.angle ?? 12 * attacker.facing),
      duration: options.duration ?? Math.max(620, TIMING.physicalTravel - tier * 24),
      ease: 'Cubic.inOut',
      onComplete: () => projectile.destroy(),
    });
  }

  createActionPicture(x, y, textureKey, { depth = 38, startScale = 1 } = {}) {
    if (!this.scene.textures.exists(textureKey)) return null;
    const key = String(textureKey);
    const isFeedback = key.includes('feedback');
    const display = isFeedback ? 104 : 96;
    return this.scene.add.image(x, y, textureKey)
      .setOrigin(0.5)
      .setDisplaySize(display, display)
      .setScale(startScale)
      .setDepth(depth);
  }

  spawnActionPicture(x, y, textureKey, options = {}) {
    const sprite = this.createActionPicture(x, y, textureKey, options);
    if (!sprite) return null;
    const key = String(textureKey);
    const isFeedback = key.includes('feedback');
    sprite.setAlpha(options.alpha ?? 0.96);
    this.scene.tweens.add({
      targets: sprite,
      y: y + (options.driftY ?? -28),
      scale: options.endScale ?? 1.08,
      alpha: 0,
      duration: options.duration ?? (isFeedback ? 1250 : 1000),
      ease: 'Cubic.out',
      onComplete: () => sprite.destroy(),
    });
    return sprite;
  }

  spawnCharge(actor, element) {
    const color = ELEMENT_COLORS[element] ?? ELEMENT_COLORS.normal;
    const tier = visualTier(actor);
    for (let i = 0; i < 9 + tier * 7; i += 1) {
      const p = this.scene.add.circle(
        actor.x + this.Phaser.Math.Between(-46, 46),
        actor.y + this.Phaser.Math.Between(-58, 28),
        this.Phaser.Math.Between(3, 7 + tier),
        color,
        0.78,
      ).setDepth(actor.depth + 6);
      this.scene.tweens.add({
        targets: p,
        x: actor.x,
        y: actor.y - 24,
        alpha: 0,
        scale: 0.25,
        duration: TIMING.anticipation + 110,
        ease: 'Quad.in',
        onComplete: () => p.destroy(),
      });
    }
  }

  async impact(defender, result, element) {
    const tier = visualTier(defender);
    const heavy = result.crit || result.damage >= 30 || tier >= 2;
    const guarded = !!result.defended;
    const shakeDuration = (result.crit ? 170 : guarded ? 70 : 95) + tier * 45;
    const shakeAmount = (result.crit ? 0.018 : guarded ? 0.006 : 0.01) + tier * 0.003;
    if (result.crit || tier >= 2) await wait(this.scene, tier >= 3 ? 100 : 70);
    this.scene.cameras.main.shake(shakeDuration, shakeAmount);
    defender.hurt({ critical: result.crit, guarded });
    this.spawnActionPicture(defender.x, defender.y - 64, guarded ? ACTION_IMAGE_KEYS.defend : ACTION_IMAGE_KEYS.comment, {
      depth: defender.depth + 18,
      startScale: result.crit ? 1.08 : 0.92,
      endScale: result.crit ? 1.42 : 1.16,
      duration: result.crit ? 680 : 560,
    });
    this.spawnActionPicture(defender.x, defender.y - 126, result.crit ? ACTION_IMAGE_KEYS.critical : guarded ? ACTION_IMAGE_KEYS.guard : ACTION_IMAGE_KEYS.hit, {
      depth: defender.depth + 20,
      startScale: 0.88,
      endScale: result.crit ? 1.28 : 1.08,
      duration: result.crit ? 1400 : 1200,
    });
    this.scene.showDamageNumber(defender, result);
    if (typeof result.hpAfter === 'number') {
      this.scene.animateHudTo(defender.key, { hp: result.hpAfter, heavy });
    }
    this.log('damage received', result);
    await wait(this.scene, TIMING.impact);
  }

  async recover(attacker, defender, result) {
    if (result.defended) defender.defend(true);
    attacker.idle();
    if (result.hpAfter <= 0) {
      await wait(this.scene, 120);
      defender.ko({ boss: !!result.boss });
      this.spawnActionPicture(defender.x, defender.y - 122, ACTION_IMAGE_KEYS.ko, {
        depth: defender.depth + 22,
        startScale: result.boss ? 1.08 : 0.94,
        endScale: result.boss ? 1.42 : 1.18,
        duration: 1100,
      });
    }
    await wait(this.scene, TIMING.recovery);
    attacker.setActiveGlow(false);
  }
}
