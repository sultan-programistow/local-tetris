# 04 — Screens & UI

## Main Menu

Options: Start, Stats, Volume, Controls.
- Navigation: D-pad/arrows, A/Enter select, B/Esc/Select back.
- Volume: slider 0–1 (persisted).
- Controls: shows key/button mapping.
- Stats: opens stats screen.

## Countdown

- 3-2-1 (3 seconds) before pieces start falling.
- Both boards visible, pieces frozen.

## Play Screen

- Two 10×20 boards side by side.
- Per player HUD: score, level, lines? (lines cleared optional display), next piece (1) preview.
- Session stats not shown during play.
- No in-game controls legend (controls in menu only).
- Pause indicator when paused.

## Pause Menu (Esc/Start)

- Resume, Volume, Restart.
- (No Quit to title in v1? Actually Restart restarts match; to exit to main menu add "Main Menu" option.) Include "Main Menu" option.
- Navigation: D-pad/arrows, A/Enter select, B/Esc/Select back.

## Game Over Screen

- Winner announcement (P1 / P2 / Draw).
- Both scores, pieces placed.
- Summary + last 5 sessions.
- "Press to restart" (any key / A) → new match with new seed.

## Stats Screen

- Sessions played, total play time, P1 wins, P2 wins, win %.
- Scrollable list of all play sessions (date, winner, scores, pieces).
- Back via B/Esc/Select.

## Visual Style

- Minimalist dark background, vibrant piece colors.
- Line clear: flash cleared rows + brief particle burst.
- Level up: silent (no banner, no sound).
- Responsive scaling to fit window; target 1920×1080.
