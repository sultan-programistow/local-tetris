export type Cell = string | null; // color or null
export type Matrix = number[][];

export interface PieceDef {
  id: string;
  name: string;
  shape: Matrix; // base rotation
  color: string;
  unlockLevel: number; // 1
}

// Tetrominoes (level 1)
const TETROMINOES: PieceDef[] = [
  { id: 'I', name: 'I', shape: [[1,1,1,1]], color: '#00f0f0', unlockLevel: 1 },
  { id: 'O', name: 'O', shape: [[1,1],[1,1]], color: '#f0f000', unlockLevel: 1 },
  { id: 'T', name: 'T', shape: [[0,1,0],[1,1,1]], color: '#a000f0', unlockLevel: 1 },
  { id: 'S', name: 'S', shape: [[0,1,1],[1,1,0]], color: '#00f000', unlockLevel: 1 },
  { id: 'Z', name: 'Z', shape: [[1,1,0],[0,1,1]], color: '#f00000', unlockLevel: 1 },
  { id: 'J', name: 'J', shape: [[1,0,0],[1,1,1]], color: '#0000f0', unlockLevel: 1 },
  { id: 'L', name: 'L', shape: [[0,0,1],[1,1,1]], color: '#f0a000', unlockLevel: 1 },
];

// Pentominoes + irregular variants unlock from level 3, one new shape every 2 levels
const EXTRA: PieceDef[] = [
  { id: 'P1', name: 'Pento-X', shape: [[0,1,0],[1,1,1],[0,1,0]], color: '#ff4da6', unlockLevel: 9 },
  { id: 'I3', name: 'Tromino-I', shape: [[1,1,1]], color: '#ff1493', unlockLevel: 4 },
  { id: 'P2', name: 'Pento-U', shape: [[1,0,1],[1,1,1]], color: '#ff6e40', unlockLevel: 5 },
  { id: 'P3', name: 'Pento-F', shape: [[0,1,1],[1,1,0],[0,1,0]], color: '#00bfa5', unlockLevel: 7 },
  { id: 'L3', name: 'Tromino-L', shape: [[1,0],[1,1]], color: '#00ff7f', unlockLevel: 7 },
  { id: 'P4', name: 'Pento-P', shape: [[1,1],[1,1],[1,0]], color: '#29b6f6', unlockLevel: 3 },
  { id: 'P5', name: 'Pento-W', shape: [[1,0,0],[1,1,0],[0,1,1]], color: '#9370db', unlockLevel: 11 },
];

export const ALL_PIECES: PieceDef[] = [...TETROMINOES, ...EXTRA];

export function availablePieces(level: number): PieceDef[] {
  return ALL_PIECES.filter(p => p.unlockLevel <= level);
}

export function rotateMatrix(m: Matrix): Matrix {
  const rows = m.length;
  const cols = m[0].length;
  const out: Matrix = Array.from({ length: cols }, () => Array(rows).fill(0));
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) out[c][rows - 1 - r] = m[r][c];
  return out;
}
