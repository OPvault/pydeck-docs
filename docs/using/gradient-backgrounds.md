# Gradient backgrounds

By default every button has a single solid background color. **Gradient backgrounds** let you fill a button with a smooth blend of colors instead — linear at any angle, or radial from the center — using a built-in editor. What you see in the editor is exactly what renders on the hardware.

Gradients are set **per button**, in the same place you pick a button's color. Whether the gradient option appears depends on the plugin function on that button (plugin authors opt in — see [Rendering & styling](../plugins/rendering.md#4-gradient-backgrounds)).

## Open the editor

Select a button and open its color picker. If the function supports gradients, you'll see two tabs:

- **Solid** — the normal color picker.
- **Gradient** — the gradient editor described below.

## The gradient editor

| Element | What it does |
|---|---|
| **Preview** | A large square showing the gradient with its real angle and type. |
| **Gradient bar** | A strip showing the blend left-to-right. Click it to add a color stop. |
| **Stop markers** | Arrows below the bar — one per color stop. |
| **Stop info** | The selected stop's color, its position (0–100%), and a delete button. |
| **Type** | Switch between **Linear** and **Radial**. |
| **Angle wheel** | A dial for the linear gradient's angle (0–360°). Hidden for radial. |
| **Color picker** | Sets the color of the selected stop. |

### Working with color stops

| Action | How |
|---|---|
| **Select a stop** | Click its marker |
| **Move a stop** | Drag the marker along the bar |
| **Add a stop** | Click the gradient bar where you want it |
| **Delete a stop** | Right-click → **Delete Stop**, press ++delete++ / ++backspace++, or drag the marker off the bar |
| **Change color** | Select the stop, then use the color picker |
| **Exact position** | Type a value in the **Position** box |

A gradient always needs at least **two** stops.

## How it's stored

Your gradient is saved with the button and rendered server-side (with Pillow) to both the browser preview and the hardware. Angles are true diagonals — a 135° gradient renders as a real diagonal, not a snapped one — and stops sit at their exact positions, so two stops at the same spot make a hard edge.

You don't need to edit this by hand, but for reference the data lives in the button's `display.gradient` object; the full format and how plugin authors use it in templates are documented in [Rendering & styling → Gradient backgrounds](../plugins/rendering.md#4-gradient-backgrounds).
