import { GRID_ROWS } from '../../../utils/monsterRescue/constants';
import { getRescueStage } from '../../../utils/monsterRescue/stages';
import StageGenerator from './StageGenerator';
import BubbleSystem from './BubbleSystem';
import ComboManager from './ComboManager';
import RewardManager from './RewardManager';
import PuzzleHUD from './PuzzleHUD';
import { getRescueBootShooterTemplateId, getRescueBootStageId } from './bootConfig';
import { preloadRescueAssets, rescueBackgroundForStage, RESCUE_SCENE_ASSETS } from './rescueAssets';
import RescueShooter from './RescueShooter';
import { computeRescueLayout } from './rescueLayout';

const SHOOT_SPEED = 680;
const MIN_AIM_ANGLE = -2.75;
const MAX_AIM_ANGLE = -0.35;

export function createMonsterRescueScene(Phaser) {
  return class MonsterRescueScene extends Phaser.Scene {
    constructor() {
      super('MonsterRescueScene');
      this.stageId = 1;
      this.shotsLeft = 30;
      this.isShooting = false;
      this.gameOver = false;
    }

    init(data) {
      this.stageId = data?.stageId ?? data?.levelId ?? getRescueBootStageId();
    }

    preload() {
      // No blocking asset loads — create() runs immediately (gradient + emoji fallbacks).
    }

    create() {
      try {
        this._bootScene();
      } catch (err) {
        console.error('[MonsterRescue] create failed', err);
        this.game.events.emit('monster-rescue-error', err);
      }
    }

    _bootScene() {
      const w = this.scale.width;
      const h = this.scale.height;
      this.stageDef = getRescueStage(this.stageId);
      this.shotsLeft = this.stageDef.shotLimit;

      const { displayFillRows, ...layout } = computeRescueLayout(w, h, this.stageDef.fillRows);
      this.layout = layout;

      this._drawBackdrop(w, h);
      this._drawPlayFrame(layout);
      this.dangerY = layout.clusterBottom + layout.cellH * 2;

      this.comboManager = new ComboManager(this);
      this.rewardManager = new RewardManager(this);
      this.stageGenerator = new StageGenerator(this.stageDef, displayFillRows);
      this.bubbleSystem = new BubbleSystem(this, this.layout);
      this.bubbleSystem.loadGrid(this.stageGenerator.buildInitialGrid());

      this.shooterX = w / 2;
      this.shooterY = layout.shooterY;
      this.aimAngle = -Math.PI / 2;
      this.currentCell = this.stageGenerator.rollShooterBubble();
      this.previewQueue = [
        this.stageGenerator.rollShooterBubble(),
        this.stageGenerator.rollShooterBubble(),
        this.stageGenerator.rollShooterBubble(),
      ];

      this.shooter = new RescueShooter(
        this,
        this.shooterX,
        this.shooterY,
        getRescueBootShooterTemplateId(),
        layout.bubbleRadius
      );
      this.shooter.setAimAngle(this.aimAngle);
      this.shooter.setLoadedBubble(this.currentCell);
      this.shooter.setNextPreview(this.previewQueue);

      this.projectile = null;
      this.puzzleHud = new PuzzleHUD(this);
      this._refreshHud();

      this.input.on('pointerdown', (p) => this._onPointerDown(p));
      this.input.on('pointermove', (p) => this._onPointerMove(p));
      this.input.on('pointerup', () => this._onPointerUp());

      this.events.on('rescue:pop', () => this.game.events.emit('rescue:pop'));
      this.time.delayedCall(0, () => {
        this.game.events.emit('monster-rescue-ready', this);
      });
      this._queueOptionalTextures();
    }

    /** Load PNG art after gameplay is live so preload cannot hang startup. */
    _queueOptionalTextures() {
      if (this._optionalTexturesQueued) return;
      this._optionalTexturesQueued = true;
      const stageId = this.stageId ?? getRescueBootStageId();
      const bgPath = rescueBackgroundForStage(stageId);
      if (bgPath && !this.textures.exists(RESCUE_SCENE_ASSETS.bg.key)) {
        this.load.image(RESCUE_SCENE_ASSETS.bg.key, bgPath);
      }
      this.shooter?.preloadMonster?.(this);
      preloadRescueAssets(this, { skipBg: true });
      this.load.once(Phaser.Loader.Events.COMPLETE, () => {
        if (!this.scene.isActive()) return;
        const w = this.scale.width;
        const h = this.scale.height;
        if (this.textures.exists(RESCUE_SCENE_ASSETS.bg.key) && !this._bgImage) {
          this._bgImage = this.add.image(w / 2, h / 2, RESCUE_SCENE_ASSETS.bg.key).setDepth(0);
          const scale = Math.max(w / this._bgImage.width, h / this._bgImage.height) * 1.05;
          this._bgImage.setScale(scale).setAlpha(0.92);
        }
        this.shooter?._tryLoadMonsterTexture?.();
      });
      if (this.load.totalToLoad > 0) this.load.start();
    }

    _drawBackdrop(w, h) {
      if (this.textures.exists(RESCUE_SCENE_ASSETS.bg.key)) {
        const bg = this.add.image(w / 2, h / 2, RESCUE_SCENE_ASSETS.bg.key).setDepth(0);
        const scale = Math.max(w / bg.width, h / bg.height) * 1.05;
        bg.setScale(scale).setAlpha(0.92);
      } else {
        const g = this.add.graphics().setDepth(0);
        g.fillGradientStyle(0x5ec8ff, 0x5ec8ff, 0xc9f0ff, 0xe8fff8, 1);
        g.fillRect(0, 0, w, h);
      }
      const veil = this.add.rectangle(w / 2, h / 2, w, h, 0x0c4a6e, 0.18).setDepth(1);
      veil.setBlendMode(Phaser.BlendModes.MULTIPLY);
      const floor = this.add.rectangle(w / 2, h - 20, w, 56, 0x022c22, 0.28).setDepth(2);
    }

    _drawPlayFrame(layout) {
      const g = this.add.graphics().setDepth(3);
      const { playLeft, playTop, playWidth, playHeight } = layout;
      g.fillStyle(0x081224, 0.42);
      g.fillRoundedRect(playLeft, playTop, playWidth, playHeight, 12);
      g.lineStyle(2, 0xffe6a3, 0.4);
      g.strokeRoundedRect(playLeft, playTop, playWidth, playHeight, 12);
      g.lineStyle(1, 0x93c5fd, 0.2);
      g.strokeRoundedRect(playLeft + 4, playTop + 4, playWidth - 8, playHeight - 8, 10);
    }

    _spawnFloatingBubble(cell, x, y, depth, scale = 1) {
      const container = this.bubbleSystem._makeBubbleVisual(cell, x, y, depth);
      container.setScale(scale);
      return container;
    }

    _advanceShooterQueue() {
      if (!this.previewQueue?.length) {
        this.currentCell = this.stageGenerator.rollShooterBubble();
        this.previewQueue = [
          this.stageGenerator.rollShooterBubble(),
          this.stageGenerator.rollShooterBubble(),
          this.stageGenerator.rollShooterBubble(),
        ];
        return;
      }
      this.currentCell = this.previewQueue.shift();
      this.previewQueue.push(this.stageGenerator.rollShooterBubble());
    }

    _refreshHud() {
      const summary = this.rewardManager.getSummary();
      const left = this.bubbleSystem.getModel().countBubbles();
      this.puzzleHud.update({
        score: summary.bubblesCleared,
        combo: this.comboManager.combo,
        stageLabel: `${this.stageDef.label}`,
        shotsLeft: this.shotsLeft,
        shotLimit: this.stageDef.shotLimit,
        bubblesLeft: left,
      });
    }

    _onPointerDown(p) {
      if (this.isShooting || this.gameOver) return;
      this._updateAim(p);
    }

    _onPointerMove(p) {
      if (this.isShooting || this.gameOver) return;
      if (!this.input.activePointer.isDown) return;
      this._updateAim(p);
    }

    _updateAim(p) {
      const aimY = Math.min(p.y, (this.layout.shooterZoneTop ?? this.shooterY) - 12);
      const dx = p.x - this.shooterX;
      const dy = aimY - this.shooterY - 8;
      let ang = Math.atan2(dy, dx);
      ang = Phaser.Math.Clamp(ang, MIN_AIM_ANGLE, MAX_AIM_ANGLE);
      this.aimAngle = ang;
      this.shooter?.setAimAngle(ang);
    }

    async _onPointerUp() {
      if (this.isShooting || this.gameOver) return;
      await this._fire();
    }

    async _fire() {
      if (this.isShooting || this.gameOver) return;
      this.isShooting = true;
      try {
        this.game.events.emit('rescue:shoot');
        const cell = this.currentCell;
        this.shooter.clearLoadedBubble();

        const muzzle = this.shooter.getMuzzleWorld();
        const proj = this.bubbleSystem._makeBubbleVisual(cell, muzzle.x, muzzle.y, 45);
        this.projectile = {
          container: proj,
          cell,
          vx: Math.cos(this.aimAngle) * SHOOT_SPEED,
          vy: Math.sin(this.aimAngle) * SHOOT_SPEED,
        };

        const result = await this._simulateProjectile();
        this.projectile = null;
        if (!result) {
          this.currentCell = cell;
          this.shooter.setLoadedBubble(cell);
          return;
        }

        const { row, col } = result;
        this.bubbleSystem.attachBubble(row, col, cell);
        this.shotsLeft -= 1;

        await this.bubbleSystem.resolveAfterAttach(row, col, this.comboManager, this.rewardManager);

        this._advanceShooterQueue();
        this.shooter.setLoadedBubble(this.currentCell);
        this.shooter.setNextPreview(this.previewQueue);

        this._refreshHud();
        this._checkEnd();
      } catch (err) {
        console.error('[MonsterRescue] fire failed', err);
        this.game.events.emit('monster-rescue-error', err);
      } finally {
        this.isShooting = false;
      }
    }

    _simulateProjectile() {
      return new Promise((resolve) => {
        const w = this.scale.width;
        const h = this.scale.height;
        const pad = this.layout.bubbleRadius + 8;
        const start = this.shooter.getMuzzleWorld();
        let x = start.x;
        let y = start.y;
        let vx = this.projectile.vx;
        let vy = this.projectile.vy;
        let steps = 0;
        const maxSteps = 900;

        const finish = (pos) => {
          this.projectile?.container?.destroy();
          resolve(pos);
        };

        const step = () => {
          if (!this.projectile?.container?.active) {
            resolve(null);
            return;
          }
          if (steps++ > maxSteps) {
            finish(null);
            return;
          }

          const dt = 1 / 60;
          x += vx * dt;
          y += vy * dt;

          if (x < pad) {
            x = pad;
            vx = Math.abs(vx);
          } else if (x > w - pad) {
            x = w - pad;
            vx = -Math.abs(vx);
          }

          if (y < this.layout.originY - this.layout.bubbleRadius) {
            const col = Math.floor((x - this.layout.originX) / this.layout.cellW);
            finish({ row: 0, col: Phaser.Math.Clamp(col, 0, 10) });
            return;
          }

          const floorY = this.layout.shooterZoneTop ?? h - pad;
          if (y > floorY) {
            finish(null);
            return;
          }

          const hit = this._findGridHit(x, y);
          if (hit) {
            const slot = this.bubbleSystem.getModel().findAttachSlot(
              hit.row,
              hit.col,
              x,
              y,
              (r, c) => this.bubbleSystem.toWorld(r, c)
            );
            finish(slot ?? hit);
            return;
          }

          this.projectile.container.setPosition(x, y);
          this.time.delayedCall(16, step);
        };
        step();
      });
    }

    _findGridHit(x, y) {
      const model = this.bubbleSystem.getModel();
      let best = null;
      const hitR = this.layout.bubbleRadius * 1.85;
      let bestDist = hitR * hitR;
      for (let row = 0; row < 14; row++) {
        for (let col = 0; col < model.colsInRow(row); col++) {
          if (!model.get(row, col)) continue;
          const pos = this.bubbleSystem.toWorld(row, col);
          const d2 = (pos.x - x) ** 2 + (pos.y - y) ** 2;
          if (d2 < bestDist) {
            bestDist = d2;
            best = { row, col };
          }
        }
      }
      return best;
    }

    _checkEnd() {
      const summary = this.rewardManager.getSummary();
      const cleared = this.bubbleSystem.getModel().isCleared();
      const won = cleared;
      const lost = this.shotsLeft <= 0 && !won;
      const danger = this.bubbleSystem.getModel().lowestOccupiedRow() >= 10;
      if (won || lost || danger) {
        this.gameOver = true;
        this.game.events.emit('monster-rescue-finish', {
          won,
          stageId: this.stageId,
          summary: {
            ...summary,
            comboPeak: this.comboManager.peak,
            shotsLeft: this.shotsLeft,
          },
        });
      }
    }

    /** Re-fit grid when the host canvas is resized (web). */
    relayout(w, h) {
      if (!this.layout || !this.stageDef) return;
      const { displayFillRows, ...layout } = computeRescueLayout(w, h, this.stageDef.fillRows);
      this.layout = layout;
      this.shooterX = w / 2;
      this.shooterY = layout.shooterY;
      this.dangerY = layout.clusterBottom + layout.cellH * 2;
      this.bubbleSystem.layout = layout;
      this.bubbleSystem.bubbleRadius = layout.bubbleRadius;
      this.bubbleSystem.rebuildSprites();
      if (this.shooter?.root) {
        this.shooter.baseX = this.shooterX;
        this.shooter.baseY = this.shooterY;
        this.shooter.bubbleRadius = layout.bubbleRadius;
        this.shooter.root.setPosition(this.shooterX, this.shooterY);
        this.shooter.setAimAngle(this.aimAngle);
        if (this.currentCell) this.shooter.setLoadedBubble(this.currentCell);
        if (this.previewQueue?.length) this.shooter.setNextPreview(this.previewQueue);
      }
      this.puzzleHud?.relayout?.(w);
    }

    shutdown() {
      this.shooter?.destroy();
      this.puzzleHud?.destroy();
    }
  };
}
