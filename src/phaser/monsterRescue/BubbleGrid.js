import { GRID_COLS, GRID_ROWS, ROW_STAGGER } from '../../../utils/monsterRescue/constants';
import { BUBBLE_TYPES } from '../../../utils/monsterRescue/constants';

export default class BubbleGrid {
  /** @param {(import('./bubbleTypes').BubbleCell|null)[][]} grid */
  constructor(grid) {
    this.grid = grid;
  }

  static empty() {
    return Array.from({ length: GRID_ROWS }, () =>
      Array.from({ length: GRID_COLS }, () => null)
    );
  }

  inBounds(row, col) {
    if (row < 0 || row >= GRID_ROWS || col < 0) return false;
    const maxCol = this.colsInRow(row);
    return col < maxCol;
  }

  colsInRow(row) {
    if (!ROW_STAGGER) return GRID_COLS;
    return row % 2 === 1 ? GRID_COLS - 1 : GRID_COLS;
  }

  get(row, col) {
    if (!this.inBounds(row, col)) return null;
    return this.grid[row][col];
  }

  set(row, col, cell) {
    if (!this.inBounds(row, col)) return false;
    this.grid[row][col] = cell;
    return true;
  }

  neighborDirs(row) {
    const odd = row % 2 === 1;
    if (odd) {
      return [[-1, 0], [-1, 1], [0, -1], [0, 1], [1, 0], [1, 1]];
    }
    return [[-1, -1], [-1, 0], [0, -1], [0, 1], [1, -1], [1, 0]];
  }

  /** BFS match group (same color, matchable types) */
  findCluster(row, col) {
    const start = this.get(row, col);
    if (!start) return [];
    const key = (r, c) => `${r},${c}`;
    const visited = new Set();
    const out = [];
    const queue = [[row, col]];
    while (queue.length) {
      const [r, c] = queue.shift();
      const k = key(r, c);
      if (visited.has(k)) continue;
      visited.add(k);
      const cell = this.get(r, c);
      if (!cell || cell.color !== start.color) continue;
      out.push({ row: r, col: c, cell });
      for (const [dr, dc] of this.neighborDirs(r)) {
        const nr = r + dr;
        const nc = c + dc;
        if (!visited.has(key(nr, nc))) queue.push([nr, nc]);
      }
    }
    return out;
  }

  findMatchesFrom(row, col) {
    const cluster = this.findCluster(row, col);
    return cluster.length >= 3 ? cluster : [];
  }

  /** First match-3+ cluster on the board (for chain reactions after pops). */
  findFirstMatchCluster() {
    const visited = new Set();
    for (let row = 0; row < GRID_ROWS; row++) {
      for (let col = 0; col < this.colsInRow(row); col++) {
        const k = `${row},${col}`;
        if (visited.has(k) || !this.get(row, col)) continue;
        const cluster = this.findCluster(row, col);
        for (const p of cluster) visited.add(`${p.row},${p.col}`);
        if (cluster.length >= 3) return cluster;
      }
    }
    return [];
  }

  removeAt(row, col) {
    if (!this.get(row, col)) return null;
    const cell = this.grid[row][col];
    this.grid[row][col] = null;
    return cell;
  }

  removeMany(positions) {
    const cells = [];
    for (const { row, col } of positions) {
      const cell = this.removeAt(row, col);
      if (cell) cells.push({ row, col, cell });
    }
    return cells;
  }

  /**
   * Match-3+ cluster touching the attach shot or cells removed in the previous pop.
   * Avoids board-wide `findFirstMatchCluster` chains that pop unrelated groups.
   */
  findMatchClusterNear(positions) {
    if (!positions?.length) return [];
    const seeds = new Set();
    const addSeed = (r, c) => {
      if (this.inBounds(r, c) && this.get(r, c)) seeds.add(`${r},${c}`);
    };
    for (const { row, col } of positions) {
      addSeed(row, col);
      for (const [dr, dc] of this.neighborDirs(row)) {
        addSeed(row + dr, col + dc);
      }
    }
    const clusterVisited = new Set();
    for (const k of seeds) {
      if (clusterVisited.has(k)) continue;
      const [row, col] = k.split(',').map(Number);
      const cluster = this.findCluster(row, col);
      for (const p of cluster) clusterVisited.add(`${p.row},${p.col}`);
      if (cluster.length >= 3) return cluster;
    }
    return [];
  }

  /** Distinct bubble color indices currently on the board. */
  collectOccupiedColors() {
    const colors = new Set();
    for (let row = 0; row < GRID_ROWS; row++) {
      for (let col = 0; col < this.colsInRow(row); col++) {
        const cell = this.get(row, col);
        if (cell) colors.add(cell.color);
      }
    }
    return [...colors];
  }

  /** Cells connected to ceiling row 0 (classic bubble-shooter anchor). */
  findAnchored() {
    const anchored = new Set();
    const key = (r, c) => `${r},${c}`;
    const queue = [];
    for (let col = 0; col < this.colsInRow(0); col++) {
      if (this.get(0, col)) queue.push([0, col]);
    }
    while (queue.length) {
      const [r, c] = queue.shift();
      const k = key(r, c);
      if (anchored.has(k)) continue;
      if (!this.get(r, c)) continue;
      anchored.add(k);
      for (const [dr, dc] of this.neighborDirs(r)) {
        const nr = r + dr;
        const nc = c + dc;
        if (this.get(nr, nc) && !anchored.has(key(nr, nc))) queue.push([nr, nc]);
      }
    }
    return anchored;
  }

