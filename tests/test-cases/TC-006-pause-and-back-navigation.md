# TC-006 — Pause and back navigation (Esc / Start / B / Select)

- **Area:** Menus / navigation / input
- **Priority:** High
- **Date run:** 2026-11-23 (run 2: FAIL — gamepad `Start` fixed; `B`/`Select` still do not go back)
- **Environment:** Chromium (OpenBot browser), production build of `82b1d18` served statically at `http://127.0.0.1:4174` (`vite preview`, no HMR), canvas 1920×1080; gamepads mocked via `navigator.getGamepads()` (pad 0)
- **Spec:** `specs/03-input-and-controls.md` §"Pause (removed)" and §"Gamepad"; `specs/04-screens-and-ui.md` §"Main Menu", §"Play Screen", §"Game Over Screen"
- **Spec pin:** `03-input-and-controls.md` @ `10aa6a0`, `04-screens-and-ui.md` @ `db1a953`

## Preconditions

1. App running at `http://127.0.0.1:4173`.
2. For pause checks: a match in progress (pieces falling).
3. For game-over checks: the match has ended and the Game Over screen is shown.

## Expected result

1. **Play → menu (keyboard).** `Esc` opens the Main Menu; the game pauses (pieces do not move) and no separate pause screen appears.
2. **Play → menu (gamepad).** `Start` opens the Main Menu, same as `Esc`.
3. **Main Menu opened from a game.** `Esc`, `B`, or `Select` returns to the running game (resume).
4. **Main Menu label.** First item reads "Resume" when opened from a game, "Start" otherwise.
5. **Game Over → back.** `B`, `Esc`, or `Select` returns to the previous screen (Main Menu). Restart and Main Menu stay explicit, selectable options.

## Method

Canvas pixel checks (no DOM content):

- **Play screen:** the P1 board border pixel `(200,900)` is light (> 50); menu/game-over screens draw no board, so it is dark.
- **Which static screen:** green item text rows — Main Menu selection at y ≈ 380–400, Game Over selection at y ≈ 380–400.
- **Pause freeze:** the set of drawn piece-cell coordinates (via a `fillRect` hook) was captured for the last frame before `Esc` and the first frame after resuming; identical sets mean the game did not advance while the menu was open.
- Gamepad buttons: `Start` = 9, `A` = 0, `B` = 1, `Select` = 8, all pressed for 150 ms per edge.

## Actual result

| # | Check | Result | Observed |
|---|---|---|---|
| 1 | `Esc` in play opens Main Menu | **PASS** | Menu shown with first item "Resume"; pieces frozen: board-region hash identical across a 1.4 s menu visit |
| 2 | `Start` in play opens Main Menu | **PASS** (run 2) | Board pixel 612 → 53 and green selection pixels 0 → 1076; menu stays open in all 12 samples over 1.6 s after release. Items: Resume / Restart / Stats / Volume / Controls, "Resume" highlighted. Game frozen while the menu is open and advancing again after resume |
| 3 | `Esc` in paused Main Menu returns to game | **PASS** (run 2) | Board pixel 53 → 612; repeatable (menu → play twice) |
| 4 | `B` in paused Main Menu returns to game | **FAIL** (run 2) | Menu stays open (board 53, green 1076 after a 150 ms `B` press) |
| 5 | `Select` in paused Main Menu returns to game | **FAIL** (run 2) | Menu stays open (board 53, green 1076 after a 150 ms `Select` press) |
| 6 | "Resume" item resumes the game | **PASS** | Keyboard `Enter` and gamepad `A`: returns to play, board redraws and advances from the frozen position |
| 7 | "Resume" label when opened from a game / "Start" otherwise | **PASS** | "Resume" after `Esc` and after gamepad `Start` during play; "Start" on a fresh Main Menu |
| 8 | `Esc` on Game Over returns to Main Menu | **PASS** (run 1) | Game Over ("Draw!", P1 11 : P2 11) → Main Menu; not re-run in run 2 |
| 9 | `B` / `Select` on Game Over return to Main Menu | **FAIL** (run 1) | Both leave the Game Over screen unchanged; not re-run in run 2 |

## Status

**FAIL** (run 2) — gamepad `Start` now opens the Main Menu and keeps it open (fix `82b1d18`), and `Esc` resumes from the paused menu. The gamepad back buttons still do not work: `B` and `Select` leave both the paused Main Menu and the Game Over screen unchanged.

## Run history

| Run | Date | Result | Notes |
|---|---|---|---|
| 1 | 2026-11-23 | FAIL | checks 2, 3, 4, 5, 9 fail; checks 1, 6, 7, 8 pass |
| 2 | 2026-11-23 | FAIL | after gamepad-Start fix `82b1d18`: checks 2 and 3 now pass; 4 and 5 still fail (`B`/`Select`); 8 and 9 not re-run |

## Evidence

- `tests/reports/TC-006/pause-menu-resume.png` — Main Menu opened from play, first item "Resume".
- `tests/reports/TC-006/gameover-screen.png` — Game Over screen ("Draw!", Restart / Main Menu).
- `tests/reports/TC-006/gameover-esc-main-menu.png` — after `Esc` on Game Over: Main Menu.
- Numeric checks are listed in the table above; no image analysis was needed for them.
- `tests/reports/TC-006/run2-start-menu.png` — Main Menu opened by gamepad `Start` in play: "Resume" highlighted, Restart / Stats / Volume / Controls below.
- `tests/reports/TC-006/run2-start-button-timeline.txt` — run 2 pixel counts, frame samples, freeze hashes and `B`/`Select` results.

## Notes / follow-up

- Run 1 failures were handed to @Developer at the user's request; the `Start` fix (`82b1d18`) is verified in run 2.
- `B`/`Select` back navigation still fails (checks 4, 5, 9) and has not been sent to @Developer yet.
- Root cause is out of scope for this test asset.
