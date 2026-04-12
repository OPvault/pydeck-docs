# PDK Plugin Development Guide

Everything you need to build rich, visually-driven Stream Deck plugins using the PyDeck Development Kit (PDK).

---

## Table of Contents

1. [What is PDK?](#1-what-is-pdk)
2. [Quick Start — Clock](#2-quick-start--clock)
3. [Plugin Directory Structure](#3-plugin-directory-structure)
4. [plugin.xml — Templates](#4-pluginxml--templates)
5. [Elements Reference](#5-elements-reference)
6. [style.css — Styling](#6-stylecss--styling)
7. [Layout Engine](#7-layout-engine)
8. [Renderer](#8-renderer)
9. [Animations](#9-animations)
10. [plugin.py — Event Handlers](#10-pluginpy--event-handlers)
11. [manifest.json for PDK Plugins](#11-manifestjson-for-pdk-plugins)
12. [State Interpolation](#12-state-interpolation)
13. [Real-World Examples](#13-real-world-examples)
14. [Tips and Best Practices](#14-tips-and-best-practices)

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

```
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

> **Note:** If you omit `manifest.json`, the core can auto-generate one from your templates. See [manifest.json for PDK Plugins](#11-manifestjson-for-pdk-plugins).

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

```
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

```
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

---

## 4. plugin.xml — Templates

The `plugin.xml` file contains one or more `<template>` blocks. Each template defines a button face layout that can be selected at runtime.

### Template Block Syntax

```xml
<template name="my_view" title="My View" description="Shows something" icon="img/icon.png">
  <box class="container">
    <text class="title">{heading}</text>
    <img src="img/logo.png" width="32" height="32" fit="contain" />
  </box>
</template>
```

### Template Attributes

| Attribute | Required | Description |
|:---|:---|:---|
| `name` | Yes | Identifier used to select this template. Maps to a function name in the manifest. |
| `title` | No | Human-readable label shown in the sidebar. Defaults to `name`. |
| `description` | No | Short description shown in the UI. |
| `icon` | No | Relative path to a sidebar icon image. |

### Multiple Templates

A single plugin can define multiple templates. The active template is selected by setting `ctx.state._template` in your event handler:

```xml
<template name="main">
  <box class="bg">
    <text class="value">{value}</text>
  </box>
</template>

<template name="detail">
  <box class="bg">
    <text class="label">{detail_line1}</text>
    <text class="label">{detail_line2}</text>
  </box>
</template>
```

```python
def on_press(ctx):
    if ctx.state.get("view") == "main":
        ctx.state.view = "detail"
        ctx.state._template = "detail"
    else:
        ctx.state.view = "main"
        ctx.state._template = "main"
```

### Inline Settings (UI Fields)

Templates can embed `<settings>` blocks with `<field>` elements to define UI fields. These are equivalent to the `ui` array in `manifest.json`:

```xml
<template name="weather" title="Weather">
  <settings>
    <field type="input" id="location" label="Location" placeholder="Oslo" default="" />
    <field type="select" id="temperature_unit" label="Unit" default="C">
      <option value="C" label="Celsius" />
      <option value="F" label="Fahrenheit" />
    </field>
  </settings>
  <box class="bg">
    <text class="temp">{temperature}</text>
  </box>
</template>
```

#### Field Attributes

| Attribute | Description |
|:---|:---|
| `type` | Field type: `input`, `select`, `checkbox`, `number`, `slider`, `radio`, `group`, etc. |
| `id` | Key name — available as `ctx.config.get("id")` in handlers. |
| `label` | Label shown in the button editor UI. |
| `placeholder` | Placeholder text for input fields. |
| `default` | Default value. Automatically cast: `checkbox` → boolean, `number`/`slider` → numeric. |
| `visible_if` | Conditionally show/hide this field based on another field's value (see below). |
| `fields` | For `group` type only — an array of child field definitions rendered inside the group container. |

#### Field Type: `group`

The `group` type renders a visual container with nested child fields. Use it to group related settings together:

```json
{
  "type": "group",
  "label": "Advanced Settings",
  "fields": [
    { "type": "checkbox", "id": "option_a", "label": "Option A", "default": false },
    { "type": "input", "id": "option_b", "label": "Option B", "default": "" }
  ]
}
```

In XML settings blocks:

```xml
<field type="group" label="Advanced Settings">
  <field type="checkbox" id="option_a" label="Option A" default="false" />
  <field type="input" id="option_b" label="Option B" default="" />
</field>
```

#### Conditional Visibility: `visible_if`

Fields can be shown or hidden based on another field's value using the `visible_if` attribute. This is set in `manifest.json` (not in XML `<field>` elements):

```json
{
  "type": "checkbox",
  "id": "show_details",
  "label": "Show details",
  "default": false,
  "visible_if": { "field": "mode", "value": "advanced" }
}
```

| Key | Description |
|:---|:---|
| `field` | The `id` of the field to watch. |
| `value` | Show this field when the watched field equals this value. |
| `not_value` | Show this field when the watched field does **not** equal this value. Use `not_value` instead of `value` for inverse conditions. |

Example using `not_value`:

```json
{
  "type": "checkbox",
  "id": "exclude_current",
  "label": "Skip current time",
  "default": false,
  "visible_if": { "field": "forecast_interval", "not_value": "24" }
}
```

This field is visible whenever `forecast_interval` is set to anything other than `"24"`.

---

## 5. Elements Reference

PDK templates use XML elements. Each element has a tag name, allowed attributes, and default style values.

### Common Attributes

All elements support these attributes:

| Attribute | Description |
|:---|:---|
| `class` | Space-separated CSS class names for styling. |
| `id` | Unique identifier for `#id` CSS selectors. |
| `width` | Explicit width (pixels, `%`, `em`, `rem`, or `auto`). |
| `height` | Explicit height (pixels, `%`, `em`, `rem`, or `auto`). |
| `style` | Inline style declarations (highest specificity). |

### Element Tags

#### `<box>` — Container

The primary layout container. Arranges children using flexbox-like rules.

```xml
<box class="row" style="direction: row; gap: 4;">
  <text>Left</text>
  <text>Right</text>
</box>
```

- **Container:** Yes
- **Default direction:** `column`

#### `<text>` — Text Label

Renders a text string. The element's text content is its display value.

```xml
<text class="title" style="font-size: 18; font-weight: bold;">{heading}</text>
```

- **Container:** No
- **Default size:** auto (fits text content)
- **Single-line only** — text is rendered on a single line with no wrapping or multi-line support.

#### `<img>` — Image

Displays an image file. The `src` path is resolved relative to the plugin directory.

```xml
<img src="img/icon.png" width="32" height="32" fit="contain" />
```

| Attribute | Description |
|:---|:---|
| `src` | Path to the image file, resolved relative to the plugin directory. Supports `{variable}` interpolation. For static images use `img/<file>`. For runtime-generated files in storage, use the relative path `../../storage/<plugin_name>/<file>`. |
| `fit` | Sizing mode: `cover` (default — fill and crop), `contain` (fit within bounds), or `stretch` (exact size). |

- **Container:** No
- **Default size:** auto (source image dimensions)

> **Note:** The layout engine does not read the image file to determine intrinsic size — `<img>` without explicit `width` and `height` is treated as 0×0 during layout. The renderer compensates by using the image's natural dimensions at draw time, but this can cause unexpected flex layout results. Always set explicit `width` and `height` on `<img>` for predictable sizing.

#### `<rect>` — Rectangle

Draws a filled or stroked rectangle.

```xml
<rect width="40" height="20" fill="#ff0000" stroke="#ffffff" stroke-width="2" />
```

| Attribute | Description |
|:---|:---|
| `fill` | Fill colour (hex or `rgb()`). Falls back to `background` style. |
| `stroke` | Stroke colour. Falls back to `border-color` style. |
| `stroke-width` | Stroke width in pixels. Default: `1`. |

- **Container:** No

#### `<circle>` — Circle

Draws a filled or stroked circle.

```xml
<circle radius="16" fill="#00ff88" />
```

| Attribute | Description |
|:---|:---|
| `fill` | Fill colour. |
| `stroke` | Stroke colour. |
| `stroke-width` | Stroke width. Default: `1`. |
| `radius` | Circle radius in pixels. |

- **Container:** No

#### `<line>` — Line

Draws a straight line between two points.

```xml
<line x1="0" y1="0" x2="72" y2="72" stroke="#ffffff" stroke-width="2" />
```

| Attribute | Description |
|:---|:---|
| `x1`, `y1` | Start point coordinates (relative to element position). |
| `x2`, `y2` | End point coordinates. |
| `stroke` | Line colour. Falls back to `color` style. |
| `stroke-width` | Line width. Default: `1`. |

- **Container:** No

#### `<progress>` — Progress Bar

Draws a horizontal progress bar.

```xml
<progress value="{percent}" fill-color="#00ff88" track-color="#333333" />
```

| Attribute | Description |
|:---|:---|
| `value` | Progress percentage (0–100). Supports `{variable}` interpolation. |
| `fill-color` | Colour of the filled portion. Supports gradients. Default: `#00ff88`. |
| `track-color` | Colour of the track background. Falls back to `background` style. Default: `#333333`. |

- **Container:** No
- **Default height:** `6px`
- **Default border-radius:** `3px`

#### `<spacer>` — Flexible Space

Absorbs remaining space in a flex layout. Equivalent to a flex-grow spacer.

```xml
<box style="direction: column;">
  <text>Top</text>
  <spacer />
  <text>Bottom</text>
</box>
```

When multiple spacers exist in the same container, the available space is divided equally among them.

- **Container:** No
- **Default size:** auto (expands to fill)

#### `<marquee>` — Scrolling Text

Renders horizontally scrolling text, clipped to the element bounds. When the rendered text fits within the box, it behaves identically to `<text>` (no scrolling). When the text overflows, it scrolls continuously from right to left.

```xml
<marquee class="song-title" speed="30">{track_name}</marquee>
```

| Attribute | Description |
|:---|:---|
| `speed` | Scroll speed in pixels per second. Default: `30`. |

- **Container:** No
- **Inherits all text styling** — `font-size`, `color`, `font-weight`, `font-style`, `shadow`, `text-stroke`, etc.
- **Automatically triggers the animation tick** (~15 FPS) — no `@keyframes` needed. See [Performance Notes](#performance-notes) in the Animations section.
- Scroll offset is derived from the render timestamp, so no plugin-side state is required.

> **Tip:** Use `<marquee>` for labels that may overflow, such as song titles or long status messages. For text that always fits, prefer `<text>`.

---

## 6. style.css — Styling

PDK uses a CSS-like styling system. Styles can come from three sources, listed here from lowest to highest precedence (for rules with the same specificity, the higher-precedence source wins):

1. Linked stylesheets via `<link href="file.css" />` in `plugin.xml` (lowest precedence)
2. `style.css` file in the plugin directory (auto-loaded)
3. `<style>` blocks inside `plugin.xml` (highest precedence)

All sources are concatenated and parsed together. Inline `style=""` attributes on elements always have the highest specificity regardless of source.

### Selector Types

| Selector | Example | Matches |
|:---|:---|:---|
| Tag | `box` | All `<box>` elements |
| Class | `.highlight` | Elements with `class="highlight"` |
| ID | `#main` | Element with `id="main"` |
| Compound | `box.highlight` | `<box>` elements with class `highlight` |
| Compound multi-class | `.a.b` | Elements with both classes `a` and `b` |
| Comma-separated | `box, text` | All `<box>` and `<text>` elements |

### CSS Variables

Define variables in `:root` and reference them with `var()`:

```css
:root {
  --primary: #1DB954;
  --bg: #222222;
}

.container {
  background: var(--bg);
  color: var(--primary);
}
```

Variables can also use state interpolation:

```css
:root {
  --bg: {_button_color};
}
```

This reads `_button_color` from the render state, allowing the plugin to pick up the user's configured button colour.

### Specificity

Styles cascade using CSS-like specificity: `(id count, class count, tag count)`. Higher specificity wins. When specificity is equal, the rule defined later in the stylesheet takes precedence. Inline `style=""` attributes have the highest specificity.

### Supported Properties

#### Layout

| Property | Values | Default |
|:---|:---|:---|
| `direction` | `row`, `column` | `column` |
| `align` | `start`, `center`, `end`, `stretch` | `start` |
| `justify` | `start`, `center`, `end`, `space-between`, `space-around` | `start` |
| `gap` | pixels | `0` |
| `padding` | shorthand (1–4 values) | `0` |
| `padding-top/right/bottom/left` | pixels | `0` |
| `width` | pixels, `%`, `em`, `rem`, `auto` | `auto` |
| `height` | pixels, `%`, `em`, `rem`, `auto` | `auto` |

#### Typography

| Property | Values | Default |
|:---|:---|:---|
| `font-family` | Font name (resolved via fontconfig, falls back to DejaVu Sans) | `DejaVu Sans` |
| `font-size` | pixels, `em`, `rem`, `%`, named sizes | `14` |
| `font-weight` | `normal`, `bold` | `normal` |
| `font-style` | `normal`, `italic` | `normal` |
| `text-align` | `left`, `center`, `right` | `center` |
| `text-anchor` | A single character (e.g. `:`) or `none` | `none` |
| `text-decoration` | `none`, `underline` | `none` |
| `color` | hex, `rgb()` | `#ffffff` |

#### Visual

| Property | Values | Default |
|:---|:---|:---|
| `background` | hex, `rgb()`, `linear-gradient(...)`, `radial-gradient(...)`, `transparent` | `transparent` |
| `border` | shorthand: `<width> <color>` or `none` | `none` |
| `border-width` | pixels | `0` |
| `border-color` | hex, `rgb()`, `transparent` | `transparent` |
| `border-radius` | pixels | `0` |

#### Transform

| Property | Values | Default |
|:---|:---|:---|
| `rotate` | degrees (numeric) | `0` |

#### Effects

| Property | Values | Default |
|:---|:---|:---|
| `shadow` | `<offset-x> <offset-y> <blur> <color>` or `none` | `none` |
| `glow` | `<size> <color>` or `none` | `none` |
| `blur` | pixels (Gaussian blur radius) | `0` |
| `text-stroke` | `<width> <color>` or `none` | `none` |

#### Animation

| Property | Values | Default |
|:---|:---|:---|
| `animation` | `<name> <duration> [timing] [iteration] [direction]` or `none` | `none` |

See [Animations](#9-animations) for full details and examples.

### CSS Units

| Unit | Description | Example |
|:---|:---|:---|
| `px` (or bare number) | Absolute pixels | `font-size: 14px;` or `font-size: 14;` |
| `em` | Relative to the element's own computed font-size | `font-size: 1.5em;` |
| `rem` | Relative to the root element's font-size | `font-size: 1.2rem;` |
| `%` | Relative to parent dimension (width for horizontal, height for vertical; font-size `%` is relative to parent font-size) | `width: 50%;` |

#### Named Font Sizes

| Name | Pixels |
|:---|:---|
| `xx-small` | 7 |
| `x-small` | 8 |
| `small` | 10 |
| `medium` | 14 |
| `large` | 18 |
| `x-large` | 22 |
| `xx-large` | 28 |

The keywords `smaller` and `larger` scale relative to the parent's font-size by a factor of `1.2`.

### Property Inheritance

The following properties are inherited from parent to child elements (matching CSS behaviour):

`color`, `font-family`, `font-size`, `font-weight`, `font-style`, `text-align`, `text-decoration`, `direction`

### Shorthand Expansion

**`padding`** — supports 1–4 value syntax identical to CSS:

```css
padding: 8;                /* all sides */
padding: 4 8;              /* vertical horizontal */
padding: 4 8 12;           /* top horizontal bottom */
padding: 4 8 12 16;        /* top right bottom left */
```

**`border`** — `<width> <color>` or `none`:

```css
border: 2 #ffffff;
border: none;
```

---

## 7. Layout Engine

PDK uses a simplified flexbox layout engine. Every element is laid out inside a square canvas (typically 72–96 px depending on the Stream Deck model).

### Flex Container Model

Any `<box>` element acts as a flex container. The `direction` property sets the main axis:

| Direction | Main Axis | Cross Axis |
|:---|:---|:---|
| `column` (default) | Vertical (top to bottom) | Horizontal |
| `row` | Horizontal (left to right) | Vertical |

### Alignment

| Property | Axis | Values |
|:---|:---|:---|
| `justify` | Main axis | `start`, `center`, `end`, `space-between`, `space-around` |
| `align` | Cross axis | `start`, `center`, `end`, `stretch` |

### Sizing

- **`auto`** — the element sizes to fit its content (text measurement, child elements, or image dimensions).
- **Explicit values** — fixed size in pixels, `%`, `em`, or `rem`.

### Spacer Behaviour

The `<spacer>` element absorbs all remaining free space on the main axis. Multiple spacers in the same container share the space equally:

```xml
<box style="direction: column;">
  <text>Pinned to top</text>
  <spacer />
  <text>Pinned to bottom</text>
</box>
```

### Gap

The `gap` property adds spacing between children on the main axis:

```css
.row {
  direction: row;
  gap: 4;
}
```

---

## 8. Renderer

The PDK renderer walks the layout tree and paints each element to a Pillow `Image` in back-to-front order:

1. **Background** — solid colour or gradient (linear / radial)
2. **Border** — stroke with optional `border-radius`
3. **Content** — text, images, shapes (`rect`, `circle`, `line`), progress bars
4. **Child elements** — recursive rendering
5. **Effects** — `blur` and `glow` applied as post-processing

### Backgrounds

Solid colour:

```css
.container { background: #1a1a2e; }
```

Linear gradient:

```css
.container { background: linear-gradient(180deg, #0091fe, #02cdf9); }
```

Radial gradient:

```css
.container { background: radial-gradient(#ffffff, #000000); }
```

Gradient angles: `0deg` = bottom-to-top, `90deg` = left-to-right, `180deg` = top-to-bottom (default), `270deg` = right-to-left.

> **Note:** Only `0`, `90`, `180`, and `270` degree angles are supported. Arbitrary angles (e.g. `45deg`) are treated as vertical (top-to-bottom).

### Image Fit Modes

The `fit` attribute on `<img>` controls how the source image is sized within the element bounds:

| Mode | Behaviour |
|:---|:---|
| `cover` (default) | Scale to fill the entire box, cropping excess. |
| `contain` | Scale to fit within the box, preserving aspect ratio. The image is centred within the element bounds. |
| `stretch` | Stretch to exactly match width and height. |

### Text Rendering

Text is rendered using the computed font, and positioned according to `text-align`:

- `left` — flush left
- `center` (default) — centred horizontally
- `right` — flush right

Text is always vertically centred within the element's box. Shadow is rendered first (behind the text) when the `shadow` property is set.

#### Text Anchor

The `text-anchor` property centres the text so that a specific character sits at the horizontal midpoint of the canvas. This is useful for aligning colons in clock displays, decimal points in numbers, or any other fixed reference character:

```css
.time { text-anchor: :; }
```

When `text-anchor` is set and the anchor character exists in the text, `text-align` is ignored. If the character is not found, `text-align` applies as normal.

#### Text Stroke

The `text-stroke` property draws an outline around text, rendered behind the fill colour. It works on both `<text>` and `<marquee>` elements:

```css
.title { text-stroke: 1 #000000; }
/*        width  color */
```

#### Emoji Support

`<text>` elements support emoji characters. When text contains emoji codepoints, the renderer splits the string into emoji and non-emoji runs, renders each with the appropriate font, and composites them together. The system emoji font is resolved via `fc-match` and scaled to match the element's `font-size`.

### Font Resolution

Fonts are resolved in this order:

1. If `font-family` names a non-DejaVu font, resolve via `fc-match` (fontconfig).
2. Fall back to bundled DejaVu Sans variants (`Regular`, `Bold`, `Oblique`, `BoldOblique`).
3. Last resort: Pillow's built-in default font.

### Effects

**Shadow** — only applies to `<text>` elements (drawn behind the text):

```css
.title { shadow: 2 2 4 #000000; }
/*        offset-x  offset-y  blur  color */
```

**Glow** — coloured glow around an element:

```css
.active { glow: 4 #00ff88; }
/*        size  color */
```

**Blur** — Gaussian blur applied to the element's region:

```css
.frosted { blur: 3; }
```

---

## 9. Animations

PDK supports CSS `@keyframes` animations and the `rotate` transform. Since PDK renders static PNGs via Pillow (there is no browser or DOM), animations work by re-rendering the button at a higher frame rate (~15 FPS) and computing interpolated property values at each timestamp.

### How It Works

1. `@keyframes` blocks and `animation` properties are parsed from your CSS.
2. A timestamp is passed to the renderer on each frame.
3. The animation resolver computes the current position in the animation cycle, applies a timing function, and interpolates keyframe property values.
4. Transforms like `rotate` are applied during Pillow drawing (render to temp layer → rotate → composite).
5. The listener re-renders animated buttons on a fast tick (~15 FPS) for the physical deck.
6. The web preview emits periodic update events so the browser refreshes the button image.

### `@keyframes`

Define keyframe animations using standard CSS `@keyframes` syntax:

```css
@keyframes spin {
  from { rotate: 0; }
  to { rotate: 360; }
}

@keyframes pulse {
  0% { opacity: 1.0; }
  50% { opacity: 0.5; }
  100% { opacity: 1.0; }
}
```

- `from` is an alias for `0%`, `to` is an alias for `100%`.
- You can define any number of percentage stops (e.g. `0%`, `25%`, `50%`, `100%`).
- Keyframe values are linearly interpolated between stops.
- Animatable properties: `rotate`, `opacity` (numeric values and hex colours are interpolated).

### `animation` Property

Apply an animation to any element using the `animation` shorthand:

```css
.icon {
  animation: spin 2s linear infinite;
}
```

#### Shorthand Format

```
animation: <name> <duration> [timing] [delay] [iteration] [direction]
```

| Part | Required | Values | Default |
|:---|:---|:---|:---|
| `name` | Yes | Name of a `@keyframes` block | — |
| `duration` | Yes | `2s`, `500ms`, etc. | — |
| `timing` | No | `linear`, `ease`, `ease-in`, `ease-out`, `ease-in-out` | `linear` |
| `delay` | No | `0.5s`, `200ms`, etc. | `0s` |
| `iteration` | No | `infinite` or a number (e.g. `3`) | `infinite` |
| `direction` | No | `normal`, `reverse`, `alternate`, `alternate-reverse` | `normal` |

#### Examples

```css
/* Spin forever at constant speed */
animation: spin 2s linear infinite;

/* Pulse 3 times with easing */
animation: pulse 1s ease-in-out 3;

/* Spin in reverse */
animation: spin 3s linear infinite reverse;

/* Alternate direction (ping-pong) */
animation: spin 2s ease infinite alternate;

/* Start after 500ms delay */
animation: spin 2s linear 0.5s infinite;
```

### `rotate` Property

The `rotate` property sets a rotation angle in degrees. It can be used statically or animated via `@keyframes`.

```css
/* Static rotation */
.tilted { rotate: 15; }

/* Animated rotation */
@keyframes spin {
  from { rotate: 0; }
  to { rotate: 360; }
}
.spinning { animation: spin 2s linear infinite; }
```

When `rotate` is non-zero, the element and all its children are rendered to a temporary RGBA layer, rotated using Pillow's bicubic resampling, and composited back onto the main canvas.

### Timing Functions

| Function | Behaviour |
|:---|:---|
| `linear` | Constant speed, no acceleration |
| `ease` | Smooth start and end (S-curve) |
| `ease-in` | Starts slow, accelerates |
| `ease-out` | Starts fast, decelerates |
| `ease-in-out` | Starts slow, speeds up, then slows down |

### Complete Example — Spinning Weather Icon

```css
@keyframes spin {
  from { rotate: 0; }
  to { rotate: 360; }
}

.icon-container {
  animation: spin 2s linear infinite;
}
```

```xml
<template name="weather">
  <box class="bg">
    <box class="icon-container">
      <img src="{icon_src}" width="24" height="24" fit="contain" />
    </box>
    <text class="temp">{temperature}</text>
  </box>
</template>
```

The `.icon-container` box (and its child `<img>`) will rotate continuously. The physical deck renders at ~15 FPS; the web preview updates at a similar rate.

### Performance Notes

- Buttons whose CSS contains `@keyframes` **or** whose template tree contains a `<marquee>` element are re-rendered at the fast animation tick rate (~15 FPS). Other buttons render at normal poll intervals.
- Animation detection is cached per plugin — if you add or remove `@keyframes` or `<marquee>` elements, restart the server.
- The animation tick only calls `render_button` (no `on_poll` dispatch) — it re-renders with the current state at a new timestamp.

---

## 10. plugin.py — Event Handlers

PDK plugins use event-driven handlers instead of per-function callables. All handlers receive a single `ctx` argument — a `PDKContext` object.

### The `ctx` Object

| Attribute | Type | Description |
|:---|:---|:---|
| `ctx.state` | dict-like (supports attribute access) | Persistent state shared between events and available to templates via `{key}` interpolation. |
| `ctx.config` | dict | Per-button configuration from the UI fields. Read-only snapshot. |
| `ctx.credentials` | dict | Plugin credentials from `credentials.json` (Settings → Credentials). |
| `ctx.device_id` | str | Identifier for the Stream Deck device that triggered the event. |
| `ctx.plugin_name` | str | The plugin's directory name. |
| `ctx.plugin_dir` | Path | Absolute path to the plugin's own directory (`plugins/plugin/<name>/`). |
| `ctx.storage_path` | Path | Absolute path to the plugin's persistent storage directory (`plugins/storage/<name>/`). Use this for runtime-generated files (e.g. downloaded images). Files here survive plugin updates. |
| `ctx.refresh()` | method | Mark the display as needing a re-render. |

#### State Attribute Access

`ctx.state` supports both dict-style and attribute-style access:

```python
ctx.state["temperature"] = 22      # dict style
ctx.state.temperature = 22         # attribute style (equivalent)
temp = ctx.state.temperature       # attribute read
temp = ctx.state.get("temperature", 0)  # dict .get() with default
```

### Event Handlers

#### `on_load(ctx)`

Called once when the runtime is first initialised. Use it to set initial state values.

```python
def on_load(ctx):
    ctx.state.time = ""
    ctx.state._template = "clock"
```

#### `on_press(ctx)`

Called when the user presses the button.

```python
def on_press(ctx):
    if ctx.state.get("view") == "main":
        ctx.state.view = "detail"
    else:
        ctx.state.view = "main"
```

#### `on_poll(ctx, interval=<ms>)`

Called periodically for live-updating displays. The poll interval is determined by:

1. **Default argument** — set the `interval` parameter default on `on_poll`:
   ```python
   def on_poll(ctx, interval: int = 5000):  # poll every 5 seconds
       ...
   ```
2. **Module-level variable** — set `poll_interval` at the top of `plugin.py`:
   ```python
   poll_interval = 5000

   def on_poll(ctx):
       ...
   ```

The interval is in **milliseconds**. If neither is set, polling is disabled.

### Template Switching

Set `ctx.state._template` to the name of any template defined in `plugin.xml` to change which template renders the button:

```python
def on_press(ctx):
    ctx.state._template = "detail"  # switch to the "detail" template
```

This is how plugins implement multi-view buttons (e.g. a weather plugin that toggles between current temperature and high/low detail).

### Per-Function Modules

Multi-function plugins can place each function's handlers in a separate Python file inside a subdirectory (see [Plugin Directory Structure](#3-plugin-directory-structure)). For example, a weather plugin with `weather` and `forecast` functions:

```
plugins/plugin/weather/
├── plugin.py               # Shared helpers (fallback handlers)
├── weather/
│   └── weather.py          # on_load, on_press, on_poll for "weather"
└── forecast/
    └── forecast.py         # on_load, on_press, on_poll for "forecast"
```

When an event fires for a specific function, the runtime resolves handlers in this order:

1. **Function module** — the `.py` file in the matching subdirectory.
2. **Root module** — the root `plugin.py` (fallback if the function module doesn't define the handler).

Each function module's `on_load` is called automatically at startup, initialising that function's state independently.

#### Per-Function State Isolation

Each function gets its own isolated state dict. This prevents `_template`, display variables, and internal data from colliding between functions sharing the same plugin:

```python
# weather/weather.py
def on_load(ctx):
    ctx.state._template = "weather"
    ctx.state.line1 = "..."

# forecast/forecast.py
def on_load(ctx):
    ctx.state._template = "forecast"
    ctx.state.fc1 = "..."
```

Both functions can use `ctx.state._template` without overwriting each other because each operates on a separate state. The root `plugin.py` can hold shared utility functions that the per-function modules import.

---

## 11. manifest.json for PDK Plugins

### With manifest.json

If your PDK plugin includes a `manifest.json`, it is loaded normally and augmented with `pdk: true` on the plugin and each function entry. This is the simplest approach — the manifest works identically to a classic plugin's manifest, but the button face is rendered by PDK instead of the core.

```json
{
  "name": "pdk-weather",
  "version": "1.0.0",
  "description": "Weather display powered by met.no",
  "functions": {
    "weather": {
      "label": "Weather",
      "description": "Current weather conditions",
      "ui": [
        {
          "type": "input",
          "id": "location",
          "label": "Location",
          "placeholder": "Oslo",
          "default": ""
        }
      ]
    }
  }
}
```

### Auto-Generated Manifest (no manifest.json)

If `manifest.json` is absent, the core generates one automatically:

- **From templates** — each `<template>` becomes a function entry. The template's `title`, `description`, and `icon` attributes map to `label`, `description`, and `sidebar_icon`.
- **From `<settings>`** — `<field>` elements inside a template become the function's `ui` array.
- **From poll detection** — if `on_poll` has an `interval` default kwarg or the module has a `poll_interval` variable, a `poll` entry is added to each function.

### Key Fields

| Field | Source | Description |
|:---|:---|:---|
| `pdk` | Auto-set | Always `true` for PDK plugins. |
| `python_dependencies` | manifest.json | Pip packages as a JSON array. |
| `credentials` | manifest.json | Credential field names. |
| `functions.*.poll` | `on_poll` interval detection | `{ "function": "on_poll", "interval_ms": <value> }`. |

---

## 12. State Interpolation

PDK templates use `{key}` syntax to inject values from the render state into text content, attributes, and even CSS.

### In Templates

Interpolation works in:

- **Text content**: `<text>{temperature}°C</text>`
- **Attributes**: `width`, `height`, `value`, `src`, `class`

```xml
<img src="{icon_src}" width="{icon_w}" height="{icon_h}" fit="contain" />
<text class="{text_class}">{display_value}</text>
<progress value="{percent}" />
```

### In CSS

State values are interpolated in the stylesheet before parsing. This enables dynamic theming:

```css
:root {
  --bg: {_button_color};
}
```

The variable `_button_color` is automatically injected by the core with the user's configured button background colour.

### Special State Keys

| Key | Description |
|:---|:---|
| `_template` | Controls which template is rendered. Set in handlers to switch views. |
| `_button_color` | Injected by the core — the user's chosen button background colour (hex string). |

### How It Works

At render time, the engine:

1. Deep-copies the template tree (so interpolation doesn't mutate the parse cache).
2. Replaces `{key}` in text content and select attributes with `str(state[key])`.
3. Replaces `{key}` in the concatenated CSS text before parsing the stylesheet.

If a `{key}` has no matching state entry, the placeholder is left as-is.

---

## 13. Real-World Examples

### Clock Plugin

A simple clock that updates every second, with optional seconds display, 12/24-hour mode, and date line.

**`plugins/plugin/clock/plugin.xml`**

```xml
<template name="clock">
  <box class="face">
    <text class="label">{label}</text>
    <text class="{time_class}">{time}</text>
  </box>
</template>

<template name="clock-date">
  <box class="face">
    <text class="label">{label}</text>
    <text class="{time_class}">{time}</text>
    <box class="divider" />
    <text class="date">{date}</text>
  </box>
</template>
```

**`plugins/plugin/clock/style.css`**

```css
:root {
  --bg: {_button_color};
  --time-color: #ffffff;
  --date-color: #777777;
  --label-color: #505050;
  --divider-color: #333333;
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

.time-sec {
  color: var(--time-color);
  font-size: 1.1em;
  font-weight: bold;
  text-align: center;
}

.date {
  color: var(--date-color);
  font-size: 0.75em;
  text-align: center;
}

.label {
  color: var(--label-color);
  font-size: 0.65em;
  text-align: center;
}

.divider {
  background: var(--divider-color);
  width: 50%;
  height: 1;
}
```

**`plugins/plugin/clock/plugin.py`**

```python
from __future__ import annotations
from datetime import datetime
from typing import Any
from zoneinfo import ZoneInfo


def on_load(ctx: Any) -> None:
    ctx.state.time = ""
    ctx.state.date = ""
    ctx.state.label = ""
    ctx.state.time_class = "time"
    ctx.state._template = "clock"


def on_poll(ctx: Any, interval: int = 1000) -> None:
    tz_name = ctx.config.get("timezone", "local")
    if tz_name and tz_name != "local":
        try:
            tz = ZoneInfo(tz_name)
        except (KeyError, Exception):
            tz = None
    else:
        tz = None

    now = datetime.now(tz)
    show_sec = ctx.config.get("show_seconds", False)
    hour_12 = ctx.config.get("hour_12", False)
    show_date = ctx.config.get("show_date", False)

    if hour_12:
        fmt = "%I:%M:%S" if show_sec else "%I:%M"
        ctx.state.label = now.strftime("%p")
    else:
        fmt = "%H:%M:%S" if show_sec else "%H:%M"
        ctx.state.label = ""

    ctx.state.time = now.strftime(fmt)
    ctx.state.time_class = "time-sec" if show_sec else "time"
    ctx.state.date = now.strftime("%b %d")
    ctx.state._template = "clock-date" if show_date else "clock"
```

**Key takeaways:**

- No `manifest.json` — the manifest is auto-generated from the templates.
- `on_poll` with `interval=1000` updates every second.
- `ctx.state._template` switches between `clock` and `clock-date` based on the `show_date` config.
- `{time_class}` interpolation in the `class` attribute dynamically switches CSS classes.
- `{_button_color}` in `:root` picks up the user's button colour setting.

---

### Weather Plugin (Multi-Function)

A multi-function weather plugin that uses the subdirectory layout. The `weather` function shows current temperature with a weather icon (toggles to high/low detail on press). The `forecast` function displays 3 upcoming forecasts. Shared utilities live in the root `plugin.py`.

**Directory structure:**

```
plugins/plugin/weather/
├── manifest.json           # Shared manifest with both functions
├── plugin.py               # Shared utilities (geocoding, API, formatting)
├── style.css               # Shared styles for both functions
├── weather/
│   ├── weather.xml         # Templates for "weather" function
│   └── weather.py          # Handlers for "weather" function
└── forecast/
    ├── forecast.xml        # Templates for "forecast" function
    └── forecast.py         # Handlers for "forecast" function
```

**`weather/weather.xml`**

```xml
<template name="weather">
  <box class="bg">
    <box class="top">
      <img src="{icon_src}" width="{icon_w}" height="{icon_h}" fit="contain" />
    </box>
    <text class="{temp_class}">{line1}</text>
    <box class="bottom">
      <text class="day">{line2}</text>
    </box>
  </box>
</template>

<template name="weather-detail">
  <box class="bg">
    <box class="detail">
      <box class="detail-arrows">
        <text class="arrow-hi">{arrow_hi}</text>
        <text class="arrow-lo">{arrow_lo}</text>
      </box>
      <box class="detail-vals">
        <text class="{val_hi_class}">{val_hi}</text>
        <text class="{val_lo_class}">{val_lo}</text>
      </box>
    </box>
  </box>
</template>
```

**`forecast/forecast.xml`**

```xml
<template name="forecast" title="Multiple Forecasts" description="3 upcoming forecasts">
  <box class="fc-bg">
    <box class="fc-entry">
      <img src="{fc1_icon}" width="{fc_iw}" height="{fc_ih}" fit="contain" />
      <text class="{fc1_class}">{fc1}</text>
    </box>
    <box class="fc-entry">
      <img src="{fc2_icon}" width="{fc_iw}" height="{fc_ih}" fit="contain" />
      <text class="{fc2_class}">{fc2}</text>
    </box>
    <box class="fc-entry">
      <img src="{fc3_icon}" width="{fc_iw}" height="{fc_ih}" fit="contain" />
      <text class="{fc3_class}">{fc3}</text>
    </box>
  </box>
</template>
```

**`weather/weather.py`** (abbreviated)

```python
from plugin import resolve_location, fetch_timeseries, current_conditions
from plugin import download_icon, fmt_temp, weather_bg, is_wide

def on_load(ctx):
    ctx.state._temp = 0.0
    ctx.state._high = 0.0
    ctx.state._low = 0.0
    ctx.state._icon = ""
    ctx.state.view = "main"
    ctx.state._template = "weather"
    ctx.state.line1 = "..."

def on_press(ctx):
    ctx.state.view = "detail" if ctx.state.get("view") == "main" else "main"
    _render(ctx)

def on_poll(ctx, interval=60000):
    lat, lon = resolve_location(ctx.config.get("location", "Oslo"))
    ts = fetch_timeseries(lat, lon)
    temp, high, low, symbol = current_conditions(ts)
    ctx.state._temp = temp
    ctx.state._high = high
    ctx.state._low = low
    ctx.state._icon = download_icon(symbol, ctx.storage_path)
    _render(ctx)
```

**`forecast/forecast.py`** (abbreviated)

```python
from plugin import resolve_location, fetch_timeseries, pick_forecasts
from plugin import download_icon, fmt_temp, fmt_time, weather_bg

def on_load(ctx):
    ctx.state._forecasts = []
    ctx.state._template = "forecast"
    ctx.state.fc1 = "..."

def on_poll(ctx, interval=60000):
    lat, lon = resolve_location(ctx.config.get("location", "Oslo"))
    ts = fetch_timeseries(lat, lon)
    interval_h = max(1, int(ctx.config.get("forecast_interval", 1)))
    ctx.state._forecasts = pick_forecasts(ts, interval_hours=interval_h)
    _render(ctx)
```

**Key takeaways:**

- **Multi-function layout** — `weather/` and `forecast/` subdirectories each have their own `.xml` template and `.py` handler. The root `plugin.py` holds shared utilities (geocoding, API calls, formatting).
- **Per-function state** — each function has isolated state. The `weather` function sets `ctx.state._template = "weather"` and the `forecast` function sets `ctx.state._template = "forecast"` without conflict.
- Two templates in `weather.xml` (`weather` and `weather-detail`) — toggled via `ctx.state._template` on press.
- `on_poll` runs every 60 seconds to fetch fresh weather data.
- Weather icon PNGs are downloaded into `plugins/storage/weather/` at runtime and referenced via `{icon_src}` using a relative path from the plugin directory.
- Private state keys prefixed with `_` (e.g. `_temp`, `_high`, `_icon`) store raw data that isn't displayed directly.
- Dynamic gradient background using state interpolation in `style.css`: `linear-gradient(180deg, {bg_top}, {bg_bottom})`.

---

## 14. Tips and Best Practices

### Naming Conventions

- Use lowercase with hyphens or underscores for plugin directory names: `weather`, `system-monitor`, not `pdkWeather`.
- Template names should match function names in the manifest (or be descriptive variants like `weather-detail`).

### State Key Conventions

- Prefix private/internal state keys with `_` (e.g. `_temp`, `_icon_path`, `_template`).
- Use descriptive names for keys that appear in templates (e.g. `line1`, `temperature`, `percent`).

### Keep Templates Small

Stream Deck buttons are 72–96 px squares. Limit your template to 3–4 elements. Use `font-size` in `em` or `rem` units so text scales with the canvas.

### Use CSS Variables for Theming

Define colours in `:root` to make themes easy to adjust:

```css
:root {
  --primary: #00ff88;
  --bg: #1a1a2e;
}
```

### Pick Up the User's Button Colour

The core injects `_button_color` into the render state with the hex value of the user's chosen button colour. Use it in your CSS:

```css
:root {
  --bg: {_button_color};
}
```

### Use `spacer` for Flexible Layouts

Instead of calculating padding manually, use `<spacer />` to push elements apart:

```xml
<box style="direction: column;">
  <text>Title</text>
  <spacer />
  <text>Footer</text>
</box>
```

### Leverage `em` Units

Using `em` for font sizes and spacing makes your layout scale proportionally if the base font size changes:

```css
.time { font-size: 1.7em; }
.label { font-size: 0.65em; }
```

### Image Assets

- **Static images** shipped with your plugin go in `img/`. Reference them as `<img src="img/icon.png" />`.
- **Runtime-generated files** (e.g. downloaded images) go in `plugins/storage/<plugin_name>/` via `ctx.storage_path`. Reference them as `<img src="../../storage/<plugin_name>/<file>" />`.
- Files in `img/` are replaced on plugin update. Files in `plugins/storage/` survive updates.

See [Images — img/ and storage/](#images--img-and-storage) for details and a code example.

### Poll Interval Selection

- `1000` ms (1 second) — for clocks and real-time displays.
- `10000`–`60000` ms — for API-backed data that doesn't change frequently.
- Avoid very short intervals for network-dependent plugins to prevent rate limiting.

### Debugging

- If a PDK render fails, the core falls back to a dark red error tile with "ERR" text on the web UI.
- Check the terminal output for `PDK render failed for <plugin>/<function>: <error>` messages.
- Use `print()` statements in your handlers during development — they appear in the backend console.
