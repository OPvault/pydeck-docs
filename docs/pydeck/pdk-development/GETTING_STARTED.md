# PDK Development — Getting Started

---

## 1. What is PDK?

PDK (PyDeck Development Kit) is an alternative plugin format that replaces the classic `manifest.json` + raw `plugin.py` approach with a template-driven model. Instead of relying on PyDeck's built-in text/image/color renderer, PDK plugins define their own button faces using:

- **XML templates** (`plugin.xml`) — structured markup with tags like `<box>`, `<text>`, `<img>`, and more.
- **CSS-like stylesheets** (`style.css`) — full cascade with selectors, variables, units, and shorthand properties.
- **Python event handlers** (`plugin.py`) — `on_load`, `on_press`, `on_poll` functions that receive a rich context object (`ctx`).

PDK plugins are rendered server-side via Pillow into PNG images at the correct resolution for each Stream Deck model, so the button face can be anything you can draw — gradients, icons, progress bars, dynamic text, and custom layouts.

### PDK vs Classic Plugins

| | Classic Plugin | PDK Plugin |
|:---|:---|:---|
| Button face | Text + color + optional image, rendered by the core | Custom template rendered by PDK engine |
| Appearance definition | `default_display` / `display_states` in manifest | `<template>` blocks + CSS |
| Logic file | `plugin.py` with per-function callables | `plugin.py` with event handlers (`on_load`, `on_press`, `on_poll`) |
| State management | Return dict with `display_update` key | Set `ctx.state.*` attributes, template re-renders automatically |
| Detection | Has `manifest.json` only | Has `plugin.xml` |

---

## 2. Quick Start — Clock

The fastest way to see PDK in action. This creates a simple clock plugin that displays the current time.

### Step 1: Create the plugin folder

```text
plugins/plugin/clock/
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

### Step 3: Create `plugin.xml`

```xml
<template name="clock">
  <box class="face">
    <text class="label">{label}</text>
    <text class="{time_class}">{time}</text>
  </box>
</template>
```

This defines a single template named `clock`. The `{time}`, `{label}`, and `{time_class}` placeholders are filled from `ctx.state` at render time.

### Step 4: Create `style.css`

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

### Step 5: Create `plugin.py`

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

### Single-Function Layout

For simple plugins with one function, everything lives in the plugin root:

```text
plugins/
├── plugin/
│   └── my_plugin/
│       ├── manifest.json      # Optional — metadata, functions, UI fields
│       ├── plugin.xml         # REQUIRED — template definitions
│       ├── plugin.py          # REQUIRED — Python event handlers
│       ├── style.css          # Optional — CSS stylesheet (auto-loaded)
│       └── img/               # Optional — static images shipped with the plugin
│           └── icon.png
└── storage/
    └── my_plugin/             # Runtime-generated files (written by plugin code)
        └── downloaded.png
```

### Multi-Function Layout

Plugins with multiple functions can organise each function into its own subdirectory. Each subdirectory contains an `.xml` template file and an optional `.py` handler file. Shared code lives in the root `plugin.py`, and shared styles live in the root `style.css`:

```text
plugins/
└── plugin/
    └── my_plugin/
        ├── manifest.json          # Optional — shared metadata
        ├── plugin.py              # Shared code / fallback handlers
        ├── style.css              # Shared styles (auto-loaded)
        ├── img/                   # Shared static images
        │   └── icon.png
        ├── func_a/                # Function "func_a"
        │   ├── func_a.xml         # Templates for this function
        │   └── func_a.py          # Handlers for this function
        └── func_b/                # Function "func_b"
            ├── func_b.xml         # Templates for this function
            └── func_b.py          # Handlers for this function
```

When subdirectories are used:

- **Templates** from subdirectory XML files are merged with any root `plugin.xml`. If a template name appears in both, the subdirectory version wins.
- **Styles** from subdirectory XML `<style>` blocks are appended after root styles, giving them higher cascade precedence.
- **Handlers** in subdirectory `.py` files take precedence over root `plugin.py` for the matching function. The root module serves as fallback.
- **State** is isolated per function — each function gets its own state dict so `_template` and other variables don't collide between functions.

### Required Files

| File | Purpose |
|:---|:---|
| `plugin.xml` or subdirectory `.xml` files | Defines templates for button rendering. The presence of XML sources is what marks a plugin as PDK-based. |
| `plugin.py` (or per-function `.py` files) | Contains event handler functions (`on_load`, `on_press`, `on_poll`). |

### Optional Files

| File | Purpose |
|:---|:---|
| `manifest.json` | Plugin metadata, function definitions, UI fields, credentials. If absent, a manifest is auto-generated from the templates. |
| `style.css` | CSS-like rules automatically loaded before any `<style>` blocks in the template file. |
| `img/` | Static images shipped with the plugin. Served by the API at `/api/plugins/<name>/img/<filename>`. Referenced in templates via `<img src="img/icon.png" />`. |

### Images — img/ and storage/

PDK distinguishes between two types of image files:

| Type | Location | Use for |
|:---|:---|:---|
| **Static assets** | `plugins/plugin/<name>/img/` | Icons, state images — shipped with the plugin |
| **Runtime-generated files** | `plugins/storage/<name>/` | Files the plugin writes at runtime (e.g. downloaded weather icons, album art) |

#### Static images — img/

Place bundled images in `plugins/plugin/<name>/img/`. Reference them in templates with a relative path from the plugin directory:

```xml
<img src="img/icon.png" width="32" height="32" fit="contain" />
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

**Why separate?** The `img/` directory ships with the plugin and is replaced on plugin update. Files in `plugins/storage/` survive updates because they live outside the plugin folder.

### How PDK Plugins Are Detected

A plugin is identified as PDK if its directory contains XML sources. The core checks this via `is_pdk_plugin()`, which looks for:

1. A root `plugin.xml` file, **or**
2. Any immediate subdirectory containing `.xml` files (skipping `__pycache__`, `img`, `storage`, and `node_modules`).

When a PDK plugin is detected, the core routes rendering, press handling, and polling through the PDK engine instead of the classic path. Plugin discovery also requires either a `manifest.json` file or PDK XML sources — directories with neither are ignored.
