# TC-003 — Horizontal steering: tap, hold delay (DAS) and repeat (keyboard + gamepad)

- **Area:** Gameplay / input
- **Priority:** High
- **Date run:** 2026-11-23 (run 7)
- **Environment:** Chromium (OpenBot browser), production build served statically at `http://127.0.0.1:4174` (`vite preview`, no HMR), build from `4a16841`, canvas 1920×1080, cell 50 px, P1 board origin (200,40), P2 origin (1220,40)
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
| P1 `a` | +44 ms | one column (3 → 2) | none |
| P1 `d` | +57 ms | one column (3 → 4) | none |
| P2 `ArrowLeft` | +66 ms | one column (3 → 2) | none |
| P2 `ArrowRight` (run 6) | +49 ms | one column (3 → 4) | none |
| pad0 D-pad left | +66 ms | one column (3 → 2) | none |
| pad0 left stick −1 | +50 ms | one column (3 → 2) | none |

### Sub-case B — hold 900 ms: FAIL (left fails, right passes)

Frames are drawn every ~33 ms, so repeat gaps carry about ±33 ms resolution.

**Right — PASS**

| Input | Press → first cell | Repeat starts | Gaps after first cell |
|---|---|---|---|
| P1 `d` | +57 ms | +407 ms | 350, 100, 100 ms |
| pad0 D-pad right | +39 ms | +372 ms | 333, 101, 100 ms |

(Run 6 also passed `ArrowRight`, pad1 D-pad right and left stick +1 with the same timings.)

**Left — FAIL**

| Input | Press → first cell | Repeat starts | Gaps after first cell | Then |
|---|---|---|---|---|
| P1 `a` | +49 ms | +233 ms | **184 ms** | +299 ms, wall |
| P2 `ArrowLeft` | +66 ms | +233 ms | **167 ms** | +299 ms, wall |
| pad0 D-pad left | +40 ms | **never** | — | no move in 900 ms |
| pad1 D-pad left | +38 ms | **never** | — | no move in 900 ms |
| pad0 left stick −1 | +50 ms | **never** | — | no move in 900 ms |

Right inputs match the spec (~350 ms initial delay, then ~75 ms ARR within frame resolution). Left inputs are unchanged from run 6: keyboard-left starts repeating after ~167–184 ms instead of 350 ms (repeat spacing ~66 ms, faster than the right side's ~100 ms), and gamepad D-pad/stick left never auto-repeat.

## Status

**FAIL** (run 7) — tap moves exactly one column for every input; right-hold meets the spec for keyboard and gamepad; **left-hold still does not**: keyboard-left delay ~167–184 ms instead of 350 ms, and gamepad-left (D-pad and left stick) never auto-repeats.

## Run history

| Run | Date | Result | Notes |
|---|---|---|---|
| 1 | 2026-11-23 | PASS | keyboard moves and gamepad D-pad/stick single moves; hold timing not measured |
| 2–4 | 2026-11-23 | PASS | re-checks after input/gamepad changes (dev server) |
| 5 | 2026-11-23 | FAIL | hold timing added; keyboard-left delay ~200 ms; gamepad hold never repeats |
| 6 | 2026-11-23 | FAIL | after DAS fix `8c932b1`: right passes (350 ms then 75 ms); left fails (keyboard ~167 ms, gamepad no repeat) |
| 7 | 2026-11-23 | FAIL | after left-DAS fix `4a16841`: left values identical to run 6 (keyboard ~167–184 ms, gamepad-left no repeat); right unchanged and passing |

## Verification

Per-frame analysis via a `fillRect` hook, current piece = last four cell fills per side, timestamps relative to the input press. Raw timelines: `tests/reports/TC-003/run6-das-timeline.txt`, `tests/reports/TC-003/run7-das-timeline.txt`. No image input used.

## Notes / follow-up

- Hold timing is new coverage in this case (runs 1–4 only checked single moves), so the failures are not regressions of a previously passing check.
- Runs 6 and 7 re-test DAS fixes (`8c932b1`, `4a16841`): right direction fixed, left direction still wrong in the same way.
- Root cause is out of scope for this test asset.
