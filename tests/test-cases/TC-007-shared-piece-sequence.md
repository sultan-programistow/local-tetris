# TC-007 — Both players receive the same piece sequence

- **Area:** Gameplay / piece sequence (seeded RNG)
- **Priority:** High
- **Spec pin:** `specs/01-game-design.md` §Overview / §Match Flow / §Seeded RNG @ `e50f503` — "Both players play simultaneously with identical piece sequence (seeded RNG)".
- **Spec:** `tests/e2e/tc-007-shared-piece-sequence.spec.ts` — `npm run test TC-007`

## Must hold

- P1 and P2 spawn the **same piece type in the same order**, from the first spawn.
- Checked for the first 10 pieces of a match, and for the first 5 of a second match started fresh.
- Two matches use different sequences — the order is random per match, shared within it.

## Notes

- Piece type is read per spawn from the `?e2e=1` hook, so the comparison is type identity, not a colour match.
- Pieces are soft-dropped and locked **one player at a time**: dropping both at once lets their `piecesPlaced` counters drift, which looks like a mismatch but is caused by the harness.
- Keys are held ~55 ms; a bare `press()` can fall between two animation frames and leave one piece in a different column, piling a stack up to a top-out.
- The run fails with a clear message if either player tops out during the sequence.
- Root cause is out of scope for this asset.

## Can it fail

Giving P2 the next piece in the sequence (`piecesPlaced + 1`) makes the boards diverge and fails the first assertion. Restored afterwards.

## History

No failures recorded; runs 1–3 were manual (three independent methods), run 4 is the automated check — evidence `tests/reports/TC-007/run4-sequence.json`.
