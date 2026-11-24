# 05 — Audio & Visuals

## Audio Events (SFX)

- Move (left/right) — subtle.
- Rotate (CW/CCW).
- Soft drop (initial tap).
- Soft drop (accelerated) — plays once when held soft drop switches to fast repeat after the 350ms delay; "ziuuuu" style. Stops immediately on release.
- Piece lock.
- Line clear.
- Level up — none (silent progression).
- Game over.
- Placement SFX (piece lock / line clear) is suppressed when the placed piece leaves both players topped out and ends the match; in that case only the Game over SFX plays.
- Pause/unpause.
- Menu navigation (select/back).
- Menu enter submenu (opening Stats, Volume, or Controls).

## Volume

- Single volume slider 0.0–1.0 (displayed as 0–100%), persisted to localStorage (`local-tetris:volume`).
- 0.0 = silent (no separate mute toggle); icon in menu corner reflects state.
- Adjustable via mouse drag/click, keyboard left/right or A/D (±0.05), gamepad D-pad/left stick left/right (±0.05).
- Changes apply live; Enter/Space or A confirms and returns, B/Esc/Select backs out.
- When adjusting the slider, play a short test sound (e.g., menu blip) so the player can judge the volume level.
- Applies to all SFX.

## Sound Design (Panning)

- Player-related sounds (piece lock, soft drop, rotate, move, line clear, game over for that player) are panned: P1 = 95% left, P2 = 95% right.
- Non-player sounds (menu navigation, menu select/back, volume test blip, countdown, global game over fanfare) are centered (pan 0).
- Implementation should use Web Audio API (stereo panner) rather than simple HTMLAudio to support panning; HTMLAudio fallback can be centered.

- Line clear: flash affected rows + brief particle burst before removal.
- Piece lock: subtle (optional).
- Level up: no visual banner.
- Game over: winner highlight.
- Countdown: 3-2-1 with scale/fade.

## Color Palette (suggested)

- Background: dark (e.g., #0f1115).
- Grid lines: subtle gray.
- Board border: clearly visible outline (distinct color, e.g. light gray/white, 2px) around each 10×20 playfield so players can easily see board edges; cell borders slightly brighter than background for readability.
- Classic 7 pieces: standard Tetris colors (I cyan, O yellow, T purple, S green, Z red, J blue, L orange).
- New pieces: distinct vibrant colors (pink, teal, lime, etc.), assigned per shape.

## Responsive

- Scale canvas to fit window preserving aspect ratio; letterbox if needed.
- Board sizing: the two 10×20 playfields together take ~40–45% of the horizontal screen width; remaining space for HUD (score, next preview, stats). Scale cell size accordingly; target 1920×1080.
- Board height must fit within screen height: if the 40–45% width would make the board taller than the available height, reduce the board/cell size so the full 20-row height fits on screen (no vertical overflow). Aspect ratio of cells remains square.
- Target 1920×1080; no mobile-specific layout.
