const RARITY_FX = {
  common: { color: 0xffffff, alpha: 0 },
  rare: { color: 0x60a5fa, alpha: 0.16 },
  epic: { color: 0xa855f7, alpha: 0.28 },
  legendary: { color: 0xfacc15, alpha: 0.34 },
  mythic: { color: 0x67e8f9, alpha: 0.42 },
};

const ELEMENT_FX = {
  fire: { color: 0xfb923c, driftY: -38, label: 'ember' },
  water: { color: 0x38bdf8, driftY: 26, label: 'drop' },
  electric: { color: 0xfacc15, driftY: -18, label: 'spark' },
  metal: { color: 0xfacc15, driftY: -18, label: 'spark' },
  poison: { color: 0x86efac, driftY: -28, label: 'gas' },
  tech: { color: 0x22d3ee, driftY: -16, label: 'pixel' },
  shadow: { color: 0xa78bfa, driftY: -22, label: 'glitch' },
};

const PALETTES = {
  nugget_dragon: { base: 0xf59f00, light: 0xffd166, dark: 0x9a4f00, accent: 0xe63946 },
  cable_serpent: { base: 0x64748b, light: 0xcbd5e1, dark: 0x1f2937, accent: 0xfacc15 },
  toiletron: { base: 0xdfe6e9, light: 0xffffff, dark: 0x8395a7, accent: 0x48cae4 },
  wifi_wraith: { base: 0x67e8f9, light: 0xecfeff, dark: 0x155e75, accent: 0xa78bfa },
  pizza_meteor: { base: 0xf97316, light: 0xfed7aa, dark: 0x9a3412, accent: 0xdc2626 },
  durian_knight: { base: 0x7cb342, light: 0xc0ca33, dark: 0x33691e, accent: 0xffd166 },
  default: { base: 0x8e44ad, light: 0xc084fc, dark: 0x4c1d95, accent: 0x22d3ee },
};

function clamp01(v) {
  return Math.max(0, Math.min(1, v));
}

function bossVisualTier(stageKind, rarity) {
  if (rarity === 'mythic') return 3;
  if (stageKind === 'bigBoss' || rarity === 'legendary') return 2;
  if (stageKind === 'miniBoss' || rarity === 'epic') return 1;
  return 0;
}

export default class MonsterActor {
  constructor(scene, Phaser, config) {
    this.scene = scene;
    this.Phaser = Phaser;
    this.key = config.key;
    this.x = config.x;
    this.y = config.y;
    this.facing = config.facing ?? 1;
    this.name = config.name ?? 'Monster';
    this.rarity = config.rarity ?? 'common';
    this.element = config.element ?? 'fire';
    this.theme = config.theme ?? 'default';
    this.stageKind = config.stageKind ?? 'normal';
    this.scale = config.scale ?? 1;
    this.depth = config.depth ?? 10;
    this.visualTier = bossVisualTier(this.stageKind, this.rarity);
    this.palette = PALETTES[this.theme] ?? PALETTES.default;
    this.idleTweens = [];
    this.fxTweens = [];
    this.isKo = false;

    this.shadow = scene.add.ellipse(this.x, this.y + 82 * this.scale, 150 * this.scale, 34 * this.scale, 0x000000, 0.22 + this.visualTier * 0.04)
      .setDepth(this.depth - 2);
    this.aura = scene.add.ellipse(this.x, this.y, (150 + this.visualTier * 18) * this.scale, (156 + this.visualTier * 24) * this.scale, RARITY_FX[this.rarity]?.color ?? 0xffffff, RARITY_FX[this.rarity]?.alpha ?? 0)
      .setDepth(this.depth - 1);
    this.container = scene.add.container(this.x, this.y).setDepth(this.depth);
    this.container.setScale(this.facing < 0 ? -1 : 1, 1);

    this.drawBody();
    this.createLabel();
    this.idle();
    this.startRarityAura();
    this.startSecondaryMotion();
    this.startElementParticles();
    this.startBossPresence();
  }

