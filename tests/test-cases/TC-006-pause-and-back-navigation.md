# TC-006 — Pause and back navigation (Esc / Start / B / Select)

- **Area:** Menus / navigation / input
- **Priority:** High
- **Date run:** 2026-11-23 (run 1: FAIL — 4 of 9 checks fail)
- **Environment:** Chromium (OpenBot browser), production build served statically at `http://127.0.0.1:4173` (`vite preview`, no HMR), canvas 1920×1080; gamepads mocked via `navigator.getGamepads()` (pad 0)
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
| 1 | `Esc` in play opens Main Menu | **PASS** | Menu shown with first item "Resume"; pieces frozen: model cell set identical before/after a 1.4 s menu visit |
| 2 | `Start` in play opens Main Menu | **FAIL** | Nothing visible happens; game keeps running (30/30 sampled frames still play). The menu does not stay open — consistent with it opening and immediately activating "Resume" in the same input pass |
| 3 | `Esc` in paused Main Menu returns to game | **FAIL** | Menu stays open (checked twice, 800 ms apart) |
| 4 | `B` in paused Main Menu returns to game | **FAIL** | Menu stays open |
| 5 | `Select` in paused Main Menu returns to game | **FAIL** | Menu stays open |
| 6 | "Resume" item resumes the game | **PASS** | `Enter` on "Resume" returns to play; pieces continue from the frozen position |
| 7 | "Resume" label when opened from a game / "Start" otherwise | **PASS** | "Resume" after `Esc` during play; "Start" on a fresh Main Menu |
| 8 | `Esc` on Game Over returns to Main Menu | **PASS** | Game Over ("Draw!", P1 11 : P2 11) → Main Menu |
| 9 | `B` / `Select` on Game Over return to Main Menu | **FAIL** | Both leave the Game Over screen unchanged |

## Status

**FAIL** (run 1) — the keyboard path mostly works (pause via `Esc`, resume via `Resume`), but gamepad `Start` does not pause, and `Esc`/`B`/`Select` do not act as "back" in either the paused Main Menu or the Game Over screen.

## Run history

| Run | Date | Result | Notes |
|---|---|---|---|
| 1 | 2026-11-23 | FAIL | checks 2, 3, 4, 5, 9 fail; checks 1, 6, 7, 8 pass |

## Evidence

- `tests/reports/TC-006/pause-menu-resume.png` — Main Menu opened from play, first item "Resume".
- `tests/reports/TC-006/gameover-screen.png` — Game Over screen ("Draw!", Restart / Main Menu).
- `tests/reports/TC-006/gameover-esc-main-menu.png` — after `Esc` on Game Over: Main Menu.
- Numeric checks are listed in the table above; no image analysis was needed for them.

## Notes / follow-up

- New test case and first failures stay with the user per the agreed workflow; no fix request has been sent to @Developer.
- Root cause is out of scope for this test asset.
