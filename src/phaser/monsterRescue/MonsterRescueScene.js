import { GRID_COLS, GRID_ROWS, RESCUE_GAME_TIME_SEC } from '../../../utils/monsterRescue/constants';
import { ROW_PUSH_MOVES_BASE } from '../../../utils/monsterRescue/difficulty';
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
import { drawGridVignette, drawProceduralArena } from './rescueBackdrop';
import { playRescueShoot } from '../../../src/utils/audioManager';

/** Physics solve step speed (px/s) — not the on-screen tween. */
const SHOOT_SPEED = 520;
/** Visible speed (px/s) for flight to wall / between bounces. */
const SHOOT_VISUAL_SPEED = 460;
/** Slower approach into the main bubble cluster (wall segments stay at SHOOT_VISUAL_SPEED). */
const SHOOT_VISUAL_SPEED_FINAL = 235;
const SHOOT_TWEEN_MIN_MS = 70;
const SHOOT_TWEEN_MAX_MS = 520;
const SHOOT_FINAL_MIN_MS = 130;
const SHOOT_FINAL_MAX_MS = 620;
/** Upward arc only — steep enough to bank off left/right frame walls. */
const MIN_AIM_ANGLE = -Math.PI + 0.12;
const MAX_AIM_ANGLE = -0.12;
/** Radians per horizontal pixel when fine-tuning from the bottom strip. */
const AIM_DRAG_SENSITIVITY = 0.009;
/** Smooth aim rotation toward pointer (higher = snappier). */
const AIM_SMOOTH_RATE = 16;
/** Width of left/right touch bands (full play height) for wall-bank aiming. */
const SIDE_AIM_BAND_PX = 52;
/** Finger movement or angle change required before release fires. */
const MIN_AIM_DRAG_PX = 5;
const MIN_AIM_ANGLE_DELTA = 0.028;

