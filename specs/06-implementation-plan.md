# 06 — Implementation Plan (for Developer)

Suggested build order. Each milestone should be playable/testable.

## Milestone 1 — Skeleton
- Vite + TS + Canvas setup, game loop, responsive scaling.
- Single board rendering (grid, pieces).

## Milestone 2 — Single-player Tetris
- Piece spawn, movement, rotation (SRS + kicks), lock delay, soft drop with DAS.
- Line clear, scoring (1 per piece), level progression (speed).
- Next piece preview (1).

## Milestone 3 — Two-player + shared seed
- Second board, shared seeded RNG sequence.
- Simultaneous play, independent boards.
- Game over logic (first tops out → other must beat score).
- Win/draw determination.

## Milestone 4 — Input
- Keyboard mapping (P1/P2).
- Gamepad support (Web Gamepad API).
- DAS for both.

## Milestone 5 — New pieces
- Pentominoes + irregular variants unlock by level.
- Colors for new pieces.

## Milestone 6 — Screens & menus
- Main menu, countdown, pause menu, game over screen, stats screen.
- Controls screen, volume slider.

## Milestone 7 — Audio
- SFX for all events, volume slider persisted.

## Milestone 8 — Polish
- Line clear flash + particles, countdown animation, responsive polish.
- localStorage stats persistence, all sessions (stats screen shows all; game over shows last 5).

## Acceptance Criteria

- Two players can play simultaneously with identical piece sequence.
- Score, level, win/draw logic matches spec.
- Gamepad + keyboard both work.
- Stats persist across reloads.
- Runs smoothly at 1920×1080 fullscreen.
- No server required; single HTML page.
