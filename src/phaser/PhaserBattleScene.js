import BattleAnimationController from './BattleAnimationController';
import MonsterActor from './MonsterActor';
import { GAME_ASSETS } from '../../utils/gameAssetPaths';
import {
  BOSS_DISPLAY_SCALE,
  BATTLE_MONSTER_SIZE_MULT,
  battleTemplateDisplayScale,
  playerBossEncounterScale,
} from '../../utils/battleLayout';
import { MONSTER_ASSETS, getNormalMonsterAsset } from './monsterAssetManifest';

export const ACTION_IMAGE_ASSETS = {
  attack: { key: 'action_attack', path: GAME_ASSETS.battleActions.attack },
  attack1: { key: 'action_attack1', path: GAME_ASSETS.battleActions.attack1 },
  attack2: { key: 'action_attack2', path: GAME_ASSETS.battleActions.attack2 },
  magic: { key: 'action_magic', path: GAME_ASSETS.battleActions.magic },
  magic1: { key: 'action1_magic', path: GAME_ASSETS.battleActions.magic1 },
  magic2: { key: 'action_magic2', path: GAME_ASSETS.battleActions.magic2 },
  defend: { key: 'action_defend', path: GAME_ASSETS.battleActions.defend },
  run: { key: 'action_run', path: GAME_ASSETS.battleActions.run },
  comment: { key: 'action_comment', path: GAME_ASSETS.battleActions.comment },
  feedbackCritical: { key: 'feedback_critical', path: GAME_ASSETS.battleActions.feedback.critical },
  feedbackDodge: { key: 'feedback_dodge', path: GAME_ASSETS.battleActions.feedback.dodge },
  feedbackMiss: { key: 'feedback_miss', path: GAME_ASSETS.battleActions.feedback.miss },
  feedbackGuard: { key: 'feedback_guard', path: GAME_ASSETS.battleActions.feedback.guard },
  feedbackKo: { key: 'feedback_ko', path: GAME_ASSETS.battleActions.feedback.ko },
  feedbackHit: { key: 'feedback_hit', path: GAME_ASSETS.battleActions.feedback.hit },
};

