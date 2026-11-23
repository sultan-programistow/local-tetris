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

- Player 1: A/D = move left/right, S = soft drop, W/Q? Actually: W not used; rotations: Q = rotate CCW, E = rotate CW (or Z/X). Final: use Z = rotate CCW, X = rotate CW. Space not used (soft drop only).
  - Final mapping: A/D move, S soft drop, Z rotate CCW, X rotate CW.
- Player 2: ←/→ move, ↓ soft drop, Z? Use , / . for rotations? Final: ←/→ move, ↓ soft drop, N rotate CCW, M rotate CW (or use / and .). Simpler: Player 2 uses arrow keys for move+drop, and [ ] for rotations. Developer to pick comfortable keys; document in Controls screen.
- Global: Esc = pause/menu, M = volume? Volume via menu. Enter = confirm in menus.

## Gamepad (Web Gamepad API)

- D-pad / left stick: move left/right.
- A button: soft drop.
- X + left trigger/bumper: rotate CCW.
- B + right trigger/bumper: rotate CW.
- Start: pause.
- Select: back in menus.

## DAS (Delayed Auto Shift)

- Initial delay: 250ms before auto-repeat starts.
- Repeat rate (ARR): 50ms.
- Applies to left/right movement and soft drop (keyboard and gamepad).

## Soft Drop

- Accelerated drop: first cell 250ms, then 10ms repeat → effectively drops to bottom.
- Lock delay still applies at landing; allows sideways squeeze/rotation before lock (~0.5s).
- No hard drop in v1.

## Rotation (SRS)

- Standard SRS kick tables for I, O, T, S, Z, J, L and new pieces (approximate for non-standard).
- Wall kicks: try offsets; if any valid, apply; else rotation fails.

## Lock Delay

- ~0.5s timer starts when piece lands (cannot move down).
- Resets on successful move/rotation (with cap to prevent infinite stall; e.g., max 15 resets or 3s total).
- Piece locks when timer expires.

## Pause

- Esc (keyboard) or Start (gamepad) toggles pause.
- Opens pause menu.
