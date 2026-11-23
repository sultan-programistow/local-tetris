import { Cell } from './pieces';

export const COLS = 10;
export const ROWS = 20;

export class Board {
  grid: (Cell)[][] = Array.from({ length: ROWS }, () => Array(COLS).fill(null));
  clear(): void { this.grid = Array.from({ length: ROWS }, () => Array(COLS).fill(null)); }
  inBounds(x: number, y: number): boolean { return x >= 0 && x < COLS && y < ROWS; }
  // y can be negative (above top) for spawn
  cell(x: number, y: number): Cell {
    if (x < 0 || x >= COLS || y >= ROWS) return null;
    if (y < 0) return null;
    return this.grid[y][x];
  }
  set(x: number, y: number, v: Cell): void { if (y >= 0 && y < ROWS && x >= 0 && x < COLS) this.grid[y][x] = v; }
  isOccupied(x: number, y: number): boolean {
    if (x < 0 || x >= COLS || y >= ROWS) return true;
    if (y < 0) return false;
    return this.grid[y][x] !== null;
  }
  // find full rows
  fullRows(): number[] {
    const res: number[] = [];
    for (let r = 0; r < ROWS; r++) if (this.grid[r].every(c => c !== null)) res.push(r);
    return res;
  }
  removeRows(rows: number[]): void {
    const set = new Set(rows);
    const remaining = this.grid.filter((_, i) => !set.has(i));
    while (remaining.length < ROWS) remaining.unshift(Array(COLS).fill(null));
    this.grid = remaining;
  }
}
