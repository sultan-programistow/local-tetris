# TC-004 — Board border is inside the viewport

- **Area:** Rendering / layout
- **Priority:** High
- **Date run:** 2026-11-24 (run 4: PASS, automated; manual run 3: PASS)
- **Environment:** Chromium (OpenBot browser), `http://localhost:5173`, dev server, viewport 1781×1103, canvas 1920×1080 (scaled ≈0.928×)
- **Automated:** `tests/e2e/tc-004-board-in-viewport.spec.ts` — `npm run test TC-004`

## Preconditions

1. The app is running (`npm run dev`) at `http://localhost:5173`.
2. A match is in progress (boards rendered).

## Expected result

The board border of both players is fully visible inside the browser viewport — the displayed bounding box of each board lies within `window.innerWidth` × `window.innerHeight`.

## Steps

1. Load `http://localhost:5173`, start a match, wait for the countdown to finish.
2. Compute each board's displayed bounding box from `canvas.getBoundingClientRect()`, the scale factor, and the board's **rendered** border rectangle (measure the drawn border instead of hard-coding a cell size or origin).
3. Compare the displayed bottom/right against the viewport.

## Actual result

Both boards now fit inside the viewport:

| Board | Displayed bbox (left, top, right, bottom) | Inside viewport |
|---|---|---|
| P1 | 178.0, 87.6, 641.8, 1015.2 | yes |
| P2 | 1124.2, 87.6, 1588.0, 1015.2 | yes |

Viewport: 1781×1103. Canvas displayed: 1781.0×1001.8 (ends at y≈1052). Board cell 50 at y=40 → 20 rows end at logical y=1040, inside the canvas; bottom border pixel at (450,1040) = `204,204,204` (drawn).

## Status

**PASS** (run 4 automated, manual run 3) — board border is inside the viewport for both players.

## Run history

| Run | Date | Result | Notes |
|---|---|---|---|
| 1 | 2026-11-23 | PASS | cell = 24 (board 240×480) — fit inside the viewport |
| 2 | 2026-11-23 | FAIL | cell changed to 54 (board 540×1080) — bottom extended past the canvas/viewport |
| 3 | 2026-11-23 | PASS | cell 50, origin y=40 (board 500×1000, ends y=1040) — fits; border drawn |
| 4 | 2026-11-24 | PASS (automated) | `npm run test TC-004`: border measured at 199–700 × 39–1040 (P1) and 1219–1720 × 39–1040 (P2) at both 1600×900 and 1366×768; both inside canvas and viewport |

## Verification

Geometry check of the displayed bounding box against `window.innerWidth`/`window.innerHeight`. No image input used.

## Notes / follow-up

- Regression from run 2 fixed by @Developer (cell 50, origin y=40); re-run 2026-11-23 PASS.
- Root cause is out of scope for this test asset.

## Automation (run 4)

`tests/e2e/tc-004-board-border-in-viewport.spec.ts`, run with `npm run test TC-004`. The board rectangle is measured from the drawn `#ccc` border (rows with > 200 near-grey pixels, columns with > 800) rather than from a hard-coded cell size, mapped through `canvas.getBoundingClientRect()`, then compared with `window.innerWidth` / `innerHeight` and with the canvas box. Checked at 1600×900 and 1366×768 in the same run, because the historical failure was a cell-size change.

Mutation check: cell size 50 → 54 pushes the bottom border out and fails the run; restored afterwards.

Evidence: `tests/reports/TC-004/run4-geometry.json`, `run4-1600x900-play.png`, `run4-1366x768-play.png`.
