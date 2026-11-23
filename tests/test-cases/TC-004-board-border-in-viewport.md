# TC-004 — Board border is inside the viewport

- **Area:** Rendering / layout
- **Priority:** High
- **Date run:** 2026-11-23 (run 2: FAIL)
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

Both boards extend below the viewport:

| Board | Displayed bbox (left, top, right, bottom) | Inside viewport |
|---|---|---|
| P1 | 178.0, 124.7, 678.9, 1126.5 | **no** (bottom > 1103) |
| P2 | 1087.1, 124.7, 1588.0, 1126.5 | **no** (bottom > 1103) |

Viewport: 1781×1103. Canvas displayed: 1781.0×1001.8 (ends at y≈1052), so the board bottom is past both the canvas and the viewport. Board height 1080 at y=80 → logical bottom y=1160 > canvas 1080.

## Status

**FAIL** (run 2) — board bottom border is outside the viewport.

## Run history

| Run | Date | Result | Notes |
|---|---|---|---|
| 1 | 2026-11-23 | PASS | cell = 24 (board 240×480) — fit inside the viewport |
| 2 | 2026-11-23 | FAIL | cell changed to 54 (board 540×1080) — bottom extends past the canvas/viewport |

## Verification

Geometry check of the displayed bounding box against `window.innerWidth`/`window.innerHeight`. No image input used.

## Notes / follow-up

- **Regression** relative to run 1 (cell size increased from 24 to 54).
- Root cause is out of scope for this test asset.
