# TC-007 — Both players receive the same piece sequence

- **Area:** Gameplay / piece sequence (seeded RNG)
- **Priority:** High
- **Date run:** 2026-11-23 (run 1: PASS — first 10 pieces; run 2: PASS — first 5 pieces, new seed; run 3: PASS — 9 pieces via spawn-window pixel sampling)
- **Environment:** Chromium (OpenBot browser), production build of `4379d90` served statically at `http://127.0.0.1:4175` (`vite preview`, no HMR), canvas 1920×1080, viewport 1766×1102
- **Spec:** `specs/01-game-design.md` §Overview / §Match Flow / §Seeded RNG — "Both players play simultaneously with identical piece sequence (seeded RNG)"
- **Spec pin:** `specs/01-game-design.md` §Overview / §Match Flow / §Seeded RNG @ `e50f503`

## Preconditions

1. The app is running (static preview) at `http://127.0.0.1:4175`.
2. The Main Menu is shown.

## Expected result

For a match, P1 and P2 receive the **same piece type in the same order**, starting with the first spawn. With level-based piece unlocking not yet reached (level 1–2, standard 7 tetrominoes), the first 10 pieces on both boards must be identical in type and index. A new match (new random seed) may produce a different sequence, but still identical between the players.

## Method

1. Start a match (`Enter` on "Start") and wait through the 3 s countdown.
2. Hook `CanvasRenderingContext2D.fillRect` and `fillText`: record the last 48 px board-cell fill per board region before the per-player score text (`P1 Score: N` / `P2 Score: N` in the HUD). Score equals pieces placed, so piece index = score.
3. Drive 10 pieces on both boards with keyboard (`s` + `ArrowDown` soft drop, alternating `a`/`ArrowLeft` and `d`/`ArrowRight` four taps to spread the stacks and avoid topping out).
4. Map fill colour to piece type: I `#00f0f0`, O `#f0f000`, T `#a000f0`, S `#00f000`, Z `#f00000`, J `#0000f0`, L `#f0a000`.
5. Repeat from a fresh match (Main Menu → Restart) to check a second random seed for the first 5 pieces.

## Actual result

### Run 1 — first 10 pieces: PASS

| Index | P1 | P2 |
|---|---|---|
| 0 | T | T |
| 1 | J | J |
| 2 | J | J |
| 3 | O | O |
| 4 | S | S |
| 5 | T | T |
| 6 | J | J |
| 7 | Z | Z |
| 8 | S | S |
| 9 | O | O |

10/10 identical. Full log: `tests/reports/TC-007/run1-first10-sequence.txt`.

### Run 2 — first 5 pieces, new seed: PASS

| Index | P1 | P2 |
|---|---|---|
| 0 | L | L |
| 1 | Z | Z |
| 2 | J | J |
| 3 | O | O |
| 4 | O | O |

5/5 identical, including two O pieces in a row. The screenshot `run2-after-5-pieces.png` shows both boards with identical stacks, score 5 : 5, and the same NEXT piece (Z) on both sides. Log: `tests/reports/TC-007/run2-first5-sequence.txt`.

Run 1 (T J J O S T J Z S O) and run 2 (L Z J O O) use different sequences, so the sequence is random per match and shared within the match.

### Run 3 — 9 pieces, dev server (canvas pixel sampling): PASS

Independent method: spawn detection in each board's center spawn window (cell columns 3–6, rows 0–3) with exact tetromino palette colours, normalizing shape so a one-frame lock/spawn timing skew is not counted as a mismatch. Run on the Vite dev server at `http://localhost:5173` at `4379d90`.

| Index | P1 | P2 |
|---|---|---|
| 0 | J | J |
| 1 | I | I |
| 2 | T | T |
| 3 | O | O |
| 4 | L | L |
| 5 | J | J |
| 6 | L | L |
| 7 | O | O |
| 8 | T | T |

9/9 identical, and the two "Next" preview regions were pixel-identical at all 9 spawns. Log: `tests/reports/TC-007/run3-devserver-sequence.txt`.

## Status

**PASS** (2026-11-23, `4379d90`) — both players got identical piece types in identical order for the first 10 pieces (run 1) and the first 5 pieces of a second match with a new seed (run 2).