  drawBody() {
    const g = this.scene.add.graphics();
    g.lineStyle(5, 0x111827, 1);

    if (this.theme === 'nugget_dragon') this.drawNugget(g);
    else if (this.theme === 'cable_serpent') this.drawCableSerpent(g);
    else if (this.theme === 'toiletron') this.drawToiletron(g);
    else if (this.theme === 'wifi_wraith') this.drawWraith(g);
    else if (this.theme === 'pizza_meteor') this.drawPizza(g);
    else if (this.theme === 'durian_knight') this.drawDurian(g);
    else this.drawDefault(g);

    this.container.add(g);
    this.bodyGraphic = g;
  }

  drawEyes(g, x, y, spacing = 24, angry = false) {
    g.fillStyle(0xffffff, 1);
    g.fillCircle(x - spacing / 2, y, 9);
    g.fillCircle(x + spacing / 2, y, 9);
    g.fillStyle(0x111827, 1);
    g.fillCircle(x - spacing / 2 + 2, y + 1, 4);
    g.fillCircle(x + spacing / 2 + 2, y + 1, 4);
    if (angry) {
      g.lineStyle(4, 0x111827, 1);
      g.lineBetween(x - 22, y - 14, x - 6, y - 8);
      g.lineBetween(x + 22, y - 14, x + 6, y - 8);
    }
  }

  drawMouth(g, x, y, wide = false) {
    g.lineStyle(4, 0x111827, 1);
    g.beginPath();
    g.arc(x, y, wide ? 18 : 12, 0, Math.PI, false);
    g.strokePath();
  }

  drawNugget(g) {
    const p = this.palette;
    g.fillStyle(p.accent, 0.9);
    g.fillTriangle(-58, -14, -98, -48, -78, 16);
    g.fillTriangle(58, -18, 94, -54, 78, 16);
    g.fillStyle(p.base, 1);
    g.fillRoundedRect(-62, -66, 124, 130, 42);
    g.strokeRoundedRect(-62, -66, 124, 130, 42);
    g.fillStyle(p.light, 0.45);
    g.fillEllipse(-10, 10, 78, 56);
    g.fillStyle(p.dark, 0.35);
    g.fillCircle(-38, 6, 7);
    g.fillCircle(38, 28, 8);
    g.fillStyle(p.accent, 1);
    g.fillTriangle(-30, -64, -14, -94, -4, -60);
    g.fillTriangle(28, -64, 50, -92, 54, -56);
    this.drawEyes(g, 8, -18, 32);
    this.drawMouth(g, 12, 10, true);
  }

  drawCableSerpent(g) {
    const p = this.palette;
    const nodes = [[-82, 46], [-44, 70], [6, 58], [50, 24], [24, -4], [72, -42]];
    g.lineStyle(25, 0x111827, 1);
    for (let i = 1; i < nodes.length; i += 1) {
      g.lineBetween(nodes[i - 1][0], nodes[i - 1][1], nodes[i][0], nodes[i][1]);
    }
    g.lineStyle(17, p.base, 1);
    for (let i = 1; i < nodes.length; i += 1) {
      g.lineBetween(nodes[i - 1][0], nodes[i - 1][1], nodes[i][0], nodes[i][1]);
    }
    g.fillStyle(p.accent, 0.95);
    nodes.slice(1, -1).forEach(([x, y], i) => g.fillCircle(x, y, i % 2 ? 4 : 5));
    g.fillStyle(p.light, 1);
    g.fillEllipse(72, -46, 74, 50);
    g.strokeEllipse(72, -46, 74, 50);
    g.fillStyle(p.accent, 1);
    g.fillRoundedRect(104, -58, 30, 9, 3);
    g.fillRoundedRect(104, -40, 30, 9, 3);
    this.drawEyes(g, 66, -48, 26, true);
  }

