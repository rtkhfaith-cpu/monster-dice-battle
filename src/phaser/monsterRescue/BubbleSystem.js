import { BUBBLE_COLORS, GRID_COLS, GRID_ROWS } from '../../../utils/monsterRescue/constants';
import { playRescueCombo, playRescuePopBurst } from '../../../src/utils/audioManager';
import BubbleGrid from './BubbleGrid';
import { createShinyBubble } from './bubbleVisuals';

const MAX_RESOLVE_CHAIN = 48;

export default class BubbleSystem {
  /**
   * @param {Phaser.Scene} scene
   * @param {{ originX: number, originY: number, cellW: number, cellH: number }} layout
   */
  constructor(scene, layout) {
    this.scene = scene;
    this.layout = layout;
    this.bubbleRadius = layout.bubbleRadius ?? 22;
    this.gridModel = new BubbleGrid(BubbleGrid.empty());
    /** @type {Map<string, Phaser.GameObjects.Container>} */
    this.sprites = new Map();
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
    const container = createShinyBubble(this.scene, cell, depth, this.bubbleRadius);
    container.setPosition(x, y);
    return container;
  }

  popPositions(positions, onCell) {
    return new Promise((resolve) => {
      if (!positions.length) {
        resolve([]);
        return;
      }

      const removed = this.gridModel.removeMany(positions);
      const cells = [];

      for (const { row, col, cell } of removed) {
        cells.push(cell);
        onCell?.(cell, row, col);

        const spriteKey = this.key(row, col);
        const sprite = this.sprites.get(spriteKey);
        this.sprites.delete(spriteKey);

        if (!sprite) continue;

        const wx = sprite.x;
        const wy = sprite.y;
        try {
          this._spawnPopSpark(wx, wy, cell);
        } catch (err) {
          console.warn('[MonsterRescue] pop spark failed', err);
        }
        sprite.destroy();
      }

      if (removed.length) playRescuePopBurst(removed.length);

      resolve(cells);
    });
  }

  _spawnPopSpark(x, y, cell) {
    const color = BUBBLE_COLORS[cell.color % BUBBLE_COLORS.length] ?? 0xffffff;
    const r = this.bubbleRadius ?? 22;
    const burst = this.scene.add.circle(x, y, r * 0.35, color, 0.55).setDepth(20);
    this.scene.tweens.add({
      targets: burst,
      scaleX: 1.8,
      scaleY: 1.8,
      alpha: 0,
      duration: 220,
      ease: 'Quad.easeOut',
      onComplete: () => burst.destroy(),
    });
    const spread = Math.max(12, r * 0.85);
    for (let i = 0; i < 3; i++) {
      const p = this.scene.add.circle(x, y, Math.max(2, r * 0.12), color, 0.85).setDepth(20);
      const ang = (Math.PI * 2 * i) / 3;
      this.scene.tweens.add({
        targets: p,
        x: x + Math.cos(ang) * spread,
        y: y + Math.sin(ang) * spread,
        alpha: 0,
        duration: 260,
        ease: 'Quad.easeOut',
        onComplete: () => p.destroy(),
      });
    }
  }

  async resolveAfterAttach(attachRow, attachCol, comboManager, rewardManager) {
    let totalCombo = 0;
    let chain = 0;

    while (chain < MAX_RESOLVE_CHAIN) {
      chain += 1;

      let matches = this.gridModel.findMatchesFrom(attachRow, attachCol);
      if (matches.length < 3) {
        matches = this.gridModel.findFirstMatchCluster();
      }

      if (matches.length >= 3) {
        const combo = comboManager.onPop(matches.length);
        totalCombo = Math.max(totalCombo, combo);
        const cells = await this.popPositions(matches.map((m) => ({ row: m.row, col: m.col })));
        rewardManager.addPopScore(cells, comboManager.getMultiplier());
        if (comboManager.combo > 1) {
          playRescueCombo(comboManager.combo);
          this.scene.game.events.emit('rescue:combo', comboManager.combo);
        }
        continue;
      }

      const floating = this.gridModel.findFloatingClusters();
      if (!floating.length) break;

      comboManager.onPop(floating.length);
      const cells = await this.popPositions(floating);
      rewardManager.addPopScore(cells, comboManager.getMultiplier());
    }

    return totalCombo;
  }

  attachBubble(row, col, cell) {
    const existing = this.sprites.get(this.key(row, col));
    if (existing) {
      existing.destroy();
      this.sprites.delete(this.key(row, col));
    }
    this.gridModel.set(row, col, cell);
    return this.spawnBubbleSprite(row, col, cell);
  }

  getModel() {
    return this.gridModel;
  }

  /**
   * Push stack down and spawn a new top row.
   * @param {import('./bubbleTypes').BubbleCell[]} topRowCells
   */
  /**
   * @param {import('./bubbleTypes').BubbleCell[]} topRowCells
   * @param {import('./StageGenerator')|null} [stageGenerator]
   */
  pushTopRow(topRowCells, stageGenerator = null) {
    const lost = this.gridModel.pushRowsDown();
    const cols = this.gridModel.colsInRow(0);
    for (let col = 0; col < cols; col++) {
      const cell = topRowCells[col];
      if (cell) this.gridModel.set(0, col, cell);
    }
    if (stageGenerator?.polishGrid) stageGenerator.polishGrid(this.gridModel);
    this.rebuildSprites();
    return { lostCount: lost.length };
  }
}
