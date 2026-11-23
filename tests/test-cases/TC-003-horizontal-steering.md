# TC-003 — Horizontal steering: tap, hold delay (DAS) and repeat (keyboard + gamepad)

- **Area:** Gameplay / input
- **Priority:** High
- **Date run:** 2026-11-23 (run 8)
- **Environment:** Chromium (OpenBot browser), production build served statically at `http://127.0.0.1:4174` (`vite preview`, no HMR), build from `557f95b`, canvas 1920×1080, cell 50 px, P1 board origin (200,40), P2 origin (1220,40)
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
| P1 `a` | +43 ms | one column (3 → 2) | none |
| P1 `d` | +43 ms | one column (3 → 4) | none |
| P2 `ArrowLeft` | +50 ms | one column (3 → 2) | none |
| P2 `ArrowRight` (run 6) | +49 ms | one column (3 → 4) | none |
| pad0 D-pad left | +38 ms | one column (3 → 2) | none |
| pad0 left stick −1 | +33 ms | one column (3 → 2) | none |

### Sub-case B — hold 900 ms: FAIL (left fails, right passes)

Frames are drawn every ~33 ms, so repeat gaps carry about ±33 ms resolution.

**Right — PASS**

| Input | Press → first cell | Repeat starts | Gaps after first cell |
|---|---|---|---|
| P1 `d` | +43 ms | +377 ms | 334, 83, 83 ms |
| pad0 D-pad right | +63 ms | +380 ms | 317, 100, 100 ms |
| pad0 left stick +1 | +59 ms | +392 ms | 333, 84, 83, 83 ms |

**Left — FAIL**

| Input | Press → first cell | Repeat starts | Gaps after first cell | Then |
|---|---|---|---|---|
| P1 `a` | +52 / +47 ms | +235 / +213 ms | **183 / 166 ms** | +302 / +263 ms, wall |
| P2 `ArrowLeft` | +50 ms | +217 ms | **167 ms** | +283 ms, wall |
| pad0 D-pad left | +46 ms | **never** | — | no move in 900 ms |
| pad1 D-pad left | +41 ms | **never** | — | no move in 900 ms |
| pad0 left stick −1 | +33 ms | **never** | — | no move in 900 ms |

Right inputs match the spec (~350 ms initial delay, then ~75 ms ARR within frame resolution). Left inputs are unchanged from runs 6–7: keyboard-left starts repeating after ~166–183 ms instead of 350 ms (repeat spacing ~50–67 ms, faster than the right side's ~83–100 ms), and gamepad D-pad/stick left never auto-repeat.

## Status

**FAIL** (run 8) — tap moves exactly one column for every input; right-hold meets the spec for keyboard and gamepad; **left-hold still does not**: keyboard-left delay ~166–183 ms instead of 350 ms, and gamepad-left (D-pad and left stick) never auto-repeats.

## Run history

| Run | Date | Result | Notes |
|---|---|---|---|
| 1 | 2026-11-23 | PASS | keyboard moves and gamepad D-pad/stick single moves; hold timing not measured |
| 2–4 | 2026-11-23 | PASS | re-checks after input/gamepad changes (dev server) |
| 5 | 2026-11-23 | FAIL | hold timing added; keyboard-left delay ~200 ms; gamepad hold never repeats |
| 6 | 2026-11-23 | FAIL | after DAS fix `8c932b1`: right passes (350 ms then 75 ms); left fails (keyboard ~167 ms, gamepad no repeat) |
| 7 | 2026-11-23 | FAIL | after left-DAS fix `4a16841`: left values identical to run 6; right unchanged and passing |
| 8 | 2026-11-23 | FAIL | after key-edge fix `557f95b`: left still identical (keyboard ~166–183 ms, gamepad-left no repeat); right passes |

## Verification

Per-frame analysis via a `fillRect` hook, current piece = last four cell fills per side, timestamps relative to the input press. One synthetic keydown per press, so OS key auto-repeat is not involved. Raw timelines: `tests/reports/TC-003/run6-das-timeline.txt`, `run7-das-timeline.txt`, `run8-das-timeline.txt`. No image input used.

## Notes / follow-up

- Hold timing is new coverage in this case (runs 1–4 only checked single moves), so the failures are not regressions of a previously passing check.
- Runs 6–8 re-test DAS fixes (`8c932b1`, `4a16841`, `557f95b`): right direction fixed and stable, left direction still wrong in the same way each time.
- Gamepad-left (no keydown path at all) fails identically, so the left defect is not specific to keyboard edge detection.
- Root cause is out of scope for this test asset.
