# TC-005 — Soft drop: 250 ms initial delay + one cell per tap

- **Area:** Gameplay / input
- **Priority:** High
- **Date run:** 2026-11-23 (run 3: sub-case B FAIL)
- **Environment:** Chromium (OpenBot browser), production build served statically at `http://127.0.0.1:4173` (`vite preview`, no HMR), canvas 1920×1080, cell 50 px
- **Spec:** `specs/03-input-and-controls.md` → "Soft Drop": first cell after 250 ms, then 10 ms repeat (effectively drops to the bottom); keyboard `S`/`↓`, gamepad D-pad down / A.

## Preconditions

1. The app is running (static preview) at `http://127.0.0.1:4173`.
2. A match is in progress with a piece near the top of the board.

## Expected result

**A. Hold (initial delay).** While a soft-drop input is held, the piece must not move during the first 250 ms; at ~250 ms it moves one cell, then repeats rapidly and drops to the bottom.

**B. Tap (single step).** A short tap (~120 ms, shorter than the 250 ms delay) of `S` / `ArrowDown` / gamepad D-pad down / gamepad A must move the piece **exactly one cell down immediately**, and no further.

`W` is bound to rotate CW in the spec (`W`/`X` = rotate CW for P1), so a `W` tap is expected to rotate the piece, not to move it down.

## Method

A `CanvasRenderingContext2D.fillRect` hook logged every drawn board cell with `performance.now()`, giving a per-frame position timeline without blocking the game loop. Each player's cells were split by x (P1 x < 900, P2 x ≥ 900); a downward move is a +50 px change in the piece's top row.

Because both players share the gravity interval, their cells move in lockstep every ~800 ms at level 1 — any step that moves **both** players is gravity, and only a step affecting **one** player can be attributed to that player's input.

- Run 1: five 120 ms taps (`s`, `ArrowDown`, `w`, D-pad down, A), 1.2 s observation each.
- Run 2: the same taps plus 350 ms holds as controls, with piece bounding-box tracking (to detect rotation).

## Actual result

### Sub-case A — hold: PASS (run 2)

| Input | First move after press | Reaches floor | Delay |
|---|---|---|---|
| P1 `s` | ~268 ms (`minY 91 → 141`) | ~785 ms | ≥250 ms ✓ |
| P2 `ArrowDown` | ~284 ms | ~783 ms | ≥250 ms ✓ |
| Gamepad A (button 0) | ~339 ms | ~1332 ms | ≥250 ms ✓ |
| Gamepad D-pad down (button 13) | ~276 ms | ~829 ms | ≥250 ms ✓ |

### Sub-case B — tap: FAIL (run 1 + run 2)

120 ms taps produced **no** piece movement. The piece only advanced on the next shared gravity step (~800 ms cadence, both players at once).

| Input | Tap window (ms) | Downward step after the tap | Attribution |
|---|---|---|---|
| P1 `s` | 5212–5332 | 5221 (dy 50) | gravity — **both** players moved |
| P2 `ArrowDown` | 6536–6656 | 6854 (dy 50) | gravity — both players |
| P1 `w` | 7856–7978 | 8487 (dy 50) | gravity — both players; no rotation visible in bbox |
| D-pad down (P1) | 9178–9299 | 9305 (dy 50) | gravity — both players |
| A (P1) | 10499–10619 | 10921 (dy 50) | gravity — both players |

Run 2 repeated the taps with the same result (no single-player step within the press/release window):

| Input | Tap window (ms) | Next downward step | Attribution |
|---|---|---|---|
| P1 `s` | 4993–5113 | 5183 | gravity (both) |
| P2 `ArrowDown` | 6864–6984 | 7634 | gravity (both) |
| P1 `w` | 12989–13109 | 13017: bbox 150×50 → 50×150 | **rotation** (CW), no downward move |
| D-pad down (P1) | 8990–9110 | 9250 | gravity (both) |
| A (P1) | 10861–10981 | 10917 | gravity (both) |

Control (350 ms hold, run 2), which *should* cross the 250 ms threshold:

| Input | Hold window (ms) | Single-player step |
|---|---|---|
| P1 `s` | 5813–6163 | one cell at 6184 (371 ms after press) |
| P2 `ArrowDown` | 7684–8034 | none (next step 8417, both players) |
| D-pad down (P1) | 9810–10161 | one cell at 10184 (374 ms after press) |
| A (P1) | 11681–12031 | none (next step 12517, both players) |

So a tap shorter than 250 ms does nothing at all, and even a 350 ms hold moved at most one cell in half of the cases.

## Status

**FAIL** (run 3) — sub-case A (250 ms initial delay) still passes; sub-case B (a tap moves the piece one cell) fails for all four inputs. `W` behaves per spec (rotates), so it is not a soft-drop binding.

## Run history

| Run | Date | Result | Notes |
|---|---|---|---|
| 1 | 2026-11-23 | FAIL | moved one cell on a 100 ms tap; slow repeat (~100–225 ms/cell) |
| 2 | 2026-11-23 | PASS | first move at ≥250 ms; fast descent to the floor |
| 3 | 2026-11-23 | FAIL | sub-case B added: 120 ms taps move nothing; holds cross 250 ms inconsistently |

## Verification

Per-frame pixel analysis via a `fillRect` hook (piece/board cells only), timestamps relative to the input press. Gamepads mocked by overriding `navigator.getGamepads()` (pad 0 → P1, pad 1 → P2). No image input was needed; the numbers above are the evidence.

## Notes / follow-up

- Run 2 (hold) remains valid; run 3 adds the tap sub-case.
- Observation to check against the spec: the spec says the first cell comes at 250 ms, while a tap is expected to move one cell immediately; run 3 also showed 350 ms holds sometimes yielding zero/single cells.
- Root cause is out of scope for this test asset.
