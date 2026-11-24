# TC-004 — Board border is inside the viewport

- **Area:** Rendering / layout
- **Priority:** High
- **Spec pin:** `specs/05-audio-and-visuals.md` §"Responsive" @ `8ef3a7c` — "the full 20-row height fits on screen (no vertical overflow)"; canvas scales to fit the window, preserving aspect ratio (`specs/02-technical-spec.md`).
- **Spec:** `tests/e2e/tc-004-board-in-viewport.spec.ts` — `npm run test TC-004`

## Must hold

- Each player's board border is fully visible: the displayed box lies inside the canvas and inside `window.innerWidth` × `window.innerHeight`.
- Holds at 1600×900 and at 1366×768 in the same run, because the historical failure was a cell-size change.
- The rectangle is measured from the **drawn** border (the `#ccc` line), not from a hard-coded cell size or origin.

## Notes

- Displayed box = drawn border rectangle mapped through `canvas.getBoundingClientRect()` and the current scale.
- A board that renders but overflows the viewport fails; so does a border that is not drawn at all.
- Root cause is out of scope for this asset.

## Can it fail

Cell size 50 → 54 pushes the bottom border out of the viewport and fails the run. Restored afterwards.

## History

| Run | Date | Result | Failure |
|---|---|---|---|
| 2 | 2026-11-23 | FAIL | cell changed to 54 (board 540×1080), bottom border past the canvas/viewport; fixed by Developer (cell 50, origin y 40) |

Last automated run: run 4, PASS (2026-11-24) — evidence `tests/reports/TC-004/run4-geometry.json`.
