# PDK Development — Getting Started

When you finish this page you will understand how PDK differs from classic plugins, and you will be able to **scaffold and run** a new PDK plugin using the **PDK Plugin Creator** (recommended). An optional hand-written clock tutorial is included if you want to see every file built step by step.

**On disk:** Plugins live under **`~/.local/share/pydeck/plugin/<name>/`** (or **`$XDG_DATA_HOME/pydeck/plugin/<name>/`**). Runtime files use **`~/.local/share/pydeck/storage/<name>/`**.

**Paths in PDK (recommended):**

- **`manifest.json` `sidebar_icon`** — use a path **under the install directory**, e.g. **`assets/icons/PlayPause.png`** or **`img/icon.png`**. The web UI resolves these using the plugin id (no `plugins/plugin/...` prefix needed).
- **`<img src>` in templates** — paths **under the plugin folder** (e.g. `assets/icons/...`) are resolved from the plugin directory. Files under **`ctx.storage_path`** may use a **short path relative to that storage folder** (e.g. `_now_playing.jpg`, `tracks/monaco.png`); the renderer maps them to `~/.local/share/pydeck/storage/<name>/`.

**Legacy (still supported):** the global logical prefixes **`plugins/plugin/...`** and **`plugins/storage/...`**, plus **`../../storage/<name>/...`** from the plugin directory, still resolve for older plugins and for **classic** `buttons.json` image fields — see [Plugin development — Getting started](../classic/getting-started.md).

---

## 1. What is PDK?

PDK (PyDeck Development Kit) is an alternative plugin format that replaces the classic `manifest.json` + raw `plugin.py` approach with a template-driven model. Instead of relying on PyDeck's built-in text/image/color renderer, PDK plugins define their own button faces using:

- **XML templates** (`template.xml`) — structured markup with tags like `<box>`, `<text>`, `<img>`, and more.
- **CSS-like stylesheets** (`shared.css`) — full cascade with selectors, variables, units, and shorthand properties.
- **Python event handlers** (`shared.py` / `handler.py`) — `on_load`, `on_press`, `on_poll` functions that receive a rich context object (`ctx`).

PDK plugins are rendered server-side via Pillow into PNG images at the correct resolution for each Stream Deck model, so the button face can be anything you can draw — gradients, icons, progress bars, dynamic text, and custom layouts.

### PDK vs Classic Plugins

| | Classic (built-in renderer) | PDK Plugin |
|:---|:---|:---|
| Button face | Text + color + optional image, rendered by the core | Custom template rendered by PDK engine |
| Appearance definition | `default_display` / `display_states` in manifest | `<template>` blocks + CSS |
| Logic file | `plugin.py` with per-function callables | `src/shared.py` with event handlers (`on_load`, `on_press`, `on_poll`) |
| State management | Return dict with `display_update` key | Set `ctx.state.*` attributes, template re-renders automatically |
| Detection | Has `manifest.json` only | Has `src/functions/` with `template.xml` files |

---

## 2. Quick Start — PDK Plugin Creator

