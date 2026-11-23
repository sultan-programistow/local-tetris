# 04 — Screens & UI

## Main Menu

Title: "LOCAL TETRIS" displayed at the top of the screen.

Options: Start/Resume (dynamic), Stats, Volume, Controls.
- When opened from in-game (a match is in progress), include a "Restart" option (starts a new match with a new random seed).
- The first item's label is dynamic: "Resume" when the menu is opened from in-game (Esc/Start), "Start" otherwise.
- Start button (gamepad) in the Main Menu resumes the game when a match is in progress (same as selecting Resume/Start). When no game is in progress, the Start button does nothing.
- Esc (keyboard) in the Main Menu also resumes the game when a match is in progress (same as Start button / selecting Resume). When no game is in progress, Esc does nothing (or backs out).
- Menu items are centered horizontally; Main Menu and Game Over screen share the same horizontal position/alignment for menu items (consistent layout).
- Navigation: D-pad/arrows, A/Enter/Space select, B/Esc/Select back. Mouse: hover highlights, click selects.
- Volume: slider 0.0–1.0 (persisted), adjustable via mouse drag/click or keyboard/gamepad; live apply. Icon reflects state.
- Controls: shows key/button mapping.
- Stats: opens stats screen.

## Countdown

- 3-2-1 (3 seconds) before pieces start falling.
- Both boards visible, pieces frozen.
- Esc (keyboard) or Start (gamepad) during countdown opens the Main Menu (pauses countdown); resuming continues the countdown.

## Play Screen

- Two 10×20 boards side by side.
- Per player HUD: score, next piece (1) preview. (Level is internal state, not displayed; lines cleared optional.)
- Next piece preview: rendered in a small preview box (e.g., 4×4 cell area) in the player's HUD, centered, using the same piece colors and cell size scaled to fit; shows the next piece in its spawn orientation. No hold slot (hold not implemented in v1).
- Session stats not shown during play.
- Per-player game over (soft): when a player tops out, their board is grayed out (tiles rendered semi-transparent/grayed) with a "GAME OVER" label overlaid on top (above tiles in z-order) that obscures the tiles (opaque/strong contrast, not blending). The other board stays active. Full match game over waits for the second player (or score beat).
- Esc (keyboard) or Start (gamepad) opens the Main Menu, which effectively pauses the game. No separate pause state or pause menu.

## Game Over Screen

- Winner announcement (P1 / P2 / Draw).
- Both scores, pieces placed.
- Summary + last 5 sessions.
- Three options: Restart (default), Stats, Main Menu. Navigation: D-pad/arrows, A/Enter/Space select, B/Esc/Select back. Mouse: hover + click. Restart starts a new match (new random seed). Stats opens the stats screen. Main Menu returns to the main menu.
- Height: should occupy the same screen height as the Main Menu where possible (consistent layout).
- Menu items centered horizontally and share the same horizontal position as the Main Menu (consistent layout).

## Stats Screen

- Aggregate stats shown as both "total" and "today" where applicable: sessions played, play time, P1 wins, P2 wins, win %.
- Scrollable list of all play sessions (date, winner, scores, pieces).
- Back via B/Esc/Select.
- Height: should occupy the same screen height as the Main Menu where possible.

## Visual Style

- Minimalist dark background, vibrant piece colors.
- Line clear: flash cleared rows + brief particle burst.
- Level up: silent (no banner, no sound).
- Responsive scaling to fit window; target 1920×1080.
- Main Menu and Game Over screen share the same screen height where possible (consistent layout).
- Revision hash: display the short git commit hash in a subtle corner (semi-transparent, small font) on all screens, injected at build time (e.g., via Vite define/import.meta.env) so testers can verify they run the tip of main.