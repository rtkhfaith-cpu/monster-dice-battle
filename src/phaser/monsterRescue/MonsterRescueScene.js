import { BUBBLE_RADIUS, GRID_ROWS } from '../../../utils/monsterRescue/constants';
import { getRescueStage } from '../../../utils/monsterRescue/stages';
import StageGenerator from './StageGenerator';
import BubbleSystem from './BubbleSystem';
import ComboManager from './ComboManager';
import RewardManager from './RewardManager';
import PuzzleHUD from './PuzzleHUD';
import { getRescueBootShooterTemplateId, getRescueBootStageId } from './bootConfig';
import { preloadRescueAssets, rescueBackgroundForStage, RESCUE_SCENE_ASSETS } from './rescueAssets';
import RescueShooter from './RescueShooter';

const SHOOT_SPEED = 680;
const MIN_AIM_ANGLE = -2.75;
const MAX_AIM_ANGLE = -0.35;
const HUD_TOP = 56;

/** Keep the starting cluster in the upper half of the playfield. */
function computeRescueLayout(w, h, fillRows) {
  const cellW = BUBBLE_RADIUS * 2 + 2;
  const cellH = BUBBLE_RADIUS * 1.82;
  const upperHalfBottom = h * 0.5;
  const maxRows = Math.max(
    3,
    Math.min(
      GRID_ROWS,
      Math.floor((upperHalfBottom - HUD_TOP - BUBBLE_RADIUS) / cellH) + 1
    )
  );
  const displayFillRows = Math.min(fillRows, maxRows);
  return {
    originX: w * 0.5 - ((11 - 1) * cellW) / 2,
    originY: HUD_TOP,
    cellW,
    cellH,
    displayFillRows,
  };
}

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

      this.comboManager = new ComboManager(this);
      this.rewardManager = new RewardManager(this);
      this.stageGenerator = new StageGenerator(this.stageDef, displayFillRows);
      this.bubbleSystem = new BubbleSystem(this, this.layout);
      this.bubbleSystem.loadGrid(this.stageGenerator.buildInitialGrid());

      this.shooterX = w / 2;
      this.shooterY = h - 78;
      this.aimAngle = -Math.PI / 2;
      this.currentCell = this.stageGenerator.rollShooterBubble();
      this.nextCell = this.stageGenerator.rollShooterBubble();

      this.shooter = new RescueShooter(this, this.shooterX, this.shooterY, getRescueBootShooterTemplateId());
      this.shooter.setAimAngle(this.aimAngle);
      this.shooter.setLoadedBubble(this.currentCell);
      this.nextBubbleGfx = this._spawnFloatingBubble(this.nextCell, w - 52, h - 52, 20, 0.75);

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
        this.bubbleSystem?.rebuildSprites?.();
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
      this.dangerY = this.layout.originY + 11 * this.layout.cellH;
    }

    _spawnFloatingBubble(cell, x, y, depth, scale = 1) {
      const container = this.bubbleSystem._makeBubbleVisual(cell, x, y, depth);
      container.setScale(scale);
      return container;
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
      const dx = p.x - this.shooterX;
      const dy = p.y - this.shooterY - 8;
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
      this.isShooting = true;
      this.game.events.emit('rescue:shoot');
      const cell = this.currentCell;
      this.shooter.clearLoadedBubble();

      const muzzle = this.shooter.getMuzzleWorld();
      const proj = this.bubbleSystem._makeBubbleVisual(cell, muzzle.x, muzzle.y, 45);
      this.projectile = { container: proj, cell, vx: Math.cos(this.aimAngle) * SHOOT_SPEED, vy: Math.sin(this.aimAngle) * SHOOT_SPEED };

      const result = await this._simulateProjectile();
      this.projectile = null;
      if (!result) {
        this.isShooting = false;
        this.currentCell = cell;
        this.shooter.setLoadedBubble(cell);
        return;
      }

      const { row, col } = result;
      this.bubbleSystem.attachBubble(row, col, cell);
      this.shotsLeft -= 1;

      await this.bubbleSystem.resolveAfterAttach(row, col, this.comboManager, this.rewardManager);

      this.currentCell = this.nextCell;
      this.nextCell = this.stageGenerator.rollShooterBubble();
      this.shooter.setLoadedBubble(this.currentCell);
      this.nextBubbleGfx?.destroy();
      this.nextBubbleGfx = this._spawnFloatingBubble(
        this.nextCell,
        this.scale.width - 52,
        this.scale.height - 52,
        20,
        0.75
      );

      this._refreshHud();
      this.isShooting = false;
      this._checkEnd();
    }

    _simulateProjectile() {
      return new Promise((resolve) => {
        const w = this.scale.width;
        const pad = BUBBLE_RADIUS + 8;
        const start = this.shooter.getMuzzleWorld();
        let x = start.x;
        let y = start.y;
        let { vx, vy, cell } = this.projectile;
        const step = () => {
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
          if (y < this.layout.originY - BUBBLE_RADIUS) {
            const col = Math.floor((x - this.layout.originX) / this.layout.cellW);
            resolve({ row: 0, col: Phaser.Math.Clamp(col, 0, 10) });
            this.projectile.container.destroy();
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
            this.projectile.container.destroy();
            resolve(slot ?? hit);
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
      let bestDist = (BUBBLE_RADIUS * 1.85) ** 2;
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

    shutdown() {
      this.shooter?.destroy();
      this.puzzleHud?.destroy();
    }
  };
}
