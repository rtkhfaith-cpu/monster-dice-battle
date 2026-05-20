import { GRID_COLS, GRID_ROWS, BUBBLE_TYPES } from '../../../utils/monsterRescue/constants';
import {
  pickBiasedPushColor,
  pickBiasedShooterColor,
} from '../../../utils/monsterRescue/colorBias';
import { getRescueStage } from '../../../utils/monsterRescue/stages';
import { createBubbleCell } from './bubbleTypes';
import { shapeHasBubble, shapeLetterForLevel } from '../../../utils/monsterRescue/openingShapes';

export default class StageGenerator {
  /**
   * @param {import('../../../utils/monsterRescue/stages').RescueStageDef} stageDef
   */
  constructor(stageDef, fillRowsOverride) {
    this.stageDef = stageDef ?? getRescueStage(1);
    this.fillRowsOverride =
      typeof fillRowsOverride === 'number' && fillRowsOverride > 0
        ? Math.floor(fillRowsOverride)
        : null;
  }

  _openingShape() {
    return this.stageDef.openingShape ?? shapeLetterForLevel(this.stageDef.levelId ?? 1);
  }

  /** @returns {(import('./bubbleTypes').BubbleCell|null)[][]} */
  buildInitialGrid() {
    const { colorCount } = this.stageDef;
    const fillRows = this.fillRowsOverride ?? this.stageDef.fillRows;
    const shape = this._openingShape();
    const grid = Array.from({ length: GRID_ROWS }, () =>
      Array.from({ length: GRID_COLS }, () => null)
    );

    for (let row = 0; row < Math.min(fillRows, GRID_ROWS); row++) {
      const cols = this._colsInRow(row);
      for (let col = 0; col < cols; col++) {
        if (!shapeHasBubble(shape, row, col, cols)) continue;
        const color = Math.floor(Math.random() * colorCount);
        grid[row][col] = createBubbleCell(color, BUBBLE_TYPES.NORMAL);
      }
    }
    this._removeInitialMatches(grid);
    return grid;
  }

  _colsInRow(row) {
    const odd = row % 2 === 1;
    return odd ? GRID_COLS - 1 : GRID_COLS;
  }

  /**
   * Break accidental match-3 setups by rerolling colors.
   * @param {number} [maxRow] highest row index to modify (inclusive); lower rows are read-only for neighbor checks
   */
  _removeInitialMatches(grid, maxRow = GRID_ROWS - 1) {
    const top = Math.max(0, Math.min(maxRow, GRID_ROWS - 1));
    const { colorCount } = this.stageDef;
    for (let pass = 0; pass < 6; pass++) {
      let changed = false;
      for (let row = 0; row <= top; row++) {
        const cols = this._colsInRow(row);
        for (let col = 0; col < cols; col++) {
          const cell = grid[row]?.[col];
          if (!cell) continue;
          const neighbors = this._neighborColors(grid, row, col, cell.color);
          if (neighbors >= 2) {
            grid[row][col] = createBubbleCell(
              Math.floor(Math.random() * colorCount),
              BUBBLE_TYPES.NORMAL
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

  /**
   * @param {import('./BubbleGrid')|null} [gridModel]
   */
  rollShooterBubble(gridModel = null) {
    const { colorCount, levelId } = this.stageDef;
    const onScreen = gridModel?.collectOccupiedColors?.() ?? [];
    const color = pickBiasedShooterColor(colorCount, onScreen, levelId);
    return createBubbleCell(color, BUBBLE_TYPES.NORMAL);
  }

  /** Only the new ceiling row — never recolor bubbles that were already on the board. */
  polishGrid(gridModel) {
    this._removeInitialMatches(gridModel.grid, 0);
  }

  /**
   * @param {import('./BubbleGrid')|null} [gridModel]
   */
  buildPushRowCells(gridModel = null) {
    const { colorCount, levelId } = this.stageDef;
    const onScreen = gridModel?.collectOccupiedColors?.() ?? [];
    const row = this._colsInRow(0);
    const scratch = Array.from({ length: GRID_ROWS }, () =>
      Array.from({ length: GRID_COLS }, () => null)
    );
    const cells = [];
    const used = [];
    for (let col = 0; col < row; col++) {
      const color = pickBiasedPushColor(colorCount, onScreen, levelId, used);
      const cell = createBubbleCell(color, BUBBLE_TYPES.NORMAL);
      cells.push(cell);
      used.push(color);
      scratch[0][col] = cell;
    }
    this._removeInitialMatches(scratch, 0);
    return cells;
  }
}
