import { Board } from './board';
import { PieceInstance, createPiece } from './piece';
import { PRNG } from '../rng/prng';
import { availablePieces, PieceDef } from './pieces';
import { collides } from './collision';

export interface PlayerState {
  board: Board;
  current: PieceInstance | null;
  nextDef: PieceDef | null;
  score: number;
  level: number;
  piecesPlaced: number;
  lockTimer: number;
  lockResets: number;
  dasLeft: number; // ms since pressed
  dasRight: number;
  dasDown: number;
  gameOver: boolean;
  toppedOut: boolean;
}

export function createPlayer(): PlayerState {
  return {
    board: new Board(),
    current: null,
    nextDef: null,
    score: 0,
    level: 1,
    piecesPlaced: 0,
    lockTimer: 0,
    lockResets: 0,
    dasLeft: 0, dasRight: 0, dasDown: 0,
    gameOver: false,
    toppedOut: false,
  };
}

export class MatchState {
  rng: PRNG;
  seed: number;
  players: [PlayerState, PlayerState];
  status: 'countdown' | 'playing' | 'paused' | 'gameover' = 'countdown';
  countdownMs = 3000;
  // first top-out handling
  firstTopOut: number | null = null; // player index
  frozenScore: number | null = null;
  winner: 'p1' | 'p2' | 'draw' | null = null;
  // piece sequence shared
  constructor(seed: number) {
    this.seed = seed;
    this.rng = new PRNG(seed);
    this.players = [createPlayer(), createPlayer()];
  }
  // get next piece def based on level (use max level? each player own level but shared sequence => use a shared level? spec: both receive same seeded piece sequence. Level affects drop speed per player AND piece unlock. Piece pool may differ by level per player. To keep sequence identical, we pick from pool based on... hmm.
  // Decision: piece selection uses a shared "match level" = max of both? Or each player's level. Spec says same seeded sequence. Use seeded random from a pool determined by current global piece index? Simpler: pick from standard 7 always for levels 1-2; for unlock, use player's own level but then sequences diverge. 
  // To keep identical, use a single shared level counter = pieces placed of... ambiguous. We'll use a shared "sequence level" based on total pieces placed by player0? Simpler: piece pool expands based on max(piecesPlaced) threshold. Use a global piece counter.
  pieceIndex = 0;
  levelForPiece(i: number): number { return Math.floor(i / 10) + 1; }
  nextPieceDef(): PieceDef {
    const lvl = this.levelForPiece(this.pieceIndex);
    this.pieceIndex++;
    const pool = availablePieces(lvl);
    const idx = Math.floor(this.rng.next() * pool.length);
    return pool[idx];
  }
  // queue shared next piece
  sharedNext: PieceDef | null = null;
  ensureNext(): void { if (!this.sharedNext) this.sharedNext = this.nextPieceDef(); }
  takeNext(): PieceDef { this.ensureNext(); const d = this.sharedNext!; this.sharedNext = null; return d; }
  peekNext(): PieceDef { this.ensureNext(); return this.sharedNext!; }
  spawnFor(p: PlayerState): boolean {
    const def = this.takeNext();
    const piece = createPiece(def);
    p.nextDef = this.peekNext();
    piece.x = 3;
    piece.y = 0;
    if (collides(p.board, piece)) {
      p.gameOver = true;
      p.toppedOut = true;
      return false;
    }
    p.current = piece;
    return true;
  }
  // advance: ensure nextDef queued? We'll just spawn on demand.
}