  drawToiletron(g) {
    const p = this.palette;
    g.fillStyle(p.light, 1);
    g.fillRoundedRect(-62, -84, 124, 70, 18);
    g.strokeRoundedRect(-62, -84, 124, 70, 18);
    g.fillStyle(p.base, 1);
    g.fillRoundedRect(-72, -20, 144, 104, 34);
    g.strokeRoundedRect(-72, -20, 144, 104, 34);
    g.fillStyle(p.accent, 1);
    g.fillCircle(0, 26, 20);
    g.fillStyle(p.dark, 1);
    g.fillRoundedRect(-112, 4, 42, 18, 8);
    g.fillRoundedRect(70, 4, 42, 18, 8);
    this.drawEyes(g, 0, -50, 30, true);
    this.drawMouth(g, 0, -28);
  }

  drawWraith(g) {
    const p = this.palette;
    g.fillStyle(p.base, 0.72);
    g.fillRoundedRect(-54, -74, 108, 132, 50);
    g.strokeRoundedRect(-54, -74, 108, 132, 50);
    g.lineStyle(6, p.accent, 0.85);
    g.beginPath();
    g.arc(0, -30, 76, Math.PI * 1.15, Math.PI * 1.85);
    g.strokePath();
    g.beginPath();
    g.arc(0, -20, 52, Math.PI * 1.18, Math.PI * 1.82);
    g.strokePath();
    g.fillStyle(p.light, 0.75);
    g.fillCircle(-70, 10, 12);
    g.fillCircle(72, -8, 10);
    this.drawEyes(g, 0, -18, 32);
    this.drawMouth(g, 0, 10);
  }

  drawPizza(g) {
    const p = this.palette;
    g.fillStyle(p.glow ?? 0xfacc15, 0.75);
    g.fillTriangle(-70, 16, -118, -6, -82, -36);
    g.fillStyle(p.base, 1);
    g.fillTriangle(-52, -70, 82, -36, -4, 82);
    g.lineStyle(5, 0x111827, 1);
    g.lineBetween(-52, -70, 82, -36);
    g.lineBetween(82, -36, -4, 82);
    g.lineBetween(-4, 82, -52, -70);
    g.fillStyle(p.light, 0.75);
    g.fillTriangle(-34, -52, 56, -30, -2, 52);
    g.fillStyle(p.accent, 1);
    g.fillCircle(-12, -22, 10);
    g.fillCircle(26, -10, 9);
    g.fillCircle(-2, 24, 8);
    this.drawEyes(g, 6, -6, 28);
    this.drawMouth(g, 6, 18, true);
  }

  drawDurian(g) {
    const p = this.palette;
    g.fillStyle(p.accent, 1);
    const spikes = [[0, -100, -18, -62, 18, -62], [-72, -22, -106, -42, -78, 4], [76, -24, 108, -42, 80, 4], [-46, 78, -18, 52, -8, 92], [44, 78, 18, 52, 8, 92]];
    spikes.forEach((s) => g.fillTriangle(...s));
    g.fillStyle(p.base, 1);
    g.fillRoundedRect(-66, -66, 132, 138, 56);
    g.strokeRoundedRect(-66, -66, 132, 138, 56);
    g.fillStyle(p.dark, 1);
    g.fillTriangle(-74, 2, -116, -10, -94, 52);
    g.fillTriangle(74, 2, 116, -10, 94, 52);
    this.drawEyes(g, 8, -16, 30, true);
    this.drawMouth(g, 8, 10);
  }

  drawDefault(g) {
    const p = this.palette;
    g.fillStyle(p.base, 1);
    g.fillEllipse(0, 0, 112, 132);
    g.strokeEllipse(0, 0, 112, 132);
    g.fillStyle(p.light, 0.5);
    g.fillEllipse(-12, 14, 72, 54);
    this.drawEyes(g, 0, -18, 30);
    this.drawMouth(g, 0, 10, true);
  }

  createLabel() {
    this.label = this.scene.add.text(0, 92 * this.scale, this.name, {
      fontFamily: 'Arial',
      fontSize: `${15 * this.scale}px`,
      fontStyle: '700',
      color: '#1f2937',
      stroke: '#ffffff',
      strokeThickness: 4,
    }).setOrigin(0.5);
    this.container.add(this.label);
  }

