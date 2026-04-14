# Plugin Development — Core

## 1. plugin.py — Writing Functions

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

```python
config = {**credentials, **button_config}
```

1. **Credentials** — Values from `~/.config/pydeck/core/credentials.json` under your plugin's key (e.g. `client_id`, `client_secret`, `access_token`)
2. **Button config** — Values from the button's UI fields saved in `buttons.json`

Button config takes precedence, so users can override credentials per-button if needed.

---

## 2. UI Field Types

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

## 3. Display States and Toggling

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

### User-Level Per-State Image Overrides

The web editor lets users customise the image for each state independently. When a function defines `display_states`, the editor shows state selector dots below the icon preview. Clicking a dot switches to that state so the user can browse the icon gallery and pick a different image for it.

User overrides are stored on the button itself in a `display_states` field that mirrors the manifest structure:

```json
{
  "id": 0,
  "type": "plugin",
  "plugin": "discord",
  "function": "toggle_mute",
  "config": {},
  "display": { "color": "#000000", "text": "", "image": "plugins/plugin/discord/img/mute_on.png" },
  "display_states": {
    "default": { "image": "/api/gallery/my_custom_unmuted.png" },
    "active":  { "image": "/api/gallery/my_custom_muted.png" }
  }
}
```

When a state change occurs (plugin returns `"state": "active"`), the core resolves the final display in two steps:

1. **Manifest lookup** — read the state's partial display from the function's `display_states` in `manifest.json`.
2. **User override merge** — if the button has its own `display_states` entry for that key, those values are merged on top (user wins).

This means plugins always define the *default* images for each state, but users can replace them per-button without editing the manifest.

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

## 4. Display Polling

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
