# TC-005 — Soft drop respects the 250 ms initial delay

- **Area:** Gameplay / input
- **Priority:** High
- **Date run:** 2026-11-23
- **Environment:** Chromium (OpenBot browser), `http://localhost:5173`, dev server, viewport 1766×1102, canvas 1920×1080 (scaled)
- **Spec:** `specs/03-input-and-controls.md` → "Soft Drop": first cell after 250 ms, then 10 ms repeat (effectively drops to the bottom); DAS initial delay 250 ms.

## Preconditions

1. The app is running (`npm run dev`) at `http://localhost:5173`.
2. A match is in progress with a piece near the top.

## Expected result

- Holding the soft-drop input (`s` for P1, `ArrowDown` for P2, D-pad down / A for gamepad) must not move the piece during the first 250 ms.
- At ~250 ms the piece moves one cell; afterwards it repeats every ~10 ms and effectively drops to the bottom.

## Steps

1. Load `http://localhost:5173`, start a match, wait for the current piece near the top.
2. Pick up the piece's top row (`minY`).
3. Short tap: press and release the soft-drop key after 100 ms; sample `minY` → expected **no** movement (delay not elapsed).
4. Longer hold: hold the key ~450 ms; sample `minY` → expected the piece reaches the bottom rapidly.

## Actual result

Keyboard, both players — the delay is **not** respected:

| Player | Input | Start `minY` | After 100 ms tap | After 450 ms hold |
|---|---|---|---|---|
| P1 | `s` | 51 (row 1) | 101 (row 2) — moved 1 cell | 301 (row 6) — ~4 cells |
| P2 | `ArrowDown` | 51 (row 1) | 101 (row 2) — moved 1 cell | 351 (row 7) — ~5 cells |
| P1 gamepad | A (button 0) | 1 (row 0) | 51 (row 1) — moved 1 cell | 151 (row 3) — ~2 cells |
| P1 gamepad | D-pad down (button 13) | 51 (row 1) | 101 (row 2) — moved 1 cell | 301 (row 6) — ~4 cells |

A 100 ms tap already moves the piece one cell (expected: no move before 250 ms). The longer hold descends roughly one cell per ~100–225 ms rather than the specified 10 ms repeat / rapid drop to the bottom.

## Status

**FAIL** — soft drop moves immediately instead of waiting 250 ms, and the repeat is far slower than 10 ms.

## Gamepad verification (static build)

Gamepad soft drop was checked against the production build served statically (`vite preview` on `http://127.0.0.1:4173`, no HMR) to avoid dev-server reloads wiping the mock gamepad. Mock pads were injected via `navigator.getGamepads()` (pad 0 → P1). Results in the table above: both the A button and D-pad down move one cell on a 100 ms tap and only descend slowly on a 450 ms hold.

## Verification

Canvas pixel sampling of exact piece-colored pixels (`getImageData` over the board region), sampling `minY` before/after timed key/gamepad holds. No image input used.

## Notes / follow-up

- New failing case; not reported to @Developer per current workflow (new cases go through re-spec first).
- Root cause is out of scope for this test asset.