  startRarityAura() {
    if (!this.aura || this.rarity === 'common') return;
    const base = RARITY_FX[this.rarity]?.alpha ?? 0.18;
    const pulseScale = 1.12 + this.visualTier * 0.08;
    this.fxTweens.push(this.scene.tweens.add({
      targets: this.aura,
      alpha: this.rarity === 'mythic' ? base * 1.35 : base * (0.7 + this.visualTier * 0.14),
      scaleX: pulseScale,
      scaleY: pulseScale - 0.04,
      duration: this.rarity === 'mythic' ? 680 : this.stageKind === 'miniBoss' ? 920 : 1300,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.inOut',
      onYoyo: () => {
        if (this.rarity === 'mythic') this.aura.fillColor = [0x67e8f9, 0xf472b6, 0xfacc15, 0xa78bfa][this.scene.time.now % 4 | 0];
      },
    }));
  }

  startSecondaryMotion() {
    if (!this.bodyGraphic) return;
    const durationBase = this.theme === 'cable_serpent' ? 420 : this.theme === 'wifi_wraith' ? 180 : 1300;
    const duration = Math.max(150, durationBase - this.visualTier * 120);
    this.fxTweens.push(this.scene.tweens.add({
      targets: this.bodyGraphic,
      angle: (this.theme === 'pizza_meteor' ? 5 : this.theme === 'cable_serpent' ? 3 : 1.2) + this.visualTier * 0.8,
      alpha: this.theme === 'wifi_wraith' ? 0.68 : 1,
      duration,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.inOut',
    }));
  }

  startBossPresence() {
    if (this.visualTier <= 0) return;
    const ringColor = this.rarity === 'mythic'
      ? 0xf472b6
      : this.rarity === 'legendary'
        ? 0xfacc15
        : 0xdc2626;
    this.presenceRing = this.scene.add.ellipse(
      this.x,
      this.y + 76 * this.scale,
      (160 + this.visualTier * 34) * this.scale,
      (36 + this.visualTier * 8) * this.scale,
      ringColor,
      this.visualTier === 1 ? 0.16 : 0.24,
    ).setDepth(this.depth - 1);
    this.fxTweens.push(this.scene.tweens.add({
      targets: this.presenceRing,
      scaleX: 1.16 + this.visualTier * 0.08,
      alpha: 0.06,
      duration: this.visualTier === 3 ? 760 : 1180,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.inOut',
    }));
    if (this.rarity === 'mythic') this.startMythicRings();
  }

  startMythicRings() {
    this.mythicTimer = this.scene.time.addEvent({
      delay: 520,
      loop: true,
      callback: () => {
        if (!this.container?.active) return;
        const ring = this.scene.add.ellipse(
          this.x,
          this.y + this.Phaser.Math.Between(-30, 40),
          this.Phaser.Math.Between(120, 190) * this.scale,
          this.Phaser.Math.Between(18, 36) * this.scale,
          [0x67e8f9, 0xf472b6, 0xfacc15, 0xa78bfa][this.Phaser.Math.Between(0, 3)],
          0.2,
        ).setDepth(this.depth + 1);
        this.scene.tweens.add({
          targets: ring,
          scaleX: 1.45,
          scaleY: 0.6,
          angle: this.Phaser.Math.Between(-12, 12),
          alpha: 0,
          duration: 760,
          ease: 'Cubic.out',
          onComplete: () => ring.destroy(),
        });
      },
    });
  }

  startElementParticles() {
    const fx = ELEMENT_FX[this.element] ?? ELEMENT_FX.tech;
    this.particleTimer = this.scene.time.addEvent({
      delay: Math.max(160, (this.element === 'fire' || this.element === 'electric' ? 420 : 650) - this.visualTier * 110),
      loop: true,
      callback: () => this.spawnElementParticle(fx),
    });
  }

