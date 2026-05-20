import { BUBBLE_COLORS, BUBBLE_RADIUS, GRID_COLS, GRID_ROWS } from '../../../utils/monsterRescue/constants';
import { BUBBLE_TYPES } from '../../../utils/monsterRescue/constants';
import BubbleGrid from './BubbleGrid';
import { getBubbleTypeMeta } from './bubbleTypes';
import { RESCUE_SCENE_ASSETS } from './rescueAssets';

export default class BubbleSystem {
  /**
   * @param {Phaser.Scene} scene
   * @param {{ originX: number, originY: number, cellW: number, cellH: number }} layout
   */
  constructor(scene, layout) {
    this.scene = scene;
    this.layout = layout;
    this.gridModel = new BubbleGrid(BubbleGrid.empty());
    /** @type {Map<string, Phaser.GameObjects.Container>} */
    this.sprites = new Map();
    this.pendingResolve = null;
  }

  loadGrid(grid) {
    this.gridModel = new BubbleGrid(grid);
    this.rebuildSprites();
  }

  key(row, col) {
    return `${row},${col}`;
  }

  toWorld(row, col) {
    const { originX, originY, cellW, cellH } = this.layout;
    const odd = row % 2 === 1;
    const x = originX + col * cellW + (odd ? cellW * 0.5 : 0);
    const y = originY + row * cellH;
    return { x, y };
  }

  rebuildSprites() {
    this.sprites.forEach((c) => c.destroy());
    this.sprites.clear();
    for (let row = 0; row < GRID_ROWS; row++) {
      for (let col = 0; col < this.gridModel.colsInRow(row); col++) {
        const cell = this.gridModel.get(row, col);
        if (cell) this.spawnBubbleSprite(row, col, cell);
      }
    }
  }

  spawnBubbleSprite(row, col, cell, depth = 5) {
    const { x, y } = this.toWorld(row, col);
    const container = this._makeBubbleVisual(cell, x, y, depth);
    this.sprites.set(this.key(row, col), container);
    return container;
  }

  _makeBubbleVisual(cell, x, y, depth) {
    const color = BUBBLE_COLORS[cell.color % BUBBLE_COLORS.length] ?? 0xffffff;
    const meta = getBubbleTypeMeta(cell.type);
    const container = this.scene.add.container(x, y).setDepth(depth);
    const glow = this.scene.add.circle(0, 0, BUBBLE_RADIUS + 4, meta.glow, 0.22);
    const shell = this.scene.add.circle(0, 0, BUBBLE_RADIUS, color, 0.55);
    const rim = this.scene.add.circle(0, 0, BUBBLE_RADIUS, 0xffffff, 0).setStrokeStyle(2, 0xffffff, 0.35);
    const shine = this.scene.add.circle(-7, -8, 6, 0xffffff, 0.35);
    container.add([glow, shell, rim, shine]);

    const icon = this._specialIcon(cell);
    if (icon) {
      container.add(icon);
    } else if (cell.type === BUBBLE_TYPES.MONSTER && cell.monsterTemplateId) {
      const texKey = `rescue_monster_${cell.monsterTemplateId}`;
      if (this.scene.textures.exists(texKey)) {
        const img = this.scene.add.image(0, 2, texKey).setDisplaySize(28, 28);
        container.add(img);
      } else if (meta.emoji) {
        const t = this.scene.add.text(0, 0, meta.emoji, { fontSize: '16px' }).setOrigin(0.5);
        container.add(t);
      }
    } else if (meta.emoji) {
      const t = this.scene.add.text(0, 0, meta.emoji, { fontSize: '14px' }).setOrigin(0.5);
      container.add(t);
    }
    return container;
  }

  _specialIcon(cell) {
    const map = {
      [BUBBLE_TYPES.CHEST]: RESCUE_SCENE_ASSETS.chest.key,
      [BUBBLE_TYPES.BOMB]: RESCUE_SCENE_ASSETS.bomb.key,
      [BUBBLE_TYPES.EXP]: RESCUE_SCENE_ASSETS.exp.key,
      [BUBBLE_TYPES.GEAR]: RESCUE_SCENE_ASSETS.gear.key,
    };
    const texKey = map[cell.type];
    if (!texKey || !this.scene.textures.exists(texKey)) return null;
    const size = cell.type === BUBBLE_TYPES.CHEST ? 26 : 22;
    return this.scene.add.image(0, 0, texKey).setDisplaySize(size, size);
  }

