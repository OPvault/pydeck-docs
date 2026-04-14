# PDK Development — Getting Started

---

## 1. What is PDK?

PDK (PyDeck Development Kit) is an alternative plugin format that replaces the classic `manifest.json` + raw `plugin.py` approach with a template-driven model. Instead of relying on PyDeck's built-in text/image/color renderer, PDK plugins define their own button faces using:

- **XML templates** (`template.xml`) — structured markup with tags like `<box>`, `<text>`, `<img>`, and more.
- **CSS-like stylesheets** (`shared.css`) — full cascade with selectors, variables, units, and shorthand properties.
- **Python event handlers** (`shared.py` / `handler.py`) — `on_load`, `on_press`, `on_poll` functions that receive a rich context object (`ctx`).

PDK plugins are rendered server-side via Pillow into PNG images at the correct resolution for each Stream Deck model, so the button face can be anything you can draw — gradients, icons, progress bars, dynamic text, and custom layouts.

### PDK vs Classic Plugins

| | Classic Plugin | PDK Plugin |
|:---|:---|:---|
| Button face | Text + color + optional image, rendered by the core | Custom template rendered by PDK engine |
| Appearance definition | `default_display` / `display_states` in manifest | `<template>` blocks + CSS |
| Logic file | `plugin.py` with per-function callables | `src/shared.py` with event handlers (`on_load`, `on_press`, `on_poll`) |
| State management | Return dict with `display_update` key | Set `ctx.state.*` attributes, template re-renders automatically |
| Detection | Has `manifest.json` only | Has `src/functions/` with `template.xml` files |

---

## 2. Quick Start — Clock

The fastest way to see PDK in action. This creates a simple clock plugin that displays the current time.

### Step 1: Create the plugin folder

```text
plugins/plugin/clock/
├── manifest.json
└── src/
    ├── shared.py
    ├── shared.css
    └── functions/
        └── clock/
            └── template.xml
```

### Step 2: Create `manifest.json`

For PDK plugins you can provide a standard `manifest.json`. The core will augment it with `pdk: true` automatically.

```json
{
  "name": "clock",
  "version": "1.0.0",
  "description": "A simple clock display",
  "functions": {
    "clock": {
      "label": "Clock",
      "description": "Displays the current time",
      "ui": [
        {
          "type": "checkbox",
          "id": "show_seconds",
          "label": "Show Seconds",
          "default": false
        }
      ]
    }
  }
}
```