  spawnElementParticle(fx) {
    if (!this.container?.active) return;
    const px = this.x + this.Phaser.Math.Between(-42, 42) * this.scale;
    const py = this.y + this.Phaser.Math.Between(-48, 42) * this.scale;
    const size = (fx.label === 'pixel' || fx.label === 'glitch' ? 7 : this.Phaser.Math.Between(3, 6)) + this.visualTier;
    const p = fx.label === 'pixel' || fx.label === 'glitch'
      ? this.scene.add.rectangle(px, py, size, size, fx.color, 0.72)
      : this.scene.add.circle(px, py, size, fx.color, 0.7);
    p.setDepth(this.depth + 2);
    this.scene.tweens.add({
      targets: p,
      y: py + fx.driftY,
      x: px + this.Phaser.Math.Between(-12, 12),
      alpha: 0,
      scale: fx.label === 'gas' ? 1.8 : 0.4,
      duration: 760 + this.visualTier * 120,
      ease: 'Quad.out',
      onComplete: () => p.destroy(),
    });
  }

  idle() {
    this.stopPoseTweens();
    this.isKo = false;
    this.container.x = this.x;
    this.container.y = this.y;
    this.container.angle = 0;
    this.container.alpha = 1;
    this.container.setScale(this.facing < 0 ? -1 : 1, 1);
    const lift = 10 * this.scale + this.visualTier * 4;
    const idleMs = Math.max(520, (this.theme === 'toiletron' ? 1350 : this.theme === 'cable_serpent' ? 760 : 950) - this.visualTier * 95);
    this.idleTweens.push(this.scene.tweens.add({
      targets: this.container,
      y: this.y - lift,
      scaleY: 0.965 - this.visualTier * 0.012,
      scaleX: this.facing < 0 ? -(1.035 + this.visualTier * 0.012) : 1.035 + this.visualTier * 0.012,
      duration: idleMs,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.inOut',
    }));
    this.idleTweens.push(this.scene.tweens.add({
      targets: this.shadow,
      scaleX: 0.86 - this.visualTier * 0.04,
      alpha: 0.15 + this.visualTier * 0.02,
      duration: idleMs,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.inOut',
    }));
    this.scheduleBlink();
  }

  scheduleBlink() {
    this.blinkTimer?.remove(false);
    this.blinkTimer = this.scene.time.addEvent({
      delay: this.Phaser.Math.Between(1600, 3200),
      loop: true,
      callback: () => {
        this.container.scaleY *= 0.96;
        this.scene.time.delayedCall(70, () => {
          if (this.container?.active) this.container.scaleY /= 0.96;
        });
      },
    });
  }

  stopPoseTweens() {
    for (const tween of this.idleTweens) tween?.stop?.();
    this.idleTweens = [];
  }

  setActiveGlow(active) {
    if (!this.aura) return;
    this.scene.tweens.add({
      targets: this.aura,
      alpha: active ? Math.max(this.aura.alpha, 0.26) : (RARITY_FX[this.rarity]?.alpha ?? 0),
      scaleX: active ? 1.18 : 1,
      scaleY: active ? 1.14 : 1,
      duration: 180,
      ease: 'Sine.out',
    });
  }

  setDimmed(dimmed) {
    this.scene.tweens.add({
      targets: this.container,
      alpha: dimmed ? 0.72 : 1,
      duration: 180,
      ease: 'Sine.out',
    });
  }

  anticipate(isMagic = false) {
    this.stopPoseTweens();
    this.scene.tweens.add({
      targets: this.container,
      x: this.x - (isMagic ? 18 : 28) * this.facing,
      y: this.y + (isMagic ? -6 : 8),
      scaleX: this.facing < 0 ? -0.92 : 0.92,
      scaleY: isMagic ? 1.1 : 0.9,
      duration: isMagic ? 190 : 160,
      ease: 'Back.out',
    });
  }

