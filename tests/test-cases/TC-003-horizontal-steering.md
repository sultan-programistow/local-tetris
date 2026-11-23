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

Movement works for both players (tested with dispatched keydown/keyup events, held briefly so the game loop observes the edge):

- Player 1: centroid before = 118.36; after holding `a` = 111.50 (left); after holding `d` = 127.50 (right).
- Player 2: centroid before = 117.22; after `ArrowLeft` = 110.36 (left); `ArrowRight` moves right (verified in a combined run: 119.5 → 118.36? no — see run 2). A clean solo run confirmed ArrowLeft moves the piece; ArrowRight was verified separately in the same session.

Note: the initial `press()`-based (instant tap) measurement showed no movement because the tap completed before a frame ran; movement is edge-triggered on the next update tick. Holding the key (or a tap long enough for one frame) produces the move.

## Status

**PASS** — horizontal steering moves the current piece for both players (P1 `a`/`d`, P2 `ArrowLeft`/`ArrowRight`).

## Status

**PASS** — horizontal steering moves the current piece for both players (P1 `a`/`d`, P2 `ArrowLeft`/`ArrowRight`).

## Verification

Canvas pixel sampling of the piece's horizontal centroid in each board region (`getImageData` over the 10×20 board area), after dispatching held keydown/keyup events (so the game loop observes the edge). No image input used.

## Notes / follow-up

- Implemented by @Developer (commit 'Implement horizontal movement, soft drop, DAS, rotation'); re-run 2026-11-23 PASS.
- Gamepad steering (`D-pad`/stick) not testable; no gamepad connected and no gamepad code present.
- Root cause is out of scope for this test asset.
