# TC-005 — Soft drop: one cell per tap, hold delay before rapid drop

- **Area:** Gameplay / input
- **Priority:** High
- **Date run:** 2026-11-23 (run 4: tap PASS, hold delay deviates from spec)
- **Environment:** Chromium (OpenBot browser), production build served statically at `http://127.0.0.1:4173` (`vite preview`, no HMR), canvas 1920×1080, cell 50 px
- **Spec:** `specs/03-input-and-controls.md` → "Soft Drop": first cell 250 ms, then 10 ms repeat (effectively drops to the bottom); keyboard `S`/`↓`, gamepad D-pad down / A.

## Preconditions

1. The app is running (static preview) at `http://127.0.0.1:4173`.
2. A match is in progress with a falling piece.

## Expected result

**A. Tap (single step).** A short tap (~120 ms) of `S` / `ArrowDown` / gamepad D-pad down / gamepad A moves the piece **exactly one cell down immediately**, and no further.

**B. Hold (initial delay, then rapid drop).** Holding a soft-drop input moves one cell at the press edge, provides no further movement for the spec's 250 ms, then repeats rapidly and drops to the bottom.

`W` is bound to rotate CW in the spec (`W`/`X` = rotate CW for P1), so a `W` tap must rotate the piece, not move it down.

## Method

A `CanvasRenderingContext2D.fillRect` hook logged every drawn board cell with `performance.now()`, giving a per-frame position timeline without blocking the game loop. Player cells were split by x (P1 x < 900, P2 x ≥ 900); a downward move is a +50 px change in the piece's top row. Both players share the gravity interval (~800 ms at level 1) and move in lockstep, so a step that moves **both** players is gravity and only a step on **one** player is attributed to its input. Gamepads mocked via `navigator.getGamepads()` (pad 0 → P1, pad 1 → P2).

## Actual result

### Sub-case A — tap: PASS (run 4)

| Input | Press → first downward step | Move | Extra cells before next gravity step |
|---|---|---|---|
| P1 `S` | 4847 → 4906 (+59 ms) | one cell | none |
| P2 `ArrowDown` | 5668 → 5722 (+54 ms) | one cell | none |
| D-pad down (P1) | 6489 → 6555 (+66 ms) | one cell | none |
| A (P1) | 7310 → 7356 (+46 ms) | one cell | none |
| P1 `W` | 8130 → 8139: bbox 150×50 → 50×150 | rotation only | no downward move (correct per spec) |

### Sub-case B — hold: FAIL against spec (run 4)

| Input | Press → first cell | Repeat starts | Gap after first cell | Then |
|---|---|---|---|---|
| P1 `S` | +35 ms | +335 ms | 300 ms | ~33 ms/cell to the floor |
| P2 `ArrowDown` | +34 ms | +384 ms | 350 ms | ~33 ms/cell to the floor |
| D-pad down (P1) | +66 ms | +416 ms | 350 ms | ~33 ms/cell to the floor |
| A (P1) | +50 ms | +417 ms | 367 ms | ~33 ms/cell to the floor |

The hold repeat uses a **350 ms** delay (`src/main.ts`: `if (p._sdTimer >= 350)`), while the spec says 250 ms. Everything else matches: one cell at the press edge, no further movement until the delay elapses, then a rapid drop to the floor.

## Status

**FAIL** (run 4) — sub-case A (tap = one cell) now passes for keyboard and gamepad; `W` behaves per spec. Sub-case B deviates from the written spec on one value: the hold delay is 350 ms, not 250 ms.

## Run history

| Run | Date | Result | Notes |
|---|---|---|---|
| 1 | 2026-11-23 | FAIL | moved one cell on a 100 ms tap; slow repeat (~100–225 ms/cell) |
| 2 | 2026-11-23 | PASS | first move at ≥250 ms; fast descent to the floor |
| 3 | 2026-11-23 | FAIL | tap sub-case added: 120 ms taps moved nothing |
| 4 | 2026-11-23 | FAIL | tap now moves one cell (PASS); hold repeat delay 350 ms vs spec 250 ms |

## Verification

Per-frame pixel analysis via a `fillRect` hook (piece/board cells only), timestamps relative to the input press. Raw timelines: `tests/reports/TC-005/run3-tap-timeline.txt` (before the fix) and `tests/reports/TC-005/run4-tap-hold-timeline.txt` (after). No image input used.

## Notes / follow-up

- Implemented by @Developer in `e9ddd8c` ("Soft drop tap moves one cell immediately") at Tester's request; 350 ms is the constant in that commit.
- Open decision: keep 250 ms (spec) or update the spec to 350 ms.
- Root cause is out of scope for this test asset.
