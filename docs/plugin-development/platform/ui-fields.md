# Shared platform — UI field types

The **`ui`** array in each function definition controls what appears in the button editor panel. Each entry is a field object, and each field's `id` becomes a key on the config your handler reads — **`ctx.config["<id>"]`** in a [PDK](../plugin/getting-started.md) handler.

PDK plugins can declare the same fields **inline** in a template's `<settings>` block instead of in the manifest; the two forms are equivalent. See [Inline settings](../plugin/templates-elements.md) in *Templates & elements*. This page is the reference for the field **types** themselves, in either form.

---

## Common properties

Every field type supports these properties:

| Property | Type | Required | Description |
|:---|:---|:---|:---|
| `type` | string | Yes | One of: `input`, `number`, `checkbox`, `slider`, `select`, `radio`, `group`, `hotkey_recorder`, `api_select` |
| `id` | string | Yes | Unique key within the function. This becomes the config key your handler reads. |
| `label` | string | Yes | Human-readable label shown above the field. |
| `default` | any | No | Default value when the button is first created. Cast automatically: `checkbox` → boolean, `number`/`slider` → numeric. |
| `visible_if` | object | No | Conditionally show this field based on another field's value. See [visible_if](#visible_if-conditional-visibility). |
| `autosave` | string | No | `"on"` (default) saves whenever the field changes. `"off"` disables autosave for this field. If **any** field in the function sets `"autosave": "off"`, the editor shows an explicit **Save** button for the whole function. Use `"off"` for fields that are expensive to apply on every keystroke (e.g. a location input that triggers a network request). |

---

## input — text input

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

---

## number — numeric input

A number field with optional min/max constraints.

```json
{
  "type": "number",
  "id": "repeat",
  "label": "Repeat",
  "min": 1,
  "max": 100,
  "default": 1
}
```

| Property | Description |
|:---|:---|
| `min` | Minimum allowed value. |
| `max` | Maximum allowed value. |

---

## checkbox — boolean toggle

A checkbox that maps to `true`/`false`.

```json
{
  "type": "checkbox",
  "id": "auto_reconnect",
  "label": "Auto-reconnect on failure",
  "default": true
}
```

---

## slider — range slider

A horizontal slider.

```json
{
  "type": "slider",
  "id": "brightness",
  "label": "LED Brightness",
  "default": 50
}
```

---

## select — dropdown

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
- `value` — Value handed to your handler via `ctx.config["action"]`

---

## radio — radio buttons

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

---

## group — nested field container

Renders a visual container with nested child fields. Use it to group related settings together.

```json
{
  "type": "group",
  "id": "display_group",
  "label": "Display",
  "fields": [
    { "type": "checkbox", "id": "show_icon",  "label": "Entity Icon", "default": true },
    { "type": "checkbox", "id": "show_label", "label": "Name / Title", "default": true }
  ]
}
```

| Property | Description |
|:---|:---|
| `fields` | Array of child field definitions rendered inside the group container. Child ids stay flat on the config — read them as `ctx.config["show_icon"]`. |

---

## hotkey_recorder — keyboard shortcut recorder

A text input paired with a **Record** button. When the user clicks Record, the editor calls `GET /api/plugins/<plugin_id>/api/record` and waits up to 10 seconds for a key combo to be pressed on the physical keyboard. The result is written back into the text field automatically.

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

1. The plugin must expose an `api_record(config)` top-level function in **`src/shared.py`**. The editor calls `GET /api/plugins/<plugin_id>/api/record` when the user clicks Record. If the endpoint is missing, the button shows an error.
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

The official **Keyboard** plugin ships a production-ready `api_record` implementation — see **`~/.local/share/pydeck/plugin/no.pydeck.keyboard/src/shared.py`** for the full version including permission-error detection and a robust keyboard-device filter.

---

## api_select — dynamic API dropdown

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
| `api` | string | Yes | Name of the `api_<endpoint>` function to call. E.g. `"entities"` calls `GET /api/plugins/<plugin_id>/api/entities`. |
| `display.label` | string | No | Key in each API response object to use as the option label. Defaults to `"label"`. |
| `display.value` | string | No | Key in each API response object to use as the option value. Defaults to `"value"`. |
| `filter_field` | string | No | `id` of another field in the same function whose value is forwarded to the API as a query parameter. Use this to scope the dropdown to a domain or category selected by the user. |
| `filter_by` | string | No | Query parameter name sent to the API when `filter_field` changes. E.g. `"domain"` → `GET /api/plugins/<plugin_id>/api/entities?domain=light`. Required when `filter_field` is set. |

**How it works:**

1. When the editor opens, the field calls `GET /api/plugins/<plugin_id>/api/<api>` and populates the `<select>` with the returned array.
2. If `filter_field` is set, the call becomes `GET /api/plugins/<plugin_id>/api/<api>?<filter_by>=<value>` and re-fires whenever the referenced field changes.
3. Any query parameters in the request are automatically merged into the `config` dict passed to the Python function, so no manual parsing is needed.

**Real-world example — Home Assistant entity picker (domain → entity):**

The official Home Assistant plugin uses two chained `api_select` fields: the first lets the user pick a domain (light, switch, media_player, …), and the second re-fetches the entity list scoped to that domain whenever the selection changes. Selecting "All" from the domain field clears the filter and shows every entity.

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

- `domain_filter` calls `GET /api/plugins/no.pydeck.home-assistant/api/domains` and shows all domains present in the user's HA instance, with an "All" option prepended (value `""`).
- `entity_id` calls `GET /api/plugins/no.pydeck.home-assistant/api/entities` and re-fetches with `?domain=<value>` every time `domain_filter` changes. An empty value means no filter — all entities are shown.

**`src/shared.py` — the two API endpoint functions:**

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

!!! note "`api_<endpoint>` functions are top-level callables"
    Define them at module level in **`src/shared.py`**. They take the merged
    credentials + button config dict and are reachable at
    `GET /api/plugins/<plugin_id>/api/<endpoint>` — see
    [HTTP API reference](http-api-reference.md).

---

## visible_if — conditional visibility

Show a field only when another field has a specific value. Add `visible_if` to any field:

```json
{
  "type": "checkbox",
  "id": "show_unit",
  "label": "Unit",
  "default": true,
  "visible_if": {
    "field": "show_value",
    "value": "true"
  }
}
```

| Key | Description |
|:---|:---|
| `field` | The `id` of the field to watch (in the same function). |
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

!!! note "`visible_if` is declared in `manifest.json`"
    Set it on the field object in the manifest — not on an inline XML
    `<field>` element. See [Conditional visibility](../plugin/templates-elements.md)
    in *Templates & elements*.

---

## Related reading

- [`manifest.json` reference](manifest-reference.md) — where the `ui` array lives.
- [Plugin development — Templates & elements](../plugin/templates-elements.md) — inline `<settings>` blocks.
- [Plugin development — Runtime & examples](../plugin/runtime-examples.md) — reading values off `ctx.config`.
- [HTTP API reference](http-api-reference.md) — the `api_<endpoint>` route used by `api_select` and `hotkey_recorder`.
