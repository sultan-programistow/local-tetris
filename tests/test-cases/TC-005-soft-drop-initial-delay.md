# TC-005 — Soft drop: one cell per tap, hold delay before rapid drop

- **Area:** Gameplay / input
- **Priority:** High
- **Spec pin:** `specs/03-input-and-controls.md` §"Soft Drop" @ `10aa6a0` — first cell immediately, 350 ms delay, then 10 ms repeat (effectively to the bottom); keyboard `S`/`↓`, gamepad D-pad down / `A`.
- **Spec:** `tests/e2e/tc-005-soft-drop-initial-delay.spec.ts` — `npm run test TC-005`

## Must hold

- **Tap** (~120 ms) of `S`, `↓`, D-pad down or `A` moves the piece exactly one cell down, and no further before the next gravity step.
- **Hold** moves one cell at the press edge, nothing for 350 ms, then drops rapidly to the floor.
- `W` rotates the piece (its cell bounds turn from 150×50 to 50×150): it must not soft-drop.

## Notes

- The piece row is sampled per animation frame from the `?e2e=1` hook.
- A downward step where both players move in the same sample is gravity, not input, and is not counted.
- A piece is allowed to lock before each sub-case, so every step starts at the top of the board.
- Asserted bands, frame-quantised: one cell per tap, 250–500 ms before the drop starts, then ≤ 200 ms per cell.
- Root cause is out of scope for this asset.

## Can it fail

`_sdTimer >= 350` → `>= 0` (repeats immediately) fails the hold-delay assertion. Restored afterwards.

## History

| Run | Date | Result | Failure |
|---|---|---|---|
| 1 | 2026-11-23 | FAIL | a 100 ms tap moved one cell; hold repeated slowly (~100–225 ms/cell) |
| 3 | 2026-11-23 | FAIL | tap sub-case added: 120 ms taps moved nothing; fixed by Developer in `e9ddd8c` |

The 350 ms value is the constant in `e9ddd8c`; an earlier 250 ms citation in this case was stale and is corrected.

Last automated run: run 6, PASS (2026-11-24) — evidence `tests/reports/TC-005/run6-tap-hold-timeline.json`.
