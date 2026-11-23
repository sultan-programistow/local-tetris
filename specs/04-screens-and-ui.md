# 04 — Screens & UI

## Main Menu

Options: Start/Resume (dynamic), Stats, Volume, Controls.
- The first item's label is dynamic: "Resume" when the menu is opened from in-game (Esc/Start), "Start" otherwise.
- Navigation: D-pad/arrows, A/Enter/Space select, B/Esc/Select back. Mouse: hover highlights, click selects.
- Volume: slider 0–1 (persisted), adjustable via mouse drag or keyboard.
- Controls: shows key/button mapping.
- Stats: opens stats screen.

## Countdown

- 3-2-1 (3 seconds) before pieces start falling.
- Both boards visible, pieces frozen.

## Play Screen

- Two 10×20 boards side by side.
- Per player HUD: score, level, lines? (lines cleared optional display), next piece (1) preview.
- Session stats not shown during play.
- Per-player game over (soft): when a player tops out, their board is grayed out (tiles rendered semi-transparent/grayed) with a "GAME OVER" label overlaid on top (above tiles in z-order) that obscures the tiles (opaque/strong contrast, not blending). The other board stays active. Full match game over waits for the second player (or score beat).
- Esc (keyboard) or Start (gamepad) opens the Main Menu, which effectively pauses the game. No separate pause state or pause menu.

## Game Over Screen

- Winner announcement (P1 / P2 / Draw).
- Both scores, pieces placed.
- Summary + last 5 sessions.
- Two options: Restart (default) and Main Menu. Navigation: D-pad/arrows, A/Enter/Space select, B/Esc/Select back. Mouse: hover + click. Restart starts a new match (new random seed). Main Menu returns to the main menu.
- Height: should occupy the same screen height as the Main Menu where possible (consistent layout).

## Stats Screen

- Sessions played, total play time, P1 wins, P2 wins, win %.
- Scrollable list of all play sessions (date, winner, scores, pieces).
- Back via B/Esc/Select.
- Height: should occupy the same screen height as the Main Menu where possible.

## Visual Style

- Minimalist dark background, vibrant piece colors.
- Line clear: flash cleared rows + brief particle burst.
- Level up: silent (no banner, no sound).
- Responsive scaling to fit window; target 1920×1080.
- Main Menu and Game Over screen share the same screen height where possible (consistent layout).