# Tests — local-tetris

Test assets for the Local Tetris app (Vite build, canvas-only rendering).

## Layout

| Path | Purpose |
|---|---|
| `test-cases/` | One contract per case: what it asserts, the spec it comes from, decisions, exclusions, failure history. |
| `e2e/` | Playwright specs, one per case (`tc-###-slug.spec.ts`) — the executable check. |
| `reports/` | Evidence per run: screenshots, probe JSON, timelines. |

## Where the truth lives

- **Behaviour:** `specs/`. If a case and the spec disagree, the spec wins.
- **The contract:** `test-cases/TC-###.md` — what the check means, which spec section and commit it was read from, what is deliberately not covered, and what has failed before.
- **The check:** `tests/e2e/tc-###-*.spec.ts`.
- **The verdict:** CI (or `npm run test`). The case file holds no PASS/FAIL of its own; "last automated run" is a pointer to evidence, not a status.

## Conventions

- One case per file, named `TC-###-short-slug.md`; the spec points back at it.
- A case has: ID, title, area, priority, spec pin, spec path, **Must hold**, **Notes**, **Can it fail**, **History**.
- No steps, preconditions or environment lines: the spec file is the procedure, and copying it only drifts.
- No measured numbers or per-run tables: the run writes them to `reports/TC-###/runN-*.json`. The case keeps the assertion, not the sample.
- `History` lists failures only (what broke, when, which commit fixed it). Green runs are not logged — CI already proves them.
- Spec-derived values are quoted only with a **Spec pin** line: spec file, section, and the commit the value was read from. When a spec changes, update the pins in the cases that quote it and re-run them, so a stale expectation is visible instead of silently passing.
- **Can it fail** records the mutation check used to prove the assertion has teeth.
- Root cause is never recorded here; that is engineering's job.

## Running

```bash
npm run test           # every automated case
npm run test TC-009    # one case
```

- The runner builds the production bundle and serves it itself (`npm run build && vite preview`, port 4317), so no dev server is needed.
- Specs drive headless Chromium at 1600×900, DPR 1; viewport-sensitive cases also check 1366×768.
- An unported case exits with code 3 rather than passing silently.
- Evidence lands in `reports/TC-###/runN-*`. Set `TC_RUN_ID` to name the run explicitly (CI builds).
- `?e2e=1` enables a read-only state hook (`window.__tetris`): `screen`, `menuIndex`, `frame`, `menuItems`, `gameOverIndex`, `volume`, `status`, `countdownMs`, and `players` (x, y, type, rotation, next, score, pieces, over as plain copies). `harness.spec.ts` checks it stays absent without the flag and cannot be written.
- Shared helpers live in `tests/e2e/helpers/`: `hook.ts` (typed state reader), `app.ts` (match start, pause, game over, gamepad mock, per-frame trace, key/pad taps), `pieces.ts` (piece driving, preview box reader), `audio.ts` (Web Audio hook), `canvas.ts` (pixel probes, logical→CSS).
- Keys and gamepad buttons are pressed with a hold (~55–150 ms) rather than `press()`/a one-frame pulse: the game polls input once per animation frame, so a shorter press can be missed entirely.
- Sound asset checks derive the expected file list from the built bundle (`sounds/<name>.ogg` in `dist/assets/*.js`), so a newly added sound is checked rather than quietly ignored.

## Out of scope, permanently

- Audibility, loudness, or the OS output route of any sound.
- Physical gamepads and physical keyboards (mocks and synthetic events only).
- Pentomino previews above level 2.

## CI

`.github/workflows/tests.yml` runs `npm run test` on every push to `main` and on
pull requests targeting `main` (and on manual dispatch). It installs Chromium, runs
the suite with `TC_RUN_ID=ci-<run>-<attempt>`, and uploads `test-results/` plus
`tests/reports/` as the `test-evidence-…` artifact for 14 days. A red run means the
build or a spec failed; the artifact holds the screenshots, probe JSON, and
Playwright trace. Merges are not blocked: the check is informational.
