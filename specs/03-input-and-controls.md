# 03 — Input & Controls

## Input Capture Policy

- The app must NOT capture or preventDefault on keys it does not use for gameplay/menus.
- Only call preventDefault/stopPropagation for keys explicitly mapped (movement, rotation, soft drop, pause, menu nav, volume).
- Browser shortcuts (F5 refresh, Ctrl+J downloads, Ctrl+R, Ctrl+W, DevTools, etc.) must remain functional.
- Avoid global keydown listeners that blanket-preventDefault; scope handlers to the game canvas/container and check the key first.

- Mouse is supported in menus and screens (main menu, pause menu, game over, stats, controls, volume).
- Hover highlights the focused item; click selects it.
- During gameplay, mouse is not used (keyboard/gamepad only for play).
- Cursor may be hidden during play and shown in menus.

### Menu selection model (Option B)

- There is exactly ONE selected item at any time.
- Mouse hover UPDATES the keyboard selection (hovered item becomes the selected item).
- No separate hover highlight; selected item uses the single green style.
- Enter (keyboard) / A (gamepad) / click activates the selected item.
- Moving the pointer away does NOT revert the selection; last hovered (or last keyboard) item stays selected.

## Keyboard

- Player 1: A/D = move left/right, S = soft drop, W/X = rotate CW, Z = rotate CCW.
- Player 2: ←/→ = move left/right, ↓ = soft drop, ↑ = rotate CW, [ = rotate CCW, ] = rotate CW.
- Global: Esc = pause/menu, Enter/Space = confirm in menus.

## Gamepad (Web Gamepad API)

- D-pad: move left/right, up = rotate CW, down = soft drop (like A).
- Left stick: move left/right only (up/down do nothing).
- A button: soft drop.
- X + left trigger/bumper: rotate CCW.
- B + right trigger/bumper: rotate CW.
- Start: pause.
- Select: back in menus.

### Menu navigation (gamepad)

- D-pad / left stick: navigate up/down/left/right.
- A: select/confirm.
- B: back.
- Select: back.
- Start: confirm (optional).

## DAS (Delayed Auto Shift)

- Initial delay: 350ms before auto-repeat starts.
- Repeat rate (ARR): 75ms.
- Applies to left/right movement and soft drop (keyboard and gamepad).

## Soft Drop

- Accelerated drop: first cell 350ms, then 10ms repeat → effectively drops to bottom.
- Lock delay still applies at landing; allows sideways squeeze/rotation before lock (~0.5s).
- No hard drop in v1.

## Rotation (SRS)

- Standard SRS kick tables for I, O, T, S, Z, J, L and new pieces (approximate for non-standard).
- Wall kicks: try offsets; if any valid, apply; else rotation fails.

## Lock Delay

- ~0.5s timer starts when piece lands (cannot move down).
- Resets on successful move/rotation (with cap to prevent infinite stall; e.g., max 15 resets or 3s total).
- Piece locks when timer expires.

## Pause (removed)

- No separate pause state. Esc (keyboard) or Start (gamepad) opens the Main Menu, which effectively pauses the game.
- Pausing works during countdown too: Esc/Start during the 3-2-1 countdown opens the Main Menu (countdown pauses/resumes accordingly).
