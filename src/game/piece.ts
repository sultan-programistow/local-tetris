import { Matrix, PieceDef, rotateMatrix } from './pieces';

export interface PieceInstance {
  def: PieceDef;
  matrix: Matrix;
  x: number;
  y: number;
  rotation: number; // 0..3
}

export function createPiece(def: PieceDef): PieceInstance {
  return { def, matrix: def.shape.map(r => [...r]), x: 3, y: 0, rotation: 0 };
}

export function rotateInstance(p: PieceInstance, dir: 1 | -1): void {
  // apply rotation dir times
  let m = p.matrix;
  if (dir === 1) m = rotateMatrix(m);
  else { m = rotateMatrix(rotateMatrix(rotateMatrix(m))); }
  p.matrix = m;
  p.rotation = (p.rotation + (dir === 1 ? 1 : 3)) % 4;
}
