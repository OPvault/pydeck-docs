# PyDeck Plugin Development Guide

Everything you need to build, test, and ship a PyDeck plugin.

---

## Table of Contents

1. [Quick Start — Hello World](#1-quick-start--hello-world)
2. [Plugin Directory Structure](#2-plugin-directory-structure)
3. [manifest.json Reference](#3-manifestjson-reference)
4. [plugin.py — Writing Functions](#4-pluginpy--writing-functions)
5. [UI Field Types](#5-ui-field-types)
6. [Display States and Toggling](#6-display-states-and-toggling)
7. [Display Polling](#7-display-polling)
8. [Credentials](#8-credentials)
9. [OAuth Integration](#9-oauth-integration)
10. [Custom CSS — style.css](#10-custom-css--stylecss)
11. [Client-Side Popup API — PyDeck.popup](#11-client-side-popup-api--pydeckpopup)
12. [Plugin Images — img/ and storage/](#12-plugin-images--img-and-storage)
13. [options.json (Marketplace Metadata)](#13-optionsjson-marketplace-metadata)
14. [Button Types](#14-button-types)
15. [Actions (Multi-Step Sequences)](#15-actions-multi-step-sequences)
16. [REST API Reference](#16-rest-api-reference)
17. [WebSocket Events](#17-websocket-events)
18. [Config and File Paths](#18-config-and-file-paths)
19. [Real-World Plugin Examples](#19-real-world-plugin-examples)
20. [Tips and Best Practices](#20-tips-and-best-practices)

---

## 1. Quick Start — Hello World

The fastest way to see how plugins work. This creates a plugin with one button that prints a greeting.

### Step 1: Create the plugin folder

```
plugins/plugin/hello_world/
```

### Step 2: Create `manifest.json`

```json
{
  "name": "hello_world",
  "version": "1.0.0",
  "description": "A simple greeting plugin",
  "functions": {
    "greet": {
      "label": "Say Hello",
      "description": "Show a greeting message",
      "default_display": {
        "color": "#4a90d9",
        "text": "Hello"
      },
      "ui": [
        {
          "type": "input",
          "id": "name",
          "label": "Your Name",
          "placeholder": "World",
          "default": ""
        }
      ]
    }
  }
}
```

### Step 3: Create `plugin.py`

```python
from __future__ import annotations
from typing import Any, Dict


def greet(config: Dict[str, Any]) -> Dict[str, Any]:
    name = config.get("name") or "World"
    return {
        "success": True,
        "message": f"Hello, {name}!"
    }
```

### Step 4: Done

Restart PyDeck. The "hello_world" plugin appears in the sidebar with a "Say Hello" function. Drag it onto a button and press it. The button text changes to "Hi World!" (or whatever name you configured). The `display_update` key tells the core to update the button's appearance on the Stream Deck and in the web GUI after each press.

---

## 2. Plugin Directory Structure

Every plugin lives under `plugins/plugin/<plugin_name>/`. The folder name **is** the plugin name used everywhere in the system.

```
plugins/plugin/my_plugin/
├── manifest.json          # REQUIRED — metadata, functions, credentials, OAuth
├── plugin.py              # REQUIRED — Python functions called on button press
├── style.css              # Optional — custom CSS loaded automatically
├── options.json           # Optional — marketplace/catalog metadata
├── img/                   # Optional — icon images served via API
│   ├── icon_default.png
│   └── icon_active.png
└── (any other .py files)  # Optional — helper modules imported by plugin.py
```

### Required Files

| File | Purpose |
|:---|:---|
| `manifest.json` | Declares the plugin's name, functions, UI fields, credentials, and OAuth config. The core reads this to discover the plugin and build the GUI. |
| `plugin.py` | Contains the Python functions that get called when buttons are pressed. Each function listed in the manifest must exist here as a top-level callable. |

### Optional Files

| File | Purpose |
|:---|:---|
| `style.css` | Custom CSS rules for your plugin. Automatically scanned and served by the core — no registration needed. |
| `options.json` | Human-friendly metadata for a future plugin marketplace (description, features, tags). |
| `img/` | Image assets served at `/api/plugins/<name>/img/<filename>`. Used for button icons, display states, etc. |
| `*.py` | Additional Python modules. Import them from `plugin.py` using a path insert (see [Spotify example](#spotify-oauth--api-client)). |

---

## 3. manifest.json Reference

The manifest is a JSON object with the following top-level keys:

```json
{
  "name": "my_plugin",
  "version": "1.0.0",
  "description": "What the plugin does",
  "author": "Your Name",
  "python_dependencies": [ ... ],
  "licenses": [ ... ],
  "credentials": [ ... ],
  "oauth": { ... },
  "permissions": { ... },
  "functions": { ... }
}
```

### Top-Level Fields

| Field | Type | Required | Description |
|:---|:---|:---|:---|
| `name` | string | Yes | Plugin identifier. Must match the folder name. |
| `version` | string | No | Semantic version string (e.g. `"1.0.0"`). |
| `description` | string | No | One-line description shown in the sidebar. |
| `author` | string | No | Plugin author name. |
| `python_dependencies` | array | No | List of pip package names the plugin requires. The backend installs missing packages automatically at startup and restarts itself. See [Python Dependencies](#python-dependencies). |
| `licenses` | array | No | Third-party license declarations for the plugin. Each entry names a license and points to its file inside the plugin folder. Shown in the marketplace as a **Licenses** button. See [Licenses](#licenses). |
| `credentials` | array | No | Credential fields shown under **Settings → Credentials** on the web UI. See [Credentials](#8-credentials). |
| `settings` | object | No | Optional category for a plugin-defined settings panel. See [Plugin settings panel](#plugin-settings-panel) under Credentials. |
| `oauth` | object | No | OAuth2 Authorization Code flow config. See [OAuth](#9-oauth-integration). |
| `permissions` | object | No | Module-level permission whitelist for the RPC system. |
| `functions` | object | Yes | Maps function names to their metadata. This is the core of the manifest. |

### Functions Object

Each key in `functions` is a function name that must exist in `plugin.py`. The value is a metadata object:

```json
{
  "functions": {
    "my_function": {
      "label": "My Function",
      "description": "What this function does",
      "default_display": {
        "color": "#1DB954",
        "text": "Go",
        "image": "plugins/plugin/my_plugin/img/icon.png"
      },
      "display_states": {
        "default": { "image": "plugins/plugin/my_plugin/img/off.png" },
        "active":  { "image": "plugins/plugin/my_plugin/img/on.png" }
      },
      "ui": [ ... ]
    }
  }
}
```

| Field | Type | Required | Description |
|:---|:---|:---|:---|
| `label` | string | Yes | Human-readable name shown in the sidebar and editor. |
| `description` | string | No | Short description shown below the label. |
| `sidebar_icon` | string | No | Relative path to an image for the **sidebar** action tile only (same path style as `default_display.image`). Omitted or empty → generic “+” tile. **Not** derived from `default_display.image`; set explicitly when you want a tile graphic. Legacy alias: `action_tile_icon`. |
| `default_display` | object | No | Initial button appearance when dragged onto a slot. Supports `color` (hex), `text` (string), `image` (relative path), optional **`scroll_enabled`** / **`scroll_speed`** (title marquee), and all text-style fields: `show_title`, `text_position`, `text_size`, `text_bold`, `text_italic`, `text_underline`, `text_color`. Text-style fields act as **suggestions** by default (applied only when the user has not set the field); add a companion `<field>_lock: true` to hard-lock a field so the manifest always wins. See [Text Style in default_display](#text-style-in-default_display) and [Text Style Priority Chain](#14-text-style-priority-chain). |
| `display_states` | object | No | Maps state keys (like `"default"`, `"active"`) to partial display overrides. Used for toggling button images. See [Display States](#6-display-states-and-toggling). |
| `poll` | object | No | Background display polling config. See [Display Polling](#7-display-polling). |
| `ui` | array | Yes | List of UI field definitions for the button editor. See [UI Field Types](#5-ui-field-types). Use `[]` for no fields. |
| `title_readonly` | boolean | No | When `true`, the web editor shows the title field as read-only with a **Read-only** badge. Use when the plugin or its poller owns the label (for example live clock text or transport state). The title is still persisted with the button like any other field; this flag is UI-only. |
| `disableGallary` / `disableGallery` | boolean | No | When `true`, the button editor hides the icon/image picker for that function. Use this for buttons that should not let users browse or replace the displayed image. The current MET current-temperature function uses this to remove the gallery UI. |
| `autosave` | — | — | Not a function-level field. The editor shows a **Save** button automatically when any field in the `ui` array sets `"autosave": "off"`. See [Common Properties](#common-properties) under UI Field Types. |

### Python Dependencies

Declares the pip packages your plugin needs. PyDeck reads this list every time the backend starts and automatically installs any package that is not yet present in the venv. If anything is newly installed the process restarts itself so the packages are importable before any plugin code runs.

```json
{
  "python_dependencies": ["evdev", "requests"]
}
```

| Field | Type | Description |
|:---|:---|:---|
| `python_dependencies` | array of strings | Pip package names (the same names you would pass to `pip install`). Import names and pip names may differ — use the pip name (e.g. `"pillow"`, not `"PIL"`). |

**Example — keyboard plugin** (`plugins/plugin/keyboard/manifest.json`):

```json
{
  "name": "Keyboard",
  "python_dependencies": ["evdev"],
  "permissions": {
    "evdev": ["UInput", "ecodes"],
    "time": ["sleep"]
  }
}
```

> **Note:** `python_dependencies` is a **pip package list**, while `permissions` is an **RPC allowlist** (module → callable names). They are independent — a package listed in `python_dependencies` does not need a matching entry in `permissions`.

---

### Permissions Object

Declares which standard library modules and functions the plugin uses. Used by the RPC permission system.

```json
{
  "permissions": {
    "webbrowser": ["open"],
    "subprocess": ["run"],
    "json": ["dumps", "loads"]
  }
}
```

Each key is a module name, and the value is a list of function/attribute names from that module.

---

### Licenses

If your plugin ships with or relies on third-party code or data that carries its own license, declare each one in a `licenses` array. Each entry is an object with two fields:

| Field | Type | Required | Description |
|:---|:---|:---|:---|
| `name` | string | Yes | Human-readable name for the license (e.g. `"MIT"`, `"OpenF1"`, `"Apache 2.0"`). Shown as the tab label in the marketplace viewer. |
| `file` | string | Yes | Filename of the license text **inside the plugin folder** (e.g. `"LICENSE-openf1"`). Only files declared here can be served to the UI — no other files are accessible. |

```json
{
  "licenses": [
    { "name": "OpenF1",     "file": "LICENSE-openf1" },
    { "name": "Jolpica F1", "file": "LICENSE-jolpica" }
  ]
}
```

The marketplace reads this list and shows a **Licenses** pill button on the plugin card. Clicking it opens a viewer modal. When a plugin declares more than one license, the viewer renders a tab for each entry — clicking a tab loads that license's full text.

**Plugin folder layout example** (F1 plugin with two licenses):

```
plugins/plugin/f1/
├── manifest.json        ← declares both licenses
├── plugin.py
├── LICENSE-openf1       ← OpenF1 API license
└── LICENSE-jolpica      ← Jolpica F1 license
```

> **Note:** The `file` value must be a plain filename with no path separators. The backend only serves files that appear in the `licenses` list, so listing a file here is both the declaration and the access grant.

> **Tip:** Always include license files when your plugin uses an external API, dataset, or library that requires attribution — it keeps the project legally clean and lets users understand the data sources at a glance.

---

## 4. plugin.py — Writing Functions

### Function Signature

Every function listed in the manifest must be a top-level callable in `plugin.py` with this signature:

```python
def function_name(config: Dict[str, Any]) -> Dict[str, Any]:
```

**Parameters:**
- `config` — A dict containing:
  - All values from the button's UI fields (keyed by their `id`)
  - All stored credentials for your plugin (merged in automatically)
  - Credentials are the base; per-button config values override them

**Returns:**
- A dict. Must include `"success": True` or `"success": False`.
- On failure, include an `"error"` string.
- Can include any additional keys you want (they're passed to the GUI).

### Minimal Example

```python
def greet(config: Dict[str, Any]) -> Dict[str, Any]:
    name = config.get("name") or "World"
    return {"success": True, "message": f"Hello, {name}!"}
```

### Error Handling Example

```python
def do_something(config: Dict[str, Any]) -> Dict[str, Any]:
    try:
        # ... your logic ...
        return {"success": True, "action": "done"}
    except SomeError as e:
        return {"success": False, "error": str(e)}
    except Exception as e:
        return {"success": False, "error": f"Unexpected error: {e}"}
```

### Importing Helper Modules

If your plugin has additional `.py` files, import them by adding the plugin directory to `sys.path`:

```python
import sys
from pathlib import Path

_PLUGIN_DIR = Path(__file__).parent
if str(_PLUGIN_DIR) not in sys.path:
    sys.path.insert(0, str(_PLUGIN_DIR))

from my_helper import MyClient  # noqa: E402
```

### Module-Level Caching

Plugin modules are cached in memory after first load. Module-level variables persist across button presses within one process. Use this for connection caching:

```python
_client_cache: dict = {}

def _get_client(config):
    key = config.get("api_key", "")
    if key not in _client_cache:
        _client_cache[key] = MyClient(key)
    return _client_cache[key]
```

### Config Dict Contents

When a button is pressed, the core builds the config dict by merging two sources:

```
config = {**credentials, **button_config}
```

1. **Credentials** — Values from `~/.config/pydeck/core/credentials.json` under your plugin's key (e.g. `client_id`, `client_secret`, `access_token`)
2. **Button config** — Values from the button's UI fields saved in `buttons.json`

Button config takes precedence, so users can override credentials per-button if needed.

---

## 5. UI Field Types

The `ui` array in each function definition controls what appears in the button editor panel. Each entry is a field object.

### Common Properties

Every field type supports these properties:

| Property | Type | Required | Description |
|:---|:---|:---|:---|
| `type` | string | Yes | One of: `input`, `number`, `checkbox`, `slider`, `select`, `radio`, `hotkey_recorder`, `api_select` |
| `id` | string | Yes | Unique key within the function. This becomes the config key passed to your Python function. |
| `label` | string | Yes | Human-readable label shown above the field. |
| `default` | any | No | Default value when the button is first created. |
| `visible_if` | object | No | Conditionally show this field based on another field's value. |
| `autosave` | string | No | `"on"` (default) saves whenever the field changes. `"off"` disables autosave for this field. If **any** field in the function sets `"autosave": "off"`, the editor shows an explicit **Save** button for the whole function. Use `"off"` for fields that are expensive to apply on every keystroke (e.g. a location input that triggers a network request). |

### input — Text Input

A single-line text field.

```json
{
  "type": "input",
  "id": "url",
  "label": "URL",
  "placeholder": "https://example.com",
  "default": ""
}
```

| Property | Description |
|:---|:---|
| `placeholder` | Grayed-out hint text shown when the field is empty. |

### number — Numeric Input

A number field with optional min/max constraints.

```json
{
  "type": "number",
  "id": "volume_step",
  "label": "Volume Step (%)",
  "min": 1,
  "max": 100,
  "default": 10
}
```

| Property | Description |
|:---|:---|
| `min` | Minimum allowed value. |
| `max` | Maximum allowed value. |

### checkbox — Boolean Toggle

A checkbox that maps to `true`/`false`.

```json
{
  "type": "checkbox",
  "id": "auto_reconnect",
  "label": "Auto-reconnect on failure",
  "default": true
}
```

### slider — Range Slider

A horizontal slider.

```json
{
  "type": "slider",
  "id": "brightness",
  "label": "LED Brightness",
  "default": 50
}
```

### select — Dropdown

A dropdown menu with predefined options.

```json
{
  "type": "select",
  "id": "action",
  "label": "Action",
  "options": [
    { "label": "Play/Pause", "value": "play_pause" },
    { "label": "Next Track", "value": "next_track" },
    { "label": "Stop", "value": "stop" }
  ],
  "default": "play_pause"
}
```

Each option has:
- `label` — Title in the dropdown
- `value` — Value sent to your Python function via `config["action"]`

### radio — Radio Buttons

Mutually exclusive options rendered as radio buttons.

```json
{
  "type": "radio",
  "id": "mode",
  "label": "Mode",
  "options": [
    { "label": "Fast", "value": "fast" },
    { "label": "Normal", "value": "normal" },
    { "label": "Slow", "value": "slow" }
  ],
  "default": "normal"
}
```

### hotkey_recorder — Keyboard Shortcut Recorder

A text input paired with a **Record** button. When the user clicks Record, the editor calls `GET /api/plugins/<name>/api/record` and waits up to 10 seconds for a key combo to be pressed on the physical keyboard. The result is written back into the text field automatically.

Modifier-only presses (Ctrl, Alt, Shift, Super held alone) are ignored — the field only captures a combo that includes at least one non-modifier key, so pressing Shift+A produces `shift+a`, not just `shift`.

```json
{
  "type": "hotkey_recorder",
  "id": "hotkey",
  "label": "Key / Shortcut",
  "placeholder": "ctrl+c",
  "default": ""
}
```

| Property | Description |
|:---|:---|
| `placeholder` | Hint text shown when the field is empty. |

**Key name format** — the recorded value (and any manually typed value) uses `+`-delimited lowercase key names:

| Example value | Meaning |
|:---|:---|
| `ctrl+c` | Ctrl + C |
| `shift+a` | Shift + A |
| `super+l` | Super/Win + L |
| `ctrl+alt+delete` | Ctrl + Alt + Delete |
| `f5` | Function key F5 |
| `volumeup` | Media volume up key |

**Requirements for the Record button to work:**

1. The plugin must expose an `api_record(config)` top-level function in `plugin.py`. The editor calls `GET /api/plugins/<your_plugin>/api/record` when the user clicks Record. If the endpoint is missing, the button shows an error.
2. The server process must have permission to read `/dev/input/event*` (Linux only). Add the running user to the `input` group: `sudo usermod -aG input $USER`, then log out and back in.

**Error display** — if `api_record` returns `{"success": false, "error": "..."}`, the error message is shown inside the Record button for 4 seconds, then the button resets. This makes permission problems immediately visible instead of silently failing.

**Implementing `api_record` in your plugin:**

```python
import select
import time
import evdev
from evdev import ecodes
from typing import Any, Dict, Set

_MODIFIER_CODES = {
    ecodes.KEY_LEFTCTRL,  ecodes.KEY_RIGHTCTRL,
    ecodes.KEY_LEFTALT,   ecodes.KEY_RIGHTALT,
    ecodes.KEY_LEFTSHIFT, ecodes.KEY_RIGHTSHIFT,
    ecodes.KEY_LEFTMETA,  ecodes.KEY_RIGHTMETA,
}

def api_record(config: Dict[str, Any]) -> Dict[str, Any]:
    """Block until the user presses a key combo; return it as a string."""
    timeout = min(30.0, max(1.0, float(config.get("timeout") or 10)))
    devices = [
        evdev.InputDevice(p) for p in evdev.list_devices()
        if _is_keyboard(p)
    ]
    if not devices:
        return {"success": False, "error": "No keyboard devices found."}

    held: Set[int] = set()
    deadline = time.monotonic() + timeout
    try:
        while True:
            remaining = deadline - time.monotonic()
            if remaining <= 0:
                return {"success": False, "error": "Timeout."}
            readable, _, _ = select.select(devices, [], [], remaining)
            if not readable:
                return {"success": False, "error": "Timeout."}
            for dev in readable:
                for event in dev.read():
                    if event.type != ecodes.EV_KEY:
                        continue
                    if event.value == 1:       # key down
                        if event.code in _MODIFIER_CODES:
                            held.add(event.code)
                        else:
                            return {
                                "success": True,
                                "hotkey": _build_combo(held, event.code),
                            }
                    elif event.value == 0:     # key up
                        held.discard(event.code)
    finally:
        for dev in devices:
            dev.close()
```

The built-in **Keyboard** plugin ships a production-ready `api_record` implementation — see `plugins/plugin/keyboard/plugin.py` for the full version including permission-error detection and a robust keyboard-device filter.

### api_select — Dynamic API Dropdown

A native `<select>` element whose options are populated at runtime by calling a plugin API endpoint. Use this when the list of choices depends on live data (e.g. a list of smart-home entities, playlists, or devices).

```json
{
  "type": "api_select",
  "id": "entity_id",
  "label": "Entity",
  "api": "entities",
  "default": "",
  "display": {
    "label": "friendly_name",
    "value": "entity_id"
  }
}
```

| Property | Type | Required | Description |
|:---|:---|:---|:---|
| `api` | string | Yes | Name of the `api_<endpoint>` function to call. E.g. `"entities"` calls `GET /api/plugins/<name>/api/entities`. |
| `display.label` | string | No | Key in each API response object to use as the option label. Defaults to `"label"`. |
| `display.value` | string | No | Key in each API response object to use as the option value. Defaults to `"value"`. |
| `filter_field` | string | No | `id` of another field in the same function whose value is forwarded to the API as a query parameter. Use this to scope the dropdown to a domain or category selected by the user. |
| `filter_by` | string | No | Query parameter name sent to the API when `filter_field` changes. E.g. `"domain"` → `GET /api/plugins/<name>/api/entities?domain=light`. Required when `filter_field` is set. |

**How it works:**

1. When the editor opens, the field calls `GET /api/plugins/<name>/api/<api>` and populates the `<select>` with the returned array.
2. If `filter_field` is set, the call becomes `GET /api/plugins/<name>/api/<api>?<filter_by>=<value>` and re-fires whenever the referenced field changes.
3. Any query parameters in the request are automatically merged into the `config` dict passed to the Python function, so no manual parsing is needed.

**Real-world example — Home Assistant entity picker (domain → entity):**

The built-in Home Assistant plugin uses two chained `api_select` fields: the first lets the user pick a domain (light, switch, media_player, …), and the second re-fetches the entity list scoped to that domain whenever the selection changes. Selecting "All" from the domain field clears the filter and shows every entity.

**`manifest.json` — `ui` array for the `toggle` function:**

```json
"ui": [
  {
    "type": "api_select",
    "id": "domain_filter",
    "label": "Domain",
    "api": "domains",
    "display": {
      "label": "label",
      "value": "value"
    },
    "default": ""
  },
  {
    "type": "api_select",
    "id": "entity_id",
    "label": "Entity",
    "api": "entities",
    "filter_field": "domain_filter",
    "filter_by": "domain",
    "display": {
      "label": "name",
      "value": "entity_id"
    },
    "default": ""
  }
]
```

- `domain_filter` calls `GET /api/plugins/home-assistant/api/domains` and shows all domains present in the user's HA instance, with an "All" option prepended (value `""`).
- `entity_id` calls `GET /api/plugins/home-assistant/api/entities` and re-fetches with `?domain=<value>` every time `domain_filter` changes. An empty value means no filter — all entities are shown.

**`plugin.py` — the two API endpoint functions:**

```python
def api_domains(config: Dict[str, Any]) -> list:
    """Return unique entity domains present in the user's HA instance.

    Always prepends an 'All' option so the filter can be cleared.
    """
    client = _get_client(config)
    states = client.list_states()
    seen: dict[str, str] = {}
    for s in states:
        domain = s["entity_id"].split(".")[0]
        if domain not in seen:
            seen[domain] = domain.replace("_", " ").title()
    domains = sorted(seen.items())
    return [{"label": "All", "value": ""}] + [
        {"label": label, "value": domain} for domain, label in domains
    ]


def api_entities(config: Dict[str, Any]) -> list:
    """Return HA entities for the entity picker.

    Accepts an optional ``domain`` query param to filter by domain.
    The query param is automatically injected into config by PyDeck.
    """
    client = _get_client(config)
    domain_filter = str(config.get("domain") or "").strip()
    states = client.list_states()
    return [
        {
            "entity_id": s["entity_id"],
            "name": s.get("attributes", {}).get(
                "friendly_name", s["entity_id"]
            ),
        }
        for s in states
        if not domain_filter or s["entity_id"].split(".")[0] == domain_filter
    ]
```

The function must return a JSON-serialisable list. Each item should be a dict containing at least the keys referenced by `display.label` and `display.value`.

### visible_if — Conditional Visibility

Show a field only when another field has a specific value. Add `visible_if` to any field:

```json
{
  "type": "number",
  "id": "step_percent",
  "label": "Volume Step (%)",
  "default": 5,
  "visible_if": {
    "field": "action",
    "value": "volume_up"
  }
}
```

This field only appears when the `action` field's value is `"volume_up"`. Works with all field types — the `field` references another field's `id` in the same function, and `value` is the string value to match against.

---

## 6. Display States and Toggling

Display states allow buttons to change their appearance based on plugin state (e.g. showing a different icon when muted vs unmuted).

### Defining Display States in the Manifest

Add a `display_states` object to a function definition. Each key is a state name, and the value is a partial display override:

```json
{
  "toggle_mute": {
    "label": "Mute",
    "default_display": {
      "image": "plugins/plugin/my_plugin/img/mute_off.png",
      "color": "#000000",
      "text": ""
    },
    "display_states": {
      "default": { "image": "plugins/plugin/my_plugin/img/mute_off.png" },
      "active":  { "image": "plugins/plugin/my_plugin/img/mute_on.png" }
    },
    "ui": []
  }
}
```

### Returning State from Python

To trigger a state change, return a `"state"` key from your function:

```python
def toggle_mute(config: Dict[str, Any]) -> Dict[str, Any]:
    # ... toggle logic ...
    is_muted = True  # result of toggle
    return {
        "success": True,
        "action": "mute",
        "muted": is_muted,
        "state": "active" if is_muted else "default",
    }
```

The core looks up `"active"` in `display_states`, finds `{"image": ".../mute_on.png"}`, and persists that to `buttons.json`. The button image updates on the Stream Deck and in the web GUI.

### display_update — Direct Override

Instead of named states, you can return a `display_update` dict directly:

```python
def set_color(config: Dict[str, Any]) -> Dict[str, Any]:
    return {
        "success": True,
        "display_update": {
            "color": "#ff0000",
            "text": "RED",
        },
    }
```

This is useful for dynamic values that don't map to predefined states.

### related_states — Updating Sibling Buttons

When one button press should also update other buttons of the same plugin (e.g. pressing "deafen" should also show the "mute" button as active), return `related_states`:

```python
def toggle_deafen(config: Dict[str, Any]) -> Dict[str, Any]:
    # ... toggle logic ...
    return {
        "success": True,
        "state": "active" if is_deaf else "default",
        "related_states": {
            "toggle_mute": "active" if is_muted else "default",
        },
    }
```

The core finds all buttons in the current profile that use the same plugin and the `toggle_mute` function, then applies the `"active"` or `"default"` display_state to each of them. The pressed button itself is excluded from this lookup.

### Cross-Device Sync

When multiple Stream Decks are connected, pressing a button on one device automatically mirrors the resulting display state to matching buttons on all other devices — including both the pressed button's own state and all `related_states` updates.

**No opt-in required.** Any plugin that returns `state` and/or `related_states` gets this behavior automatically.

**Matching rule:** A button on Device B is a sync target when it uses the **same plugin name** and occupies the **same slot ID** as the updated button on Device A.

**What gets synced:**
- The pressed button's own `display_update` (resolved from `state`)
- All sibling updates generated by `related_states` (e.g. deafen → mute turns red)

**Latency:** Near-zero. After a press, the core writes the updated state to each other device's `buttons.json` and sends a `RELOAD` signal to that device's listener process, which pushes the change to hardware within one poll cycle (~16–20 ms).

**Example — Discord:** Pressing mute on Deck 1 causes Deck 2's mute button to turn red immediately. Pressing deafen causes both the deafen and mute buttons to turn red on all connected decks.

---

## 7. Display Polling

Display polling lets a button's appearance update automatically in the background — without the user pressing it. This is useful for live data like album art, system stats, clocks, or any state that changes over time.

### How It Works

1. A function in the manifest declares a `poll` block
2. The core runs a background thread that periodically calls the specified poll function
3. If the poll function returns a `display_update`, the button image is updated on the Stream Deck and in the web GUI via WebSocket

The polling system is fully generic — any plugin can use it. No changes to core files are needed.

### Declaring Polling in the Manifest

Add a `poll` object to any function definition in `manifest.json`:

```json
{
  "functions": {
    "play_pause": {
      "label": "Play / Pause",
      "poll": {
        "function": "poll_display",
        "interval_ms": 3000
      },
      "ui": []
    }
  }
}
```

| Field | Type | Required | Description |
|:---|:---|:---|:---|
| `function` | string | Yes | Name of the Python function in `plugin.py` to call for polling. Must be a top-level callable. |
| `interval_ms` | integer | No | Polling interval in milliseconds. Default: `3000`. Minimum: `1000`. |

The poll function is separate from the press function. Pressing the button calls `play_pause`, while the background poller calls `poll_display`. This keeps the toggle action separate from the display refresh.

### Writing a Poll Function

The poll function has the same signature as a regular plugin function — it receives the merged credentials + config dict. The key difference: it should **only return `display_update` when something actually changed**, to avoid unnecessary disk writes and WebSocket events.

```python
_last_known_state: str | None = None

def poll_display(config: Dict[str, Any]) -> Dict[str, Any]:
    """Called by the background poller. Returns display_update only on change."""
    try:
        current_state = fetch_current_state(config)
        global _last_known_state
        if current_state == _last_known_state:
            return {}  # No change — skip update
        _last_known_state = current_state
        return {
            "display_update": {
                "image": "plugins/plugin/my_plugin/img/latest.png"
            }
        }
    except Exception:
        return {}
```

**Rules for poll functions:**

- Return `{}` (empty dict) when nothing changed — the poller skips the update
- Return `{"display_update": {...}}` only when the display should change
- Change detection is the plugin's responsibility (track the last state yourself)
- Catch all exceptions — an error in a poll function must not crash the poller
- Keep it fast — the function runs on a shared background thread

### What the Poller Does

When a poll function returns a `display_update`:

1. **Runtime image state** is updated (so the next `/api/buttons/<id>/image` request renders the new image)
2. **buttons.json** is updated (so the change persists across restarts and the physical Stream Deck picks it up)
3. **A `display_update` WebSocket event** is emitted (so the web GUI refreshes the button image immediately)

### Preloading scheduled display updates (universal API)

Poll functions and **press** results may include **`preload_display_updates`**: a list of future `display_update` payloads the core applies **at specific times** without waiting for the next poll tick. This removes multi‑hundred‑millisecond jitter when you already know the next frames (for example a clock registering the next several second-boundary faces).

Return shape (alongside optional `display_update`):

```python
return {
    "display_update": { ... },  # optional: current frame, same as today
    "preload_display_updates": [
        {"apply_at": 1735689600.0, "display_update": {"text": "12:00:01", "text_size": 0}},
        {"apply_at": 1735689601.0, "display_update": {"text": "12:00:02", "text_size": 0}},
    ],
}
```

| Field | Type | Description |
|:---|:---|:---|
| `preload_display_updates` | array | Each element schedules one update. |
| `apply_at` | number | **UNIX timestamp in seconds** (float or int). When `time.time() >= apply_at`, the core applies that element’s `display_update` (same path as a normal poll: scroll registration, `buttons.json`, WebSocket, hardware via the listener). |
| `offset_ms` | integer | Alternative to `apply_at`: apply at `time.time() + offset_ms/1000` from when the core processed the result (useful for relative delays). |

**Rules:**

- New preloads **replace** any previous scheduled entries for the same `(device_id, button_id)` — always send a fresh chain when you emit preloads.
- The scheduler runs at ~50 ms resolution; use `apply_at` on clean second boundaries for wall clocks (`float(int(time.time()) + k)` pattern).
- Omit `preload_display_updates` if you do not need timed delivery; behavior stays unchanged.
- The same key is honored on **HTTP button press** responses (`plugin` result dict) so a manual refresh can re-seed the schedule.

**Cancelling all pending preloads:**

Return an **explicit empty list** to cancel every scheduled frame for a button without scheduling new ones:

```python
return {
    "display_update": {"image": "plugins/plugin/my_plugin/img/icon.png", "text": "", "text_labels": None},
    "preload_display_updates": [],   # ← cancels any countdown/animation still in flight
}
```

This is the pattern used by the Spotify plugin when playback stops — the idle-reset update clears the album art and text while `[]` cancels any countdown ticks that were pre-scheduled during the last playing session. Omitting the key entirely leaves existing preloads running.

The **clock** plugin uses this API to register the next several seconds ahead whenever the displayed second changes.

### Real Example — Spotify Album Art

The Spotify plugin uses polling to keep the play/pause button showing the current track's album cover:

**manifest.json:**

```json
{
  "play_pause": {
    "label": "Play / Pause",
    "poll": {
      "function": "poll_display",
      "interval_ms": 3000
    },
    "ui": [...]
  }
}
```

**plugin.py:**

```python
_last_art_url: str | None = None

def poll_display(config: Dict[str, Any]) -> Dict[str, Any]:
    """Fetch current playback and return album art if the track changed."""
    try:
        client = _get_client(config)
        pb = client.get_playback()
        prev_url = _last_art_url
        art_path, _ = _fetch_album_art(pb)
        if art_path and _last_art_url != prev_url:
            return {"display_update": {"image": art_path}}
        return {}
    except Exception:
        return {}
```

The album art updates automatically every 3 seconds when the track changes. Pressing the button still toggles play/pause — the two behaviors are independent.

### Title marquee — `scroll_enabled` and `scroll_speed`

The core may **auto-scroll** long **`display.text`** labels horizontally when a line is wider than the visible title area (after trying smaller font sizes). Newlines (`\n`) split lines; the widest line controls fit and scroll — matching how Pillow draws multi-line labels.

| Key | Type | Default | Description |
|:---|:---|:---|:---|
| `scroll_enabled` | boolean | `true` | When `false`, the title never marquees: it stays centred with a static offset (font may still shrink). Set in `default_display` or `display_update`. A value stored on the button in `buttons.json` overrides the manifest default for that key. |
| `scroll_speed` | integer | (built-in minimum) | Pixels per tick when scrolling is active; larger is faster. The core clamps very small values up to a minimum while scrolling is enabled. |

**Example — clock with date on a second line, no marquee:**

```json
"default_display": {
  "text": "00:00",
  "text_position": "middle",
  "scroll_enabled": false
}
```

You can return `scroll_enabled` or `scroll_speed` from a poll function or press handler inside `display_update` like any other display field.

### Scrolling Text (scroll_text)

Plugins can set a **scrolling marquee label** on a button by including `scroll_text` in a `display_update`. This is useful for long strings that don't fit on the 80×80 button face — like song titles, status messages, or ticker data.

The scroll engine is built into the core and works with any plugin. No manifest declaration is needed — just return `scroll_text` from a poll function or button press.

**Behaviour:**

1. Text starts left-aligned (showing the beginning)
2. After a short pause it scrolls left so the rest of the text is revealed
3. Once the end is visible it pauses again, then scrolls back right to the start
4. Repeats indefinitely (ping-pong / bounce marquee)

If the text fits within the button without scrolling, it is rendered normally (centred).

**Returning scroll_text from a poll function:**

```python
def poll_display(config: Dict[str, Any]) -> Dict[str, Any]:
    title = get_current_title(config)
    if title:
        return {"display_update": {"scroll_text": title}}
    return {}
```

**Returning scroll_text from a button press:**

```python
def my_action(config: Dict[str, Any]) -> Dict[str, Any]:
    status = do_something(config)
    return {
        "success": True,
        "display_update": {
            "scroll_text": f"Status: {status}",
        },
    }
```

**Clearing scroll_text:**

Return an empty string to stop scrolling and revert to the static label:

```python
return {"display_update": {"scroll_text": ""}}
```

**Priority rules:**

- If the button's `display.text` field is non-empty (i.e. the user set a static label), the static label is always shown and `scroll_text` is ignored.
- `scroll_text` is runtime-only — it is **not** persisted to `buttons.json`. A server restart clears all active scrolls until the next poll cycle restores them.

**Combining with other display fields:**

`scroll_text` can be returned alongside `image`, `color`, or `text` in the same `display_update`:

```python
return {
    "display_update": {
        "image": "plugins/plugin/my_plugin/img/cover.jpg",
        "scroll_text": "Now Playing — Song Title",
    }
}
```

### Real Example — Spotify Album Art + Track Title

The Spotify plugin returns both album art and a scrolling track label:

**plugin.py:**

```python
_last_track_label: str | None = None

def _build_track_label(pb: dict | None) -> str:
    """Build a 'Title — Artist' string from playback data."""
    if not pb or not isinstance(pb, dict):
        return ""
    item = pb.get("item")
    if not isinstance(item, dict):
        return ""
    title = item.get("name", "")
    artists = item.get("artists", [])
    if isinstance(artists, list) and artists:
        names = [a.get("name", "") for a in artists if isinstance(a, dict)]
        artist_str = ", ".join(n for n in names if n)
        if artist_str:
            return f"{title} — {artist_str}"
    return title or ""


def poll_display(config: Dict[str, Any]) -> Dict[str, Any]:
    """Return album art and track title when either changes."""
    global _last_track_label
    try:
        client = _get_client(config)
        pb = client.get_playback()
        display_update = {}

        art_path, _ = _fetch_album_art(pb)
        if art_path and _last_art_url != prev_url:
            display_update["image"] = art_path

        track_label = _build_track_label(pb)
        if track_label != _last_track_label:
            display_update["scroll_text"] = track_label or ""
            _last_track_label = track_label

        return {"display_update": display_update} if display_update else {}
    except Exception:
        return {}
```

The button shows the album cover as the background image with the track title scrolling across the bottom — "Bohemian Rhapsody — Queen" scrolls left then right in a loop.

---

## 8. Credentials

Plugins that interact with external APIs typically need secrets — API keys, client IDs, OAuth tokens, etc.  PyDeck stores these separately from button configuration so they can be shared across all buttons of the same plugin, edited in one place, and kept out of the buttons.json file.

### Where Credentials Are Stored

All credentials live in a single file:

```
~/.config/pydeck/core/credentials.json
```

This file is a flat JSON object. Each top-level key is a **plugin name** (matching the folder name under `plugins/plugin/`), and its value is an object of key–value pairs:

```json
{
  "spotify": {
    "client_id": "abc123def456",
    "client_secret": "secret789",
    "access_token": "BQD...long_token...",
    "refresh_token": "AQB...long_token..."
  },
  "discord": {
    "client_id": "1234567890",
    "client_secret": "abcdefg"
  },
  "my_weather_plugin": {
    "api_key": "wk_live_abc123"
  }
}
```

The file is created automatically the first time a user saves credentials through the GUI. If the file doesn't exist yet, the core treats every plugin as having an empty credential set (`{}`).

> **Security note:** `credentials.json` stores secrets in plaintext on disk. It lives in the user's home directory under `.config/pydeck/`, which is not world-readable on most systems, but plugins should still encourage users to use app-specific or restricted-scope credentials where possible.

### Declaring Credentials in the Manifest

To tell PyDeck that your plugin needs credentials, add a `credentials` array to `manifest.json`. Each entry describes one input field that will appear under **Settings → Credentials** in the web UI (open **Settings** from the deck header, then choose the **Credentials** category):

```json
{
  "name": "my_weather_plugin",
  "credentials": [
    { "id": "api_key", "label": "API Key", "type": "password" }
  ],
  "functions": { ... }
}
```

A more complex example with multiple fields:

```json
{
  "credentials": [
    { "id": "client_id",     "label": "Client ID",     "type": "text" },
    { "id": "client_secret", "label": "Client Secret", "type": "password" },
    { "id": "webhook_url",   "label": "Webhook URL",   "type": "text" }
  ]
}
```

Each entry has these fields:

| Field | Type | Description |
|:---|:---|:---|
| `id` | string | The key stored in `credentials.json` and injected into your function's `config` dict. Must be unique within the plugin. |
| `label` | string | Human-readable label shown next to the input field under **Settings → Credentials**. |
| `type` | string | `"text"` renders a normal visible input. `"password"` renders a masked input and the saved value is displayed as `••••••••` when re-opened. |

If a plugin has **no** `credentials` array (or it's empty), the plugin simply won't appear in the Credentials list — no section, no fields.

### The Credentials UI

On **Settings → Credentials**, the UI calls `GET /api/credentials`, which scans every discovered plugin's manifest for `credentials` declarations. For each plugin that declares credentials:

1. A **section** is shown with the plugin name as a header
2. **Input fields** are rendered for each credential definition
3. Existing values are pre-filled (password fields show `••••••••` instead of the real value)
4. A **Save** button persists the values
5. If the plugin also has an `oauth` config, an **Authorize** button and status badge are shown

### Plugin settings panel

Plugins can add a **custom HTML panel** in the **Settings** overlay (gear on the deck; URL stays `/`) and group multiple plugins under one sidebar category.

1. Add a `settings` object to `manifest.json`:

```json
"settings": {
  "category": "Integrations",
  "category_id": "integrations",
  "order": 10
}
```

| Field | Required | Description |
|:---|:---|:---|
| `category` | Yes | Human-readable sidebar label. Plugins with the same resolved `category_id` share one category. |
| `category_id` | No | Stable id (`a-z`, `0-9`, `-`). If omitted, it is derived from `category` (lowercase, non-alphanumeric → `-`). |
| `order` | No | Sort order for your plugin within that category (integer; lower first). |

2. Optionally add `plugins/plugin/<your_plugin>/settings.html`. Static HTML only; no server-side templating.

3. The settings page calls `GET /api/settings/categories` to build the sidebar (built-in categories **Appearance**, **Text defaults**, and **Credentials** are always listed first). For each plugin in a category, the UI loads:

```
GET /api/plugins/<plugin_name>/settings/panel
```

If `settings.html` is missing, the category still appears when `settings` is declared, and the user sees a short note for that plugin’s panel.

With Settings open, **Escape** closes the overlay and returns to the deck (URL remains `/`).

When the user clicks Save:
- The GUI sends `POST /api/credentials/<plugin_name>` with the field values
- The backend **merges** the new values into the existing entry — it never wipes the whole entry
- Values that are still `••••••••` (the mask) are **skipped**, so re-saving the form without editing a password field won't destroy the stored secret
- Any extra keys already in `credentials.json` (like `access_token` from OAuth) are preserved

### How Credentials Reach Your Function

When a button is pressed, the core performs a two-step merge before calling your function:

```
Step 1: Load credentials.json → read the object under your plugin's name
Step 2: Merge with button config → credentials first, then button config on top
```

In code (from `lib/button.py`):

```python
merged = {**credentials_from_file, **per_button_config}
fn(merged)
```

This means:
- **Credentials are the base layer** — every function call automatically gets `client_id`, `api_key`, `access_token`, etc. without the user configuring each button individually.
- **Per-button config overrides credentials** — if a user sets `api_key` in a button's form fields, that value takes precedence over the one in `credentials.json`. This allows advanced users to use different keys per button.

Your function receives the merged result as a single `config` dict:

```python
def get_weather(config: Dict[str, Any]) -> Dict[str, Any]:
    api_key = config.get("api_key", "")
    city = config.get("city", "London")

    # api_key comes from credentials.json automatically
    # city comes from the button's per-button UI config
    ...
```

### Credential Lifecycle Example

Here's the full lifecycle of how a credential value flows through the system, using a weather plugin as an example:

**1. Plugin declares the credential:**

```json
{
  "name": "weather",
  "credentials": [
    { "id": "api_key", "label": "OpenWeather API Key", "type": "password" }
  ],
  "functions": {
    "current": {
      "label": "Current Weather",
      "ui": [
        { "type": "input", "id": "city", "label": "City", "default": "London" }
      ]
    }
  }
}
```

**2. User enters the key under Settings → Credentials:**

The GUI shows a password input labeled "OpenWeather API Key". The user pastes their key and clicks Save.

**3. The key is persisted to disk:**

```json
// ~/.config/pydeck/core/credentials.json
{
  "weather": {
    "api_key": "wk_live_abc123def456"
  }
}
```

**4. User assigns the function to a button:**

They drag "weather / current" onto button slot 0 and set the city to "Berlin".

**5. The button config is saved (no credential data here):**

```json
// In the active profile's buttons.json
{
  "id": 0,
  "type": "plugin",
  "plugin": "weather",
  "function": "current",
  "config": { "city": "Berlin" },
  "display": { "text": "Weather", "color": "#4a90d9" }
}
```

**6. User presses the button — core merges and calls the function:**

```python
# What the core does internally:
credentials = {"api_key": "wk_live_abc123def456"}  # from credentials.json
button_config = {"city": "Berlin"}                   # from buttons.json
merged = {**credentials, **button_config}
# merged = {"api_key": "wk_live_abc123def456", "city": "Berlin"}

result = weather_plugin.current(merged)
```

**7. Your function receives the merged config:**

```python
def current(config):
    api_key = config["api_key"]   # "wk_live_abc123def456"
    city = config["city"]         # "Berlin"
    # Make API call...
```

### OAuth Tokens in Credentials

When a plugin uses [OAuth](#9-oauth-integration), the token exchange automatically writes `access_token` and `refresh_token` into the same `credentials.json` entry alongside the `client_id` and `client_secret`:

```json
{
  "spotify": {
    "client_id": "abc123",
    "client_secret": "secret456",
    "access_token": "BQD...",
    "refresh_token": "AQB..."
  }
}
```

These tokens are then merged into `config` on every button press, so your plugin function can use `config["access_token"]` directly. When your plugin refreshes an expired token, it should write the new token back to `credentials.json` so it persists across restarts. See the Spotify plugin's `_save_tokens()` method for an example.

### Multiple Buttons, One Credential Set

A key design principle: credentials are per-plugin, not per-button. If you have five Spotify buttons (play, pause, next, previous, volume), they all share the same `client_id`, `client_secret`, `access_token`, and `refresh_token` from a single entry in `credentials.json`. The user only has to configure credentials once.

### Credential Validation in Your Function

Always check that required credentials are present before using them. If a credential is missing, return a clear error message pointing the user to **Settings → Credentials**:

```python
def my_function(config):
    api_key = str(config.get("api_key") or "").strip()
    if not api_key:
        return {
            "success": False,
            "error": "API key not configured — add it under Settings → Credentials",
        }
    # Safe to proceed...
```

This is important because:
- A fresh install won't have any credentials yet
- The user might have forgotten to save credentials before testing
- OAuth tokens can expire or be revoked

---

## 9. OAuth Integration

Plugins that need OAuth2 Authorization Code flow can declare their OAuth config in the manifest. The core handles the entire browser-based flow generically.

### Declaring OAuth in the Manifest

Replace a simple `"oauth": true` with an object:

```json
{
  "oauth": {
    "authorize_url": "https://accounts.spotify.com/authorize",
    "token_url": "https://accounts.spotify.com/api/token",
    "scopes": "user-read-playback-state user-modify-playback-state",
    "auth_method": "basic"
  }
}
```

| Field | Type | Required | Description |
|:---|:---|:---|:---|
| `authorize_url` | string | Yes | The provider's authorization endpoint URL. |
| `token_url` | string | Yes | The provider's token exchange endpoint URL. |
| `scopes` | string | No | Space-separated OAuth scopes to request. |
| `auth_method` | string | No | How client credentials are sent to the token endpoint. `"basic"` (default) sends Base64-encoded `client_id:client_secret` in the Authorization header. `"post"` sends them as form body fields. |
| `user_agent` | string | No | `User-Agent` header sent to the token endpoint. Defaults to `PyDeck/1.0`. Set this when the provider requires a specific format — for example, Discord's API requires the `DiscordBot` prefix. |

> **`user_agent` example — Discord:**  
> Discord's API rejects token requests whose `User-Agent` does not start with `DiscordBot`.  
> Declare it in the manifest so `lib/oauth.py` never needs provider-specific strings:
>
> ```json
> "oauth": {
>   "authorize_url": "https://discord.com/api/oauth2/authorize",
>   "token_url":     "https://discord.com/api/oauth2/token",
>   "scopes":        "rpc rpc.voice.read rpc.voice.write",
>   "auth_method":   "post",
>   "user_agent":    "DiscordBot (pydeck, 1.0)"
> }
> ```
>
> Any plugin that does **not** set `user_agent` automatically sends `PyDeck/1.0`.

### How the OAuth Flow Works

1. User saves `client_id` and `client_secret` under **Settings → Credentials**
2. User clicks **Authorize** in the same place
3. The GUI calls `GET /api/<plugin_name>/authorize`
4. The core reads the manifest's `oauth` config and builds the authorization URL
5. The browser opens the provider's auth page
6. After the user approves, the provider redirects to `http://127.0.0.1:8686/oauth/<plugin_name>/callback`
7. The core exchanges the authorization code for tokens
8. `access_token` and `refresh_token` are saved to `credentials.json` under the plugin's key
9. Tokens are automatically included in `config` on every button press

### Setting Up the Provider

When creating your app on the OAuth provider's dashboard, set the redirect URI to:

```
http://127.0.0.1:8686/oauth/<your_plugin_name>/callback
```

For example, a Spotify plugin would use:

```
http://127.0.0.1:8686/oauth/spotify/callback
```

### Token Refresh

The core handles the initial token exchange and storage. Your plugin is responsible for refreshing expired tokens using the `refresh_token` from `config`. See the Spotify plugin's `SpotifyClient._req()` method for an example that auto-refreshes on 401 responses.

---

## 10. Custom CSS — style.css

Each plugin can provide its own CSS by placing a `style.css` file in the plugin folder. The core automatically scans all plugins and serves their CSS combined at `/api/plugins/styles.css`.

### How It Works

1. Place `style.css` in your plugin folder: `plugins/plugin/my_plugin/style.css`
2. The route `GET /api/plugins/styles.css` scans every `plugins/plugin/*/` directory for `style.css`
3. All found CSS files are concatenated and served as one stylesheet
4. The HTML template includes `<link rel="stylesheet" href="/api/plugins/styles.css">` after the core stylesheet
5. Plugin CSS loads after the core CSS, so plugin rules can override core styles

No registration, no config — just drop the file and it's picked up.

### What to Put in style.css

Plugin-specific theme colors and UI component styles. The core uses CSS classes based on the plugin name via `data-action-type` attributes. Common patterns:

```css
/* Sidebar tile icon color */
.action-tile[data-action-type="my_plugin"] .action-tile-icon {
    background: rgba(100, 200, 150, 0.18);
    color: #64c896;
}

/* Properties panel badge color */
.action-badge.badge-my_plugin {
    background: rgba(100, 200, 150, 0.18);
    color: #64c896;
}

/* Settings → Credentials UI */
.api-section-icon.my_plugin-icon {
    background: rgba(100, 200, 150, 0.18);
    color: #64c896;
}

/* Event log tag color */
.log-tag-my_plugin {
    background: #122e1e;
    color: #64c896;
}
```

### Real Example — Spotify's style.css

```css
/* Spotify plugin theme */
.action-tile[data-action-type="spotify"] .action-tile-icon {
    background: rgba(29,185,84,0.18);
    color: #1DB954;
}
.action-badge.badge-spotify {
    background: rgba(29,185,84,0.18);
    color: #1DB954;
}
.api-section-icon.spotify-icon {
    background: rgba(29,185,84,0.18);
    color: #1DB954;
}
.log-tag-spotify {
    background: #122212;
    color: #1DB954;
}
```

---

## 11. Client-Side Popup API — PyDeck.popup

PyDeck exposes a global `window.PyDeck` object with promise-based popup functions. These replace the browser's native `confirm()` and `prompt()` dialogs with themed modals that match the PyDeck dark UI.

Plugins can call these from any inline `onclick` handler or injected script within their `style.css` / form HTML.

### PyDeck.confirm(message, opts?)

Show a confirmation dialog. Returns `Promise<boolean>` — `true` if confirmed, `false` / `undefined` if cancelled.

```js
const ok = await PyDeck.confirm('Delete this item?', {
    title: 'Delete',          // dialog title (default: "Confirm")
    confirmText: 'Delete',    // confirm button label (default: "Confirm")
    cancelText: 'Cancel',     // cancel button label (default: "Cancel")
    danger: true,             // styles the confirm button red (default: false)
});
if (ok) { /* proceed */ }
```

### PyDeck.prompt(message, opts?)

Show a text input dialog. Returns `Promise<string|null>` — the trimmed input value, or `null` if cancelled/empty.

```js
const name = await PyDeck.prompt('Enter a name:', {
    title: 'New Item',        // dialog title (default: "Input")
    placeholder: 'My item',   // input placeholder text
    defaultValue: '',          // pre-filled input value
    confirmText: 'Create',    // confirm button label (default: "OK")
    cancelText: 'Cancel',     // cancel button label (default: "Cancel")
});
if (name) { /* use name */ }
```

### PyDeck.popup(config)

Low-level fully customizable popup. Returns `Promise<any>` that resolves with the clicked button's `value`.

```js
const choice = await PyDeck.popup({
    title: 'Choose an action',
    body: '<p>What would you like to do?</p>',   // HTML string
    buttons: [
        { label: 'Cancel', value: null,     style: 'secondary' },
        { label: 'Save',   value: 'save',   style: 'primary' },
        { label: 'Delete', value: 'delete', style: 'danger' },
    ],
});
```

Button `style` options: `"primary"` (accent blue), `"danger"` (red), `"secondary"` (default grey).

Pressing **Escape** closes the popup and resolves with `undefined`.

---

## 12. Plugin Images — img/ and storage/

PyDeck distinguishes between two types of plugin files:

| Type | Location | Endpoint | Use for |
|:---|:---|:---|:---|
| **Static assets** | `plugins/plugin/<name>/img/` | `GET /api/plugins/<name>/img/<filename>` | Icons, state images — shipped with the plugin |
| **Runtime-generated files** | `plugins/storage/<name>/` | `GET /api/plugins/<name>/storage/<filename>` | Files the plugin writes at runtime (e.g. downloaded album art) |

### Static images — img/

Place bundled image files in `plugins/plugin/my_plugin/img/`. They are served at:

```
GET /api/plugins/<plugin_name>/img/<filename>
```

Supported formats: `.png`, `.jpg`, `.jpeg`, `.gif`, `.bmp`, `.webp`

### Runtime storage — plugins/storage/

If your plugin **writes files at runtime** (e.g. fetching an image from the internet), write them to `plugins/storage/<plugin_name>/` instead of inside the plugin folder. Reference them with the relative path `plugins/storage/<plugin_name>/<filename>` — the core resolves this path just like any other image.

```python
from pathlib import Path

_PLUGIN_DIR = Path(__file__).parent
# _PLUGIN_DIR.parents[1] == pydeck/plugins/
_STORAGE_DIR = _PLUGIN_DIR.parents[1] / "storage" / "my_plugin"

def _write_runtime_file(data: bytes, name: str) -> str:
    """Write data to the plugin storage folder and return the relative path."""
    _STORAGE_DIR.mkdir(parents=True, exist_ok=True)
    (_STORAGE_DIR / name).write_bytes(data)
    return f"plugins/storage/my_plugin/{name}"
```

Use the returned relative path as `display_update["image"]` — the core fetches it via `GET /api/plugins/my_plugin/storage/<filename>`.

**Why separate?** The `img/` directory ships with the plugin (and is replaced on marketplace update). Files in `plugins/storage/` survive plugin updates because they live outside the plugin folder.

### Using Images in default_display

Reference images using their relative path from the project root:

```json
{
  "default_display": {
    "image": "plugins/plugin/my_plugin/img/icon.png",
    "color": "#000000",
    "text": ""
  }
}
```

<a name="text-style-in-default_display"></a>
### Text Style in default_display

Plugins can declare any of the text-style fields inside `default_display`. By default these act as **suggestions** — they are applied only when the user has not explicitly set that field on the button. A field declared in the manifest will not override a value the user has already saved.

To opt a specific field in to hard-locking (always overriding the user), add a companion `<field>_lock: true` key alongside it. See [Lock tags](#lock-tags) below.

| Field | Type | Default | Description |
|:---|:---|:---|:---|
| `show_title` | boolean | `true` | Whether the button label is rendered at all. |
| `text_position` | string | `"bottom"` | Vertical position of the text: `"top"`, `"middle"`, or `"bottom"`. |
| `text_size` | integer | `0` | Font size in pixels. `0` = auto (fits the label to the button). |
| `text_bold` | boolean | `false` | Render the label in bold. |
| `text_italic` | boolean | `false` | Render the label in italic. |
| `text_underline` | boolean | `false` | Draw an underline beneath the label. |
| `text_color` | string | `""` | Hex color for the label (e.g. `"#ffffff"`). `""` = auto-contrasting. |

Only the fields you declare are applied at plugin priority; any omitted field falls through to the user's per-button setting or the system default.

#### Lock tags

Each text-style field has an optional companion boolean `<field>_lock`. When set to `true` it switches that field from suggestion mode to hard-lock mode — the manifest value always wins, even if the user has configured a different value on the button.

| Lock tag | Locks field |
|:---|:---|
| `text_position_lock` | `text_position` |
| `text_size_lock` | `text_size` |
| `text_bold_lock` | `text_bold` |
| `text_italic_lock` | `text_italic` |
| `text_underline_lock` | `text_underline` |
| `text_color_lock` | `text_color` |
| `show_title_lock` | `show_title` |

**Suggestion (default) — user can override `text_position`:**

```json
"default_display": {
  "color": "#1e293b",
  "text": "Type",
  "text_position": "middle",
  "scroll_enabled": false
}
```

**Locked — plugin always enforces `text_position` and `text_size`:**

```json
"default_display": {
  "color": "#1e293b",
  "text": "Type",
  "text_position": "middle",
  "text_position_lock": true,
  "text_size": 18,
  "text_size_lock": true,
  "scroll_enabled": false
}
```

**Example** — a Spotify button that places the track name in the middle in white:

```json
"default_display": {
  "color": "#1DB954",
  "text": "",
  "image": "plugins/plugin/spotify/img/icon.png",
  "text_position": "middle",
  "text_size": 11,
  "text_bold": false,
  "text_italic": false,
  "text_underline": false,
  "text_color": "#ffffff"
}
```

### Multi-Position Labels (text_labels)

`text_labels` lets a button display independent text at up to three positions simultaneously — **top**, **middle**, and **bottom** — each rendered at its own y-coordinate. It replaces the single `text` + `text_position` pair when more than one label is needed.

#### Format

```json
"text_labels": {
  "top":    "12",
  "bottom": "00"
}
```

- Keys are a subset of `"top"`, `"middle"`, `"bottom"`.
- Each position may appear **at most once** — uniqueness is guaranteed by the dict structure.
- Values are the label strings to render at that position.
- When `text_labels` is set and non-empty it takes **full priority** over `text` and `text_position`; those fields are ignored by the renderer.
- Pass `null` (or omit) to fall back to the single-label `text` + `text_position` path.

#### Shared style

All labels share the same text-style settings (`text_bold`, `text_color`, `text_size`, etc.).

When `text_size` is `0` (auto) each label finds its own best-fit font size independently — a short label like `"-2:24"` keeps a large font while a long label like `"Bohemian Rhapsody — Queen"` shrinks (or scrolls) to fit. They are **not** forced to a common size driven by the longest label. Set an explicit `text_size` to pin all labels to the same point size.

#### In display_update

Plugins emit `text_labels` inside `display_update` (or inside a `preload_display_updates` entry) the same way as `text`:

```python
return {
    "display_update": {
        "text_labels": {"top": h, "bottom": m},
        "text_size": 0,
    }
}
```

#### In the button editor

Users can add multiple labels from the **Title** section of the button editor by clicking **+ Label**. Each row has its own position selector (top / middle / bottom). A position already used by another row is disabled to prevent duplicates.

#### Marquee scroll in text_labels mode

When `text_labels` is active the core automatically scrolls the **lowest present label** (bottom → middle → top priority) when its text overflows the button width — exactly like the single `text` scroll path. All other labels remain centred and static.

Control scroll speed with `scroll_speed` in the same `display_update`:

```python
return {
    "display_update": {
        "text_labels": {"top": "-3:42", "bottom": "A Very Long Song Title"},
        "text": "",         # must be empty — prevents stale single-label scroll
        "scroll_speed": 4,  # pixels per tick; omit to use the built-in default
    }
}
```

**Important:** always include `"text": ""` in a `text_labels` update. If a previous update set `text` to a non-empty value, the scroll engine will continue animating that stale text in parallel with the multi-label render, causing visual jank. Explicitly clearing it prevents this.

To disable scrolling on a specific button (keep labels static even when long), set `scroll_enabled: false` in `default_display` or in a `display_update`.

#### Smooth countdowns with text_labels + preload_display_updates

`text_labels` pairs well with `preload_display_updates` for second-by-second tickers that need to look smooth without hammering an external API. The pattern:

1. Fetch fresh data from the API (e.g. track `progress_ms` + `duration_ms`).
2. Return the current `text_labels` state as `display_update`.
3. Pre-compute the next N seconds of label states and return them as `preload_display_updates`.

The core fires each preload at its `apply_at` timestamp independently of the poll interval, giving 1-second resolution updates from a single API call.

```python
import time

def poll_display(config):
    pb = fetch_playback()          # single API call
    now = time.time()
    progress_ms = pb["progress_ms"]
    duration_ms = pb["item"]["duration_ms"]
    track_name  = pb["item"]["name"]

    def _time_left(offset_s):
        remaining_s = max(0, (duration_ms - progress_ms) // 1000 - offset_s)
        return f"-{remaining_s // 60}:{remaining_s % 60:02d}"

    labels = {"top": _time_left(0), "bottom": track_name}

    preloads = [
        {
            "apply_at": now + i,
            "display_update": {
                "text_labels": {"top": _time_left(i), "bottom": track_name},
                "text": "",
                "scroll_speed": 4,
            },
        }
        for i in range(1, 7)   # pre-compute the next 6 seconds
    ]

    return {
        "display_update": {"text_labels": labels, "text": "", "scroll_speed": 4},
        "preload_display_updates": preloads,
    }
```

The Spotify plugin uses this pattern for its **Show Time Left** option on the Play / Pause button — the countdown ticks every second while the track title scrolls simultaneously, all from a single API call every 3 seconds.

When playback stops (Spotify closes or no active device) the plugin returns an idle reset that reverts the button to the static play/pause icon and cancels any remaining preloads in one response:

```python
return {
    "display_update": {
        "image": "plugins/plugin/spotify/img/PlayPause.png",
        "text": "",
        "text_labels": None,
    },
    "preload_display_updates": [],  # cancel pending countdown ticks
}
```

#### Clock plugin — vertical style

The built-in Clock plugin (vertical style) uses `text_labels` to position each time component at a dedicated slot rather than stacking everything in one block:

| Configuration | Labels |
|:---|:---|
| Hour + Minute | `{"top": "12", "bottom": "00"}` |
| Hour + Minute + Seconds | `{"top": "12", "middle": "00", "bottom": "30"}` |
| Hour + Minute + Date | `{"top": "12", "middle": "00", "bottom": "Fri 04"}` |
| Hour + Minute + Seconds + Date | `{"top": "12", "middle": "00:30", "bottom": "Fri 04"}` |

### Using Images in display_states

```json
{
  "display_states": {
    "default": { "image": "plugins/plugin/my_plugin/img/off.png" },
    "active":  { "image": "plugins/plugin/my_plugin/img/on.png" }
  }
}
```

### Icon Gallery

All plugin images are automatically discovered and shown in the Icon Gallery (the image picker in the button editor). Users can browse and select any plugin's icons for any button.

The **sidebar** library tile uses only `sidebar_icon` (see functions table), not `default_display.image`.

If a function sets `disableGallary` or `disableGallery` in its manifest, the editor hides the entire **Button Icon** field for that function, including the label and browse button. This is useful for single-purpose buttons where the image is part of the function's own presentation and should not be user-editable.

---

## 13. options.json (Marketplace Metadata)

Optional file for future plugin marketplace/catalog features. Not used by the core runtime.

```json
{
  "name": "My Plugin",
  "description": "A longer description of what the plugin does",
  "features": [
    "Feature one",
    "Feature two"
  ],
  "options": {
    "client_id": "",
    "client_secret": ""
  },
  "metadata": {
    "category": "media",
    "tags": ["music", "playback", "media"]
  }
}
```

---

## 14. Button Types

PyDeck supports three button types. Plugins use `plugin` and `plugin_loop`.

### plugin — Single Press

The standard button type. Calls one plugin function on each press.

```json
{
  "id": 0,
  "type": "plugin",
  "plugin": "spotify",
  "function": "play_pause",
  "config": {},
  "display": {
    "color": "#1DB954",
    "text": "Play",
    "image": null
  }
}
```

### plugin_loop — Repeating Press

Calls the function repeatedly at a fixed interval. Used for live-updating displays (e.g. a clock, system monitor).

```json
{
  "id": 1,
  "type": "plugin_loop",
  "plugin": "clock",
  "function": "update_time",
  "interval_ms": 1000,
  "config": {},
  "display": {
    "color": "#333333",
    "text": "00:00"
  }
}
```

| Field | Description |
|:---|:---|
| `interval_ms` | Positive integer. How often (in milliseconds) the function is called. |

### action — Multi-Step Sequence

Runs a named sequence of plugin calls and delays defined in `actions.json`. See [Actions](#15-actions-multi-step-sequences).

```json
{
  "id": 2,
  "type": "action",
  "action": "mute_then_deafen",
  "config": {},
  "display": {
    "color": "#ff6600",
    "text": "Macro"
  }
}
```

---

## 15. Actions (Multi-Step Sequences)

Actions are named sequences of plugin calls and delays, defined in `~/.config/pydeck/core/actions.json`. They allow a single button press to trigger multiple plugin functions in order.

### actions.json Format

```json
{
  "actions": {
    "mute_then_deafen": [
      { "plugin": "discord", "function": "toggle_mute" },
      { "delay": 2000 },
      { "plugin": "discord", "function": "toggle_deafen" }
    ],
    "launch_and_play": [
      { "plugin": "browser", "function": "open_url" },
      { "delay": 3000 },
      { "plugin": "spotify", "function": "play_pause" }
    ]
  }
}
```

Each step is either:
- **Plugin call**: `{ "plugin": "<name>", "function": "<func>" }` — runs the function
- **Delay**: `{ "delay": <milliseconds> }` — pauses before the next step

### Action Button Toggling

Action buttons support a toggle feature via config fields:

| Config Key | Description |
|:---|:---|
| `action_switch_enabled` | Set to `true` to enable toggle behavior. |
| `action_next` | Name of the action to switch to after this press. |
| `action_switch_toggle_image` | Set to `true` to also swap button images. |
| `action_image_primary` | Image path for the primary state. |
| `action_image_secondary` | Image path for the secondary state. |

On each press, the button swaps its `action` and `action_next` values, effectively toggling between two actions.

---

## 16. REST API Reference

All endpoints are served by `start.py` on port **8686**.

### Plugin Discovery

#### `GET /api/plugins`

Returns all discovered plugins with their functions.

**Response:**

```json
{
  "plugins": [
    {
      "name": "spotify",
      "display_name": "Spotify",
      "version": "1.0.3",
      "description": "Control Spotify playback via the Web API",
      "functions": {
        "play_pause": {
          "label": "Play / Pause",
          "description": "Toggle Spotify play/pause",
          "default_display": { "color": "#1DB954", "text": "Play" },
          "sidebar_icon": "plugins/plugin/spotify/img/PlayPause.png",
          "title_readonly": false,
          "has_ui": true,
          "autosave": false
        }
      }
    }
  ]
}
```

| Response field | Description |
|:---|:---|
| `name` | Internal plugin identifier (directory name). |
| `display_name` | Human-readable name from the manifest `name` field. |
| `version` | Plugin version string. |
| `description` | Plugin description from the manifest. |
| `functions.<fn>.label` | Button label shown in the sidebar. |
| `functions.<fn>.sidebar_icon` | Path to the icon shown in the function picker. |
| `functions.<fn>.title_readonly` | When `true`, the button title cannot be edited by the user. |
| `functions.<fn>.has_ui` | Whether the function has a configurable UI form. |
| `functions.<fn>.autosave` | When `true`, config changes are saved immediately without a submit button. |

#### `GET /api/plugins/<name>/functions/<func_name>/form`

Returns the HTML form fragment for one plugin function's UI fields.

**Response:** Raw HTML (`text/html`) for the editor panel.

#### `GET /api/settings/categories`

Returns sidebar categories for the Settings overlay. Built-in categories are always present; plugins can add their own via the manifest `settings` object.

**Built-in category IDs:**

| ID | Label |
|:---|:---|
| `device` | Device (brightness, orientation — only shown when a hardware deck is connected) |
| `appearance` | Appearance |
| `text_style` | Text defaults |
| `api` | Credentials (plugin credentials & OAuth) |

**Response:**

```json
{
  "categories": [
    { "id": "device",      "label": "Device",      "builtin": true,  "plugins": [] },
    { "id": "appearance",  "label": "Appearance",  "builtin": true,  "plugins": [] },
    { "id": "text_style",  "label": "Text defaults","builtin": true,  "plugins": [] },
    { "id": "api",         "label": "Credentials",  "builtin": true,  "plugins": [] },
    { "id": "integrations","label": "Integrations","builtin": false, "plugins": [{ "name": "my_plugin", "order": 0 }] }
  ]
}
```

#### `GET /api/plugins/<name>/settings/panel`

Returns `plugins/plugin/<name>/settings.html` if it exists.

**Response:** Raw HTML (`text/html`), or **404** if the file is missing.

#### `GET /api/plugins/<name>/img/<filename>`

Serves a static image from a plugin's `img/` directory.

#### `GET /api/plugins/<name>/storage/<filename>`

Serves a runtime-generated file from `plugins/storage/<name>/<filename>`. Use this endpoint when a plugin writes files at runtime (e.g. downloaded album art) instead of serving pre-packaged static assets.

**Response:** The file's raw bytes with `Cache-Control: no-store`.

#### `GET /api/plugins/styles.css`

Serves all plugin `style.css` files concatenated into one stylesheet.

#### `GET /api/plugins/<name>/api/<path:endpoint>`

Generic plugin data API. Any plugin can expose a data function by defining `api_<endpoint>(config)` as a top-level callable in `plugin.py`. It is then reachable at this URL with the plugin's stored credentials merged into `config` automatically.

**Example — a plugin that exposes an `api_entities` function:**

```python
# plugin.py
def api_entities(config: Dict[str, Any]) -> list:
    client = _get_client(config)
    return client.list_entities()
```

This function becomes available at `GET /api/plugins/my_plugin/api/entities`.

**Response:** Whatever the `api_<endpoint>` function returns, serialized as JSON.

This is the mechanism used by the [`api_select` field type](#api_select--dynamic-api-dropdown) to populate dynamic dropdowns. Query parameters sent to the endpoint are automatically merged into the `config` dict, enabling server-side filtering (e.g. scoping an entity list to a specific domain).

**Well-known endpoint — `api_record`**

When a function's `ui` contains a `hotkey_recorder` field, the editor calls `GET /api/plugins/<name>/api/record` when the user clicks the **Record** button. The endpoint must block until a key combo is pressed (or a timeout expires) and return:

```json
{ "success": true,  "hotkey": "ctrl+c" }
{ "success": false, "error":  "Timeout: no key combo was pressed." }
```

The `hotkey` string uses `+`-delimited lowercase key names identical to the format accepted by the **Keyboard** plugin's `press_key` function. See the [`hotkey_recorder` field type](#hotkey_recorder--keyboard-shortcut-recorder) for implementation details.

### Icons

#### `GET /api/icons`

Returns metadata for all discovered icons, combining three sources:

- **Static assets** — files under `plugins/plugin/<name>/img/` (scanned once at startup)
- **Runtime-generated files** — files under `plugins/storage/<name>/` (scanned live on every request, so newly written files like album art appear without a server restart)
- **User uploads** — files uploaded via `POST /api/icons/upload`, stored in the uploads directory and served via `GET /api/gallery/<filename>`

**Response:**

```json
{
  "icons": [
    {
      "plugin": "discord",
      "name": "mute_0",
      "filename": "mute_0.png",
      "url": "/api/plugins/discord/img/mute_0.png",
      "rel": "plugins/plugin/discord/img/mute_0.png"
    },
    {
      "plugin": "spotify",
      "name": "_now_playing",
      "filename": "_now_playing.jpg",
      "url": "/api/plugins/spotify/storage/_now_playing.jpg",
      "rel": "plugins/storage/spotify/_now_playing.jpg"
    }
  ]
}
```

### Buttons

#### `GET /api/buttons`

Returns all buttons in the active profile.

**Response:**

```json
{
  "buttons": [
    {
      "id": 0,
      "type": "plugin",
      "plugin": "spotify",
      "function": "play_pause",
      "config": {},
      "display": { "color": "#1DB954", "text": "Play", "image": null }
    }
  ]
}
```

#### `POST /api/buttons/<id>`

Create or update a button. Send the full button object as JSON.

**Request body:**

```json
{
  "id": 0,
  "type": "plugin",
  "plugin": "browser",
  "function": "open_url",
  "config": { "url": "https://youtube.com" },
  "display": { "color": "#ff0000", "text": "YT", "image": null }
}
```

**Response:** The normalized button object.

#### `DELETE /api/buttons/<id>`

Delete a button by ID.

**Response:** The removed button object.

#### `GET /api/buttons/<slot>/image`

Render the button at the given slot as a PNG image. Returns `image/png`.

#### `POST /api/buttons/<id>/press`

Execute a button press from the web UI and return the result.

**Response:**

```json
{
  "id": 0,
  "type": "plugin",
  "plugin": "spotify",
  "function": "play_pause",
  "result": {
    "success": true,
    "action": "play",
    "is_playing": true
  }
}
```

### Actions

The Actions API provides full CRUD access to named multi-step action sequences stored in `~/.config/pydeck/core/actions.json`. Each step is either a plugin call or a delay (see [§15](#15-actions-multi-step-sequences) for the step schema).

#### `GET /api/actions`

Returns all configured action names as a sorted array.

**Response:**

```json
{
  "actions": ["launch_and_play", "mute_then_deafen"]
}
```

---

#### `GET /api/actions/<name>`

Returns the step list for a single named action.

**Path parameters:** `name` — the action name (URL-encoded).

**Response — 200:**

```json
{
  "name": "mute_then_deafen",
  "steps": [
    { "plugin": "discord", "function": "toggle_mute" },
    { "delay": 2000 },
    { "plugin": "discord", "function": "toggle_deafen" }
  ]
}
```

**Response — 404** when the action does not exist:

```json
{ "error": "action 'mute_then_deafen' not found" }
```

---

#### `POST /api/actions`

Create a new named action. Returns **409**-equivalent via a 400 error if the name already exists and `overwrite` is not set.

**Request body:**

```json
{
  "name": "mute_then_deafen",
  "steps": [
    { "plugin": "discord", "function": "toggle_mute" },
    { "delay": 2000 },
    { "plugin": "discord", "function": "toggle_deafen" }
  ],
  "overwrite": false
}
```

| Field | Type | Required | Description |
|:---|:---|:---|:---|
| `name` | string | yes | Unique action name. Non-empty, stripped of surrounding whitespace. |
| `steps` | array | yes | Ordered list of step objects (see step schema below). |
| `overwrite` | boolean | no (default `false`) | If `true`, replace an existing action with the same name. |

**Response — 201:**

```json
{
  "name": "mute_then_deafen",
  "steps": [
    { "plugin": "discord", "function": "toggle_mute" },
    { "delay": 2000 },
    { "plugin": "discord", "function": "toggle_deafen" }
  ]
}
```

**Response — 400** on validation failure:

```json
{ "error": "action 'mute_then_deafen' already exists" }
```

---

#### `PUT /api/actions/<name>`

Replace the step list of an existing action. The name itself cannot be changed; delete and re-create to rename.

**Path parameters:** `name` — the action name (URL-encoded).

**Request body:**

```json
{
  "steps": [
    { "plugin": "discord", "function": "toggle_mute" }
  ]
}
```

**Response — 200:**

```json
{
  "name": "mute_then_deafen",
  "steps": [
    { "plugin": "discord", "function": "toggle_mute" }
  ]
}
```

**Response — 404** when the action does not exist.

---

#### `DELETE /api/actions/<name>`

Remove a named action permanently.

**Path parameters:** `name` — the action name (URL-encoded).

**Response — 200:**

```json
{ "deleted": "mute_then_deafen" }
```

**Response — 404** when the action does not exist.

---

#### Step Schema

Every step in a `steps` array must be one of two shapes:

| Shape | Fields | Description |
|:---|:---|:---|
| Plugin call | `{ "plugin": string, "function": string }` | Invokes the named function in the named plugin. Both fields are required and non-empty. |
| Delay | `{ "delay": integer }` | Pauses execution for `delay` milliseconds (non-negative integer). Cannot be combined with plugin fields. |

A step may **not** mix `delay` with `plugin`/`function`.

---

### Credentials

#### `GET /api/credentials`

Returns all plugins that declare credentials, with password fields masked by default.

**Query parameters:**

| Parameter | Values | Description |
|:---|:---|:---|
| `secrets` | `1`, `true`, `yes` | Return real plaintext secret values instead of `••••••••`. Response includes `Cache-Control: no-store` when secrets are exposed. |

**Response:**

```json
{
  "credentials": {
    "spotify": {
      "credentials": [
        { "id": "client_id", "label": "Client ID", "type": "text" },
        { "id": "client_secret", "label": "Client Secret", "type": "password" }
      ],
      "values": {
        "client_id": "abc123",
        "client_secret": "••••••••"
      },
      "oauth": true,
      "authorized": true
    }
  }
}
```

#### `POST /api/credentials/<plugin_name>`

Save credentials for a plugin. Masked values (`••••••••`) are skipped to avoid overwriting.

**Request body:**

```json
{
  "client_id": "new_id",
  "client_secret": "new_secret"
}
```

### OAuth

#### `GET /api/<plugin_name>/authorize`

Returns the OAuth authorization URL for a plugin. The GUI opens this URL in a new browser tab.

**Response:**

```json
{
  "url": "https://accounts.spotify.com/authorize?client_id=...&redirect_uri=..."
}
```

#### `GET /oauth/<plugin_name>/callback`

Handles the OAuth redirect from the provider. Exchanges the authorization code for tokens and saves them to `credentials.json`. Returns a simple HTML page telling the user they can close the tab.

### Folders

#### `GET /api/folders/getall`

Returns all configured folders and the currently active folder ID.

**Response:**

```json
{
  "folders": { "gaming": { "name": "Gaming" }, "work": { "name": "Work" } },
  "active_folder": "gaming"
}
```

#### `POST /api/folders/<folder_id>`

Create a folder entry if it doesn't exist. Automatically adds a "back" button at the last slot.

**Request body (optional):**

```json
{ "name": "Gaming" }
```

**Response:**

```json
{ "ok": true, "folder": { "id": "gaming", "name": "Gaming" } }
```

#### `POST /api/folders/change/<folder_id>`

Switch the active folder to the given ID.

**Response:**

```json
{ "active_folder": "gaming" }
```

Returns **404** if the folder ID does not exist.

#### `POST /api/folders/changename/`

Rename an existing folder.

**Request body:**

```json
{ "old_name": "gaming", "new_name": "Games" }
```

**Response:**

```json
{ "ok": true, "name": "Games" }
```

#### `DELETE /api/folders/<folder_id>`

Remove a folder entry permanently.

**Response:**

```json
{ "ok": true }
```

### Deck Preview

#### `GET /api/deck/grid`

Returns a snapshot of every button slot as rendered PNG images (and optionally GIF data). Used by the web UI to refresh the visual deck grid.

**Response:**

```json
{
  "t": 1712345678123,
  "slots": [
    { "id": 0, "png_b64": "<base64-encoded PNG>" },
    { "id": 1, "png_b64": "<base64-encoded PNG>", "gif_b64": "<base64-encoded GIF>" }
  ]
}
```

| Field | Description |
|:---|:---|
| `t` | Server timestamp in milliseconds (used by the client to detect stale responses). |
| `slots[].id` | Button slot index. |
| `slots[].png_b64` | Base64-encoded PNG of the rendered button. |
| `slots[].gif_b64` | Base64-encoded GIF, present only when the button is displaying an animated GIF. |

#### `GET /api/buttons/<slot>/gif`

Returns the raw animated GIF bytes for the button at the given slot, or an empty **404** response if the slot is not displaying a GIF.

**Response:** Raw bytes (`image/gif`), or **404**.

---

### Icons — Gallery & Uploads

#### `GET /api/gallery/<filename>`

Serves a user-uploaded icon file by filename.

**Response:** The file's raw bytes, or **404**.

#### `POST /api/icons/upload`

Upload a custom icon image. Accepts `image/png`, `image/jpeg`, `image/gif`, and `image/webp`. Maximum file size is enforced by the server.

**Request:** `multipart/form-data` with a `file` field.

**Response — 201:**

```json
{
  "icon": {
    "plugin": null,
    "name": "my_icon",
    "filename": "my_icon.png",
    "url": "/api/gallery/my_icon.png",
    "rel": "uploads/my_icon.png"
  }
}
```

**Response — 400** if no file is provided or the filename is empty.  
**Response — 413** if the file exceeds the size limit.  
**Response — 415** if the MIME type is not an accepted image format.

---

### Devices

#### `GET /api/devices`

Returns all connected Stream Deck devices with their geometry and selection state.

**Response:**

```json
{
  "devices": [
    {
      "id": "usb:0fd9:0060:00001",
      "name": "Stream Deck MK.2",
      "selected": true,
      "cols": 5,
      "rows": 3,
      "num_buttons": 15,
      "brightness": 70,
      "orientation": 0
    }
  ]
}
```

#### `POST /api/devices/select`

Switch the active device.

**Request body:**

```json
{ "device_id": "usb:0fd9:0060:00001" }
```

**Response — 200:**

```json
{
  "ok": true,
  "device": "usb:0fd9:0060:00001",
  "brightness": 70,
  "orientation": 0,
  "num_buttons": 15,
  "cols": 5,
  "rows": 3
}
```

**Response — 404** if the device ID is not recognised.

#### `GET /api/devices/orientation`

Returns the display orientation of the active device.

**Response:**

```json
{ "orientation": 0 }
```

Valid values: `0`, `90`, `180`, `270`.

#### `POST /api/devices/orientation`

Set the display orientation of the active device.

**Request body:**

```json
{ "orientation": 90 }
```

**Response:**

```json
{ "ok": true, "orientation": 90 }
```

**Response — 400** if the value is not one of `0`, `90`, `180`, `270`.

---

### Themes

#### `GET /api/themes`

Returns all available UI themes grouped by family.

**Response:**

```json
{
  "themes": { "dark": { "label": "Dark", "slots": ["default", "compact"] } },
  "theme_groups": [{ "family": "dark", "label": "Dark", "slots": ["default", "compact"] }]
}
```

#### `GET /api/themes/<family>/<slot>.css`

Serves the CSS file for a specific theme variant.

**Response:** CSS (`text/css`), or **404**.

#### `GET /api/settings/theme`

Returns the active theme setting.

**Response:**

```json
{ "theme": "dark/default" }
```

#### `POST /api/settings/theme`

Set the active theme.

**Request body:**

```json
{ "theme": "dark/compact" }
```

**Response:**

```json
{ "ok": true, "theme": "dark/compact" }
```

**Response — 400** if `theme` is missing or empty.

---

### Profiles

#### `GET /api/profiles/getall`

Returns all profile names.

**Response:**

```json
{ "profiles": ["main", "gaming", "work"] }
```

#### `POST /api/profiles/change/<profile_name>`

Switch the active profile to the given name. All button slots reload from the new profile's `buttons.json`.

**Response:**

```json
{ "active_profile": "gaming" }
```

**Response — 404** if the profile does not exist.

#### `POST /api/profiles/changename/`

Rename an existing profile.

**Request body:**

```json
{ "old_name": "gaming", "new_name": "Games" }
```

**Response:**

```json
{ "ok": true, "name": "Games" }
```

**Response — 400** if either name is missing, empty, or the old name doesn't exist.

#### `DELETE /api/profiles/delete/<profile_name>`

Permanently delete a profile and its `buttons.json`.

**Response:**

```json
{ "ok": true }
```

**Response — 404** if the profile does not exist.

---

### Marketplace

#### `GET /api/marketplace/catalog`

Returns the combined plugin catalog fetched from all configured manifest URLs.

**Query parameters:**

| Parameter | Description |
|:---|:---|
| `q` | Filter by plugin name or description (case-insensitive substring). |
| `category` | Filter by category string (e.g. `media`, `communication`). |

**Response — 200:**

```json
{
  "plugins": [
    {
      "slug": "spotify",
      "name": "Spotify",
      "description": "Control Spotify playback",
      "version": "1.0.3",
      "category": "media",
      "manifest_url": "https://example.com/plugins/spotify/manifest.json"
    }
  ],
  "generated_at": "2026-04-04T12:00:00Z",
  "schema_version": 1,
  "configured": true,
  "manifest_urls": ["https://example.com/catalog.json"],
  "catalog_labels": { "https://example.com/catalog.json": "Official" }
}
```

Returns `"configured": false` when no marketplace repos have been configured.  
Returns **502** with `"error"` if all configured repos fail to respond.

#### `GET /api/marketplace/repos`

Returns the currently configured marketplace repository URLs.

**Response:**

```json
{
  "manifest_urls": ["https://example.com/catalog.json"],
  "active_catalogs": 1,
  "env_manifest_set": false
}
```

| Field | Description |
|:---|:---|
| `manifest_urls` | List of catalog URLs currently configured. |
| `active_catalogs` | Number of catalogs that responded successfully. |
| `env_manifest_set` | `true` if the URL list was overridden by an environment variable. |

#### `PUT /api/marketplace/repos`

Replace the list of marketplace repository URLs.

**Request body:**

```json
{ "manifest_urls": ["https://example.com/catalog.json"] }
```

**Response:**

```json
{ "ok": true, "manifest_urls": ["https://example.com/catalog.json"] }
```

**Response — 400** if `manifest_urls` is missing or not a list.

#### `POST /api/marketplace/install`

Download and install a plugin from a manifest URL.

**Request body:**

```json
{
  "manifest_url": "https://example.com/plugins/spotify/manifest.json",
  "slug": "spotify",
  "version": "1.0.3"
}
```

| Field | Required | Description |
|:---|:---|:---|
| `manifest_url` | Yes | Direct URL to the plugin's `manifest.json`. |
| `slug` | Yes | Plugin directory name to install into. |
| `version` | No | Expected version for verification. |

**Response — 200:**

```json
{
  "ok": true,
  "installed_path": "plugins/plugin/spotify",
  "slug": "spotify",
  "version": "1.0.3"
}
```

**Response — 400** if required fields are missing.  
**Response — 404** if the manifest URL is unreachable.  
**Response — 502** if the download fails.

#### `POST /api/marketplace/uninstall`

Remove an installed plugin by slug.

**Request body:**

```json
{ "slug": "spotify" }
```

**Response:**

```json
{ "ok": true, "slug": "spotify" }
```

---

### Settings

#### `GET /api/status`

Returns server status and current brightness.

**Response:**

```json
{ "status": "ok", "brightness": 70 }
```

#### `POST /api/brightness`

Set the Stream Deck brightness.

**Request body:**

```json
{ "value": 85 }
```

---

## 17. WebSocket Events

The server uses Socket.IO to push real-time events to the web GUI. Connect to the same host/port as the HTTP server.

### Event: `deck_event`

All events are emitted under the `deck_event` channel with a `type` field:

| Type | Fields | Description |
|:---|:---|:---|
| `press` | `button`, `device_id`, `result?` | A button was pressed (physical or web). `result` contains the plugin return dict. |
| `error` | `button`, `device_id`, `error` | A button press failed. `error` is the error message string. |
| `display_update` | `button`, `device_id` | A button's display was updated (by poller or cross-device sync). GUI should refresh that button's image. |
| `folder_change` | `device_id` | The active folder changed. GUI should reload all button images. |

All events include a `device_id` field so the GUI can scope updates to the correct device. Cross-device sync emits `display_update` events for **all** affected devices simultaneously — a client viewing Device B will see its buttons update live when Device A is pressed.

---

## 18. Config and File Paths

### Directory Layout

```
~/.config/pydeck/
└── core/
    ├── config.json            # Active profile name and global settings
    ├── credentials.json       # Plugin credentials (client IDs, tokens, etc.)
    ├── folders.json           # Folder definitions for virtual pages
    ├── actions.json           # Named multi-step action sequences
    └── profiles/
        ├── main/
        │   └── buttons.json   # Button definitions for the "main" profile
        └── gaming/
            └── buttons.json   # Button definitions for the "gaming" profile
```

Plugin files on disk:

```
plugins/
├── plugin/                    # Installed plugin code (managed by marketplace)
│   ├── spotify/
│   │   ├── manifest.json
│   │   ├── plugin.py
│   │   └── img/               # Static assets shipped with the plugin
│   └── discord/
│       └── ...
└── storage/                   # Runtime-generated files (written by plugins, not replaced on update)
    ├── spotify/
    │   └── _now_playing.jpg   # Downloaded album art
    └── my_plugin/
        └── cached_data.json
```

### config.json

```json
{
  "buttonProfiles": "main"
}
```

The `buttonProfiles` value selects which profile's `buttons.json` is active.

### buttons.json

```json
{
  "buttons": [
    {
      "id": 0,
      "type": "plugin",
      "plugin": "spotify",
      "function": "play_pause",
      "config": {},
      "display": { "color": "#1DB954", "text": "Play", "image": null }
    }
  ]
}
```

Buttons are sorted by `id`. The Stream Deck listener maps buttons to physical slots in sorted order.

---

## 19. Real-World Plugin Examples

### Browser — Minimal Plugin (No Credentials)

The simplest possible plugin. Opens URLs in the default browser.

**Directory:**

```
plugins/plugin/browser/
├── manifest.json
└── plugin.py
```

**manifest.json:**

```json
{
  "name": "browser",
  "version": "1.0.0",
  "description": "Open URLs in the default browser",
  "permissions": {
    "webbrowser": ["open"]
  },
  "functions": {
    "open_url": {
      "label": "Open URL",
      "description": "Launch a custom URL in your default browser",
      "ui": [
        {
          "type": "input",
          "id": "url",
          "label": "URL",
          "default": "https://youtube.com"
        }
      ]
    }
  }
}
```

**plugin.py:**

```python
import webbrowser
from typing import Any, Dict

def open_url(config: Dict[str, Any]) -> Dict[str, Any]:
    url = str(config.get("url") or "https://youtube.com")
    opened = webbrowser.open(url, new=2)
    return {
        "success": bool(opened),
        "url": url,
        "message": "Browser launch attempted",
    }
```

**Takeaway:** No credentials, no images, no CSS. Just a manifest and a Python file.

---

### Media Control — Multiple Functions with Shared Logic

Controls system media playback. Shows how to use `select` dropdowns and `visible_if` conditional fields.

**Key manifest pattern — a "mega function" using select + visible_if:**

```json
{
  "media_control": {
    "label": "Media Control",
    "description": "Run a media command",
    "ui": [
      {
        "type": "select",
        "id": "action",
        "label": "Action",
        "options": [
          { "label": "Play/Pause", "value": "play_pause" },
          { "label": "Volume Up", "value": "volume_up" },
          { "label": "Volume Down", "value": "volume_down" }
        ],
        "default": "play_pause"
      },
      {
        "type": "input",
        "id": "player",
        "label": "Player Filter (optional)",
        "placeholder": "spotify",
        "default": ""
      },
      {
        "type": "number",
        "id": "step_percent",
        "label": "Volume Step (%)",
        "default": 5
      }
    ]
  }
}
```

**plugin.py pattern — dispatching by action:**

```python
def media_control(config: Dict[str, Any]) -> Dict[str, Any]:
    action = config.get("action", "play_pause")
    player = config.get("player", "")

    if action in ("volume_up", "volume_down"):
        step = int(config.get("step_percent") or 5)
        return _adjust_volume(action, step)
    else:
        return _playerctl_action(action, player)
```

**Takeaway:** One function can handle many actions via a select dropdown. Use `visible_if` to show fields only when relevant.

---

### Folder — Plugin That Modifies Button State

The folder plugin swaps all deck buttons when "entering" a folder and restores them when "returning". Shows how plugins can directly modify `buttons.json`.

**Key return pattern — signaling a folder change:**

```python
def enter_folder(config: Dict[str, Any]) -> Dict[str, Any]:
    # ... swap buttons.json with folder contents ...
    return {
        "success": True,
        "folder_id": folder_id,
        "folder_change": True,  # tells the listener to reload
    }
```

**Takeaway:** Plugins can read/write PyDeck config files directly. The `folder_change` key triggers a full GUI reload.

---

### Discord — Display States and Related States

Toggles Discord mute/deafen with image-based state tracking. Shows `display_states` and `related_states`.

**manifest.json — display_states:**

```json
{
  "toggle_mute": {
    "label": "Discord Mute",
    "default_display": {
      "image": "plugins/plugin/discord/img/mute_0.png",
      "color": "#000000",
      "text": ""
    },
    "display_states": {
      "default": { "image": "plugins/plugin/discord/img/mute_0.png" },
      "active":  { "image": "plugins/plugin/discord/img/mute_1.png" }
    },
    "ui": []
  }
}
```

**plugin.py — returning state + related_states:**

```python
def toggle_mute(config: Dict[str, Any]) -> Dict[str, Any]:
    rpc = _get_rpc(config.get("client_id"), config.get("client_secret"))
    state = rpc.toggle_mute()
    return {
        "success": True,
        "action": "mute",
        "muted": state["mute"],
        "deafened": state["deaf"],
        "state": "active" if state["mute"] else "default",
        "related_states": {
            "toggle_deafen": "active" if state["deaf"] else "default",
        },
    }
```

When mute is toggled, the deafen button's display also updates to reflect the current deaf state.

**Takeaway:** Use `display_states` for image toggling. Use `related_states` to keep sibling buttons in sync.

---

### Spotify — OAuth + API Client + Token Refresh

The most complex plugin. Uses OAuth for authorization, a dedicated API client module, and module-level caching.

**Directory:**

```
plugins/plugin/spotify/
├── manifest.json
├── plugin.py
├── spotify_client.py
├── options.json
└── style.css
```

**manifest.json — OAuth config:**

```json
{
  "oauth": {
    "authorize_url": "https://accounts.spotify.com/authorize",
    "token_url": "https://accounts.spotify.com/api/token",
    "scopes": "user-read-playback-state user-modify-playback-state user-read-currently-playing",
    "auth_method": "basic"
  },
  "credentials": [
    { "id": "client_id",     "label": "Client ID",     "type": "text" },
    { "id": "client_secret", "label": "Client Secret", "type": "password" }
  ]
}
```

**plugin.py — client caching pattern:**

```python
_client_cache: dict[tuple[str, str], SpotifyClient] = {}

def _get_client(config: Dict[str, Any]) -> SpotifyClient:
    cid = str(config.get("client_id") or "").strip()
    csec = str(config.get("client_secret") or "").strip()
    if not cid or not csec:
        raise SpotifyError("client_id and client_secret are required")

    key = (cid, csec)
    client = _client_cache.get(key)
    if client is None:
        client = SpotifyClient(
            cid, csec,
            access_token=str(config.get("access_token") or ""),
            refresh_token=str(config.get("refresh_token") or ""),
        )
        _client_cache[key] = client
    return client


def play_pause(config: Dict[str, Any]) -> Dict[str, Any]:
    try:
        client = _get_client(config)
        pb = client.get_playback()
        if pb and pb.get("is_playing"):
            client.pause()
            return {"success": True, "action": "pause", "is_playing": False}
        else:
            client.play()
            return {"success": True, "action": "play", "is_playing": True}
    except SpotifyError as e:
        return {"success": False, "error": str(e)}
```

**spotify_client.py — auto token refresh:**

```python
def _req(self, method, path, query=None, body=None, _retry=True):
    # ... make API request ...
    try:
        # ... urllib request ...
    except urllib.error.HTTPError as e:
        if e.code == 401 and _retry:
            if self.refresh():
                return self._req(method, path, query, body, _retry=False)
        raise SpotifyError(msg)
```

**Takeaway:** OAuth tokens flow automatically via `config`. Cache clients at module level. Handle token refresh in your API client.

---

## 20. Tips and Best Practices

### Plugin Independence

Plugins must be fully self-contained. All functionality lives in the plugin folder:
- No modifications to `start.py`, `lib/`, or `app/` files
- CSS goes in `style.css`, not in the core stylesheet
- Images go in `img/`, served via the generic image route
- OAuth config goes in the manifest, handled by the generic OAuth routes

### Return Format

Always return a dict with `"success": True/False`:

```python
# Good
return {"success": True, "data": result}
return {"success": False, "error": "Something went wrong"}

# Bad — missing success flag
return {"data": result}
return result_string
```

### Error Handling

Catch exceptions in your function and return them as error dicts. If your function raises an uncaught exception, the core wraps it in a `RuntimeError` and the button shows an error in the GUI.

```python
def my_function(config):
    try:
        return {"success": True}
    except MySpecificError as e:
        return {"success": False, "error": str(e)}
    except Exception as e:
        return {"success": False, "error": f"Unexpected: {e}"}
```

### Cache Eviction

If cached state becomes stale (e.g. credentials changed, connection dropped), evict the cache entry so the next press creates a fresh instance:

```python
def _evict_client(config):
    key = (config.get("client_id", ""), config.get("client_secret", ""))
    _client_cache.pop(key, None)

def my_function(config):
    try:
        client = _get_client(config)
        return client.do_thing()
    except ConnectionError as e:
        _evict_client(config)
        return {"success": False, "error": str(e)}
```

### File Organization

For complex plugins with multiple modules:

```
plugins/plugin/my_plugin/
├── manifest.json
├── plugin.py          # Entry point — thin wrappers that call into your client
├── my_client.py       # API client / business logic
├── style.css          # Theme colors
├── options.json       # Marketplace metadata
└── img/
    ├── icon.png
    ├── state_on.png
    └── state_off.png
```

Keep `plugin.py` as a thin orchestration layer. Put complex logic in separate modules.

---

## 14. Text Style Priority Chain

PyDeck resolves the final text style for every rendered button through a three-layer merge. Lower layers provide fallback values; higher layers win for any field they explicitly set.

```
┌─────────────────────────────────────────────────────────────────┐
│  Priority (highest → lowest)                                    │
│                                                                 │
│  3. Plugin manifest  default_display  ← wins when field_lock   │
│                                          is true, otherwise     │
│                                          suggestion only        │
│  2. User per-button  display settings ← wins over system       │
│  1. System Default   (Settings UI)    ← global fallback        │
└─────────────────────────────────────────────────────────────────┘
```

### Layer 1 — System Default

The **System Default** is a global fallback that applies to every button that has no per-button override. It is configured in the PyDeck web UI under **Settings → Text defaults** (open Settings from the deck header).

The defaults are stored in `~/.config/pydeck/core/config.json` under the key `text_style_defaults` and can also be read/written via the API:

```
GET  /api/settings/text-style   → current system default values
POST /api/settings/text-style   → update (partial or full)
```

**Default values** (when no system default has been saved):

| Field | Value |
|:---|:---|
| `show_title` | `true` |
| `text_position` | `"bottom"` |
| `text_size` | `0` (auto) |
| `text_bold` | `false` |
| `text_italic` | `false` |
| `text_underline` | `false` |
| `text_color` | `""` (auto-contrasting) |

### Layer 2 — User Per-Button Settings

The user can customise text style for each individual button through the **Title → T↓** popup in the button editor. These settings are saved in the button's `display` object inside `buttons.json`. They override the system default for that button.

The user can also configure **multi-position labels** from the Title section by clicking **+ Label**. When multiple labels are configured the button stores a `text_labels` dict instead of a plain `text` string; see [Multi-Position Labels (text_labels)](#multi-position-labels-text_labels) for details.

### Layer 3 — Plugin Manifest

Text-style fields declared inside `default_display` in the plugin's `manifest.json` act as **suggestions** by default: they are applied only when the user has not explicitly set that field on the button. If the user has saved a value for the field, their choice takes priority.

To override the user and enforce a specific value regardless of their settings, add a companion `<field>_lock: true` alongside the field. Only then does the manifest field take the highest priority.

Only fields that are **explicitly declared** in the manifest participate in layer 3 at all. Any omitted field falls through to layer 2 or layer 1.

### Practical example

A user has set a system default of `text_position: "top"` and `text_bold: true`. They configure a specific Spotify button with `text_size: 12` and explicitly save `text_position: "bottom"`. The Spotify plugin declares `text_position: "middle"` (no lock) and `text_color: "#ffffff"` (no lock) in its manifest. The resolved style is:

| Field | Value | Source |
|:---|:---|:---|
| `text_position` | `"bottom"` | User per-button (manifest suggestion overridden) |
| `text_color` | `"#ffffff"` | Plugin manifest suggestion (user had not set it) |
| `text_size` | `12` | User per-button |
| `text_bold` | `true` | System default |
| All other fields | system defaults | System default |

If the plugin instead declared `"text_position_lock": true`, the resolved `text_position` would be `"middle"` regardless of what the user saved.
