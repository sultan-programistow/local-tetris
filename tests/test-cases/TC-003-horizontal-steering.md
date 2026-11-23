# TC-003 — Horizontal steering: tap, hold delay (DAS) and repeat (keyboard + gamepad)

- **Area:** Gameplay / input
- **Priority:** High
- **Date run:** 2026-11-23 (run 9)
- **Environment:** Chromium (OpenBot browser), production build served statically at `http://127.0.0.1:4174` (`vite preview`, no HMR), build from `ff18d12`, canvas 1920×1080, cell 50 px, P1 board origin (200,40), P2 origin (1220,40)
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
| P1 `a` | +66 ms | one column (3 → 2) | none |
| P1 `d` | +40 ms | one column (3 → 4) | none |
| P2 `ArrowLeft` | +60 ms | one column (3 → 2) | none |
| P2 `ArrowRight` | +65 ms | one column (3 → 4) | none |
| pad0 D-pad left | +63 ms | one column (3 → 2) | none |
| pad0 left stick −1 | +37 ms | one column (3 → 2) | none |

### Sub-case B — hold 900 ms: FAIL (keyboard-left only)

Frames are drawn every ~33 ms, so repeat gaps carry about ±33 ms resolution.

**Right — PASS**

| Input | Press → first cell | Repeat starts | Gaps after first cell |
|---|---|---|---|
| P1 `d` | +40 / +37 ms | +374 / +370 ms | 334 / 333, 99 / 101 ms |
| P2 `ArrowRight` | +65 ms | +398 ms | 333, 100, 101 ms |
| pad0 D-pad right | +42 ms | +426 ms | 384, 99, 101 ms |
| pad1 D-pad right | +47 ms | +430 ms | 383, 101, 83 ms |
| pad0 left stick +1 | +66 ms | +433 ms | 367, 84, 99 ms |

**Left — gamepad PASS, keyboard FAIL**

| Input | Press → first cell | Repeat starts | Gaps after first cell | Then |
|---|---|---|---|---|
| pad0 D-pad left | +59 ms | +409 ms | 350, 99 ms | wall |
| pad1 D-pad left | +35 ms | +385 ms | 350, 100 ms | wall |
| pad0 left stick −1 | +37 ms | +404 ms | 367, 100 ms | wall |
| pad1 left stick −1 | +65 ms | +431 ms | 366, 100 ms | wall |
| P1 `a` | +49 / +62 / +44 ms | +216 / +229 / +211 ms | **167 / 167 / 167 ms** | +283 / +295 / +277 ms, wall |
| P2 `ArrowLeft` | +60 / +34 ms | +227 / +200 ms | **167 / 166 ms** | +294 / +233 ms, wall |

Gamepad hold now matches the spec in both directions (~350 ms, then ~75 ms within frame resolution). Keyboard-right matches too. **Keyboard-left does not**: first repeat after ~166–167 ms instead of 350 (5 runs, both players), and its repeat spacing (33–67 ms) is faster than the right side's (~100 ms).

## Status

**FAIL** (run 9) — tap is correct for every input; right-hold and gamepad-left hold meet the spec; **keyboard-left hold is still wrong**: first repeat ~167 ms after the press-edge cell instead of 350 ms, with faster repeats than the right side.

## Run history

| Run | Date | Result | Notes |
|---|---|---|---|
| 1 | 2026-11-23 | PASS | keyboard moves and gamepad D-pad/stick single moves; hold timing not measured |
| 2–4 | 2026-11-23 | PASS | re-checks after input/gamepad changes (dev server) |
| 5 | 2026-11-23 | FAIL | hold timing added; keyboard-left delay ~200 ms; gamepad hold never repeats |
| 6 | 2026-11-23 | FAIL | after DAS fix `8c932b1`: right passes; left fails (keyboard ~167 ms, gamepad no repeat) |
| 7 | 2026-11-23 | FAIL | after left-DAS fix `4a16841`: left values identical to run 6; right passing |
| 8 | 2026-11-23 | FAIL | after key-edge fix `557f95b`: left still identical; right passing |
| 9 | 2026-11-23 | FAIL | after gamepad-timer fix `ff18d12`: gamepad-left now passes (350/100); **keyboard-left still ~167 ms**; right passing |

## Verification

Per-frame analysis via a `fillRect` hook, current piece = last four cell fills per side, timestamps relative to the input press. One synthetic keydown per keyboard press, so OS key auto-repeat is not involved. Raw timelines: `tests/reports/TC-003/run6..run9-das-timeline.txt`. No image input used.

## Notes / follow-up

- Hold timing is new coverage in this case (runs 1–4 only checked single moves), so the failures are not regressions of a previously passing check.
- Runs 6–9 re-test DAS fixes (`8c932b1`, `4a16841`, `557f95b`, `ff18d12`). Remaining defect is limited to keyboard-left: gamepad both directions and keyboard-right now pass.
- Root cause is out of scope for this test asset.
