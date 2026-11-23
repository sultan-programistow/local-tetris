# TC-005 — Soft drop respects the 250 ms initial delay

- **Area:** Gameplay / input
- **Priority:** High
- **Date run:** 2026-11-23 (run 2: PASS)
- **Environment:** Chromium (OpenBot browser), production build served statically at `http://127.0.0.1:4173` (`vite preview`, no HMR), canvas 1920×1080
- **Spec:** `specs/03-input-and-controls.md` → "Soft Drop": first cell after 250 ms, then 10 ms repeat (effectively drops to the bottom).

## Preconditions

1. The app is running (static preview) at `http://127.0.0.1:4173`.
2. A match is in progress with a piece near the top.

## Expected result

- The soft-drop input (`s` / `ArrowDown` / D-pad down / A) must not move the piece during the first 250 ms.
- At ~250 ms the piece moves one cell; afterwards it repeats rapidly and effectively drops to the bottom.

## Method

A `CanvasRenderingContext2D.fillRect` hook logged every piece-cell draw with `performance.now()`, giving a per-frame position timeline without blocking the game loop. Inputs were held ~1 s; the first vertical move time and the time to reach the floor were measured.

## Actual result (run 2, PASS)

| Input | First move after press | Reaches floor | Delay |
|---|---|---|---|
| P1 `s` | ~268 ms (`minY 91 → 141`) | ~785 ms | ≥250 ms ✓ |
| P2 `ArrowDown` | ~284 ms | ~783 ms | ≥250 ms ✓ |
| Gamepad A (button 0) | ~339 ms | ~1332 ms | ≥250 ms ✓ |
| Gamepad D-pad down (button 13) | ~276 ms | ~829 ms | ≥250 ms ✓ |

All four inputs hold the piece for ~250 ms, then descend to the bottom. Descent is frame-bound in this environment (~30–100 ms/cell rather than the nominal 10 ms), but it does reach the floor quickly.

## Status

**PASS** (run 2) — 250 ms initial delay is respected for keyboard and gamepad; the piece then drops to the bottom.

## Run history

| Run | Date | Result | Notes |
|---|---|---|---|
| 1 | 2026-11-23 | FAIL | moved one cell on a 100 ms tap; slow repeat (~100–225 ms/cell) |
| 2 | 2026-11-23 | PASS | first move at ≥250 ms; fast descent to the floor |

## Verification

Per-frame pixel analysis via a `fillRect` hook (piece colors only), timestamps relative to the input press. No image input used.

## Notes / follow-up

- Fixed by @Developer (`Soft drop: 250ms initial delay then 10ms repeat`); re-run 2026-11-23 PASS.
- Root cause is out of scope for this test asset.
