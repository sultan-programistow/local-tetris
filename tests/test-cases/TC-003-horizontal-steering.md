# TC-003 — Horizontal steering: tap, hold delay (DAS) and repeat (keyboard + gamepad)

- **Area:** Gameplay / input
- **Priority:** High
- **Date run:** 2026-11-23 (run 6)
- **Environment:** Chromium (OpenBot browser), production build served statically at `http://127.0.0.1:4174` (`vite preview`, no HMR), build from `8c932b1` (`HEAD` was `cf8a8f9`, menu-title only), canvas 1920×1080, cell 50 px, P1 board origin (200,40), P2 origin (1220,40)
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
| P1 `a` | +58 ms | one column (3 → 2) | none |
| P1 `d` | +65 ms | one column (3 → 4) | none |
| P2 `ArrowLeft` | +41 ms | one column (3 → 2) | none |
| P2 `ArrowRight` | +49 ms | one column (3 → 4) | none |
| pad0 D-pad left | +36 ms | one column (3 → 2) | none |
| pad0 left stick −1 | +51 ms | one column (3 → 2) | none |

### Sub-case B — hold 900 ms: FAIL (left fails, right passes)

Frames are drawn every ~33 ms, so repeat gaps carry about ±33 ms resolution.

**Right — PASS**

| Input | Press → first cell | Repeat starts | Gaps after first cell |
|---|---|---|---|
| P1 `d` | +65 ms | +399 ms | 334, 100, 100 ms |
| P2 `ArrowRight` | +49 ms | +399 ms | 350, 100, 84 ms |
| pad0 D-pad right | +49 ms | +382 ms | 333, 83, 100 ms |
| pad1 D-pad right | +64 ms | +381 ms | 317, 100, 100 ms |
| pad0 left stick +1 | +50 ms | +383 ms | 333, 84, 100 ms |

**Left — FAIL**

| Input | Press → first cell | Repeat starts | Gaps after first cell | Then |
|---|---|---|---|---|
| P1 `a` | +60 / +63 / +58 ms | +227 / +230 / +225 ms | **167 / 167 / 167 ms** | +294 / +297 / +292 ms, wall |
| P2 `ArrowLeft` | +41 ms | +224 ms | **183 ms** | +291 ms, wall |
| pad0 D-pad left | +36 ms | **never** | — | no move in 900 ms |
| pad0 left stick −1 | +51 ms | **never** | — | no move in 900 ms |
| pad1 D-pad left | +51 ms | **never** | — | no move in 900 ms |
| pad1 left stick −1 | +46 ms | **never** | — | no move in 900 ms |

Right inputs now match the spec: ~350 ms initial delay, then repeats at the ~75 ms ARR within frame resolution. Left inputs do not: keyboard-left starts repeating after ~167–183 ms instead of 350 ms (and its repeat spacing, ~67 ms, is also faster than the right side's ~100 ms), while gamepad D-pad and stick hold never auto-repeat at all in 900 ms.

## Status

**FAIL** (run 6) — tap moves exactly one column for every input, and right-hold now matches the spec (350 ms then ~75 ms) for keyboard and gamepad. **Left-hold does not**: keyboard-left delay is ~167 ms instead of 350 ms, and gamepad-left (D-pad and left stick, both pads) never auto-repeats.

## Run history

| Run | Date | Result | Notes |
|---|---|---|---|
| 1 | 2026-11-23 | PASS | keyboard moves and gamepad D-pad/stick single moves; hold timing not measured |
| 2–4 | 2026-11-23 | PASS | re-checks after input/gamepad changes (dev server) |
| 5 | 2026-11-23 | FAIL | hold timing added; keyboard-left delay ~200 ms; gamepad hold never repeats |
| 6 | 2026-11-23 | FAIL | after Developer DAS fix `8c932b1`: right now passes (350 ms then 75 ms, all inputs); left fails (keyboard ~167 ms, gamepad no repeat) |

## Verification

Per-frame analysis via a `fillRect` hook, current piece = last four cell fills per side, timestamps relative to the input press. Raw timeline: `tests/reports/TC-003/run6-das-timeline.txt`. No image input used.

## Notes / follow-up

- Hold timing is new coverage in this case (runs 1–4 only checked single moves), so the failures are not regressions of a previously passing check.
- Run 6 re-tests the Developer's DAS fix (`8c932b1`): right direction fixed, left direction still wrong in a different way.
- Root cause is out of scope for this test asset.