export function createPhaserBattleScene(Phaser) {
  return class PhaserBattleScene extends Phaser.Scene {
    constructor() {
      super('PhaserBattleScene');
      this.fighters = {
        player: { name: 'Nugget Dragon', hp: 82, maxHp: 100, element: 'fire', rarity: 'common', theme: 'nugget_dragon' },
        enemy: { name: 'Charging Cable Serpent', hp: 120, maxHp: 140, element: 'electric', rarity: 'rare', theme: 'cable_serpent' },
      };
      this.actors = {};
      this.isAnimatingAction = false;
      this.visualEventComplete = null;
    }

    preload() {
      Object.values(MONSTER_ASSETS).forEach((asset) => {
        this.load.image(asset.key, asset.path);
      });
      Object.values(ACTION_IMAGE_ASSETS).forEach((asset) => {
        this.load.image(asset.key, asset.path);
      });
      this.load.on('loaderror', (file) => {
        console.warn('[phaser-assets] Asset missing or failed to load:', file?.src || file?.key);
      });
    }

    create() {
      this.drawBattlefield();
      this.createMonsterActor('player', this.scale.width * 0.25, this.scale.height * 0.72, 1, 12);
      this.createMonsterActor('enemy', this.scale.width * 0.72, this.scale.height * 0.58, -1, 10);
      this.animationController = new BattleAnimationController(this, Phaser);
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

    createMonsterActor(key, x, y, facing, depth) {
      this.actors[key]?.destroy();
      const fighter = this.fighters[key] || {};
      const stageKind = this.fighters.enemy?.stageKind ?? fighter.stageKind;
      const encounterScale =
        key === 'player'
          ? playerBossEncounterScale(stageKind)
          : key === 'enemy'
            ? fighter.stageKind === 'bigBoss'
              ? BOSS_DISPLAY_SCALE.bigBoss
              : fighter.stageKind === 'miniBoss'
                ? BOSS_DISPLAY_SCALE.miniBoss
                : 1
            : 1;
      this.actors[key] = new MonsterActor(this, Phaser, {
        key,
        x,
        y,
        facing,
        depth,
        scale:
          (key === 'player' ? 1 : 1.03)
          * encounterScale
          * BATTLE_MONSTER_SIZE_MULT
          * battleTemplateDisplayScale(fighter.templateId ?? fighter.monsterTemplateId),
        asset: getNormalMonsterAsset(fighter.templateId),
        ...fighter,
      });
    }

    createHud() {
      this.hud = {};
      this.hud.player = this.makeHpPanel(24, 22, 'player');
      this.hud.enemy = this.makeHpPanel(this.scale.width - 244, 22, 'enemy');
    }

    makeHpPanel(x, y, key) {
      const fighter = this.fighters[key];
      const name = this.add.text(x + 14, y + 10, fighter.name, {
        fontFamily: 'Arial',
        fontSize: '15px',
        fontStyle: '700',
        color: '#ffffff',
        stroke: '#111827',
        strokeThickness: 4,
      }).setDepth(31).setScrollFactor(0);
      const barBg = this.add.rectangle(x + 110, y + 44, 176, 12, 0x111827, 0.32).setDepth(31).setScrollFactor(0);
      const bar = this.add.rectangle(x + 22, y + 44, 176 * (fighter.hp / fighter.maxHp), 12, 0x22c55e, 1)
        .setOrigin(0, 0.5)
        .setDepth(32)
        .setScrollFactor(0);
      const mpBg = this.add.rectangle(x + 110, y + 58, 176, 7, 0x111827, 0.24).setDepth(31).setScrollFactor(0);
      const mpRatio = (fighter.mp ?? fighter.maxMp ?? 1) / Math.max(1, fighter.maxMp ?? fighter.mp ?? 1);
      const mpBar = this.add.rectangle(x + 22, y + 58, 176 * mpRatio, 7, 0x6366f1, 1)
        .setOrigin(0, 0.5)
        .setDepth(32)
        .setScrollFactor(0);
      const flash = this.add.rectangle(x + 110, y + 44, 176, 12, 0xff3b30, 0)
        .setDepth(33)
        .setScrollFactor(0);
      return { name, barBg, bar, mpBg, mpBar, flash };
    }

    updateBattleState(next = {}) {
      this.fighters = {
        player: { ...this.fighters.player, ...(next.player || {}) },
        enemy: { ...this.fighters.enemy, ...(next.enemy || {}) },
      };
      for (const key of ['player', 'enemy']) {
        const actor = this.actors[key];
        const fighter = this.fighters[key];
        if (!actor || !fighter) continue;
        if (
          actor.name !== fighter.name
          || actor.rarity !== fighter.rarity
          || actor.element !== fighter.element
          || actor.theme !== fighter.theme
          || actor.stageKind !== fighter.stageKind
        ) {
          this.createMonsterActor(key, actor.x, actor.y, actor.facing, actor.depth);
        }
      }
      for (const key of ['player', 'enemy']) {
        const actor = this.actors[key];
        const fighter = this.fighters[key];
        if (!actor || !fighter) continue;
        if (fighter.hp <= 0) actor.ko();
        else if (actor.isKo) actor.idle();
        actor.setShieldActive?.((fighter.shieldHp ?? 0) > 0 && fighter.hp > 0);
      }
      for (const key of ['player', 'enemy']) {
        const panel = this.hud?.[key];
        if (!panel) continue;
        const fighter = this.fighters[key];
        panel.name.setText(fighter.name);
        if (!this.isAnimatingAction) this.syncHudPanel(key, fighter);
      }
    }

    setVisualEventComplete(callback) {
      this.visualEventComplete = callback;
    }

    notifyVisualEventComplete(result) {
      this.visualEventComplete?.(result);
    }

    playVisualEvent(event = {}) {
      const kind = event.kind || 'attack';
      if (kind === 'actionResult' || event.actionType) return this.animationController?.play(event);
      if (kind === 'turn') return this.animationController?.play({ ...event, actionType: 'turn' });
      if (kind === 'bossIntro') return this.playBossIntro(event);
      if (kind === 'defend') return this.actors[event.target || 'player']?.defend();
      if (kind === 'hurt') return this.actors[event.target || 'enemy']?.hurt();
      if (kind === 'ko') return this.actors[event.target || 'enemy']?.ko();
      if (kind === 'dodge') return this.playDodge(event.target || 'player');
      if (kind === 'crit') return this.playAttack({ ...event, critical: true });
      return this.playAttack(event);
    }

    playAttack(event = {}) {
      const attackerKey = event.attacker || 'player';
      const targetKey = attackerKey === 'player' ? 'enemy' : 'player';
      const attacker = this.actors[attackerKey];
      const target = this.actors[targetKey];
      if (!attacker || !target) return null;

      const attackKeys = [ACTION_IMAGE_ASSETS.attack.key, ACTION_IMAGE_ASSETS.attack1.key, ACTION_IMAGE_ASSETS.attack2.key];
      const attackKey = attackKeys[Math.abs(Number(event.seq ?? event.damage ?? 0)) % attackKeys.length];
      const projectile = this.textures.exists(attackKey)
        ? this.add.image(attacker.x + 40 * attacker.facing, attacker.y - 24, attackKey)
          .setDisplaySize(80, 80)
          .setScale(event.critical ? 1 : 0.86)
          .setFlipX(attacker.facing < 0)
          .setDepth(18)
        : this.add.circle(attacker.x + 40 * attacker.facing, attacker.y - 24, event.critical ? 16 : 11, event.critical ? 0xfff200 : 0x38bdf8, 1)
          .setDepth(18);
      attacker.attack(target, event);
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
      const target = this.actors[targetKey];
      if (!target) return;
      this.cameras.main.shake(event.critical ? 180 : 100, event.critical ? 0.018 : 0.01);
      target.hurt();

      const damage = this.add.text(target.x, target.y - 120, event.critical ? 'CRIT 128!' : '42', {
        fontFamily: 'Arial',
        fontSize: event.critical ? '34px' : '25px',
        fontStyle: '900',
        color: event.critical ? '#facc15' : '#ef4444',
        stroke: event.critical ? '#111827' : '#7f1d1d',
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

    syncHudPanel(key, fighter = this.fighters[key]) {
      const panel = this.hud?.[key];
      if (!panel || !fighter) return;
      const hpRatio = Phaser.Math.Clamp(fighter.hp / Math.max(1, fighter.maxHp), 0, 1);
      const mpRatio = Phaser.Math.Clamp((fighter.mp ?? fighter.maxMp ?? 1) / Math.max(1, fighter.maxMp ?? fighter.mp ?? 1), 0, 1);
      panel.bar.width = 176 * hpRatio;
      panel.mpBar.width = 176 * mpRatio;
      this.syncStatusIcons(key, fighter);
    }

    syncStatusIcons(key, fighter) {
      const panel = this.hud?.[key];
      if (!panel) return;
      if (panel._statusIcons) {
        panel._statusIcons.forEach((t) => t.destroy());
        panel._statusIcons = [];
      }
      const ICONS = { poison: '☠️', burn: '🔥', atkDown: '⬇️', defDown: '🛡️' };
      const dict = fighter.statuses || {};
      const active = Object.keys(ICONS).filter((t) => dict[t]?.turnsLeft > 0);
      if (!active.length) return;
      const baseX = panel.bar.x - (panel.bar.width / 2) + 2;
      const baseY = (panel.mpBar?.y ?? panel.bar.y) + 14;
      panel._statusIcons = active.map((type, i) => {
        const icon = this.add.text(baseX + i * 22, baseY, ICONS[type], {
          fontSize: '13px',
        }).setDepth(34).setScrollFactor(0);
        return icon;
      });
    }

    animateHudTo(key, { hp, mp, heavy = false } = {}) {
      const panel = this.hud?.[key];
      const fighter = this.fighters[key];
      if (!panel || !fighter) return;
      if (typeof hp === 'number') {
        fighter.hp = hp;
        const hpRatio = Phaser.Math.Clamp(hp / Math.max(1, fighter.maxHp), 0, 1);
        this.tweens.add({
          targets: panel.bar,
          width: 176 * hpRatio,
          duration: heavy ? 520 : 380,
          ease: 'Cubic.out',
        });
        this.tweens.add({
          targets: panel.flash,
          alpha: heavy ? 0.55 : 0.34,
          duration: 90,
          yoyo: true,
          ease: 'Quad.out',
        });
      }
      if (typeof mp === 'number') {
        fighter.mp = mp;
        const mpRatio = Phaser.Math.Clamp(mp / Math.max(1, fighter.maxMp ?? mp), 0, 1);
        this.tweens.add({
          targets: panel.mpBar,
          width: 176 * mpRatio,
          duration: 280,
          ease: 'Cubic.out',
        });
      }
    }

    showFloatingText(x, y, text, options = {}) {
      const feedbackKey = this.feedbackKeyForText(text);
      if (feedbackKey) return this.showFeedbackImage(x, y, feedbackKey, options);

      const t = this.add.text(x, y, text, {
        fontFamily: 'Arial',
        fontSize: `${options.size ?? 26}px`,
        fontStyle: '900',
        color: options.color ?? '#ffffff',
        stroke: options.stroke ?? '#111827',
        strokeThickness: 5,
      }).setOrigin(0.5).setDepth(44);
      t.setScale(0.65);
      this.tweens.add({
        targets: t,
        y: y - 48,
        alpha: 0,
        scale: 1.15,
        duration: options.duration ?? 760,
        ease: 'Cubic.out',
        onComplete: () => t.destroy(),
      });
      return t;
    }

    feedbackKeyForText(text = '') {
      const normalized = String(text).toLowerCase();
      if (normalized.includes('dodg')) return ACTION_IMAGE_ASSETS.feedbackDodge.key;
      if (normalized.includes('miss')) return ACTION_IMAGE_ASSETS.feedbackMiss.key;
      if (normalized.includes('guard')) return ACTION_IMAGE_ASSETS.feedbackGuard.key;
      if (normalized.includes('crit')) return ACTION_IMAGE_ASSETS.feedbackCritical.key;
      if (normalized.includes('ko')) return ACTION_IMAGE_ASSETS.feedbackKo.key;
      if (normalized.includes('hit')) return ACTION_IMAGE_ASSETS.feedbackHit.key;
      return null;
    }

    showFeedbackImage(x, y, textureKey, options = {}) {
      if (!this.textures.exists(textureKey)) return null;
      const img = this.add.image(x, y, textureKey)
        .setOrigin(0.5)
        .setDisplaySize(80, 80)
        .setDepth(options.depth ?? 44)
        .setScale(options.startScale ?? 0.9);
      this.tweens.add({
        targets: img,
        y: y - 42,
        alpha: 0,
        scale: options.endScale ?? 1.18,
        duration: options.duration ?? 920,
        ease: 'Cubic.out',
        onComplete: () => img.destroy(),
      });
      return img;
    }

    showDamageNumber(actor, result = {}) {
      if (!actor || result.dodged) return;
      const damage = Math.max(0, Math.round(result.damage ?? 0));
      if (result.crit) this.showFeedbackImage(actor.x, actor.y - 154, ACTION_IMAGE_ASSETS.feedbackCritical.key);
      else if (result.defended) this.showFeedbackImage(actor.x, actor.y - 154, ACTION_IMAGE_ASSETS.feedbackGuard.key);
      const label = `-${damage}`;
      this.showFloatingText(actor.x, actor.y - 122, label, {
        color: result.crit ? '#facc15' : result.defended ? '#bfdbfe' : '#ef4444',
        size: result.crit ? 34 : result.defended ? 22 : 27,
        stroke: result.crit || result.defended ? '#111827' : '#7f1d1d',
      });
    }

    showTurnText(text) {
      const label = this.add.text(this.scale.width / 2, 120, text, {
        fontFamily: 'Arial',
        fontSize: '32px',
        fontStyle: '900',
        color: '#ffffff',
        stroke: '#0f172a',
        strokeThickness: 6,
      }).setOrigin(0.5).setDepth(45);
      label.setScale(0.72);
      this.tweens.add({
        targets: label,
        y: 92,
        alpha: 0,
        scale: 1.08,
        duration: 720,
        ease: 'Cubic.out',
        onComplete: () => label.destroy(),
      });
    }

    playDodgeEffect(actor) {
      for (let i = 0; i < 7; i += 1) {
        const puff = this.add.circle(actor.x + Phaser.Math.Between(-28, 28), actor.y + 52, Phaser.Math.Between(4, 8), 0xffffff, 0.45)
          .setDepth(actor.depth + 2);
        this.tweens.add({
          targets: puff,
          x: puff.x - 40 * actor.facing,
          y: puff.y + Phaser.Math.Between(-12, 12),
          alpha: 0,
          scale: 1.8,
          duration: 360,
          ease: 'Quad.out',
          onComplete: () => puff.destroy(),
        });
      }
    }

    playElementImpact(actor, element = 'normal', { critical = false, guarded = false } = {}) {
      const colorMap = {
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
      const color = guarded ? 0xbfdbfe : colorMap[element] ?? colorMap.normal;
      const tier = actor.visualTier ?? 0;
      const count = (critical ? 20 : guarded ? 8 : 13) + tier * 6;
      for (let i = 0; i < count; i += 1) {
        const particle = element === 'tech' || element === 'glitch'
          ? this.add.rectangle(actor.x, actor.y, Phaser.Math.Between(4, 9), Phaser.Math.Between(4, 9), color, 0.85)
          : this.add.circle(actor.x, actor.y, Phaser.Math.Between(3, 7), color, 0.88);
        particle.setDepth(actor.depth + 8);
        this.tweens.add({
          targets: particle,
          x: actor.x + Phaser.Math.Between(-82 - tier * 24, 82 + tier * 24),
          y: actor.y + Phaser.Math.Between(-78 - tier * 18, 42 + tier * 12),
          alpha: 0,
          scale: element === 'poison' || element === 'bacteria' ? 1.9 : 0.35,
          duration: (critical ? 560 : 420) + tier * 90,
          ease: 'Quad.out',
          onComplete: () => particle.destroy(),
        });
      }
    }

    playDodge(targetKey) {
      const actor = this.actors[targetKey];
      if (!actor) return null;
      actor.dodge();
      this.showFeedbackImage(actor.x, actor.y - 118, ACTION_IMAGE_ASSETS.feedbackDodge.key);
      return null;
    }

    playBossIntro(event = {}) {
      const enemy = this.actors.enemy;
      if (!enemy) return null;
      const boss = event.stageKind === 'bigBoss';
      const mythic = enemy.rarity === 'mythic' || enemy.rarity === 'ultra_mythic';
      const title = event.title || (boss ? 'BOSS BATTLE!' : 'Mini Boss Appears!');
      enemy.setActiveGlow(true);
      this.showTurnText(title);
      if (boss) this.playBossEnvironmentPulse(mythic);
      this.cameras.main.zoomTo(mythic ? 1.32 : boss ? 1.24 : 1.14, mythic ? 560 : boss ? 440 : 280, 'Sine.easeInOut');
      this.cameras.main.pan(enemy.x, enemy.y, mythic ? 560 : boss ? 440 : 280, 'Sine.easeInOut');
      this.time.delayedCall(mythic ? 700 : boss ? 540 : 360, () => {
        this.cameras.main.shake(mythic ? 560 : boss ? 420 : 220, mythic ? 0.02 : boss ? 0.014 : 0.008);
        this.cameras.main.zoomTo(1, mythic ? 520 : boss ? 420 : 280, 'Sine.easeInOut');
        this.cameras.main.pan(this.scale.width / 2, this.scale.height / 2, mythic ? 520 : boss ? 420 : 280, 'Sine.easeInOut');
        enemy.setActiveGlow(false);
      });
      return null;
    }

    playBossEnvironmentPulse(mythic = false) {
      const tint = this.add.rectangle(
        this.scale.width / 2,
        this.scale.height / 2,
        this.scale.width,
        this.scale.height,
        mythic ? 0x4c1d95 : 0x78350f,
        mythic ? 0.26 : 0.16,
      ).setDepth(8);
      this.tweens.add({
        targets: tint,
        alpha: 0,
        duration: mythic ? 920 : 620,
        ease: 'Sine.out',
        onComplete: () => tint.destroy(),
      });
      const count = mythic ? 28 : 16;
      for (let i = 0; i < count; i += 1) {
        const p = mythic
          ? this.add.rectangle(Phaser.Math.Between(0, this.scale.width), Phaser.Math.Between(40, this.scale.height - 80), Phaser.Math.Between(4, 12), Phaser.Math.Between(4, 12), [0x67e8f9, 0xf472b6, 0xfacc15][Phaser.Math.Between(0, 2)], 0.72)
          : this.add.circle(Phaser.Math.Between(0, this.scale.width), Phaser.Math.Between(80, this.scale.height - 80), Phaser.Math.Between(3, 7), 0xfacc15, 0.62);
        p.setDepth(9);
        this.tweens.add({
          targets: p,
          y: p.y - Phaser.Math.Between(30, 90),
          alpha: 0,
          scale: mythic ? 1.6 : 0.4,
          duration: Phaser.Math.Between(520, mythic ? 1100 : 820),
          ease: 'Quad.out',
          onComplete: () => p.destroy(),
        });
      }
    }
  };
}
