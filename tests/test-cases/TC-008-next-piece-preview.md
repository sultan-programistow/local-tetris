# TC-008 — Next-piece preview shows the piece that actually spawns next

- **Area:** Rendering / HUD
- **Priority:** Medium
- **Date run:** 2026-11-23 (run 1: PASS)
- **Environment:** Chromium (OpenBot browser), production build of `4379d90` served statically at `http://127.0.0.1:4173` (`vite preview`, no HMR), canvas 1920×1080, viewport 1766×1102
- **Spec:** `specs/04-screens-and-ui.md` §Play Screen — "Per player HUD: score, next piece (1) preview"; "Next piece preview: rendered in a small preview box (e.g., 4×4 cell area) in the player's HUD, centered, using the same piece colors and cell size scaled to fit; shows the next piece in its spawn orientation."
- **Spec pin:** `specs/04-screens-and-ui.md` §Play Screen @ `4379d90`

## Preconditions

1. The app is running (static preview) at `http://127.0.0.1:4173`.
2. The Main Menu is shown.

## Expected result

For each player, during play, a 4×4 preview box shows exactly one next piece, in its spawn orientation and with its piece colour. When the current piece locks, the piece that spawns is the one the preview showed. Both players' previews show the same piece (shared sequence).

## Steps

1. Load `http://127.0.0.1:4173/`, start a match with `Enter`, wait through the 3 s countdown.
2. Read both preview boxes (P1 at logical 720,40; P2 at 1120,40; 4×4 cells of 20 px) and the current piece on each board from canvas pixels at cell centres.
3. Hold soft drop (`s` + `ArrowDown`). Detect each new spawn by the current piece returning to rows 0–1 (this cannot be skipped by fast soft drop), and compare it with the preview recorded on the previous sample.
4. Repeat across pieces and a fresh match so that all seven standard tetrominoes appear.
5. Check preview box presence on the first play frame and its border/geometry.

## Actual result

### Function — PASS

| Spawn | Preview shown | Piece that spawned | P1/P2 previews agree |
|---|---|---|---|
| 1 (first) | (set with the first spawn; box empty during countdown) | I | yes |
| 2 | L | L | yes |
| 3 | S | S | yes |
| 4 | T | T | yes |
| 5 | O | O | yes |
| 6 | Z | Z | yes |
| 7 | S | S | yes |

6/6 comparable spawns matched (preview = next spawn). Earlier batches on the same build matched for J, L, S, I, T, O and Z. Colours matched the palette exactly (I `#00f0f0`, O `#f0f000`, T `#a000f0`, S `#00f000`, Z `#f00000`, J `#0000f0`, L `#f0a000`). Shapes were in spawn orientation (e.g. T `010/111`, I `1111`).

Both players' previews were identical at every sample, and both boards spawned the same piece.

### Geometry and presence — PASS

- P1 box: logical x 720–800, y 40–120; P2 box: x 1120–1200, y 40–120. Both 80×80 px = 4×4 cells of 20 px, inside the canvas.
- Border drawn on all four edges (`rgb(58,59,61)` sampled on each side, 1 px `#666` antialiased at the 0.927 canvas scale).
- Preview pixels appeared 76 ms after board pixels at countdown end (30 ms sampling) on the first play frame.
- Pieces fit inside the box in every sample.

### Observation — centering

Piece margins inside the 4×4 box are integer cells (`top/bottom/left/right`):

| Piece | Margins (cells) |
|---|---|
| I `1111` | 1/2/0/0 |
| O `11/11` | 1/1/0/0 |
| T, S, Z, J, L (3-wide) | 1/1/0/1 |

Odd dimensions sit one cell off centre on one axis (floor rounding). The spec's "centered" is met to within one cell; flagged as a cosmetic observation, not a failure.

## Status

**PASS** (2026-11-23, `4379d90`) — each preview showed the piece that spawned next for 6/6 measured spawns and both players' previews agreed. Cosmetic note: odd-sized pieces are one cell off exact centre in the 4×4 box.

## Run history

| Run | Date | Result | Notes |
|---|---|---|---|
| 1 | 2026-11-23 | PASS | 7 spawns, one match; first-frame presence and box geometry checked |

## Evidence

- `tests/reports/TC-008/preview-verification.txt` — geometry, spawn table, bundle checksum, colours, margins.
- `tests/reports/TC-008/play-preview-both-players.png` — play screen, both NEXT boxes (J), P1 current I, scores 0:0.

## Verification

Canvas pixel sampling (`getImageData`) with exact palette classification; spawn detected at the top of the board; served bundle checksum matched `dist/` (`01303a5a…eebb91`). No image input used for the verdict; the screenshot is illustrative.

## Not covered

- Pentomino previews at level 3+ (unlock needs 20 pieces); only the seven standard tetrominoes were seen.
- Preview during countdown/menu (spec requires it only on the Play screen; it is empty there).