  attack() {
    this.stopPoseTweens();
    return new Promise((resolve) => {
      let contacted = false;
      const reach = 58 + this.visualTier * 18;
      const attackMs = Math.max(105, 145 - this.visualTier * 12);
      this.scene.tweens.add({
        targets: this.container,
        x: this.x + reach * this.facing,
        y: this.y - 10 - this.visualTier * 4,
        scaleX: this.facing < 0 ? -(1.1 + this.visualTier * 0.04) : 1.1 + this.visualTier * 0.04,
        scaleY: 1.04 + this.visualTier * 0.03,
        duration: attackMs,
        ease: 'Quad.out',
        yoyo: true,
        onYoyo: () => {
          if (contacted) return;
          contacted = true;
          resolve();
        },
        onComplete: () => {
          this.idle();
          if (!contacted) resolve();
        },
      });
    });
  }

  hurt({ critical = false, guarded = false } = {}) {
    const recoil = guarded ? 10 : critical ? 34 : 22;
    const tint = guarded ? 0xbfdbfe : critical ? 0xfacc15 : 0xffffff;
    const flash = this.scene.add.ellipse(this.x, this.y, 150 * this.scale, 160 * this.scale, tint, guarded ? 0.18 : 0.32)
      .setDepth(this.depth + 5);
    this.scene.tweens.add({
      targets: this.container,
      x: this.x - recoil * this.facing,
      alpha: guarded ? 0.82 : 0.58,
      duration: critical ? 95 : 75,
      yoyo: true,
      repeat: 1,
      onComplete: () => {
        this.container.x = this.x;
        this.container.alpha = 1;
        this.idle();
      },
    });
    this.scene.tweens.add({
      targets: flash,
      scale: critical ? 1.35 : 1.12,
      alpha: 0,
      duration: critical ? 220 : 150,
      ease: 'Quad.out',
      onComplete: () => flash.destroy(),
    });
  }

  defend(impact = false) {
    const shield = this.scene.add.ellipse(this.x, this.y, 150 * this.scale, 164 * this.scale, 0x74c0fc, 0.28)
      .setStrokeStyle(4, 0xbfdbfe, 0.9)
      .setDepth(this.depth + 4);
    if (!impact) {
      this.scene.tweens.add({
        targets: this.container,
        scaleX: this.facing < 0 ? -0.94 : 0.94,
        scaleY: 1.06,
        duration: 140,
        yoyo: true,
        ease: 'Sine.out',
      });
    }
    this.scene.tweens.add({
      targets: shield,
      scale: impact ? 1.36 : 1.18,
      alpha: 0,
      duration: impact ? 380 : 650,
      ease: 'Sine.out',
      onComplete: () => shield.destroy(),
    });
  }

  dodge() {
    this.scene.tweens.add({
      targets: this.container,
      x: this.x - 74 * this.facing,
      alpha: 0.72,
      duration: 95,
      ease: 'Sine.out',
      yoyo: true,
      onComplete: () => {
        this.container.x = this.x;
        this.container.alpha = 1;
      },
    });
  }

  ko() {
    if (this.isKo) return;
    this.isKo = true;
    this.scene.tweens.killTweensOf(this.container);
    this.stopPoseTweens();
    this.container.setAngle(0);
    const puff = this.scene.add.ellipse(this.x, this.y + 76, 86, 24, 0xffffff, 0.58).setDepth(this.depth + 1);
    this.scene.tweens.add({
      targets: puff,
      scaleX: 1.8,
      scaleY: 1.5,
      alpha: 0,
      duration: 420,
      ease: 'Quad.out',
      onComplete: () => puff.destroy(),
    });
    this.scene.tweens.add({
      targets: this.container,
      y: this.y + 58,
      angle: -24 * this.facing,
      alpha: 0.25,
      duration: 520,
      ease: 'Back.in',
    });
    this.scene.tweens.add({
      targets: this.shadow,
      alpha: 0.05,
      scaleX: 1.2,
      duration: 520,
    });
  }

  destroy() {
    this.blinkTimer?.remove(false);
    this.particleTimer?.remove(false);
    this.mythicTimer?.remove(false);
    this.stopPoseTweens();
    for (const tween of this.fxTweens) tween?.stop?.();
    this.fxTweens = [];
    this.container?.destroy(true);
    this.shadow?.destroy();
    this.aura?.destroy();
    this.presenceRing?.destroy();
  }
}