  popPositions(positions, onCell) {
    return new Promise((resolve) => {
      if (!positions.length) {
        resolve([]);
        return;
      }
      const removed = this.gridModel.removeMany(positions);
      let done = 0;
      const cells = [];
      for (const { row, col, cell } of removed) {
        cells.push(cell);
        onCell?.(cell, row, col);
        const sprite = this.sprites.get(this.key(row, col));
        this.sprites.delete(this.key(row, col));
        if (!sprite) {
          done++;
          if (done >= removed.length) resolve(cells);
          continue;
        }
        this.scene.tweens.add({
          targets: sprite,
          scaleX: 1.35,
          scaleY: 1.35,
          alpha: 0,
          duration: 160,
          ease: 'Back.easeIn',
          onComplete: () => {
            this._spawnPopSpark(sprite.x, sprite.y, cell);
            sprite.destroy();
            done++;
            if (done >= removed.length) resolve(cells);
          },
        });
      }
    });
  }

  _spawnPopSpark(x, y, cell) {
    const color = BUBBLE_COLORS[cell.color % BUBBLE_COLORS.length] ?? 0xffffff;
    if (this.scene.textures.exists(RESCUE_SCENE_ASSETS.popFx.key)) {
      const fx = this.scene.add.image(x, y, RESCUE_SCENE_ASSETS.popFx.key).setDepth(20).setAlpha(0.85);
      fx.setDisplaySize(28, 28);
      this.scene.tweens.add({
        targets: fx,
        scaleX: 1.4,
        scaleY: 1.4,
        alpha: 0,
        duration: 220,
        onComplete: () => fx.destroy(),
      });
    }
    for (let i = 0; i < 4; i++) {
      const p = this.scene.add.circle(x, y, 3, color, 0.9).setDepth(20);
      const ang = (Math.PI * 2 * i) / 4;
      this.scene.tweens.add({
        targets: p,
        x: x + Math.cos(ang) * 16,
        y: y + Math.sin(ang) * 16,
        alpha: 0,
        duration: 260,
        onComplete: () => p.destroy(),
      });
    }
  }

  async resolveAfterAttach(row, col, comboManager, rewardManager) {
    let totalCombo = 0;
    let loop = true;
    while (loop) {
      loop = false;
      const matches = this.gridModel.findMatchesFrom(row, col);
      if (matches.length >= 3) {
        const combo = comboManager.onPop(matches.length);
        totalCombo = Math.max(totalCombo, combo);
        const cells = await this.popPositions(
          matches.map((m) => ({ row: m.row, col: m.col })),
          (cell) => {
            this.scene.events.emit('rescue:pop');
            if (cell.type === BUBBLE_TYPES.MONSTER) {
              this.scene.game.events.emit('rescue:rescued');
            }
          }
        );
        rewardManager.addPopScore(
          cells,
          comboManager.getMultiplier()
        );
        if (comboManager.combo > 1) {
          this.scene.game.events.emit('rescue:combo', comboManager.combo);
        }
        loop = true;
        continue;
      }

      const floating = this.gridModel.findFloatingClusters();
      if (floating.length) {
        comboManager.onPop(floating.length);
        const cells = await this.popPositions(floating);
        rewardManager.addPopScore(cells, comboManager.getMultiplier());
        loop = true;
      }
    }
    return totalCombo;
  }

  async triggerBomb(row, col, comboManager, rewardManager) {
    const positions = this.gridModel.expandBomb(row, col);
    comboManager.onPop(positions.length);
    const cells = await this.popPositions(positions, (cell) => {
      this.scene.events.emit('rescue:pop');
      if (cell.type === BUBBLE_TYPES.MONSTER) {
        this.scene.game.events.emit('rescue:rescued');
      }
    });
    rewardManager.addPopScore(cells, comboManager.getMultiplier());
    const floating = this.gridModel.findFloatingClusters();
    if (floating.length) {
      const extra = await this.popPositions(floating);
      rewardManager.addPopScore(extra, comboManager.getMultiplier());
    }
  }

  attachBubble(row, col, cell) {
    this.gridModel.set(row, col, cell);
    return this.spawnBubbleSprite(row, col, cell);
  }

  getModel() {
    return this.gridModel;
  }
}
