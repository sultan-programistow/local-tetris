# TC-003 — Horizontal steering: tap, hold delay (DAS) and repeat

- **Area:** Gameplay / input
- **Priority:** High
- **Spec pin:** `specs/03-input-and-controls.md` §"DAS (Delayed Auto Shift)" @ `a27d32b` — initial delay 350 ms, repeat 75 ms, keyboard and gamepad.
- **Spec:** `tests/e2e/tc-003-horizontal-steering.spec.ts` — `npm run test TC-003`

## Must hold

- **Tap** (~130 ms) of any horizontal input moves the piece exactly one column, and not again in the 400 ms after release.
- **Hold** moves one column at the press edge, nothing more for 350 ms, then repeats every 75 ms.
- Same for all 10 paths: P1 `a`/`d`, P2 `←`/`→`, D-pad left/right on pads 0 and 1, pad 0 left stick ±1.
- Left and right behave identically — the left path is where the historical defect was.

## Notes

- The column is sampled once per animation frame from the `?e2e=1` hook, so each change is timed without a `fillRect` hook or a sleep.
- Timings are measured from the press, not from the first observed step, which removed a 243-vs-250 ms near-miss.
- A move caused by a new piece spawning at column 3 is excluded, so a lock inside the window cannot fake a repeat.
- Frames are ~33 ms apart, so the asserted bands are 250–500 ms for the delay and ≤ 200 ms for repeats; a spec value outside them fails.
- Root cause is out of scope for this asset.

## Can it fail

Setting the keyboard DAS threshold to 0 (repeat immediately) fails the hold-delay assertion. Restored afterwards.

## History

| Run | Date | Result | Failure |
|---|---|---|---|
| 5–9 | 2026-11-23 | FAIL | keyboard-left delay ~167–200 ms and gamepad hold never repeated; fixed over `8c932b1`, `4a16841`, `557f95b`, `ff18d12`, resolved in `3798531` |

Hold timing was new coverage in run 5, so runs 5–9 were not regressions of a previously passing check.

Last automated run: run 12, PASS (2026-11-24) — evidence `tests/reports/TC-003/run12-das-timeline.json`.
