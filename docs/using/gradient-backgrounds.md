# Gradient Backgrounds

Add custom gradient backgrounds to Stream Deck buttons. Plugins opt in per function via `manifest.json`, and users create gradients through a Photoshop-style editor built into the color picker.

---

## Table of Contents

1. [Overview](#1-overview)
2. [Enabling Gradient Support](#2-enabling-gradient-support)
3. [The Gradient Editor](#3-the-gradient-editor)
4. [Data Format](#4-data-format)
5. [Using Gradients in PDK Templates](#5-using-gradients-in-pdk-templates)
6. [Rendering](#6-rendering)
7. [Example Plugin](#7-example-plugin)

---

## 1. Overview

By default, every button has a single solid background color. Gradient backgrounds extend this with:

- **Linear gradients** at any angle (0–360°)
- **Radial gradients** (center-out)
- **Unlimited color stops** with precise position control
- **Live preview** in the editor, rendered identically on hardware

Gradient support is **opt-in per function** — plugins declare which functions support it, and the editor UI adapts automatically. Functions without the flag show the standard color picker with no gradient option.

---

## 2. Enabling Gradient Support

Add `"gradient": true` to a function entry in `manifest.json`:

```json
{
  "functions": {
    "my_function": {
      "label": "My Function",
      "gradient": true,
      "ui": [
        { "type": "input", "id": "message", "label": "Message", "default": "Hello" }
      ]
    },
    "other_function": {
      "label": "Other Function",
      "ui": [
        { "type": "input", "id": "text", "label": "Text", "default": "" }
      ]
    }
  }
}
```

In this example:

- `my_function` — the color picker shows **Solid / Gradient** tabs
- `other_function` — the color picker shows the standard solid picker only

---

## 3. The Gradient Editor

When a function has `"gradient": true`, the button color picker gains a tabbed interface:

### Solid Tab

The standard HSV color picker — unchanged from the normal editor experience.

### Gradient Tab

A Photoshop-inspired gradient editor with:

| Element | Description |
|:---|:---|
| **Preview** | Large square showing the gradient with its actual angle and type applied. |
| **Gradient bar** | Thin horizontal strip showing the gradient left-to-right. Click anywhere on the bar to add a new color stop. |
| **Stop markers** | Arrow-shaped markers below the bar. Each represents a color stop. |
| **Stop info bar** | Shows the selected stop's hex color, position (0–100%), and a delete button. |
| **Type selector** | Choose between `Linear` and `Radial`. |
| **Angle wheel** | A circular dial for setting the linear gradient angle (0–360°). Drag to rotate. Hidden for radial gradients. |
| **Color picker** | HSV spectrum and hue slider for the selected stop. Always visible — click a marker to select it. |

### Working with Stops

| Action | How |
|:---|:---|
| **Select a stop** | Click its marker arrow |
| **Move a stop** | Drag the marker left/right along the bar |
| **Add a stop** | Click on the gradient bar at the desired position |
| **Delete a stop** | Right-click the marker → **Delete Stop**, press `Delete` / `Backspace`, or drag the marker away from the bar vertically |
| **Change a stop's color** | Select it, then use the color picker below |
| **Set exact position** | Type a value in the **Position** input in the stop info bar |

> **Note:** A minimum of 2 stops is always required. The delete option is disabled when only 2 stops remain.

---

## 4. Data Format

Gradient data is stored in the button's `display.gradient` object in `buttons.json`:

```json
{
  "display": {
    "text": "Hello",
    "color": "#1a1a2e",
    "gradient": {
      "enabled": true,
      "type": "linear",
      "angle": 135,
      "stops": [
        { "color": "#ff0000", "position": 0 },
        { "color": "#0000ff", "position": 100 }
      ]
    }
  }
}
```

| Key | Type | Description |
|:---|:---|:---|
| `enabled` | `boolean` | Whether the gradient is active. When `false`, the solid `color` is used. |
| `type` | `string` | `"linear"` or `"radial"`. |
| `angle` | `number` | Angle in degrees (0–360). Only used for linear gradients. Follows CSS convention: `0` = bottom-to-top, `90` = left-to-right, `180` = top-to-bottom. |
| `stops` | `array` | Array of color stop objects, each with `color` (hex string) and `position` (0–100). |

When `display.gradient` is absent, `null`, or has `enabled: false`, the renderer falls back to the solid `display.color`.

---

## 5. Using Gradients in PDK Templates

For PDK plugins, the core injects `_button_gradient` into the render state alongside `_button_color`. This lets you use the user's gradient as a CSS value in your templates.

### The `_button_gradient` Variable

| Variable | Value when gradient is set | Value when no gradient |
|:---|:---|:---|
| `_button_color` | The solid hex colour (e.g. `#1a1a2e`) | The solid hex colour |
| `_button_gradient` | A CSS gradient string (e.g. `linear-gradient(135deg, #ff0000 0%, #0000ff 100%)`) | Falls back to `_button_color` |

### Usage in CSS

Use `{_button_gradient}` as a `background` value in your `src/shared.css` or `<style>` block:

```css
:root {
  --bg: {_button_gradient};
}

.bg {
  background: var(--bg);
}
```

This works for both solid colours and gradients — when the user hasn't set a gradient, `_button_gradient` contains the plain hex colour, which is a valid CSS `background` value.

### Example

A PDK template that uses the gradient background:

**src/shared.css:**

```css
:root {
  --bg: {_button_gradient};
}

.bg {
  width: 100%;
  height: 100%;
  background: var(--bg);
  border-radius: 8px;
}

.label {
  color: #ffffff;
  font-size: 12px;
}
```

**src/functions/gradient_demo/template.xml:**

```xml
<template name="gradient_demo" title="Gradient Demo">
  <box class="bg" direction="column" align="center" justify="center">
    <text class="label">{message}</text>
  </box>
</template>
```

> **Note:** The `_button_gradient` variable is available to **all** PDK plugins, regardless of whether `"gradient": true` is set. The manifest flag only controls whether the gradient editor UI appears — the CSS variable always exists and falls back gracefully.

---

## 6. Rendering

Gradients are rendered server-side using Pillow and applied to both:

- **Web preview** — the button images shown in the browser editor
- **Hardware** — the actual Stream Deck device buttons

The renderer supports:

- **Arbitrary angles** — not limited to 0/90/180/270. A 135° gradient renders as a true diagonal.
- **Position-aware stops** — stops at their exact positions, matching the CSS `linear-gradient()` behavior. Two stops at the same position create a sharp color boundary.
- **Radial gradients** — circular gradients from center to corners.

The gradient is drawn first as the background layer, then text and icons are composited on top, identical to how solid colors work.

---

## 7. Example Plugin

A minimal plugin demonstrating gradient support:

### Directory structure

```text
~/.local/share/pydeck/plugin/my_gradient_plugin/
├── manifest.json
└── src/
    └── shared.py
```

### manifest.json

```json
{
  "name": "my_gradient_plugin",
  "version": "1.0.0",
  "description": "A plugin with gradient support",
  "functions": {
    "gradient_demo": {
      "label": "Gradient Demo",
      "description": "A button with gradient background support",
      "gradient": true,
      "default_display": {
        "color": "#1a1a2e",
        "text": "Gradient"
      },
      "ui": [
        { "type": "input", "id": "message", "label": "Display Message", "default": "Hello" }
      ]
    },
    "solid_only": {
      "label": "Solid Only",
      "description": "A button without gradient support",
      "default_display": {
        "color": "#2e1a2e",
        "text": "Solid"
      },
      "ui": [
        { "type": "input", "id": "message", "label": "Display Message", "default": "World" }
      ]
    }
  }
}
```

### src/shared.py

```python
from __future__ import annotations
from typing import Any, Dict


def gradient_demo(config: Dict[str, Any]) -> Dict[str, Any]:
    return {"text": config.get("message", "Hello")}


def solid_only(config: Dict[str, Any]) -> Dict[str, Any]:
    return {"text": config.get("message", "World")}
```

When a user assigns `gradient_demo` to a button, the color picker shows the Solid / Gradient tabs. When they assign `solid_only`, only the standard solid color picker appears.
