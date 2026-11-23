# 01 — Game Design

## Overview

Two players play Tetris simultaneously on the same screen. Both receive the **same seeded piece sequence**. Pure score race: highest score when a player tops out and the other fails to beat it.

## Core Mechanics

- Board: 10×20 cells per player, two boards side by side.
- Piece spawn: top center. Game over when a new piece cannot be placed.
- Line clear: standard full-row clear (rows removed, blocks above fall).
- Rotation: SRS (Super Rotation System) with wall kicks.
- Lock delay: ~0.5s after a piece lands before it locks; allows last-moment moves/rotations.
- No hold piece. No ghost piece.

## Scoring

- 1 point per piece successfully placed. No line-clear bonuses, no combos, no T-spins.
- Score is cumulative per match.

## Level Progression

- Level advances every 10 pieces placed (piece-count based).
- Each level: drop speed increases (~10% faster), starting ~0.8s/drop, floor ~0.05s.
- New (non-standard) piece types unlock gradually starting at level 3, adding one new shape every 2 levels.

## Piece Set

- Levels 1–2: standard 7 tetrominoes (I, O, T, S, Z, J, L).
- Level 3+: introduce pentominoes (5-cell) and irregular variants gradually.
- Standard pieces use classic Tetris colors; new pieces use distinct vibrant colors.

## Match Flow

1. Main menu → Start.
2. 3-2-1 countdown.
3. Both players play simultaneously with identical piece sequence (seeded RNG).
4. First player to top out: their score is frozen; the other keeps playing.
   - The topped-out player's board enters a soft "Game Over" state: tiles are grayed out / rendered semi-transparent, and a "GAME OVER" label is overlaid above the tiles (higher z-order) on that board only.
   - The other player's board remains active and playable.
5. Second player must exceed the first's score to win; if they also top out at ≤ score, first player wins.
6. Tie (identical scores) = draw.
7. Game over screen: winner, both scores, pieces placed, summary + last 5 sessions, "press to restart" (new random seed).

## Seeded RNG

- Each match uses a random seed. Sequence identical for both players.
- Seed is NOT displayed.

## Match Start / Restart

- Restart immediately on game over (new random seed). No "replay same seed" option.
