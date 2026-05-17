const DEBUG_ANIMATIONS = typeof __DEV__ !== 'undefined' ? __DEV__ : false;

const TIMING = {
  anticipation: 190,
  physicalTravel: 290,
  magicTravel: 420,
  impact: 120,
  recovery: 260,
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

function wait(scene, ms) {
  return new Promise((resolve) => scene.time.delayedCall(ms, resolve));
}

function tween(scene, config) {
  return new Promise((resolve) => {
    scene.tweens.add({ ...config, onComplete: resolve });
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
    this.scene.showTurnText(result.text || 'Guard Up');
    await wait(this.scene, 560);
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
      await attacker.attack();
    }

    if (this.currentRun !== runId) return;
    await this.impact(defender, result, element);
    await this.recover(attacker, defender, result);
  }

  async anticipation(attacker, isMagic, element) {
    attacker.anticipate(isMagic);
    if (isMagic) this.spawnCharge(attacker, element);
    await wait(this.scene, TIMING.anticipation);
  }

  async playDodgeMiss(attacker, defender, result, isMagic, element) {
    const miss = isMagic
      ? this.playMagicTravel(attacker, defender, { ...result, missOnly: true }, element)
      : attacker.attack();
    await wait(this.scene, 90);
    defender.dodge();
    await miss;
    this.scene.showFloatingText(defender.x, defender.y - 118, 'Dodged!', {
      color: '#67e8f9',
      size: 29,
      stroke: '#0f172a',
    });
    this.scene.playDodgeEffect(defender);
    await wait(this.scene, TIMING.dodgeTotal);
  }

  async playMagicTravel(attacker, defender, result, element) {
    const color = ELEMENT_COLORS[element] ?? ELEMENT_COLORS.normal;
    const projectile = this.createElementProjectile(attacker, element, color);
    const tier = visualTier(attacker);
    const duration = Math.max(260, (result.crit ? TIMING.magicTravel - 70 : TIMING.magicTravel) - tier * 35);
    this.scene.cameras.main.zoomTo(1.035 + tier * 0.025, 150, 'Sine.easeOut');
    await tween(this.scene, {
      targets: projectile,
      x: defender.x - 46 * attacker.facing,
      y: defender.y - 18,
      scale: (result.crit ? 1.6 : 1.25) + tier * 0.22,
      angle: element === 'metal' ? 100 : 0,
      duration,
      ease: 'Cubic.inOut',
    });
    projectile.destroy();
    this.scene.cameras.main.zoomTo(1, 180, 'Sine.easeInOut');
  }

  createElementProjectile(attacker, element, color) {
    const x = attacker.x + 44 * attacker.facing;
    const y = attacker.y - 36;
    const tier = visualTier(attacker);
    const sizeBoost = tier * 10;
    if (element === 'electric') {
      return this.scene.add.rectangle(x, y, 54 + sizeBoost, 8 + tier * 2, color, 0.95).setDepth(36);
    }
    if (element === 'water') {
      return this.scene.add.ellipse(x, y, 54 + sizeBoost, 28 + tier * 5, color, 0.92).setDepth(36);
    }
    if (element === 'poison' || element === 'bacteria') {
      return this.scene.add.ellipse(x, y, 62 + sizeBoost, 44 + tier * 8, color, 0.55).setDepth(36);
    }
    if (element === 'tech' || element === 'glitch') {
      return this.scene.add.rectangle(x, y, 46 + sizeBoost, 34 + tier * 7, color, 0.82).setDepth(36);
    }
    if (element === 'earth') {
      return this.scene.add.polygon(x, y, [0, -24, 24, 4, 10, 28, -20, 20, -26, -8], color, 0.96).setDepth(36);
    }
    if (element === 'metal') {
      return this.scene.add.rectangle(x, y, 62, 10, color, 0.96).setDepth(36);
    }
    if (element === 'food') {
      return this.scene.add.ellipse(x, y, 54, 34, color, 0.94).setDepth(36);
    }
    return this.scene.add.circle(x, y, 18 + tier * 5, color, 0.96).setDepth(36);
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
    this.scene.playElementImpact(defender, element, { critical: result.crit, guarded });
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
      this.scene.showFloatingText(defender.x, defender.y - 122, result.boss ? 'BOSS KO!' : 'KO!', {
        color: '#f8fafc',
        size: result.boss ? 34 : 30,
        stroke: '#111827',
      });
    }
    await wait(this.scene, TIMING.recovery);
    attacker.setActiveGlow(false);
  }
}