The **PDK Plugin Creator** lives in the [pydeck-plugins](https://github.com/opvault/pydeck-plugins) repo (`python -m tools.pdk_create`). It writes a full **standard PDK layout** into your **plugin data directory** under **`~/.local/share/pydeck/plugin/<slug>/`** (or `$XDG_DATA_HOME/pydeck/plugin/<slug>/`) — manifest stubs, `src/shared.py`, `src/shared.css`, `src/functions/<id>/template.xml`, `handler.py`, asset folders, and more — so you skip empty-folder setup and start from working code.

Full CLI options, path resolution, and non-interactive examples are in **[PDK Plugin Creator](../catalog/pdk-create.md)**.

### Step 1 — Repos and Python

- Python **3.10+**
- Local clones of **[pydeck](https://github.com/opvault/pydeck)** (where plugins run) and **[pydeck-plugins](https://github.com/opvault/pydeck-plugins)** (where the tool lives)

### Step 2 — Run the creator

From the root of your **pydeck-plugins** clone:

```bash
python -m tools.pdk_create
```

**Interactive mode** (default) asks for a slug, display name, description, function ids, and a **preset**:

| Preset | What you get |
|:---|:---|
| `static` | Label-style demo — good default to learn the layout |
| `counter` | Press increments a number — shows `on_press` + state updates |

The tool finds the **plugin root** (default **`~/.local/share/pydeck/plugin`**) using the same rules as `sync_from_pydeck.py` (`--pydeck-source`, `PYDECK_SOURCE`, saved `path.json`, or built-in candidates, including a **legacy checkout** folder **`…/pydeck/plugins/plugin/`** when it still exists under the PyDeck repo). If it cannot resolve the path, it prompts you.

**One-shot example** (adjust paths):

```bash
python -m tools.pdk_create --non-interactive \
  --pydeck-root /path/to/pydeck \
  --slug my_clock \
  --name "My Clock" \
  --functions clock \
  --preset static
```

Then edit the generated `template.xml`, `shared.py`, and CSS to match what you want (for a clock, add `on_poll` and time fields — or start from `static` and follow [Templates & Elements](templates-elements.md) and [Runtime & Examples](runtime-examples.md)).

### Step 3 — Run PyDeck

Restart **PyDeck**, find your plugin in the sidebar, drag a function onto a button, and press it. Iterate in the generated tree under **`~/.local/share/pydeck/plugin/<slug>/`**.

---

## 3. Tutorial — clock plugin from scratch (optional)

If you prefer to **create every file by hand** to learn how they fit together, follow this minimal clock. It matches what you could evolve from a **static** scaffold after reading [Rendering](rendering.md) and [Runtime & Examples](runtime-examples.md).

### Step A: Create the plugin folder

```text
~/.local/share/pydeck/plugin/clock/
├── manifest.json
└── src/
    ├── shared.py
    ├── shared.css
    └── functions/
        └── clock/
            └── template.xml
```

### Step B: Create `manifest.json`

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

> **Note:** If you omit `manifest.json`, the core can auto-generate one from your templates. See [manifest.json for PDK Plugins](runtime-examples.md#2-manifestjson-for-pdk-plugins).

### Step C: Create `src/functions/clock/template.xml`

```xml
<template name="clock">
  <box class="face">
    <text class="label">{label}</text>
    <text class="{time_class}">{time}</text>
  </box>
</template>
```

This defines a single template named `clock`. The `{time}`, `{label}`, and `{time_class}` placeholders are filled from `ctx.state` at render time.

### Step D: Create `src/shared.css`

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

### Step E: Create `src/shared.py`

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

### Step F: Done

Restart PyDeck. The `clock` plugin appears in the sidebar. Drag it onto a button and the current time renders on the button face, updating every second.

---

## 4. Plugin Directory Structure

PDK plugins live under the same **`~/.local/share/pydeck/plugin/<plugin_name>/`** directory as classic plugins (see **`$XDG_DATA_HOME`** above). The folder name **is** the plugin name.

### Standard Layout

```text
~/.local/share/pydeck/plugin/
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
| **Static assets** | `~/.local/share/pydeck/plugin/<name>/assets/icons/` | Icons, state images — shipped with the plugin |
| **Runtime-generated files** | `~/.local/share/pydeck/storage/<name>/` | Files the plugin writes at runtime (e.g. downloaded weather icons, album art) |

#### Static images — assets/icons/

Place bundled images in `assets/icons/`. Reference them in templates with a relative path from the plugin directory:

```xml
<img src="assets/icons/icon.png" width="32" height="32" fit="contain" />
```

#### Runtime storage

If your plugin **downloads or generates files at runtime**, write them via **`ctx.storage_path`** (on disk: **`~/.local/share/pydeck/storage/<plugin_name>/`**). In handlers, return a **`src` string for templates** that is **relative to that storage directory** — for example **`_now_playing.jpg`**, **`clearsky_day.png`**, or **`tracks/monaco.png`** — after writing the file under `ctx.storage_path`. The PDK renderer resolves these to the data home.

```python
def _download_image(url: str, filename: str, ctx) -> str:
    """Download an image to storage and return the src path for templates."""
    ctx.storage_path.mkdir(parents=True, exist_ok=True)
    dst = ctx.storage_path / filename
    # ... download to dst ...
    return filename  # e.g. "_art.jpg" — relative to ctx.storage_path
```

```xml
<img src="{icon_src}" width="24" height="24" fit="contain" />
```

**Legacy:** returning `../../storage/<plugin_name>/<file>` from the plugin directory, or the logical path `plugins/storage/<plugin_name>/<file>`, still works for older code.

**Why separate?** The `assets/` directory ships with the plugin and is replaced on plugin update. Files under **`~/.local/share/pydeck/storage/`** survive updates because they live outside the plugin package folder.

### How PDK Plugins Are Detected

A plugin is identified as PDK if its directory contains template XML sources. The core checks this via `is_pdk_plugin()`, which looks for:

1. A `src/functions/` directory containing subdirectories with `template.xml` files, **or**
2. (Legacy) A root `plugin.xml` file or immediate subdirectories with `.xml` files.

When a PDK plugin is detected, the core routes rendering, press handling, and polling through the PDK engine instead of the classic path. Plugin discovery also requires either a `manifest.json` file or PDK XML sources — directories with neither are ignored.
