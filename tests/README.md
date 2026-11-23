# Tests — local-tetris

Test assets for the Tetris Duel app (Vite dev server at `http://localhost:5173`).

## Layout

| Path | Purpose |
|---|---|
| `test-cases/` | Manual/exploratory test cases, one file per case (`TC-###-slug.md`). |
| `reports/` | Run reports and evidence (screenshots, notes) from test sessions. |

## Conventions

- One test case per file, named `TC-###-short-slug.md`.
- Each case has: ID, title, area, priority, preconditions, steps, expected result,
  actual result, status (`PASS` / `FAIL` / `BLOCKED`), and evidence.
- The app renders to a single `<canvas>`, so checks use canvas pixel state and
  keyboard/mouse input rather than DOM selectors.
- Keep `Actual result` and `Status` filled in from a real run; do not guess.
- Spec-derived values (delays, sizes, amounts) are quoted only with a **Spec pin**
  line in the case header: spec file, section, and the commit the value was read
  from. When a spec changes, update the pins in the cases that quote it and re-run
  them, so a stale expectation is visible instead of silently passing.

## Running

```bash
npm run dev   # serves http://localhost:5173
```
