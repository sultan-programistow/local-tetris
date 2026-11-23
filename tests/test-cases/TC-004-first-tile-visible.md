# TC-004 — First spawned piece is visible on screen (not below the viewport)

- **Area:** Gameplay / rendering
- **Priority:** Medium
- **Date run:** 2026-11-23
- **Environment:** Chromium (OpenBot browser), `http://localhost:5173`, dev server, viewport 1766×1102, canvas 1920×1080 (scaled)

## Preconditions

1. The app is running (`npm run dev`) at `http://localhost:5173`.
2. The main menu is shown (Start highlighted).

## Expected result

After starting a match and the countdown finishing, the first piece on each board is rendered inside the visible board area (top rows), not below the viewport.

## Steps

1. Load `http://localhost:5173` (menu; Start highlighted).
2. Press `Enter` to start a match.
3. Wait for the 3-second countdown to finish and ~0.2 s of play.
4. Sample each board region (P1: x=200,y=80; P2: x=1480,y=80; 240×480 px) and find the topmost piece pixel (`minY`).

## Actual result

Both first pieces are at the top of their boards (visible):

- Player 1: cyan piece, `minY` = 1 (rows 0–2), `maxY` = 52.
- Player 2: orange piece, `minY` = 1 (rows 0–4), `maxY` = 106.

No piece is below the viewport.

## Status

**PASS** — the first spawned piece is visible on screen for both players.

## Verification

Canvas pixel sampling of piece-colored pixels (filtering out background `#0f1115`, grid `#222`, and anti-aliased grid edges). No image input used.

## Notes / follow-up

- Gamepad not relevant to this case.
- Root cause is out of scope for this test asset.
