# TC-003 — Horizontal steering of the current piece (keyboard + gamepad)

- **Area:** Gameplay / input
- **Priority:** High
- **Date run:** 2026-11-23
- **Environment:** Chromium (OpenBot browser), `http://localhost:5173`, dev server, viewport 1766×1102, canvas 1920×1080 (scaled)
- **Spec:** `specs/03-input-and-controls.md` → keyboard mapping (P1: A/D, P2: ←/→) and gamepad (D-pad / left stick)

## Preconditions

1. The app is running (`npm run dev`) at `http://localhost:5173`.
2. A match is started (Enter on "Start"); countdown finishes and both boards have a falling piece.

## Expected result

- Keyboard: `a`/`d` moves Player 1's piece one column left/right immediately; `ArrowLeft`/`ArrowRight` does the same for Player 2.
- Gamepad: D-pad left/right (buttons 14/15) and left stick (`axes[0]` < -0.5 / > 0.5) do the same for the corresponding player (gamepad 0 → P1, gamepad 1 → P2).
- Movement is visible right after the input, not only after gravity.

## Steps

1. Load `http://localhost:5173`, start a match, wait for countdown to finish.
2. Sample each board's piece centroid (exact piece-color pixels only).
3. Keyboard: hold `a`/`d` (P1) and `ArrowLeft`/`ArrowRight` (P2), sample after each.
4. Gamepad: inject two mock gamepads by overriding `navigator.getGamepads()` (unpressed buttons, zero axes). Toggle button 14 (left) / 15 (right) on pad 0 (P1) and pad 1 (P2); also set `axes[0]` to -1 / +1. Sample after each input.

## Actual result

**Keyboard (PASS):** P1 centroid `118.36 → 111.50` (left) → `127.50` (right); P2 centroid `117.22 → 110.36` (left), right verified in the same session.

**Gamepad (PASS):** with the mock pads (board cell = 54 px; P1 origin 200, P2 origin 1180):

| Input | P1 centroid | P2 centroid |
|---|---|---|
| before | 242.5 | 242.5 |
| pad0 button 14 (left) | 188.5 | — |
| pad0 button 15 (right) | 242.5 | — |
| pad1 button 14 (left) | — | 188.5 |
| pad1 button 15 (right) | — | 242.5 |
| pad0 `axes[0]` = -1 / +1 | 188.5 / 242.5 | — |

Both D-pad buttons and the left stick move the correct player by one column.

## Status

**PASS** — horizontal steering works for both players via keyboard and gamepad.

## Verification

Canvas pixel sampling of piece-colored pixels (exact piece colors only, filtering background/grid/anti-alias), in logical 1920×1080 board coordinates (P1 origin 200, P2 origin 1180, cell 54, board 540×1080). Gamepad mocked in-page by replacing `navigator.getGamepads()` with two synthetic pads. No image input used.

## Notes / follow-up

- Gamepad support is now implemented (Developer commits: menu navigation, soft drop, gameover restart).
- Note: board cell size is now 54 px, so the board is 540×1080 and its bottom edge extends past the canvas — tracked separately in TC-004.
- Root cause is out of scope for this test asset.
