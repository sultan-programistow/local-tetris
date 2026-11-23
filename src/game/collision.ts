import { Board } from './board';
import { PieceInstance } from './piece';

export function collides(board: Board, p: PieceInstance, dx = 0, dy = 0, matrix?: number[][]): boolean {
  const m = matrix ?? p.matrix;
  for (let r = 0; r < m.length; r++) {
    for (let c = 0; c < m[r].length; c++) {
      if (m[r][c]) {
        const x = p.x + c + dx;
        const y = p.y + r + dy;
        if (x < 0 || x >= 10 || y >= 20) return true;
        if (y >= 0 && board.isOccupied(x, y)) return true;
      }
    }
  }
  return false;
}

// SRS wall kicks (approx). For simplicity try offsets.
export const KICKS: [number, number][] = [[0,0],[ -1,0],[1,0],[0,-1],[-1,-1],[1,-1],[ -2,0],[2,0],[0,-2]];

export function tryRotate(board: Board, p: PieceInstance, dir: 1 | -1): boolean {
  const oldMatrix = p.matrix;
  const oldRot = p.rotation;
  const oldX = p.x, oldY = p.y;
  // compute new matrix
  let newMatrix = oldMatrix;
  if (dir === 1) newMatrix = rotateMatrixLocal(oldMatrix);
  else newMatrix = rotateMatrixLocal(rotateMatrixLocal(rotateMatrixLocal(oldMatrix)));
  for (const [kx, ky] of KICKS) {
    p.matrix = newMatrix;
    p.x = oldX + kx;
    p.y = oldY + ky;
    if (!collides(board, p)) {
      p.rotation = (p.rotation + (dir === 1 ? 1 : 3)) % 4;
      return true;
    }
  }
  // revert
  p.matrix = oldMatrix;
  p.x = oldX;
  p.y = oldY;
  p.rotation = oldRot;
  return false;
}

function rotateMatrixLocal(m: number[][]): number[][] {
  const rows = m.length, cols = m[0].length;
  const out: number[][] = Array.from({ length: cols }, () => Array(rows).fill(0));
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) out[c][rows - 1 - r] = m[r][c];
  return out;
}
