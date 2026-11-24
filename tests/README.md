# Tests — local-tetris

Test assets for the Tetris Duel app (Vite dev server at `http://localhost:5173`).

## Layout

| Path | Purpose |
|---|---|
| `test-cases/` | Manual/exploratory test cases, one file per case (`TC-###-slug.md`). |
| `e2e/` | Playwright specs for cases that run in CI (`tc-###-slug.spec.ts`). |
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

## Automated cases

Selected cases also run headless in CI, without an agent:

```bash
npm run test TC-001    # one case
npm run test           # every automated case
```

- Specs live in `tests/e2e/`, one per case, named `tc-###-slug.spec.ts`.
- The runner starts the production build itself (`npm run build && vite preview`, port 4317), so no dev server is needed.
- Screenshots and probe values land in `reports/TC-###/runN-*`. Set `TC_RUN_ID` to name the run explicitly (CI builds).
- The markdown case stays the source of truth; each spec points to its case file.
- Cases without a spec exit with code 3 rather than passing silently.
- `?e2e=1` enables a read-only state hook (`window.__tetris`: `screen`, `menuIndex`, `frame`); `harness.spec.ts` checks it stays absent without the flag.

## CI

`.github/workflows/tests.yml` runs `npm run test` on every push to `main` and on
pull requests targeting `main` (and on manual dispatch). It installs Chromium, runs
the suite with `TC_RUN_ID=ci-<run>-<attempt>`, and uploads `test-results/` plus
`tests/reports/` as the `test-evidence-…` artifact for 14 days. A red run means the
build or a spec failed; the artifact holds the screenshots, probe JSON, and
Playwright trace. Merges are not blocked: the check is informational.

