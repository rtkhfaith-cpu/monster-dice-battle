export function createPhaserBattleScene(Phaser) {
  return class PhaserBattleScene extends Phaser.Scene {
    constructor() {
      super('PhaserBattleScene');
      this.fighters = {
        player: { name: 'Nugget Dragon', hp: 82, maxHp: 100, element: 'fire' },
        enemy: { name: 'Noise Boss', hp: 120, maxHp: 140, element: 'shadow' },
      };
      this.sprites = {};
    }

    create() {
      this.drawBattlefield();
      this.createMonster('player', 210, 330, 0xffb347, 1);
      this.createMonster('enemy', 610, 250, 0x8e44ad, -1);
      this.createHud();
      this.game.events.emit('phaser-battle-ready', this);
    }

    drawBattlefield() {
      const w = this.scale.width;
      const h = this.scale.height;
      const sky = this.add.graphics();
      sky.fillGradientStyle(0x86d9ff, 0x86d9ff, 0xd9f7ff, 0xd9f7ff, 1);
      sky.fillRect(0, 0, w, h);

      this.clouds = this.add.group();
      for (let i = 0; i < 5; i += 1) {
        const c = this.add.ellipse(90 + i * 170, 70 + (i % 2) * 34, 118, 34, 0xffffff, 0.72);
        c.setDepth(1);
        this.clouds.add(c);
      }

      const far = this.add.graphics();
      far.fillStyle(0x7ed6df, 0.62);
      far.fillEllipse(w * 0.52, h * 0.72, w * 0.88, 170);
      far.setDepth(2);

      const stage = this.add.graphics();
      stage.fillStyle(0x3bb273, 1);
      stage.fillEllipse(w * 0.5, h * 0.82, w * 0.9, 190);
      stage.fillStyle(0x238a56, 0.9);
      stage.fillEllipse(w * 0.5, h * 0.86, w * 0.78, 116);
      stage.setDepth(4);

      const foreground = this.add.graphics();
      foreground.fillStyle(0x145a32, 0.65);
      foreground.fillRect(0, h - 58, w, 58);
      foreground.setDepth(20);

      this.tweens.add({
        targets: this.clouds.getChildren(),
        x: '+=36',
        duration: 14000,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.inOut',
      });
    }

    createMonster(key, x, y, color, facing) {
      const depth = key === 'player' ? 12 : 10;
      const shadow = this.add.ellipse(x, y + 82, 150, 34, 0x000000, 0.22).setDepth(depth - 1);
      const body = this.add.container(x, y).setDepth(depth);
      const core = this.add.ellipse(0, 0, 105, 125, color, 1);
      const glow = this.add.ellipse(0, 2, 132, 148, color, 0.18);
      const eyeA = this.add.circle(-20 * facing, -18, 9, 0xffffff);
      const eyeB = this.add.circle(18 * facing, -18, 9, 0xffffff);
      const pupilA = this.add.circle(-20 * facing, -18, 4, 0x111827);
      const pupilB = this.add.circle(18 * facing, -18, 4, 0x111827);
      const label = this.add.text(0, 88, this.fighters[key].name, {
        fontFamily: 'Arial',
        fontSize: '16px',
        fontStyle: '700',
        color: '#1f2937',
        stroke: '#ffffff',
        strokeThickness: 4,
      }).setOrigin(0.5);
      body.add([glow, core, eyeA, eyeB, pupilA, pupilB, label]);

      this.sprites[key] = { body, core, glow, shadow, x, y, facing };
      this.tweens.add({
        targets: body,
        y: y - 12,
        scaleX: 1.035,
        scaleY: 0.97,
        duration: key === 'player' ? 920 : 1100,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.inOut',
      });
      this.tweens.add({
        targets: shadow,
        scaleX: 0.9,
        alpha: 0.15,
        duration: key === 'player' ? 920 : 1100,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.inOut',
      });
    }

    createHud() {
      this.hud = {};
      this.hud.player = this.makeHpPanel(24, 22, 'player');
      this.hud.enemy = this.makeHpPanel(this.scale.width - 244, 22, 'enemy');
    }

    makeHpPanel(x, y, key) {
      const fighter = this.fighters[key];
      const box = this.add.graphics().setDepth(30);
      box.fillStyle(0xffffff, 0.86);
      box.lineStyle(3, key === 'player' ? 0x2563eb : 0xdc2626, 1);
      box.fillRoundedRect(x, y, 220, 66, 14);
      box.strokeRoundedRect(x, y, 220, 66, 14);
      const name = this.add.text(x + 14, y + 10, fighter.name, {
        fontFamily: 'Arial',
        fontSize: '15px',
        fontStyle: '700',
        color: '#111827',
      }).setDepth(31);
      const barBg = this.add.rectangle(x + 110, y + 44, 176, 12, 0x111827, 0.16).setDepth(31);
      const bar = this.add.rectangle(x + 22, y + 44, 176 * (fighter.hp / fighter.maxHp), 12, 0x22c55e, 1)
        .setOrigin(0, 0.5)
        .setDepth(32);
      return { box, name, barBg, bar };
    }

    updateBattleState(next = {}) {
      this.fighters = {
        player: { ...this.fighters.player, ...(next.player || {}) },
        enemy: { ...this.fighters.enemy, ...(next.enemy || {}) },
      };
      for (const key of ['player', 'enemy']) {
        const panel = this.hud?.[key];
        if (!panel) continue;
        const fighter = this.fighters[key];
        const ratio = Phaser.Math.Clamp(fighter.hp / Math.max(1, fighter.maxHp), 0, 1);
        panel.bar.width = 176 * ratio;
      }
    }

    playVisualEvent(event = {}) {
      const kind = event.kind || 'attack';
      if (kind === 'bossIntro') return this.playBossIntro();
      if (kind === 'dodge') return this.playDodge(event.target || 'player');
      if (kind === 'crit') return this.playAttack({ ...event, critical: true });
      return this.playAttack(event);
    }

    playAttack(event = {}) {
      const attackerKey = event.attacker || 'player';
      const targetKey = attackerKey === 'player' ? 'enemy' : 'player';
      const attacker = this.sprites[attackerKey];
      const target = this.sprites[targetKey];
      if (!attacker || !target) return null;

      this.tweens.add({
        targets: attacker.body,
        x: attacker.x + 36 * attacker.facing,
        duration: 120,
        yoyo: true,
        ease: 'Quad.out',
      });

      const projectile = this.add.circle(attacker.x + 40 * attacker.facing, attacker.y - 24, event.critical ? 16 : 11, event.critical ? 0xfff200 : 0x38bdf8, 1)
        .setDepth(18);
      this.tweens.add({
        targets: projectile,
        x: target.x - 42 * attacker.facing,
        y: target.y - 16,
        scale: event.critical ? 1.8 : 1.25,
        duration: event.critical ? 300 : 380,
        ease: 'Cubic.in',
        onComplete: () => {
          projectile.destroy();
          this.playImpact(targetKey, event);
        },
      });
      return null;
    }

    playImpact(targetKey, event = {}) {
      const target = this.sprites[targetKey];
      if (!target) return;
      this.cameras.main.shake(event.critical ? 180 : 100, event.critical ? 0.018 : 0.01);
      this.tweens.add({
        targets: target.body,
        x: target.x + (targetKey === 'enemy' ? 18 : -18),
        alpha: 0.62,
        duration: 70,
        yoyo: true,
        repeat: 1,
        onComplete: () => {
          target.body.x = target.x;
          target.body.alpha = 1;
        },
      });

      const damage = this.add.text(target.x, target.y - 120, event.critical ? 'CRIT 128!' : '42', {
        fontFamily: 'Arial',
        fontSize: event.critical ? '34px' : '25px',
        fontStyle: '900',
        color: event.critical ? '#facc15' : '#ffffff',
        stroke: '#111827',
        strokeThickness: 5,
      }).setOrigin(0.5).setDepth(40);
      this.tweens.add({
        targets: damage,
        y: damage.y - 54,
        alpha: 0,
        duration: 740,
        ease: 'Cubic.out',
        onComplete: () => damage.destroy(),
      });

      for (let i = 0; i < 12; i += 1) {
        const p = this.add.circle(target.x, target.y, Phaser.Math.Between(3, 6), event.critical ? 0xfff200 : 0xffffff, 0.88).setDepth(35);
        this.tweens.add({
          targets: p,
          x: target.x + Phaser.Math.Between(-70, 70),
          y: target.y + Phaser.Math.Between(-70, 34),
          alpha: 0,
          duration: 420,
          ease: 'Quad.out',
          onComplete: () => p.destroy(),
        });
      }
    }

    playDodge(targetKey) {
      const target = this.sprites[targetKey];
      if (!target) return null;
      this.tweens.add({
        targets: target.body,
        x: target.x + (targetKey === 'player' ? -70 : 70),
        duration: 100,
        yoyo: true,
        ease: 'Sine.out',
      });
      const txt = this.add.text(target.x, target.y - 118, 'Dodged!', {
        fontFamily: 'Arial',
        fontSize: '28px',
        fontStyle: '900',
        color: '#67e8f9',
        stroke: '#0f172a',
        strokeThickness: 5,
      }).setOrigin(0.5).setDepth(42);
      this.tweens.add({
        targets: txt,
        y: txt.y - 44,
        alpha: 0,
        duration: 680,
        ease: 'Cubic.out',
        onComplete: () => txt.destroy(),
      });
      return null;
    }

    playBossIntro() {
      const enemy = this.sprites.enemy;
      if (!enemy) return null;
      this.cameras.main.zoomTo(1.18, 360, 'Sine.easeInOut');
      this.cameras.main.pan(enemy.x, enemy.y, 360, 'Sine.easeInOut');
      this.time.delayedCall(520, () => {
        this.cameras.main.shake(360, 0.012);
        this.cameras.main.zoomTo(1, 360, 'Sine.easeInOut');
        this.cameras.main.pan(this.scale.width / 2, this.scale.height / 2, 360, 'Sine.easeInOut');
      });
      return null;
    }
  };
}
