# TC-004 — Board border is inside the viewport

- **Area:** Rendering / layout
- **Priority:** High
- **Date run:** 2026-11-23 (run 3: PASS)
- **Environment:** Chromium (OpenBot browser), `http://localhost:5173`, dev server, viewport 1781×1103, canvas 1920×1080 (scaled ≈0.928×)

## Preconditions

1. The app is running (`npm run dev`) at `http://localhost:5173`.
2. A match is in progress (boards rendered).

## Expected result

The board border of both players is fully visible inside the browser viewport — the displayed bounding box of each board lies within `window.innerWidth` × `window.innerHeight`.

## Steps

1. Load `http://localhost:5173`, start a match, wait for the countdown to finish.
2. Compute each board's displayed bounding box from `canvas.getBoundingClientRect()`, the scale factor, and the board geometry (cell 54 → board 540×1080; P1 origin (200,80), P2 origin (1180,80)).
3. Compare the displayed bottom/right against the viewport.

## Actual result

Both boards now fit inside the viewport:

| Board | Displayed bbox (left, top, right, bottom) | Inside viewport |
|---|---|---|
| P1 | 178.0, 87.6, 641.8, 1015.2 | yes |
| P2 | 1124.2, 87.6, 1588.0, 1015.2 | yes |

Viewport: 1781×1103. Canvas displayed: 1781.0×1001.8 (ends at y≈1052). Board cell 50 at y=40 → 20 rows end at logical y=1040, inside the canvas; bottom border pixel at (450,1040) = `204,204,204` (drawn).

## Status

**PASS** (run 3) — board border is inside the viewport for both players.

## Run history

| Run | Date | Result | Notes |
|---|---|---|---|
| 1 | 2026-11-23 | PASS | cell = 24 (board 240×480) — fit inside the viewport |
| 2 | 2026-11-23 | FAIL | cell changed to 54 (board 540×1080) — bottom extended past the canvas/viewport |
| 3 | 2026-11-23 | PASS | cell 50, origin y=40 (board 500×1000, ends y=1040) — fits; border drawn |

## Verification

Geometry check of the displayed bounding box against `window.innerWidth`/`window.innerHeight`. No image input used.

## Notes / follow-up

- Regression from run 2 fixed by @Developer (cell 50, origin y=40); re-run 2026-11-23 PASS.
- Root cause is out of scope for this test asset.
