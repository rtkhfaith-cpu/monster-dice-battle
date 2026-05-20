import { GRID_COLS, GRID_ROWS, BUBBLE_TYPES } from '../../../utils/monsterRescue/constants';
import { getRescueStage, pickSpecialType } from '../../../utils/monsterRescue/stages';
import { createBubbleCell } from './bubbleTypes';
import { NORMAL_MONSTER_IMAGE_ASSETS, LADDER_MONSTER_IMAGE_ASSETS } from '../../../utils/monsterImageAssets';

const MONSTER_TEMPLATE_POOL = [
  ...Object.keys(NORMAL_MONSTER_IMAGE_ASSETS),
  ...Object.keys(LADDER_MONSTER_IMAGE_ASSETS).slice(0, 12),
];

export default class StageGenerator {
  /**
   * @param {import('../../../utils/monsterRescue/stages').RescueStageDef} stageDef
   */
  constructor(stageDef) {
    this.stageDef = stageDef ?? getRescueStage(1);
  }

  /** @returns {(import('./bubbleTypes').BubbleCell|null)[][]} */
  buildInitialGrid() {
    const { fillRows, colorCount } = this.stageDef;
    const grid = Array.from({ length: GRID_ROWS }, () =>
      Array.from({ length: GRID_COLS }, () => null)
    );

    for (let row = 0; row < Math.min(fillRows, GRID_ROWS); row++) {
      const cols = this._colsInRow(row);
      for (let col = 0; col < cols; col++) {
        const color = Math.floor(Math.random() * colorCount);
        const special = pickSpecialType(this.stageDef);
        let cell = createBubbleCell(color, special);
        if (special === BUBBLE_TYPES.MONSTER) {
          cell.monsterTemplateId = MONSTER_TEMPLATE_POOL[
            Math.floor(Math.random() * MONSTER_TEMPLATE_POOL.length)
          ];
        }
        if (special !== BUBBLE_TYPES.NORMAL && special !== BUBBLE_TYPES.MONSTER) {
          cell = createBubbleCell(color, special);
        }
        grid[row][col] = cell;
      }
    }
    this._removeInitialMatches(grid);
    return grid;
  }

  _colsInRow(row) {
    const odd = row % 2 === 1;
    return odd ? GRID_COLS - 1 : GRID_COLS;
  }

  _removeInitialMatches(grid) {
    for (let pass = 0; pass < 6; pass++) {
      let changed = false;
      for (let row = 0; row < GRID_ROWS; row++) {
        for (let col = 0; col < GRID_COLS; col++) {
          const cell = grid[row]?.[col];
          if (!cell) continue;
          const neighbors = this._neighborColors(grid, row, col, cell.color);
          if (neighbors >= 2) {
            grid[row][col] = createBubbleCell(
              Math.floor(Math.random() * this.stageDef.colorCount),
              cell.type,
              cell.monsterTemplateId
            );
            changed = true;
          }
        }
      }
      if (!changed) break;
    }
  }

  _neighborColors(grid, row, col, color) {
    const dirs = this._neighborDirs(row);
    let n = 0;
    for (const [dr, dc] of dirs) {
      const c = grid[row + dr]?.[col + dc];
      if (c && c.color === color) n++;
    }
    return n;
  }

  _neighborDirs(row) {
    const odd = row % 2 === 1;
    if (odd) {
      return [[-1, 0], [-1, 1], [0, -1], [0, 1], [1, 0], [1, 1]];
    }
    return [[-1, -1], [-1, 0], [0, -1], [0, 1], [1, -1], [1, 0]];
  }

  rollShooterBubble() {
    const color = Math.floor(Math.random() * this.stageDef.colorCount);
    const special = pickSpecialType(this.stageDef);
    const cell = createBubbleCell(color, special);
    if (special === BUBBLE_TYPES.MONSTER) {
      cell.monsterTemplateId = MONSTER_TEMPLATE_POOL[
        Math.floor(Math.random() * MONSTER_TEMPLATE_POOL.length)
      ];
    }
    return cell;
  }
}
