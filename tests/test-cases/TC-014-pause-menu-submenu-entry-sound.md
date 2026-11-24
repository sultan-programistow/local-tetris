# TC-014 — Submenu entry sound from the pause menu

- **Area:** Menus / audio / submenu entry
- **Priority:** Medium
- **Date run:** 2026-11-24 (run 3: PASS, automated; manual run 2: PASS)
- **Automated:** `tests/e2e/tc-014-pause-menu-submenu-entry-sound.spec.ts` — `npm run test TC-014`
- **Spec:** `specs/05-audio-and-visuals.md` §"Audio Events (SFX)" — "Menu enter submenu (opening Stats, Volume, or Controls)" is a listed SFX event. When a match is paused the menu shows Resume, Restart, Stats, Volume, Controls (`specs/04-screens-and-ui.md` §"Main Menu"; `menuItems()` in `src/main.ts`), so all three submenus are reachable from the pause menu. TC-010 A10/A11 covers the same event from the main menu only.
- **Spec pin:** `specs/05-audio-and-visuals.md` §"Audio Events (SFX)" @ `962dc56` (the event is listed; no sound file is named).
- **Behaviour under test:** opening Stats, Volume or Controls from the **pause menu** plays exactly one sound per entry, on keyboard, gamepad and mouse. Going back plays `menu_back` and no second entry sound.

## Preconditions

1. Production build of `4616b7e` served at `http://127.0.0.1:4183` (clean `git archive` copy served statically: `vite preview` in run 1, `python3 -m http.server` in run 2), headless Chrome 158, 1920×1080.
2. Volume `0.7`; trusted click for AudioContext activation; gamepad mock in `navigator.getGamepads()` (standard mapping).
3. A live match paused with keyboard `Esc`, so the pause menu is open and Resume is highlighted.
4. Fresh page load per input group.

## Method

- Same Web Audio hook as TC-010 / TC-013: `fetch` records the last `sounds/<name>.ogg` URL, `decodeAudioData` tags buffers, and a wrapped `createBufferSource().start()` records one entry per played sound.
- Pause menu rows are drawn at y = 400 + 60·i: Resume 400, Restart 460, Stats 520, Volume 580, Controls 640; the hit area is x 800–1120, y −30/+10 around each row.
- Each step clears the log, opens one submenu, waits 350 ms and reads the log; the screen labels (`STATS`, `VOLUME`, `CONTROLS`) are read from the canvas `fillText` log to prove the submenu opened.
- For the mouse group the pointer is first moved onto the row and left to settle (that hover plays `menu_select` as navigation), then the log is cleared and the click is scored.

## Sub-cases and results (run 2, `4616b7e`)

| # | Input path | Action from the pause menu | Expected | Actual | Screen | Status |
|---|---|---|---|---|---|---|
| K1 | Keyboard | `Enter` on Stats | 1 sound | `menu_enter` ×1 | STATS | PASS |
| K2 | Keyboard | `Enter` on Volume | 1 sound | `menu_enter` ×1 | VOLUME | PASS |
| K3 | Keyboard | `Enter` on Controls | 1 sound | `menu_enter` ×1 | CONTROLS | PASS |
| K4 | Keyboard | `Esc` back from Controls | `menu_back` ×1, no entry sound | `menu_back` ×1 | pause menu | PASS |
| G1 | Gamepad 0 | `A` on Stats | 1 sound | `menu_enter` ×1 | STATS | PASS |
| G2 | Gamepad 0 | `A` on Volume | 1 sound | `menu_enter` ×1 | VOLUME | PASS |
| G3 | Gamepad 0 | `A` on Controls | 1 sound | `menu_enter` ×1 | CONTROLS | PASS |
| M1 | Mouse | Click Stats | 1 sound | `menu_enter` ×1 | STATS | PASS |
| M2 | Mouse | Click Volume | 1 sound | `menu_enter` ×1 | VOLUME | PASS |
| M3 | Mouse | Click Controls | 1 sound | `menu_enter` ×1 | CONTROLS | PASS |

**Run 3 (automated) result: PASS — 10 of 10.** Run 2 result: PASS — 10 of 10 on `4616b7e`. Every entry from the pause menu plays exactly one sound on keyboard, gamepad and mouse, and every back key plays `menu_back` only. All entries now play the dedicated `menu_enter.ogg` (`4c74459` wires it for Stats/Volume/Controls); run 1 on `962dc56` played `menu_select.ogg` instead. The spec names no file, so the file name is recorded, not scored.

## Not covered

- Pan value of the entry sound — the spec's panning section places menu sounds at pan 0; TC-012 D1/D2 check menu sounds, but not this event.
- Whether `menu_enter` is used for every other entry path the app adds later — this case covers the pause menu only; the main menu is in TC-010 A10/A11.
- Hover-only movement onto a submenu row (navigation, not entry) — covered as `menu_select` navigation in TC-010.
- Whether the sound is audible — the hook proves a buffer start, not loudness.

## Evidence

- `tests/reports/TC-014/run2-results.json` — run 2 (`4616b7e`): every sub-case with expected/actual sound names and the screen reached.
- `tests/reports/TC-014/run2-pause-stats.png`, `run2-pause-volume.png`, `run2-pause-controls.png` — the three submenus opened from the pause menu by keyboard.
- `tests/reports/TC-014/run2-mouse-pause-stats.png`, `run2-mouse-pause-controls.png` — Stats and Controls reached by mouse click from the pause menu.
- `tests/reports/TC-014/run1-results.json`, `run1-*.png` — run 1 (`962dc56`), which played `menu_select` for the same entries.

## Run history

| Run | Date | Build | Result | Notes |
|---|---|---|---|---|
| 1 | 2026-11-24 | `962dc56` | PASS | 10/10; all entries play `menu_select` once, back plays `menu_back` |
| 2 | 2026-11-24 | `4616b7e` | PASS | 10/10; all entries now play `menu_enter` once, back plays `menu_back` |
| 3 | 2026-11-24 | current | PASS (automated) | `npm run test TC-014`: K1–K4, G1–G3 and M1–M3 pass; every entry plays exactly one sound and Esc back plays only `menu_back` |

## Automation (run 3)

`tests/e2e/tc-014-pause-menu-submenu-entry-sound.spec.ts`, run with `npm run test TC-014`. The match is paused once with Esc; each submenu is then opened by keyboard Enter, gamepad A and a mouse click on the row (the pointer is moved onto the row and allowed to settle first, because that hover is navigation and plays `menu_select`; the log is cleared before the click is scored). The sound file name is recorded, not scored, because the spec does not name it.

Mutation check: removing the entry sound from the submenu branch fails K1; restored afterwards.

Evidence: `tests/reports/TC-014/run3-results.json`, `run3-mouse-stats.png`, `run3-mouse-volume.png`, `run3-mouse-controls.png`.
