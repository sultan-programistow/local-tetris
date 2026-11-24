# TC-003 — Horizontal steering: tap, hold delay (DAS) and repeat (keyboard + gamepad)

- **Area:** Gameplay / input
- **Priority:** High
- **Date run:** 2026-11-24 (run 11: PASS, automated; manual run 10: PASS)
- **Environment:** Chromium (OpenBot browser), production build served statically at `http://127.0.0.1:4174` (`vite preview`, no HMR), build from `3798531`, canvas 1920×1080, cell 50 px, P1 board origin (200,40), P2 origin (1220,40)
- **Automated:** `tests/e2e/tc-003-horizontal-steering.spec.ts` — `npm run test TC-003`
- **Spec:** `specs/03-input-and-controls.md` → Keyboard, Gamepad, DAS (initial delay 350 ms, repeat 75 ms, keyboard and gamepad)
- **Spec pin:** `specs/03-input-and-controls.md` §DAS @ `a27d32b` (350 ms initial delay, 75 ms repeat). Re-check the pin when the spec changes.

## Preconditions

1. The app is running (static preview) at `http://127.0.0.1:4174`.
2. A fresh match is in progress with a falling piece for both players.

## Expected result

**A. Tap (single step).** A short tap (~130 ms) of the left/right input moves the piece **exactly one column** immediately, and no further.

**B. Hold (initial delay, then auto-repeat).** Holding left/right moves one column at the press edge, provides **no further movement for 350 ms**, then repeats every **75 ms** (DAS/ARR). This applies to keyboard (`a`/`d` for P1, `←`/`→` for P2), gamepad D-pad left/right, and gamepad left stick.

Same inputs as TC-005's soft-drop matrix: keyboard and gamepad must both honour the hold delay.

## Method

`CanvasRenderingContext2D.fillRect` hook logged every drawn 50 px board cell with `performance.now()`. The current piece is the last four cells drawn for each side (locked board cells are drawn first); its left edge gives the column. A fresh match was started per run with a unique page URL (so no stale board carried over), and the hold was ended by an in-page `setTimeout`, so harness sleep drift does not skew the release time. Gamepads were mocked via `navigator.getGamepads()` (pad 0 → P1, pad 1 → P2).

## Actual result

### Sub-case A — tap: PASS

| Input | Press → first move | Move | Extra moves |
|---|---|---|---|
| P1 `a` | +37 ms | one column (3 → 2) | none |
| P1 `d` | +61 ms | one column (3 → 4) | none |
| P2 `ArrowLeft` | +25 ms | one column (3 → 2) | none |
| P2 `ArrowRight` | +38 ms | one column (3 → 4) | none |
| pad0 D-pad left | +51 ms | one column (3 → 2) | none |
| pad0 left stick −1 | +40 ms | one column (3 → 2) | none |

### Sub-case B — hold 900 ms: PASS

Frames are drawn every ~33 ms, so a 350 ms delay reads 317–383 ms and a 75 ms repeat reads 67–100 ms; all inputs are inside that band.

| Input | Press → first cell | Repeat starts | Gaps after first cell |
|---|---|---|---|
| P1 `a` | +62 / +61 ms | +395 / +395 ms | 333 / 334, 83 / 67 ms |
| P2 `ArrowLeft` | +25 / +53 ms | +375 / +370 ms | 350 / 317, 83 / 99 ms |
| pad0 D-pad left | +39 ms | +389 ms | 350, 67 ms |
| pad1 D-pad left | +19 ms | +402 ms | 383, 100 ms |
| pad0 left stick −1 | +40 ms | +390 ms | 350, 100 ms |
| P1 `d` | +61 ms | +377 ms | 316, 100, 83 ms |
| P2 `ArrowRight` | +38 ms | +372 ms | 334, 100, 100, 100 ms |
| pad0 D-pad right | +65 ms | +432 ms | 367, 100, 100 ms |
| pad1 D-pad right | +65 ms | +416 ms | 351, 99, 100 ms |
| pad0 left stick +1 | +65 ms | +432 ms | 367, 83 ms |

Left and right now behave the same, for keyboard and gamepad. (Later moves end at the wall; only the measured gaps are shown.)

## Status

**PASS** (run 11 automated, manual run 10) — tap moves exactly one column; hold moves one column at the press edge, then repeats after ~350 ms and every ~75 ms, the same for keyboard and gamepad in both directions.

## Run history

| Run | Date | Result | Notes |
|---|---|---|---|
| 1 | 2026-11-23 | PASS | keyboard moves and gamepad D-pad/stick single moves; hold timing not measured |
| 2–4 | 2026-11-23 | PASS | re-checks after input/gamepad changes (dev server) |
| 5 | 2026-11-23 | FAIL | hold timing added; keyboard-left delay ~200 ms; gamepad hold never repeats |
| 6 | 2026-11-23 | FAIL | after DAS fix `8c932b1`: right passes; left fails (keyboard ~167 ms, gamepad no repeat) |
| 7 | 2026-11-23 | FAIL | after left-DAS fix `4a16841`: left identical to run 6; right passing |
| 8 | 2026-11-23 | FAIL | after key-edge fix `557f95b`: left identical; right passing |
| 9 | 2026-11-23 | FAIL | after gamepad-timer fix `ff18d12`: gamepad-left passes; keyboard-left still ~167 ms |
| 10 | 2026-11-23 | PASS |
| 11 | 2026-11-24 | PASS (automated) | `npm run test TC-003`: tap = exactly one column on all 10 paths; hold delay 312–385 ms, then repeats every 73–114 ms (spec 350/75, frame-quantised) | after dead-loop removal `3798531`: left and right both ~350 ms then ~75 ms, keyboard and gamepad |

## Verification

Per-frame analysis via a `fillRect` hook, current piece = last four cell fills per side, timestamps relative to the input press. One synthetic keydown per keyboard press. Raw timelines: `tests/reports/TC-003/run5..run10-das-timeline.txt`. No image input used.

## Notes / follow-up

- Hold timing is new coverage in this case (runs 1–4 only checked single moves), so the earlier failures were not regressions of a previously passing check.
- Runs 6–9 re-tested DAS fixes (`8c932b1`, `4a16841`, `557f95b`, `ff18d12`); the remaining keyboard-left defect was resolved in `3798531`.
- Root cause is out of scope for this test asset.

## Automation (run 11)

`tests/e2e/tc-003-horizontal-steering.spec.ts`, run with `npm run test TC-003` on the production build at 1600×900. The current piece's column is sampled once per animation frame from the read-only `?e2e=1` hook, so each column change is timed without a `fillRect` hook or a fixed sleep. Inputs: P1 `a`/`d`, P2 `←`/`→`, D-pad left/right on pads 0 and 1, and pad 0's left stick.

Tap: exactly one move, no second move in the 400 ms after release. Hold: press-edge move, then a gap of 250–500 ms, then repeats with gaps ≤ 200 ms. A move caused by a new piece spawning at x = 3 is excluded, so a lock during the window cannot fake a repeat.

Mutation check: setting the keyboard DAS threshold to 0 (repeat immediately) fails the hold-delay assertion; restored afterwards.

Evidence: `tests/reports/TC-003/run11-das-timeline.json` (per-input tap count, gaps, columns), `run11-after-das.png`.
