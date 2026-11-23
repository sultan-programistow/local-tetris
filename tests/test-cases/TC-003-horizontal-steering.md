# TC-003 — Horizontal steering of the current piece (P1 `a`/`d`, P2 arrows)

- **Area:** Gameplay / input
- **Priority:** High
- **Date run:** 2026-11-23
- **Environment:** Chromium (OpenBot browser), `http://localhost:5173`, dev server, viewport 1766×1102, canvas 1920×1080 (scaled)
- **Spec:** `specs/03-input-and-controls.md` → keyboard mapping (P1: A/D, P2: ←/→)

## Preconditions

1. The app is running (`npm run dev`) at `http://localhost:5173`.
2. A match is started (Enter on "Start"); countdown finishes and both boards have a falling piece.

## Expected result

Pressing `a` / `d` moves Player 1's current piece one column left / right **immediately**. Pressing `ArrowLeft` / `ArrowRight` does the same for Player 2. Movement should be visible right after the key press (not only after gravity).

## Steps

1. Load `http://localhost:5173`, start a match, wait for countdown to finish.
2. Sample Player 1's board: record the horizontal centroid (in cell units) of the colored piece.
3. Press `a`, wait 400 ms, sample again → centroid should shift left by ~1 cell.
4. Press `d`, wait 400 ms, sample again → centroid should shift right.
5. Repeat steps 2–4 on Player 2's board using `ArrowLeft` / `ArrowRight`.

## Actual result

No horizontal movement observed in either board.

- Player 1: centroid before `a` = 119.5 (cell units); after `a` = 119.5; after `d` = 119.5 (unchanged).
- Player 2: centroid before = 119.5; after `ArrowLeft` = 118.36; after `ArrowRight` = 118.36 (no left/right response; the tiny shift is consistent with gravity, not input).

## Status

**FAIL** — horizontal steering does not move the current piece for either player.

## Verification

Canvas pixel sampling of the piece's horizontal centroid in each board region (`getImageData` over the 10×20 board area). No image input used.

## Notes / follow-up

- New failing case; not reported to @Developer per current workflow (new cases go through re-spec first).
- Gamepad steering (`D-pad`/stick) not testable; no gamepad connected and no gamepad code present.
- Root cause is out of scope for this test asset.