export function createMonsterRescueScene(Phaser) {
  return class MonsterRescueScene extends Phaser.Scene {
    constructor() {
      super('MonsterRescueScene');
      this.stageId = 1;
      this.shotsFired = 0;
      this.isShooting = false;
      this.gameOver = false;
      this._moveTimerEvent = null;
      this._gameClockEvent = null;
      this._pendingTimeUp = false;
      this.gameTimeLimitMs = RESCUE_GAME_TIME_SEC * 1000;
      this.timeRemainingMs = this.gameTimeLimitMs;
      this.isAiming = false;
      this.aimDragMoved = false;
      this.aimAngleTarget = -Math.PI / 2;
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
      this.shotsFired = 0;
      this.movesSinceRowPush = 0;
      this.gameTimeLimitMs = (this.stageDef.gameTimeSec ?? RESCUE_GAME_TIME_SEC) * 1000;
      this.timeRemainingMs = this.gameTimeLimitMs;

      const { displayFillRows, ...layout } = computeRescueLayout(w, h, this.stageDef.fillRows);
      this.layout = layout;

      this._drawBackdrop(w, h, layout);
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
      this.aimAngleTarget = this.aimAngle;
      const gridModel = this.bubbleSystem.getModel();
      this.currentCell = this.stageGenerator.rollShooterBubble(gridModel);
      this.previewQueue = [
        this.stageGenerator.rollShooterBubble(gridModel),
        this.stageGenerator.rollShooterBubble(gridModel),
        this.stageGenerator.rollShooterBubble(gridModel),
      ];

      this.shooter = new RescueShooter(
        this,
        this.shooterX,
        this.shooterY,
        getRescueBootShooterTemplateId(),
        layout.bubbleRadius
      );
      this.shooter.configureLayout({
        canvasWidth: w,
        frameLineLocalY: layout.frameLineLocalY,
        gunBaseRight: layout.gunBaseRight,
        monsterRightNudgePx: layout.monsterRightNudgePx,
      });
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
      this._startGameClock();
      this._startMoveTimer();
    }

    _startGameClock() {
      this._clearGameClock();
      this._gameClockEvent = this.time.addEvent({
        delay: 200,
        loop: true,
        callback: () => this._tickGameClock(),
      });
    }

    _clearGameClock() {
      if (this._gameClockEvent) {
        this._gameClockEvent.remove(false);
        this._gameClockEvent = null;
      }
    }

    _tickGameClock() {
      if (this.gameOver) return;
      this.timeRemainingMs = Math.max(0, this.timeRemainingMs - 200);
      this._refreshHud();
      if (this.timeRemainingMs <= 0) {
        if (this.isShooting) this._pendingTimeUp = true;
        else this._onTimeUp();
      }
    }

    _onTimeUp() {
      if (this.gameOver) return;
      if (this.bubbleSystem?.getModel()?.isCleared()) {
        this._checkEnd();
        return;
      }
      this.gameOver = true;
      this._clearMoveTimer();
      this._clearGameClock();
      const summary = this.rewardManager.getSummary();
      this.game.events.emit('monster-rescue-finish', {
        won: false,
        timeUp: true,
        stageId: this.stageId,
        summary: {
          ...summary,
          comboPeak: this.comboManager.peak,
          shotsFired: this.shotsFired,
          timeRemainingMs: 0,
        },
      });
    }

    /** Hidden per-move limit — auto-fires at current aim when time expires. */
    _startMoveTimer() {
      this._clearMoveTimer();
      if (this.gameOver || this.isShooting || this.timeRemainingMs <= 0) return;
      const moveSec = this.stageDef?.moveTimeSec ?? 15;
      this._moveTimerEvent = this.time.delayedCall(moveSec * 1000, () => {
        this._moveTimerEvent = null;
        if (this.gameOver || this.isShooting) return;
        void this._fire();
      });
    }

    _clearMoveTimer() {
      if (this._moveTimerEvent) {
        this._moveTimerEvent.remove(false);
        this._moveTimerEvent = null;
      }
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
          this._proceduralBg?.setVisible(false);
          this._bgImage = this.add.image(w / 2, h / 2, RESCUE_SCENE_ASSETS.bg.key).setDepth(0);
          const scale = Math.max(w / this._bgImage.width, h / this._bgImage.height) * 1.05;
          this._bgImage.setScale(scale).setAlpha(1);
        }
        this.shooter?._tryLoadMonsterTexture?.();
      });
      if (this.load.totalToLoad > 0) this.load.start();
    }

    _drawBackdrop(w, h, layout) {
      this._proceduralBg = drawProceduralArena(this, w, h);
      this._gridVignette = drawGridVignette(this, w, h);

      if (this.textures.exists(RESCUE_SCENE_ASSETS.bg.key)) {
        this._proceduralBg.setVisible(false);
        this._bgImage = this.add.image(w / 2, h / 2, RESCUE_SCENE_ASSETS.bg.key).setDepth(0);
        const scale = Math.max(w / this._bgImage.width, h / this._bgImage.height) * 1.05;
        this._bgImage.setScale(scale).setAlpha(1);
      }

      const hudVeil = this.add.rectangle(0, 0, w, layout?.playTop ?? 48, 0x0a0614, 0.35).setOrigin(0, 0).setDepth(2);
      hudVeil.setBlendMode(Phaser.BlendModes.MULTIPLY);
    }

    _drawPlayFrame(layout) {
      const g = this.add.graphics().setDepth(3);
      const { playLeft, playTop, playWidth, playHeight } = layout;
      g.fillStyle(0x081224, 0.28);
      g.fillRoundedRect(playLeft, playTop, playWidth, playHeight, 10);
      g.lineStyle(1, 0xffe6a3, 0.45);
      g.strokeRoundedRect(playLeft, playTop, playWidth, playHeight, 10);
      g.lineStyle(1, 0xc084fc, 0.22);
      g.strokeRoundedRect(playLeft + 3, playTop + 3, playWidth - 6, playHeight - 6, 8);
    }

    _spawnFloatingBubble(cell, x, y, depth, scale = 1) {
      const container = this.bubbleSystem._makeBubbleVisual(cell, x, y, depth);
      container.setScale(scale);
      return container;
    }

    _advanceShooterQueue() {
      const gridModel = this.bubbleSystem?.getModel?.();
      if (!this.previewQueue?.length) {
        this.currentCell = this.stageGenerator.rollShooterBubble(gridModel);
        this.previewQueue = [
          this.stageGenerator.rollShooterBubble(gridModel),
          this.stageGenerator.rollShooterBubble(gridModel),
          this.stageGenerator.rollShooterBubble(gridModel),
        ];
        return;
      }
      this.currentCell = this.previewQueue.shift();
      this.previewQueue.push(this.stageGenerator.rollShooterBubble(gridModel));
    }

    async _maybePushTopRow() {
      this.movesSinceRowPush += 1;
      const interval = this.stageDef.rowPushEvery ?? ROW_PUSH_MOVES_BASE;
      if (this.movesSinceRowPush < interval) return false;

      this.movesSinceRowPush = 0;
      const topCells = this.stageGenerator.buildPushRowCells(this.bubbleSystem.getModel());
      const { lostCount } = this.bubbleSystem.pushTopRow(topCells, this.stageGenerator);
      if (lostCount > 0) {
        this.rewardManager.addPopScore(
          Array.from({ length: lostCount }, () => ({ color: 0 })),
          1
        );
      }
      this.game.events.emit('rescue:rowPush');
      this.cameras?.main?.shake?.(80, 0.004);
      return true;
    }

    _refreshHud() {
      const summary = this.rewardManager.getSummary();
      const interval = this.stageDef.rowPushEvery ?? ROW_PUSH_MOVES_BASE;
      const untilPush = Math.max(0, interval - this.movesSinceRowPush);
      this.puzzleHud.update({
        score: summary.bubblesCleared,
        combo: this.comboManager.combo,
        stageLabel: `${this.stageDef.label}`,
        timeRemainingMs: this.timeRemainingMs,
        gameTimeLimitMs: this.gameTimeLimitMs,
        movesUntilPush: untilPush,
        rowPushEvery: interval,
      });
    }

    _playFrameBounds() {
      const playLeft = this.layout?.playLeft ?? 10;
      const playWidth = this.layout?.playWidth ?? this.scale.width - 20;
      return {
        playLeft,
        playRight: playLeft + playWidth,
        playTop: this.layout?.playTop ?? 48,
      };
    }

    /** Left/right strips along the frame — drag here to aim bank shots. */
    _isSideAimBand(p) {
      const { playLeft, playRight, playTop } = this._playFrameBounds();
      const aimTop = this.layout?.aimZoneTop ?? (this.layout?.shooterZoneTop ?? this.shooterY - 58) - 40;
      if (p.y < playTop || p.y >= aimTop) return false;
      const band = Math.max(SIDE_AIM_BAND_PX, (this.layout?.bubbleRadius ?? 22) * 2.1);
      return p.x <= playLeft + band || p.x >= playRight - band;
    }

    /** Bottom strip + side wall bands (not the center grid). */
    _isInAimZone(p) {
      if (this._isSideAimBand(p)) return true;
      const top = this.layout?.aimZoneTop ?? (this.layout?.shooterZoneTop ?? this.shooterY - 58) - 40;
      if (p.y < top) return false;
      const left = this.layout?.aimZoneLeft ?? (this.layout?.playLeft ?? 10) - 44;
      const right = this.layout?.aimZoneRight ?? left + (this.layout?.playWidth ?? this.scale.width - 20) + 88;
      return p.x >= left && p.x <= right;
    }

    _updateAimFromPointer(p, { allowDragDelta = false } = {}) {
      const muzzle = this.shooter?.getMuzzleWorld?.() ?? { x: this.shooterX, y: this.shooterY - 28 };
      let ang = Math.atan2(p.y - muzzle.y, p.x - muzzle.x);
      if (allowDragDelta && this.aimDragStartAngle != null) {
        const dx = p.x - this.aimDragStartX;
        ang = this.aimDragStartAngle + dx * AIM_DRAG_SENSITIVITY;
      }
      ang = Phaser.Math.Clamp(ang, MIN_AIM_ANGLE, MAX_AIM_ANGLE);
      if (
        allowDragDelta &&
        (Math.hypot(p.x - this.aimDragStartX, p.y - (this.aimDragStartY ?? p.y)) >= MIN_AIM_DRAG_PX ||
          Math.abs(ang - this.aimDragStartAngle) >= MIN_AIM_ANGLE_DELTA)
      ) {
        this.aimDragMoved = true;
      }
      if (Math.abs(ang - this.aimAngle) >= MIN_AIM_ANGLE_DELTA) {
        this.aimDragMoved = true;
      }
      this.aimAngleTarget = ang;
    }

    update(_time, delta) {
      if (!this.shooter || this.isShooting || this.gameOver) return;
      if (!this.isAiming) return;
      const t = 1 - Math.exp(-AIM_SMOOTH_RATE * (delta / 1000));
      const next = Phaser.Math.Linear(this.aimAngle, this.aimAngleTarget, t);
      if (Math.abs(next - this.aimAngle) < 0.0004) return;
      this.aimAngle = next;
      this.shooter.setAimAngle(next);
    }

    _onPointerDown(p) {
      if (this.isShooting || this.gameOver) return;
      if (!this._isInAimZone(p)) return;
      this.isAiming = true;
      this.aimDragMoved = false;
      this.aimDragStartX = p.x;
      this.aimDragStartY = p.y;
      this.aimDragStartAngle = this.aimAngle;
      this.aimFromSideWall = this._isSideAimBand(p);
      if (this.aimFromSideWall) {
        this._updateAimFromPointer(p);
        this.aimDragMoved = true;
      }
    }

    _onPointerMove(p) {
      if (!this.isAiming || this.isShooting || this.gameOver) return;
      if (!this.input.activePointer.isDown) return;
      if (this.aimFromSideWall) {
        this._updateAimFromPointer(p);
      } else {
        this._updateAimFromPointer(p, { allowDragDelta: true });
      }
    }

    async _onPointerUp() {
      if (!this.isAiming) return;
      this.isAiming = false;
      if (this.isShooting || this.gameOver || this.timeRemainingMs <= 0) return;
      if (!this.aimDragMoved) return;
      await this._fire();
    }

    async _fire() {
      if (this.isShooting || this.gameOver || this.timeRemainingMs <= 0) return;
      this._clearMoveTimer();
      this.isShooting = true;
      try {
        playRescueShoot();
        this.shooter?.setAimLineVisible(false);
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
        this.shotsFired += 1;

        this._advanceShooterQueue();
        this.shooter.setLoadedBubble(this.currentCell);
        this.shooter.setNextPreview(this.previewQueue);
        this.isShooting = false;
        this.shooter?.setAimLineVisible(true);
        if (!this.gameOver) this._startMoveTimer();

        await this.bubbleSystem.resolveAfterAttach(row, col, this.comboManager, this.rewardManager);
        await this._maybePushTopRow();

        this._refreshHud();
        this._checkEnd();
      } catch (err) {
        console.error('[MonsterRescue] fire failed', err);
        this.game.events.emit('monster-rescue-error', err);
      } finally {
        if (this.isShooting) {
          this.isShooting = false;
          this.shooter?.setAimLineVisible(true);
        }
        if (this._pendingTimeUp) {
          this._pendingTimeUp = false;
          this._onTimeUp();
        } else if (!this.gameOver && !this._moveTimerEvent) {
          this._startMoveTimer();
        }
      }
    }

    _reflectSideWalls(x, y, vx, vy, r) {
      const left = this.layout.wallLeft ?? r + 8;
      const right = this.layout.wallRight ?? this.scale.width - r - 8;
      let nx = x;
      let ny = y;
      let nvx = vx;
      let nvy = vy;

      let wall = null;
      if (nx - r < left) {
        nx = left + r;
        nvx = Math.abs(vx) > 1 ? Math.abs(vx) : Math.abs(vy) * 0.35 + 120;
        wall = 'left';
      } else if (nx + r > right) {
        nx = right - r;
        nvx = Math.abs(vx) > 1 ? -Math.abs(vx) : -(Math.abs(vy) * 0.35 + 120);
        wall = 'right';
      }

      return { x: nx, y: ny, vx: nvx, vy: nvy, wall };
    }

    _projectileSegmentDuration(distPx, isFinal) {
      const speed = isFinal ? SHOOT_VISUAL_SPEED_FINAL : SHOOT_VISUAL_SPEED;
      const minMs = isFinal ? SHOOT_FINAL_MIN_MS : SHOOT_TWEEN_MIN_MS;
      const maxMs = isFinal ? SHOOT_FINAL_MAX_MS : SHOOT_TWEEN_MAX_MS;
      return Phaser.Math.Clamp((distPx / speed) * 1000, minMs, maxMs);
    }

    _pushPathPoint(path, x, y, minDist) {
      const last = path[path.length - 1];
      if (!last) {
        path.push({ x, y });
        return;
      }
      if (Phaser.Math.Distance.Between(last.x, last.y, x, y) >= minDist) {
        path.push({ x, y });
      }
    }

    /** Instant physics solve — records wall bounces for segmented flight tweens. */
    _solveProjectilePath() {
      const h = this.scale.height;
      const r = this.layout.bubbleRadius;
      const start = this.shooter.getMuzzleWorld();
      const path = [{ x: start.x, y: start.y }];
      const minPointDist = Math.max(6, r * 0.35);
      let x = start.x;
      let y = start.y;
      let vx = this.projectile.vx;
      let vy = this.projectile.vy;
      let steps = 0;
      const maxSteps = 900;
      const dt = 1 / 60;
      const ceilingY = this.layout.originY - r;
      /** Only reject shots that fall back into the cannon — not shallow horizontal wall approaches. */
      const floorY = (this.layout.shooterY ?? h - 48) + r * 0.35;
      let lastBounceWall = null;

      while (steps++ < maxSteps) {
        const speed = Math.hypot(vx, vy);
        const travel = speed * dt;
        const subSteps = Math.max(1, Math.min(8, Math.ceil(travel / (r * 0.45))));

        for (let i = 0; i < subSteps; i++) {
          const subDt = dt / subSteps;
          x += vx * subDt;
          y += vy * subDt;

          const bounced = this._reflectSideWalls(x, y, vx, vy, r);
          x = bounced.x;
          y = bounced.y;
          vx = bounced.vx;
          vy = bounced.vy;

          if (bounced.wall && bounced.wall !== lastBounceWall) {
            this._pushPathPoint(path, x, y, minPointDist);
            lastBounceWall = bounced.wall;
          } else if (!bounced.wall) {
            lastBounceWall = null;
          }

          if (y < ceilingY) {
            const col = Math.floor((x - this.layout.originX) / this.layout.cellW);
            const attachCol = Phaser.Math.Clamp(col, 0, GRID_COLS - 1);
            const pos = this.bubbleSystem.toWorld(0, attachCol);
            this._pushPathPoint(path, pos.x, pos.y, minPointDist);
            return { row: 0, col: attachCol, path };
          }

          if (y > floorY && vy > 0) return null;

          const hit = this._findGridHit(x, y);
          if (hit) {
            const slot = this.bubbleSystem.getModel().findAttachSlot(
              hit.row,
              hit.col,
              x,
              y,
              (row, col) => this.bubbleSystem.toWorld(row, col)
            );
            if (!slot) return null;
            const attach = slot;
            const pos = this.bubbleSystem.toWorld(attach.row, attach.col);
            this._pushPathPoint(path, pos.x, pos.y, minPointDist);
            return { row: attach.row, col: attach.col, path };
          }
        }
      }
      return null;
    }

    _animateProjectilePath(container, solved) {
      const { path, row, col } = solved;
      if (!path?.length || path.length < 2) {
        return Promise.resolve(null);
      }

      return new Promise((resolve) => {
        let seg = 0;
        const runSegment = () => {
          if (!container?.active) {
            resolve(null);
            return;
          }
          if (seg >= path.length - 1) {
            container.destroy();
            resolve({ row, col });
            return;
          }

          const from = path[seg];
          const to = path[seg + 1];
          const isFinal = seg === path.length - 2;
          const dist = Phaser.Math.Distance.Between(from.x, from.y, to.x, to.y);
          const duration = this._projectileSegmentDuration(dist, isFinal);

          container.setPosition(from.x, from.y);
          seg += 1;

          this.tweens.add({
            targets: container,
            x: to.x,
            y: to.y,
            duration,
            ease: isFinal ? 'Sine.easeOut' : 'Linear',
            onComplete: runSegment,
          });
        };
        runSegment();
      });
    }

    _simulateProjectile() {
      const container = this.projectile?.container;
      if (!container?.active) return Promise.resolve(null);

      const solved = this._solveProjectilePath();
      if (!solved?.path?.length) {
        container.destroy();
        return Promise.resolve(null);
      }

      return this._animateProjectilePath(container, solved);
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
      const timeUp = this.timeRemainingMs <= 0 && !won;
      const dangerRow = this.stageDef.dangerRow ?? 10;
      const danger = this.bubbleSystem.getModel().lowestOccupiedRow() >= dangerRow;
      if (won || timeUp || danger) {
        this.gameOver = true;
        this._clearMoveTimer();
        this._clearGameClock();
        this.game.events.emit('monster-rescue-finish', {
          won,
          timeUp,
          stageId: this.stageId,
          summary: {
            ...summary,
            comboPeak: this.comboManager.peak,
            shotsFired: this.shotsFired,
            timeRemainingMs: this.timeRemainingMs,
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
        this.shooter.setBubbleRadius(layout.bubbleRadius);
        this.shooter.root.setPosition(this.shooterX, this.shooterY);
        this.shooter.configureLayout({
          canvasWidth: w,
          frameLineLocalY: layout.frameLineLocalY,
          gunBaseRight: layout.gunBaseRight,
          monsterRightNudgePx: layout.monsterRightNudgePx,
        });
        this.shooter.setAimAngle(this.aimAngle);
        if (this.currentCell) this.shooter.setLoadedBubble(this.currentCell);
        if (this.previewQueue?.length) this.shooter.setNextPreview(this.previewQueue);
      }
      this.puzzleHud?.relayout?.(w);
    }

    shutdown() {
      this._clearMoveTimer();
      this._clearGameClock();
      this.shooter?.destroy();
      this.puzzleHud?.destroy();
    }
  };
}