> **Note:** If you omit `manifest.json`, the core can auto-generate one from your templates. See [manifest.json for PDK Plugins](RUNTIME_EXAMPLES.md#2-manifestjson-for-pdk-plugins).

### Step 3: Create `src/functions/clock/template.xml`

```xml
<template name="clock">
  <box class="face">
    <text class="label">{label}</text>
    <text class="{time_class}">{time}</text>
  </box>
</template>
```

This defines a single template named `clock`. The `{time}`, `{label}`, and `{time_class}` placeholders are filled from `ctx.state` at render time.

### Step 4: Create `src/shared.css`

```css
:root {
  --bg: {_button_color};
  --time-color: #ffffff;
  --label-color: #505050;
}

.face {
  background: var(--bg);
  padding: 6;
  direction: column;
  align: center;
  justify: center;
  gap: 2;
}

.time {
  color: var(--time-color);
  font-size: 1.7em;
  font-weight: bold;
  text-align: center;
}

.label {
  color: var(--label-color);
  font-size: 0.65em;
  text-align: center;
}
```

### Step 5: Create `src/shared.py`

```python
from __future__ import annotations
from datetime import datetime
from typing import Any


def on_load(ctx: Any) -> None:
    ctx.state.time = ""
    ctx.state.label = ""
    ctx.state.time_class = "time"
    ctx.state._template = "clock"


def on_poll(ctx: Any, interval: int = 1000) -> None:
    now = datetime.now()
    show_sec = ctx.config.get("show_seconds", False)

    if show_sec:
        ctx.state.time = now.strftime("%H:%M:%S")
        ctx.state.time_class = "time-sec"
    else:
        ctx.state.time = now.strftime("%H:%M")
        ctx.state.time_class = "time"
```

### Step 6: Done

Restart PyDeck. The "clock" plugin appears in the sidebar. Drag it onto a button and the current time renders directly on the button face, updating every second.

---

## 3. Plugin Directory Structure

PDK plugins live under the same `plugins/plugin/<plugin_name>/` root as classic plugins. The folder name **is** the plugin name.

### Standard Layout

```text
plugins/
└── plugin/
    └── my_plugin/
        ├── manifest.json
        ├── src/
        │   ├── shared.py          # Shared code / fallback handlers
        │   ├── shared.css         # Shared CSS stylesheet (auto-loaded)
        │   └── functions/
        │       ├── func_a/
        │       │   ├── template.xml   # Template for this function
        │       │   ├── handler.py     # Handlers for this function
        │       │   └── style.css      # Per-function styles (optional)
        │       └── func_b/
        │           ├── template.xml
        │           ├── handler.py
        │           └── style.css
        ├── assets/
        │   ├── icons/             # Static images shipped with the plugin
        │   │   ├── icon.png
        │   │   └── func_a.png
        │   └── fonts/
        ├── scripts/
        │   └── setup.sh           # Post-install script
        └── meta/
            ├── options.json       # Marketplace metadata
            └── licenses/
                ├── LICENSE-main
                └── LICENSE-third-party
```

### How It Works

- **Templates** in `src/functions/<func>/template.xml` are discovered and merged. Each function gets its own template file.
- **Shared styles** in `src/shared.css` are loaded first. Per-function `style.css` files in each function directory are appended after, giving them higher cascade precedence.
- **Handlers** in `src/functions/<func>/handler.py` take precedence over `src/shared.py` for the matching function. The shared module serves as fallback.
- **State** is isolated per function — each function gets its own state dict so `_template` and other variables don't collide between functions.

### Required Files

| File | Purpose |
|:---|:---|
| `src/functions/<func>/template.xml` | Defines templates for button rendering. The presence of template XML files is what marks a plugin as PDK-based. |
| `src/shared.py` (and/or per-function `handler.py`) | Contains event handler functions (`on_load`, `on_press`, `on_poll`). |

### Optional Files

| File | Purpose |
|:---|:---|
| `manifest.json` | Plugin metadata, function definitions, UI fields, credentials. If absent, a manifest is auto-generated from the templates. |
| `src/shared.css` | CSS-like rules automatically loaded before any `<style>` blocks in the template files. |
| `assets/icons/` | Static images shipped with the plugin. Referenced in templates via `<img src="assets/icons/icon.png" />`. |
| `meta/options.json` | Marketplace/catalog metadata. |
| `meta/licenses/` | License files for third-party dependencies. |
| `scripts/setup.sh` | Post-install shell script. |

### Images — assets/icons/ and storage/

PDK distinguishes between two types of image files:

| Type | Location | Use for |
|:---|:---|:---|
| **Static assets** | `plugins/plugin/<name>/assets/icons/` | Icons, state images — shipped with the plugin |
| **Runtime-generated files** | `plugins/storage/<name>/` | Files the plugin writes at runtime (e.g. downloaded weather icons, album art) |

#### Static images — assets/icons/

Place bundled images in `assets/icons/`. Reference them in templates with a relative path from the plugin directory:

```xml
<img src="assets/icons/icon.png" width="32" height="32" fit="contain" />
```

#### Runtime storage — plugins/storage/

If your plugin **downloads or generates files at runtime**, write them to `plugins/storage/<plugin_name>/` via `ctx.storage_path`. Reference them in templates using the relative path from the plugin directory:

```python
def _download_image(url: str, filename: str, ctx) -> str:
    """Download an image to storage and return the src path for templates."""
    ctx.storage_path.mkdir(parents=True, exist_ok=True)
    dst = ctx.storage_path / filename
    # ... download to dst ...
    return f"../../storage/{ctx.plugin_name}/{filename}"
```

```xml
<img src="{icon_src}" width="24" height="24" fit="contain" />
```

The `../../storage/<name>/` relative path works because `<img src>` is resolved relative to the plugin directory (`plugins/plugin/<name>/`).

**Why separate?** The `assets/` directory ships with the plugin and is replaced on plugin update. Files in `plugins/storage/` survive updates because they live outside the plugin folder.

### How PDK Plugins Are Detected

A plugin is identified as PDK if its directory contains template XML sources. The core checks this via `is_pdk_plugin()`, which looks for:

1. A `src/functions/` directory containing subdirectories with `template.xml` files, **or**
2. (Legacy) A root `plugin.xml` file or immediate subdirectories with `.xml` files.

When a PDK plugin is detected, the core routes rendering, press handling, and polling through the PDK engine instead of the classic path. Plugin discovery also requires either a `manifest.json` file or PDK XML sources — directories with neither are ignored.
