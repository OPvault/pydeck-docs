# PDK Development — Runtime & Examples

---

## 1. Event Handlers (shared.py / handler.py)

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
2. **Module-level variable** — set `poll_interval` at the top of `src/shared.py`:
   ```python
   poll_interval = 5000

   def on_poll(ctx):
       ...
   ```

The interval is in **milliseconds**. If neither is set, polling is disabled.

### Template Switching

Set `ctx.state._template` to the name of any template defined in `template.xml` to change which template renders the button:

```python
def on_press(ctx):
    ctx.state._template = "detail"  # switch to the "detail" template
```

This is how plugins implement multi-view buttons (e.g. a weather plugin that toggles between current temperature and high/low detail).

### Per-Function Modules

Multi-function plugins can place each function's handlers in a separate Python file inside a subdirectory (see [Plugin Directory Structure](GETTING_STARTED.md#3-plugin-directory-structure)). For example, a weather plugin with `weather` and `forecast` functions:

```text
plugins/plugin/weather/
├── src/
│   ├── shared.py               # Shared helpers (fallback handlers)
│   └── functions/
│       ├── weather/
│       │   └── handler.py      # on_load, on_press, on_poll for "weather"
│       └── forecast/
│           └── handler.py      # on_load, on_press, on_poll for "forecast"
```

When an event fires for a specific function, the runtime resolves handlers in this order:

1. **Function module** — the `handler.py` file in the matching subdirectory (`src/functions/<func>/handler.py`).
2. **Root module** — the root `src/shared.py` (fallback if the function module doesn't define the handler).

Each function module's `on_load` is called automatically at startup, initialising that function's state independently.

#### Per-Function State Isolation

Each function gets its own isolated state dict. This prevents `_template`, display variables, and internal data from colliding between functions sharing the same plugin:

```python
# src/functions/weather/handler.py
def on_load(ctx):
    ctx.state._template = "weather"
    ctx.state.line1 = "..."

# src/functions/forecast/handler.py
def on_load(ctx):
    ctx.state._template = "forecast"
    ctx.state.fc1 = "..."
```

Both functions can use `ctx.state._template` without overwriting each other because each operates on a separate state. The root `src/shared.py` can hold shared utility functions that the per-function modules import.

---

## 2. manifest.json for PDK Plugins

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

## 3. State Interpolation

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
| `_button_gradient` | Injected by the core — a CSS gradient string (e.g. `linear-gradient(135deg, #ff0000 0%, #0000ff 100%)`). Falls back to `_button_color` when no gradient is set. See [Gradient Backgrounds](GRADIENT_BACKGROUNDS.md). |

### How It Works

At render time, the engine:

1. Deep-copies the template tree (so interpolation doesn't mutate the parse cache).
2. Replaces `{key}` in text content and select attributes with `str(state[key])`.
3. Replaces `{key}` in the concatenated CSS text before parsing the stylesheet.

If a `{key}` has no matching state entry, the placeholder is left as-is.

---

## 4. Real-World Examples

### Clock Plugin

A simple clock that updates every second, with optional seconds display, 12/24-hour mode, and date line.

**`plugins/plugin/clock/src/functions/clock/template.xml`**

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

**`plugins/plugin/clock/src/shared.css`**

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

**`plugins/plugin/clock/src/shared.py`**

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

A multi-function weather plugin that uses the subdirectory layout. The `weather` function shows current temperature with a weather icon (toggles to high/low detail on press). The `forecast` function displays 3 upcoming forecasts. Shared utilities live in `src/shared.py`.

**Directory structure:**

```text
plugins/plugin/weather/
├── manifest.json           # Shared manifest with both functions
└── src/
    ├── shared.py           # Shared utilities (geocoding, API, formatting)
    ├── shared.css          # Shared styles for both functions
    └── functions/
        ├── weather/
        │   ├── template.xml    # Templates for "weather" function
        │   └── handler.py      # Handlers for "weather" function
        └── forecast/
            ├── template.xml    # Templates for "forecast" function
            └── handler.py      # Handlers for "forecast" function
```

**`src/functions/weather/template.xml`**

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

**`src/functions/forecast/template.xml`**

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

**`src/functions/weather/handler.py`** (abbreviated)

```python
from shared import resolve_location, fetch_timeseries, current_conditions
from shared import download_icon, fmt_temp, weather_bg, is_wide

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

**`src/functions/forecast/handler.py`** (abbreviated)

```python
from shared import resolve_location, fetch_timeseries, pick_forecasts
from shared import download_icon, fmt_temp, fmt_time, weather_bg

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

- **Multi-function layout** — `src/functions/weather/` and `src/functions/forecast/` subdirectories each have their own `template.xml` and `handler.py`. The root `src/shared.py` holds shared utilities (geocoding, API calls, formatting).
- **Per-function state** — each function has isolated state. The `weather` function sets `ctx.state._template = "weather"` and the `forecast` function sets `ctx.state._template = "forecast"` without conflict.
- Two templates in `template.xml` (`weather` and `weather-detail`) — toggled via `ctx.state._template` on press.
- `on_poll` runs every 60 seconds to fetch fresh weather data.
- Weather icon PNGs are downloaded into `plugins/storage/weather/` at runtime and referenced via `{icon_src}` using a relative path from the plugin directory.
- Private state keys prefixed with `_` (e.g. `_temp`, `_high`, `_icon`) store raw data that isn't displayed directly.
- Dynamic gradient background using state interpolation in `shared.css`: `linear-gradient(180deg, {bg_top}, {bg_bottom})`.

---

## 5. Tips and Best Practices

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

- **Static images** shipped with your plugin go in `assets/icons/`. Reference them as `<img src="assets/icons/icon.png" />`.
- **Runtime-generated files** (e.g. downloaded images) go in `plugins/storage/<plugin_name>/` via `ctx.storage_path`. Reference them as `<img src="../../storage/<plugin_name>/<file>" />`.
- Files in `assets/icons/` are replaced on plugin update. Files in `plugins/storage/` survive updates.

See [Images — assets/icons/ and storage/](GETTING_STARTED.md#images--img-and-storage) for details and a code example.

### Poll Interval Selection

- `1000` ms (1 second) — for clocks and real-time displays.
- `10000`–`60000` ms — for API-backed data that doesn't change frequently.
- Avoid very short intervals for network-dependent plugins to prevent rate limiting.

### Debugging

- If a PDK render fails, the core falls back to a dark red error tile with "ERR" text on the web UI.
- Check the terminal output for `PDK render failed for <plugin>/<function>: <error>` messages.
- Use `print()` statements in your handlers during development — they appear in the backend console.