  findFloatingClusters() {
    const anchored = this.findAnchored();
    const key = (r, c) => `${r},${c}`;
    const floating = [];
    for (let row = 0; row < GRID_ROWS; row++) {
      for (let col = 0; col < this.colsInRow(row); col++) {
        if (!this.get(row, col) || anchored.has(key(row, col))) continue;
        floating.push({ row, col });
      }
    }
    return floating;
  }

  /** Closest empty cell on ceiling row 0 (never overwrites an occupied slot). */
  findCeilingAttachSlot(fromX, fromY, toWorld) {
    const candidates = [];
    for (let col = 0; col < this.colsInRow(0); col++) {
      if (this.get(0, col)) continue;
      const pos = toWorld(0, col);
      const dist = (pos.x - fromX) ** 2 + (pos.y - fromY) ** 2;
      candidates.push({ row: 0, col, dist });
    }
    if (!candidates.length) return null;
    candidates.sort((a, b) => a.dist - b.dist);
    return { row: candidates[0].row, col: candidates[0].col };
  }

  /** Neighbor slot for projectile attachment — only returns empty cells. */
  findAttachSlot(hitRow, hitCol, fromX, fromY, toWorld) {
    const candidates = [];
    const seen = new Set();
    const addCandidate = (nr, nc) => {
      const k = `${nr},${nc}`;
      if (seen.has(k) || !this.inBounds(nr, nc) || this.get(nr, nc)) return;
      seen.add(k);
      const pos = toWorld(nr, nc);
      const dist = (pos.x - fromX) ** 2 + (pos.y - fromY) ** 2;
      candidates.push({ row: nr, col: nc, dist });
    };

    for (const [dr, dc] of this.neighborDirs(hitRow)) {
      addCandidate(hitRow + dr, hitCol + dc);
    }

    if (!candidates.length) {
      for (const [dr, dc] of this.neighborDirs(hitRow)) {
        const nr = hitRow + dr;
        const nc = hitCol + dc;
        if (!this.inBounds(nr, nc) || !this.get(nr, nc)) continue;
        for (const [dr2, dc2] of this.neighborDirs(nr)) {
          addCandidate(nr + dr2, nc + dc2);
        }
      }
    }

    if (!candidates.length) return null;
    candidates.sort((a, b) => a.dist - b.dist);
    return { row: candidates[0].row, col: candidates[0].col };
  }

  expandBomb(row, col, radius = 1) {
    const positions = [{ row, col }];
    for (const [dr, dc] of this.neighborDirs(row)) {
      const nr = row + dr;
      const nc = col + dc;
      if (this.get(nr, nc)) positions.push({ row: nr, col: nc });
    }
    for (let r = row - radius; r <= row + radius; r++) {
      for (let c = col - radius; c <= col + radius; c++) {
        if (this.get(r, c)) positions.push({ row: r, col: c });
      }
    }
    const seen = new Set();
    return positions.filter((p) => {
      const k = `${p.row},${p.col}`;
      if (seen.has(k)) return false;
      seen.add(k);
      return this.get(p.row, p.col);
    });
  }

  countBubbles() {
    let n = 0;
    for (let row = 0; row < GRID_ROWS; row++) {
      for (let col = 0; col < this.colsInRow(row); col++) {
        if (this.get(row, col)) n++;
      }
    }
    return n;
  }

  isCleared() {
    return this.countBubbles() === 0;
  }

  lowestOccupiedRow() {
    for (let row = GRID_ROWS - 1; row >= 0; row--) {
      for (let col = 0; col < this.colsInRow(row); col++) {
        if (this.get(row, col)) return row;
      }
    }
    return -1;
  }

  /**
   * Shift all bubbles down one row; bottom row is discarded.
   * @returns {{ row: number, col: number, cell: import('./bubbleTypes').BubbleCell }[]}
   */
  pushRowsDown() {
    const bottom = GRID_ROWS - 1;
    const lost = [];
    for (let col = 0; col < this.colsInRow(bottom); col++) {
      const cell = this.get(bottom, col);
      if (cell) lost.push({ row: bottom, col, cell });
    }

    for (let row = bottom; row >= 1; row--) {
      const destCols = this.colsInRow(row);
      const srcCols = this.colsInRow(row - 1);
      for (let col = 0; col < GRID_COLS; col++) this.grid[row][col] = null;
      const copyCols = Math.min(destCols, srcCols);
      for (let col = 0; col < copyCols; col++) {
        this.grid[row][col] = this.grid[row - 1][col];
      }
      for (let col = copyCols; col < srcCols; col++) {
        const cell = this.grid[row - 1][col];
        if (cell) lost.push({ row: row - 1, col, cell });
      }
    }

    for (let col = 0; col < this.colsInRow(0); col++) {
      this.grid[0][col] = null;
    }

    return lost;
  }
}
