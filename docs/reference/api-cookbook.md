# API cookbook

Everything you can do with an API token, with a worked example for each
endpoint. Every example below was run against a live server while writing this
page.

!!! tip "Which API page do I want?"
    This page is **task-oriented** — how to make a given call, and what comes
    back. For the payload schemas, WebSocket event shapes and persisted file
    formats, see the [HTTP and WebSocket API reference](http-api.md). For
    creating a token and choosing its scopes, see [API tokens](api-tokens.md).

## Contents

1. [Quick start](#1-quick-start)
2. [Authentication](#2-authentication)
3. [Conventions](#3-conventions)
4. [Decks and devices](#4-decks-and-devices)
5. [Buttons](#5-buttons)
6. [Rendered previews](#6-rendered-previews)
7. [Profiles](#7-profiles)
8. [Folders](#8-folders)
9. [Actions](#9-actions)
10. [Plugins](#10-plugins)
11. [Credentials](#11-credentials)
12. [Icons and gallery](#12-icons-and-gallery)
13. [Themes](#13-themes)
14. [Settings](#14-settings)
15. [Updates](#15-updates)
16. [Marketplace](#16-marketplace)
17. [Network](#17-network)
18. [The WebSocket event stream](#18-the-websocket-event-stream)
19. [Limitations](#19-limitations)
20. [Recipes](#20-recipes)

---

## 1. Quick start

```bash
export PYDECK=http://127.0.0.1:8686
export TOKEN=pdk_your_token_here

# What is connected?
curl -s -H "X-API-Key: $TOKEN" $PYDECK/api/devices

# What is on the deck?
curl -s -H "X-API-Key: $TOKEN" $PYDECK/api/buttons

# Press key 2
curl -s -X POST -H "X-API-Key: $TOKEN" -H 'Content-Type: application/json' \
     -d '{}' $PYDECK/api/buttons/2/press
```

Python:

```python
import requests

PYDECK = 'http://127.0.0.1:8686'
S = requests.Session()
S.headers['X-API-Key'] = 'pdk_your_token_here'

print(S.get(f'{PYDECK}/api/status').json())
S.post(f'{PYDECK}/api/buttons/2/press', json={})
```

---

## 2. Authentication

Send the token one of two ways:

```
X-API-Key: pdk_...
Authorization: Bearer pdk_...
```

For the WebSocket, use a query parameter — a handshake carries no header a
browser script can set:

```
ws://127.0.0.1:8686/ws?api_key=pdk_...
```

Each endpoint below lists the **scope** it needs. `read` covers GET; `write`
covers POST, PUT, PATCH, DELETE. There is no hierarchy: `buttons:write` does not
grant `buttons:read`.

Failure responses:

| Status | Body | Meaning |
|:---|:---|:---|
| 401 | `{"error": "Invalid or expired API token"}` | Unknown, malformed or expired |
| 403 | `{"error": "...", "missing_scope": "buttons:write"}` | Valid token, missing scope |
| 403 | `{"error": "...", "reason": "endpoint_not_scopable"}` | No token can reach this endpoint |
| 421 | `{"error": "Invalid host"}` | `Host` header is not an IP literal, `localhost`, or in `PYDECK_ALLOWED_HOSTS` |

A token restricts you **even on localhost**. A local request with no token keeps
full access (that is how the web UI works), but a request that carries a token is
judged on that token's scopes wherever it came from.

---

## 3. Conventions

**Base URL** — `http://<host>:8686`. The port is fixed.

**Request bodies** are JSON with `Content-Type: application/json`, except
`/api/icons/upload` which is `multipart/form-data`.

**Responses** are JSON unless the endpoint returns an image, CSS or HTML.

**Three different error shapes** exist, so parse defensively:

```jsonc
{"error": "action 'x' not found"}                    // service errors (most 4xx/5xx)
{"detail": [{"type": "int_parsing", "loc": [...]}]}  // FastAPI path/query validation (422)
{"detail": "Not Found"}                              // unmatched route (404)
```

**Which deck a request applies to.** PyDeck can drive several decks. Unless your
token is pinned to one, a request resolves to the currently selected deck. Override
per request:

```bash
curl -H "X-API-Key: $TOKEN" -H 'X-Device-Id: BL06K1B02897' $PYDECK/api/buttons
curl -H "X-API-Key: $TOKEN" "$PYDECK/api/buttons?device=BL06K1B02897"
```

An unknown device id is **silently ignored** and falls back to the selection —
it is not an error.

**No pagination, no sorting.** Every list endpoint returns everything. Unknown
query parameters are ignored.

**No trailing slashes.** `/api/buttons/` answers `307` to `/api/buttons`. Two
endpoints are exceptions and *require* the trailing slash:
`/api/profiles/changename/` and `/api/folders/changename/`.

**HEAD is not supported** — it answers `405`. Use GET.

---

## 4. Decks and devices

### `GET /api/status` — scope `decks:read`

Liveness plus current brightness.

```bash
curl -s -H "X-API-Key: $TOKEN" $PYDECK/api/status
```
```json
{"status": "ok", "brightness": 100}
```

### `GET /api/devices` — scope `decks:read`

Every deck PyDeck knows about, physical and virtual.

```json
{
  "devices": [
    {
      "num_slots": 6, "cols": 3, "rows": 2, "icon_size": 80,
      "name": "Stream Deck Mini", "device_id": "BL06K1B02897",
      "firmware_version": "3.00.000", "serial_number": "BL06K1B02897",
      "selected": true
    }
  ]
}
```

A virtual deck carries `"virtual": true` and `"virtual_type": "kiosk" | "mobile"`
instead of firmware fields.

### `POST /api/devices/select` — scope `decks:write`

Point the editor (and any request without an explicit device) at a deck.

```bash
curl -s -X POST -H "X-API-Key: $TOKEN" -H 'Content-Type: application/json' \
     -d '{"device_id": "BL06K1B02897"}' $PYDECK/api/devices/select
```
```json
{"ok": true, "device": {...}, "brightness": 100, "orientation": 0,
 "num_buttons": 6, "cols": 3, "rows": 2}
```

`404 {"error": "Unknown device_id"}` for a deck that is not connected.

### `GET|POST /api/devices/orientation` — scopes `decks:read` / `decks:write`

```bash
curl -s -X POST -H "X-API-Key: $TOKEN" -H 'Content-Type: application/json' \
     -d '{"orientation": 180}' $PYDECK/api/devices/orientation
```
```json
{"ok": true, "orientation": 180}
```

Only `0`, `90`, `180`, `270` are accepted; anything else is `400`.

### `POST /api/brightness` — scope `decks:write`

```bash
curl -s -X POST -H "X-API-Key: $TOKEN" -H 'Content-Type: application/json' \
     -d '{"value": 60}' $PYDECK/api/brightness
```
```json
{"brightness": 60}
```

**Careful:** a malformed body does not error — it applies the default of 70. See
Limitations.

### `GET /api/virtual-decks` — scope `decks:read`

```json
{"decks": [], "presets": ["mini", "standard", "xl"]}
```

### `POST /api/virtual-decks` — scope `decks:write`

Create a deck with no hardware behind it — a phone or kiosk page drives it.

```bash
curl -s -X POST -H "X-API-Key: $TOKEN" -H 'Content-Type: application/json' \
     -d '{"name": "Studio", "type": "kiosk", "preset": "standard"}' \
     $PYDECK/api/virtual-decks
```
```json
{"ok": true, "deck": {"id": "vdeck-5f0fa7df1ac6", "name": "Studio",
 "type": "kiosk", "rows": 3, "cols": 5, "num_buttons": 15, "icon_size": 72}}
```

`type` is `kiosk` or `mobile`. Layout comes from `preset`
(`mini`/`standard`/`xl`), or pass `"source_device": "<device_id>"` to mirror a
real deck's geometry instead.

### `DELETE /api/virtual-decks/{deck_id}` — scope `decks:write`

```json
{"ok": true}
```

---

## 5. Buttons

### `GET /api/buttons` — scope `buttons:read`

Every button in the active profile and folder of the current deck.

```json
{
  "buttons": [
    {
      "id": 0,
      "type": "plugin",
      "plugin": "no.pydeck.discord",
      "function": "toggle_mute",
      "config": {},
      "display": {
        "color": "#5865f2",
        "text": "",
        "image": "plugins/plugin/no.pydeck.discord/assets/icons/mic.png",
        "text_labels": null, "show_title": null, "text_position": null,
        "text_size": null, "text_bold": null, "text_italic": null,
        "text_underline": null, "text_color": null
      },
      "display_states": {"default": {"image": "..."}}
    }
  ]
}
```

`id` is the slot number, zero-based, left to right and top to bottom.

### `POST /api/buttons/{slot}` — scope `buttons:write`

Create or update. **This is a merge, not a replace** — verified: keys you omit
keep their previous values.

```bash
# Full definition
curl -s -X POST -H "X-API-Key: $TOKEN" -H 'Content-Type: application/json' -d '{
  "type": "plugin",
  "plugin": "no.pydeck.clock",
  "function": "clock",
  "config": {"format": "24h"},
  "display": {"color": "#111111", "text": "Time"}
}' $PYDECK/api/buttons/4

# Recolour only — text and config survive
curl -s -X POST -H "X-API-Key: $TOKEN" -H 'Content-Type: application/json' \
     -d '{"type":"plugin","plugin":"no.pydeck.clock","function":"clock","display":{"color":"#222222"}}' \
     $PYDECK/api/buttons/4
```

Omitting `display` entirely preserves it. To *clear* a field, send it explicitly:
`{"display": {"text": ""}}`.

Button types: `plugin`, `plugin_loop` (same dispatch, plus a required positive
`interval_ms`), and `action` (runs a named sequence).

Returns the saved button. `400 {"error": "invalid JSON"}` on an unparseable body.

### `DELETE /api/buttons/{slot}` — scope `buttons:write`

Returns the removed button; `404 {"error": "not found"}` if the slot was empty.

### `POST /api/buttons/{slot}/press` — scope `buttons:write`

Runs the button exactly as a physical press would.

```bash
curl -s -X POST -H "X-API-Key: $TOKEN" -H 'Content-Type: application/json' \
     -d '{}' $PYDECK/api/buttons/4/press
```
```json
{"id": 4, "type": "plugin", "event": "press",
 "plugin": "no.pydeck.clock", "function": "clock",
 "result": {"pdk": true}}
```

Optional body `{"device_id": "..."}` targets another deck. `result` is whatever
the plugin returned — a classic plugin may include `display_update`,
`related_updates`, `profile_change`, `folder_change` or `cross_device_updates`.

`404 {"error": "Button 4 not configured"}` for an empty slot. A plugin that
raises gives `500` with the exception message, and an `error` event on the
WebSocket.

---

## 6. Rendered previews

These render the face **as the web grid draws it**. The hardware is drawn
separately by the listener process.

### `GET /api/buttons/{slot}/image` — scope `buttons:read`

PNG at the deck's native icon size (80×80 on a Mini), `Cache-Control: no-store`.

```bash
curl -s -H "X-API-Key: $TOKEN" $PYDECK/api/buttons/0/image -o key0.png
```

### `GET /api/buttons/{slot}/gif` — scope `buttons:read`

The raw animated GIF when the slot uses one. `404` when the button has no image,
the file is not multi-frame, or a PDK template owns the face.

### `GET /api/buttons/{slot}/image/hires?scale=4` — scope `buttons:read`

Same face at `scale`× (clamped 1–10), with a `Content-Disposition` filename.
**Requires the `export_rightclick` developer option**, otherwise
`403 {"error": "Export right-click is not enabled"}`.

### `GET /api/deck/grid` — scope `buttons:read`

Every key in one payload, from a single file read — much cheaper than N image
requests when polling.

```json
{"t": 1787949609905,
 "slots": [{"id": 0, "png_b64": "iVBORw0KGgo..."},
           {"id": 1, "png_b64": "...", "gif_b64": "..."}]}
```

`t` is the server's render timestamp in milliseconds. `gif_b64` appears only for
animated slots.

---

## 7. Profiles

A profile is a whole set of buttons. Switching one replaces the entire deck.

### `GET /api/profiles/getall` — scope `profiles:read`

```json
{"profiles": ["default", "main"], "active": "default"}
```

### `POST /api/profiles/change/{name}` — scope `profiles:write`

```bash
curl -s -X POST -H "X-API-Key: $TOKEN" $PYDECK/api/profiles/change/main
```
```json
{"active_profile": "main"}
```

Also drops every cached face and pending display update, and broadcasts
`profile_change` on the WebSocket. `404` for an unknown profile.

### `POST /api/profiles/changename/` — scope `profiles:write`

Note the required trailing slash.

```bash
curl -s -X POST -H "X-API-Key: $TOKEN" -H 'Content-Type: application/json' \
     -d '{"old_name": "main", "new_name": "streaming"}' \
     $PYDECK/api/profiles/changename/
```
```json
{"ok": true, "name": "streaming"}
```

If the renamed profile was active, the selection follows it.

### `DELETE /api/profiles/delete/{name}` — scope `profiles:write`

```json
{"ok": true}
```

**There is no create-profile endpoint.** See Limitations.

---

## 8. Folders

A folder is a nested page of buttons the deck walks into.

### `GET /api/folders/getall` — scope `folders:read`

```json
{"folders": [], "active_folder": "root", "folder_stack": []}
```

`folder_stack` is the path taken to get here, so a Back button knows where to go.

### `POST /api/folders/{folder_id}` — scope `folders:write`

Create or update a folder, sized to the current deck.

```bash
curl -s -X POST -H "X-API-Key: $TOKEN" -H 'Content-Type: application/json' -d '{
  "name": "Lighting",
  "auto_return_enabled": true,
  "auto_return_seconds": 10,
  "auto_return_show_text": true
}' $PYDECK/api/folders/lighting
```
```json
{"ok": true, "folder": {...}}
```

The three `auto_return_*` keys are applied **only when present**, so saving a
name never silently rewrites settings your request did not mention.

### `POST /api/folders/change/{folder_id}` — scope `folders:write`

Walk into a folder. `root` clears the stack; anything else pushes the folder you
came from. Pass `{"stack": [...]}` to jump to an arbitrary breadcrumb.

```bash
curl -s -X POST -H "X-API-Key: $TOKEN" -H 'Content-Type: application/json' \
     -d '{}' $PYDECK/api/folders/change/lighting
```
```json
{"active_folder": "lighting"}
```

### `POST /api/folders/changename/` — scope `folders:write`

Trailing slash required. Body `{"old_name", "new_name"}`.

### `DELETE /api/folders/{folder_id}` — scope `folders:write`

```json
{"ok": true}
```

---

## 9. Actions

A named sequence of plugin calls and delays, as built in the Action Builder.

### `GET /api/actions` — scope `actions:read`

```json
{"actions": ["mute and dim"]}
```

### `GET /api/actions/{name}` — scope `actions:read`

```json
{"name": "mute and dim",
 "steps": [{"plugin": "no.pydeck.discord", "function": "toggle_mute"},
           {"delay": 250},
           {"plugin": "no.pydeck.clock", "function": "clock"}]}
```

A step is either `{"plugin", "function"}` or `{"delay": <milliseconds>}`.

### `POST /api/actions` — scope `actions:write`

Returns **201**.

```bash
curl -s -X POST -H "X-API-Key: $TOKEN" -H 'Content-Type: application/json' -d '{
  "name": "mute and dim",
  "steps": [{"plugin": "no.pydeck.discord", "function": "toggle_mute"},
            {"delay": 250}],
  "overwrite": false
}' $PYDECK/api/actions
```
```json
{"name": "mute and dim", "steps": [...]}
```

Without `"overwrite": true`, an existing name is `400`.

### `PUT /api/actions/{name}` — scope `actions:write`

Replaces the step list. Body `{"steps": [...]}`. `404` if the action does not exist.

### `DELETE /api/actions/{name}` — scope `actions:write`

```json
{"deleted": "mute and dim"}
```

To run an action, bind it to a button (`"type": "action"`) and press that button.

---

## 10. Plugins

### `GET /api/plugins` — scope `plugins:read`

Every installed plugin and its functions.

```json
{
  "plugins": [
    {
      "name": "no.pydeck.clock",
      "display_name": "Clock",
      "version": "3.0.0",
      "description": "...",
      "pdk": true,
      "functions": {
        "clock": {
          "label": "My Clock",
          "description": "Display a custom analog or digital clock.",
          "default_display": {"color": "#000000", "text": "",
                              "text_position": "bottom", "scroll_enabled": false},
          "title_readonly": true,
          "has_ui": true,
          "autosave": "on",
          "display_states": {},
          "sidebar_icon": null,
          "actionable": false,
          "gradient": false,
          "pdk": true,
          "pdk_buttonlabel_count": 1,
          "pdk_buttonlabel_defaults": []
        }
      }
    }
  ]
}
```

`name` is the plugin id and the install directory name. `pdk` says which
generation it is. `actionable` says whether the function may be an Action step.

### `GET /api/plugins/{name}/functions/{func}/form` — scope `plugins:read`

The property form for one function, as HTML (`text/html`) generated from the
manifest's `ui` array. This is what the button editor injects.

### `GET /api/plugins/{name}/settings/panel` — scope `plugins:read`

The plugin's own `settings.html`, or `404` if it ships none.

### `GET /api/plugins/{name}/img/{filename}` — scope `plugins:read`

A bundled image. Basename only — subdirectories are not accepted, but both
`img/` and `assets/icons/` are searched.

### `GET /api/plugins/{name}/storage/{filename}` — scope `plugins:read`

A file the plugin wrote at runtime (downloaded album art, a generated icon).

### `GET /api/plugins/styles.css` — scope `plugins:read`

Every installed plugin's `style.css` concatenated.

### `GET /api/plugins/{name}/api/{endpoint}` — scope `plugin_api:read`

Calls the plugin's own `api_<endpoint>(config)` function with its stored
credentials merged in, plus any query parameters. Only plugins that define such
a function expose anything here — most do not.

```bash
# A plugin that defines `def api_devices(config)` in plugin.py:
curl -s -H "X-API-Key: $TOKEN" \
     "$PYDECK/api/plugins/no.pydeck.spotify/api/devices?limit=5"
```

The response is whatever the plugin returns, as JSON. If the plugin or the
function does not exist you get:

```json
{"error": "no.pydeck.spotify.api_devices not found"}
```

with `404`; a function that raises gives `500` with its message.

**This executes plugin code**, which is why it has its own scope rather than
sitting under `plugins:read`.

---

## 11. Credentials

### `GET /api/credentials` — scope `credentials:read`

```json
{
  "credentials": {
    "no.pydeck.discord": {
      "display_name": "Discord",
      "credentials": [
        {"id": "client_id", "label": "Client ID", "type": "text"},
        {"id": "client_secret", "label": "Client Secret", "type": "password"}
      ],
      "values": {"client_id": "14900412...", "client_secret": "••••••••"},
      "oauth": true,
      "authorized": true
    }
  }
}
```

`credentials` is the schema the plugin declares; `values` holds what is stored.
Password fields come back as the mask `••••••••` when a value exists.

### `GET /api/credentials?secrets=1` — scope `credentials:read`

Returns real password values, with `Cache-Control: no-store`. **This is the
endpoint that hands out plugin secrets in clear text** — grant `credentials:read`
accordingly.

### `POST /api/credentials/{plugin}` — scope `credentials:write`

```bash
curl -s -X POST -H "X-API-Key: $TOKEN" -H 'Content-Type: application/json' \
     -d '{"client_id": "abc", "client_secret": "shhh"}' \
     $PYDECK/api/credentials/no.pydeck.discord
```
```json
{"ok": true}
```

A merge, not a replace. A value equal to the mask `••••••••` is treated as
"unchanged", so a form round-trip cannot overwrite a secret with bullets.
Unknown plugin names are accepted and simply create an entry.

---

## 12. Icons and gallery

### `GET /api/icons` — scope `icons:read`

Every image the button editor can pick, from three sources.

```json
{"icons": [
  {"plugin": "no.pydeck.spotify", "name": "_now_playing",
   "filename": "_now_playing.jpg",
   "url": "/api/plugins/no.pydeck.spotify/storage/_now_playing.jpg",
   "rel": "plugins/storage/no.pydeck.spotify/_now_playing.jpg"}
]}
```

`rel` is the value to put in a button's `display.image`. `plugin` is
`"My Uploads"` for user uploads.

### `GET /api/gallery/{filename}` — scope `icons:read`

Serves a user-uploaded file.

### `POST /api/icons/upload` — scope `icons:write`

`multipart/form-data` with a `file` part. Returns **201**.

```bash
curl -s -X POST -H "X-API-Key: $TOKEN" \
     -F 'file=@logo.png' $PYDECK/api/icons/upload
```
```json
{"icon": {"plugin": "My Uploads", "name": "logo", "filename": "logo.png",
          "url": "/api/gallery/logo.png",
          "rel": "/home/you/.config/pydeck/gallery/logo.png"}}
```

Allowed: `.png .jpg .jpeg .gif .bmp .webp .svg`. Limit 10 MB. A name collision
gets a `_1`, `_2` suffix rather than overwriting.

Errors: `400` no file or empty filename, `415` unsupported type, `413` too large.

**There is no delete endpoint for uploads.** See Limitations.

---

## 13. Themes

### `GET /api/themes` — scope `themes:read`

```json
{
  "themes": [{"id": "default/dark", "label": "PyDeck (Default)",
              "description": "...", "scheme": "dark", "group_id": "default"}],
  "theme_groups": [{"id": "default", "label": "PyDeck",
                    "variants": [{"select_id": "default/dark", "scheme": "dark",
                                  "label": "Default",
                                  "colors": {"bg0": "#111111", "accent": "..."}}]}]
}
```

### `GET /api/themes/{family}/{slot}.css` — scope `themes:read`

The stylesheet itself, `text/css`.

### `GET|POST /api/settings/theme` — scopes `themes:read` / `themes:write`

```bash
curl -s -X POST -H "X-API-Key: $TOKEN" -H 'Content-Type: application/json' \
     -d '{"theme": "default/light"}' $PYDECK/api/settings/theme
```
```json
{"ok": true, "theme": "default/light"}
```

`400 {"error": "Unknown theme: '...'"}` for a theme that is not installed.

---

## 14. Settings

### `GET /api/settings/categories` — scope `settings:read`

The settings navigation, built-ins plus any category a plugin declares.

```json
{"categories": [
  {"id": "marketplace", "label": "Marketplace", "builtin": true, "plugins": []},
  {"id": "device", "label": "Device", "builtin": true, "plugins": []},
  {"id": "integrations", "label": "Integrations", "builtin": false,
   "plugins": [{"name": "my_plugin", "order": 0}]}
]}
```

### `GET /api/settings/text-style` — scope `settings:read`

The system-wide text defaults — the bottom layer of the three-layer merge
(system < per-button `display` < plugin manifest `default_display`).

```json
{"show_title": true, "text_position": "bottom", "text_size": 0,
 "text_bold": false, "text_italic": false, "text_underline": false,
 "text_color": ""}
```

### `GET|POST /api/settings/keybinds` — scopes `settings:read` / `settings:write`

```json
{"keybinds": {"toggle_settings": "alt+m", "profile_next": "alt+arrowdown", "...": "..."},
 "defaults": {"toggle_settings": "alt+m", "...": "..."}}
```

POST the whole `keybinds` object (not wrapped):

```bash
curl -s -X POST -H "X-API-Key: $TOKEN" -H 'Content-Type: application/json' \
     -d '{"toggle_settings": "alt+s"}' $PYDECK/api/settings/keybinds
```
```json
{"ok": true, "keybinds": {...}}
```

### `GET|POST /api/settings/developer` — scopes `settings:read` / `settings:write`

```json
{"export_rightclick": false, "emulated_clock": false,
 "emulated_clock_time": "", "emulated_clock_resolved": ""}
```

Toggle a flag, or set a value:

```bash
curl -s -X POST -H "X-API-Key: $TOKEN" -H 'Content-Type: application/json' \
     -d '{"key": "export_rightclick", "enabled": true}' $PYDECK/api/settings/developer

curl -s -X POST -H "X-API-Key: $TOKEN" -H 'Content-Type: application/json' \
     -d '{"key": "emulated_clock_time", "value": "19:43:43"}' $PYDECK/api/settings/developer
```

`enabled` toggles a boolean; `value` sets a value. `400 {"error": "missing key"}`
without `key`.

### `GET /api/welcome` — scope `settings:read`

```json
{"seen": true, "devices": 1, "physical_devices": 1, "device_name": "Stream Deck Mini"}
```

### `POST /api/welcome/seen` — scope `settings:write`

Marks the first-run screen dismissed. **One-way** — there is no API to set it
back to `false`.

### `GET /api/licenses` and `GET /api/licenses/file/{filename}` — scope `settings:read`

The bundled third-party licence index, and one licence file as `text/plain`.

---

## 15. Updates

### `GET /api/settings/updater` — scope `updates:read`

```json
{"mode": "none", "branch": "dev", "interval_minutes": 30,
 "last_check": "2026-04-12T17:06:29.135233+00:00",
 "current_version": "1.1.0", "is_pinned": false,
 "available_branches": [],
 "valid_intervals": [0, 15, 30, 60, 120, 360, 720, 1440],
 "last_auto_update_error": null}
```

### `POST /api/settings/updater` — scope `updates:write`

```bash
curl -s -X POST -H "X-API-Key: $TOKEN" -H 'Content-Type: application/json' \
     -d '{"mode": "auto", "branch": "dev", "interval_minutes": 60}' \
     $PYDECK/api/settings/updater
```

`mode` is required (`400` without it).

### `POST /api/settings/updater/check` — scope `updates:write`

```json
{"update_available": false, "current_version": "1.1.0", "latest_version": "1.1.0"}
```

While a version is pinned this returns `update_available: false` with an
explanatory `error` field rather than failing.

### `POST /api/settings/updater/update` — scope `updates:write`

Applies an available update, then **restarts PyDeck** about 1.5 s later — long
enough for this response to reach you, not long enough to make another request.
`409` while a version is pinned.

### `GET|POST /api/settings/version-selector` — scopes `updates:read` / `updates:write`

```json
{"mode": "none", "pinned_version": null, "current_version": "1.1.0"}
```

### `GET /api/settings/version-selector/releases` — scope `updates:read`

```json
{"releases": [{"tag": "v1.1.0", "name": "...", "published_at": "..."}]}
```

### `POST /api/settings/version-selector/apply` — scope `updates:write`

Checks out a release and **restarts**. Body `{"version": "1.0.9"}`; the `v`
prefix is optional (it retries with one automatically).

---

## 16. Marketplace

### `GET /api/marketplace/catalog` — scope `marketplace:read`

Every configured catalog merged into one payload. Fetched in parallel; a slow
repo does not stall the rest.

Query parameters: `q` (free text), `category`, `refresh=1` (bypass the cache).

```bash
curl -s -H "X-API-Key: $TOKEN" "$PYDECK/api/marketplace/catalog?q=clock"
```

Top-level keys: `plugins`, `themes`, `installed_themes`, `generated_at`,
`schema_version`, `configured`, `manifest_urls`, `catalog_labels`,
`catalog_root_urls`, `official_catalogs`, `pydeck_version`, and `repo_errors`
when a catalog failed.

A plugin row:

```json
{"name": "Clock", "slug": "clock", "category": "utilities",
 "summary": "Display a live digital clock on a button",
 "author": "PyDeck Team", "latest": "1.1.0",
 "icon_path": "plugins/clock/icon.svg",
 "compatible_pydeck_versions": ["1.0"],
 "versions": [{"version": "1.1.0", "path": "plugins/clock/1.1.0",
               "min_pydeck_version": null, "max_pydeck_version": null}],
 "manifest_url": "https://plugins.pydeck.no",
 "installed": true, "installed_dir": "no.pydeck.clock", "installed_version": "3.0.0"}
```

`installed`, `installed_dir` and `installed_version` are resolved server-side,
because the browser cannot know that `clock` and `no.pydeck.clock` are the same
plugin.

A theme row carries `colors` — a swatch resolved from an installed copy, a
persistent cache, or the network, in that order.

`502` only when **every** catalog failed; a partial failure still returns rows
plus `repo_errors`.

### `GET /api/marketplace/repos` — scope `marketplace:read`

```json
{"manifest_urls": ["https://raw.githubusercontent.com/opvault/pydeck-plugins/canary/manifest.json"],
 "active_catalogs": [{"url": "...", "source": "config", "official": true}],
 "env_manifest_set": false}
```

`source` is `env`, `config` or `default`. `official` means PyDeck publishes it —
judged on the configured URL, never on anything the manifest claims about itself.

### `PUT /api/marketplace/repos` — scope `marketplace:write`

Replaces the configured list (env vars are untouched). Each entry is normalised
to a raw `manifest.json` URL first, so you can paste a GitHub repo, branch or
file page.

```bash
curl -s -X PUT -H "X-API-Key: $TOKEN" -H 'Content-Type: application/json' \
     -d '{"manifest_urls": ["https://github.com/opvault/pydeck-plugins/tree/stable"]}' \
     $PYDECK/api/marketplace/repos
```
```json
{"ok": true, "manifest_urls": ["https://raw.githubusercontent.com/opvault/pydeck-plugins/stable/manifest.json"]}
```

### `POST /api/marketplace/install` — scope `marketplace:write`

**Downloads and installs third-party code.**

```bash
curl -s -X POST -H "X-API-Key: $TOKEN" -H 'Content-Type: application/json' \
     -d '{"manifest_url": "https://plugins.pydeck.no", "slug": "clock", "version": "1.1.0"}' \
     $PYDECK/api/marketplace/install
```
```json
{"ok": true, "installed_path": "/home/you/.local/share/pydeck/plugin/clock",
 "slug": "clock", "version": "1.1.0", "postinstall_required": false}
```

Omit `version` for the latest. When the plugin ships a post-install script the
response instead carries `"postinstall_required": true` with a `request_id`,
`requires_sudo` and the script paths — **nothing has run yet**, and a
`postinstall_prompt` event goes out on the WebSocket.

### `GET /api/marketplace/postinstall/status/{request_id}` — scope `marketplace:read`
### `GET /api/marketplace/postinstall/script/{request_id}` — scope `marketplace:read`

The pending request's state, and the script text to review before approving.

### `POST /api/marketplace/postinstall/approve` — scope `marketplace:write`

```bash
curl -s -X POST -H "X-API-Key: $TOKEN" -H 'Content-Type: application/json' \
     -d '{"request_id": "...", "sudo_password": "optional"}' \
     $PYDECK/api/marketplace/postinstall/approve
```

Runs the script. Returns `status`, `exit_code`, `output`, `error`.

### `POST /api/marketplace/postinstall/decline` — scope `marketplace:write`

Refuses it; `deleted_plugin_on_decline` says whether the plugin was removed too.

### `POST /api/marketplace/uninstall` — scope `marketplace:write`

Body `{"slug": "clock"}`. Deletes the install directory and clears every cache
keyed on any of the plugin's aliases.

### `POST /api/marketplace/theme-install` / `theme-uninstall` — scope `marketplace:write`

Same shapes, for themes. Uninstall refuses bundled themes
(`400 {"error": "Cannot uninstall bundled themes"}`) and reports
`theme_reset: true` when the removed theme was the active one.

### `GET /api/marketplace/installed-doc?slug=...` — scope `marketplace:read`

The bundled markdown documentation for an installed plugin.

```json
{"ok": true, "slug": "clock", "documentation": "DOCS.md",
 "markdown": "# Clock\n...", "show_markdown_after_install": true}
```

### `POST /api/open-folder` — scope `marketplace:write`

Opens a directory in the desktop file manager **on the PyDeck machine**. Body
`{"path": "..."}`. Walks up to the nearest existing directory.

---

## 17. Network

### `GET /api/network` — scope `network:read`

```json
{"host": "0.0.0.0", "lan_ip": "192.168.10.106", "port": 8686}
```

`host` is the bind address; `lan_ip` is what a phone would use.

### `POST /api/network` — scope `network:write`

Sets the bind host and **restarts PyDeck** half a second later.

```bash
curl -s -X POST -H "X-API-Key: $TOKEN" -H 'Content-Type: application/json' \
     -d '{"host": "0.0.0.0"}' $PYDECK/api/network
```

### `GET /api/qrcode?url=...` — scope `network:read`

An SVG QR code for any URL. `400` with no `url`.

---

## 18. The WebSocket event stream

```
ws://<host>:8686/ws?api_key=pdk_...
```

Needs `events:read`. The stream is **read-only** — frames you send are ignored,
the socket just stays open.

```python
import asyncio, json, websockets

async def watch():
    async with websockets.connect('ws://127.0.0.1:8686/ws?api_key=pdk_...') as ws:
        async for raw in ws:
            e = json.loads(raw)
            if e['event'] == 'deck_event' and e.get('type') == 'press':
                print('pressed', e['button'], 'on', e.get('device_id'))

asyncio.run(watch())
```

Every message has an `event` field. Four top-level events exist:

| `event` | When |
|:---|:---|
| `deck_event` | Anything that happened on a deck — see the `type` table below |
| `devices_changed` | A deck was plugged in, unplugged, created or deleted. Carries `devices`. |
| `pairing_request` | A pairing code was generated. **Local sockets only.** |
| `pairing_complete` | A device finished pairing. **Local sockets only.** |

An API-token socket is always treated as remote, so it never receives the two
pairing events — the code is the whole secret and is not broadcast to scripts.

Inside `deck_event`, `type` is one of:

| `type` | Fields | Meaning |
|:---|:---|:---|
| `press` | `button`, `device_id`, `plugin`, `function`, `result` | A key was pressed, on hardware or through the API |
| `display_update` | `button`, `device_id`, optionally `display_update`, `plugin`, `function` | A face changed; refetch the image |
| `folder_change` | `device_id` | The deck walked into or out of a folder |
| `profile_change` | — | The active profile changed; everything is stale |
| `error` | `button`, `error`, `device_id` | A button's handler raised |
| `postinstall_prompt` | `request_id`, `slug`, `version`, `requires_sudo`, script paths | An install is waiting for approval |
| `postinstall_result` | `request_id`, `slug`, `status`, `exit_code`/`deleted_plugin_on_decline` | That approval finished |

`display_update` is emitted often — the poll loop runs every 200 ms per device,
and animated PDK faces and scrolling labels tick on their own timers. Debounce
before refetching images.

---

## 19. Limitations

Everything here was confirmed against a running server.

### Things the API cannot do at all

| Gap | Detail |
|:---|:---|
| **Create a profile** | You can switch, rename and delete profiles, but there is no create endpoint. `POST /api/profiles/<name>` is `404`. New profiles come from the GUI or by creating the directory on disk. |
| **Delete an uploaded icon** | `POST /api/icons/upload` has no counterpart. Uploads accumulate until you delete the file from `~/.config/pydeck/gallery/`. |
| **Un-dismiss the welcome screen** | `POST /api/welcome/seen` only ever sets it to `true`. |
| **Manage API tokens** | `/api/tokens/*` is unreachable with a token, by design — a credential that mints credentials is not a scoped credential. Use the GUI on the host. |
| **Drive OAuth** | `/api/{plugin}/authorize` and `/oauth/{plugin}/callback` are `403` for tokens. They are browser redirect flows; authorise plugins in the GUI. |
| **Fetch HTML pages** | `/`, `/settings`, `/mobile/...` are `403` for tokens. |
| **Run an action directly** | There is no "execute action" endpoint. Bind it to a button and press that. |
| **Send commands over the WebSocket** | The stream is one-way. Frames you send are ignored. |
| **Reorder or bulk-edit buttons** | One slot per request. Moving a button means writing both slots. |

### Protocol limits

| Limit | Detail |
|:---|:---|
| **No pagination or sorting** | Every list returns everything; `?limit=` and `?offset=` are ignored. |
| **No filtering** except the marketplace | Only `/api/marketplace/catalog` takes `q` and `category`. Note `category` filters plugins but **not** themes. |
| **HEAD is not supported** | `405` on every route. Use GET. |
| **No ETag or Cache-Control on JSON** | No conditional requests; images are explicitly `no-store`. |
| **No CORS** | No `Access-Control-*` headers, so browser JS on another origin cannot call the API. Server-side or same-origin only. |
| **No OpenAPI schema** | `/openapi.json`, `/docs` and `/redoc` are disabled. This document is the spec. |
| **HTTP only** | No TLS. On a LAN, a token travels in clear text — put a reverse proxy in front (and add its hostname to `PYDECK_ALLOWED_HOSTS`). |
| **Port is fixed at 8686** | Not configurable through the API. |
| **Inconsistent error shapes** | Service errors use `{"error": ...}`, FastAPI path/query validation uses `{"detail": [...]}`, unmatched routes use `{"detail": "Not Found"}`. |
| **No rate limiting** | 40 sequential requests completed in 151 ms with no throttling. Only the pairing keypad is rate limited. |
| **No idempotency keys, no optimistic concurrency** | Writes are last-write-wins. Two clients editing the same button will clobber each other silently. |

### Rough edges worth knowing

**A malformed JSON body is treated as an empty one.** For most endpoints that is
harmless — validation then reports the missing field. For `POST /api/brightness`
it is not, because the route defaults to 70:

```bash
curl -X POST -H "X-API-Key: $TOKEN" -H 'Content-Type: application/json' \
     -d 'not json' $PYDECK/api/brightness
# -> 200 {"brightness": 70}   ... and the deck actually dims
```

This predates the API-token work (the same line is in the original `start.py`).
Always send valid JSON.

**A non-numeric brightness is a 500, not a 400.**

```bash
curl -X POST ... -d '{"value": "abc"}' $PYDECK/api/brightness
# -> 500 Internal Server Error
```

**An unknown `X-Device-Id` is ignored silently** and the request falls back to
the selected deck, rather than erroring. Check `/api/devices` first if you care.

**`/api/marketplace/postinstall/status/<unknown>` returns 200**, not 404, with a
status object describing nothing. The `script` endpoint does 404 properly.

**Four endpoints restart the server**, ending in-flight requests:
`POST /api/network`, `POST /api/settings/updater/update`,
`POST /api/settings/version-selector/apply`, and any plugin install that pulls in
a new Python dependency.

### Deliberately not exercised by the tester

`api_tester.py` never sends `POST /api/network` (it would restart the server),
and never installs or uninstalls anything. Those paths are covered by their
validation-failure cases only.

---

## 20. Recipes

### Mirror the deck into your own dashboard

```python
import base64, requests
S = requests.Session(); S.headers['X-API-Key'] = 'pdk_...'
grid = S.get('http://127.0.0.1:8686/api/deck/grid').json()
for slot in grid['slots']:
    open(f"key{slot['id']}.png", 'wb').write(base64.b64decode(slot['png_b64']))
```

One request instead of one per key. Scope: `buttons:read`.

### React to physical key presses

```python
import asyncio, json, websockets, requests
S = requests.Session(); S.headers['X-API-Key'] = 'pdk_...'

async def main():
    url = 'ws://127.0.0.1:8686/ws?api_key=pdk_...'
    async with websockets.connect(url) as ws:
        async for raw in ws:
            e = json.loads(raw)
            if e.get('event') == 'deck_event' and e.get('type') == 'press':
                print('key', e['button'], 'plugin', e.get('plugin'))

asyncio.run(main())
```

Scopes: `events:read`.

### Build a whole page of buttons

```python
KEYS = [
    (0, 'no.pydeck.clock', 'clock', {'color': '#101010', 'text': 'Time'}),
    (1, 'no.pydeck.weather', 'weather', {'color': '#0b3d5c', 'text': 'Wx'}),
]
for slot, plugin, fn, display in KEYS:
    S.post(f'{PYDECK}/api/buttons/{slot}', json={
        'type': 'plugin', 'plugin': plugin, 'function': fn,
        'config': {}, 'display': display,
    })
```

Scopes: `buttons:write`.

### Switch profile on a schedule

```bash
curl -s -X POST -H "X-API-Key: $TOKEN" $PYDECK/api/profiles/change/streaming
```

Scopes: `profiles:write`. Everything cached is dropped and a `profile_change`
event goes out.

### Dim the deck at night

```bash
curl -s -X POST -H "X-API-Key: $TOKEN" -H 'Content-Type: application/json' \
     -d '{"value": 20}' $PYDECK/api/brightness
```

Scopes: `decks:write`. A read-only monitoring token cannot do this — which is
the point of scoping.

### Watch for available updates without allowing them

Grant `updates:read` only:

```bash
curl -s -H "X-API-Key: $TOKEN" $PYDECK/api/settings/updater \
  | python3 -c 'import json,sys; d=json.load(sys.stdin); print(d["current_version"], d["last_auto_update_error"])'
```

`POST /api/settings/updater/check` needs `updates:write`, because it writes the
last-check timestamp.

### A minimal safe token for a status dashboard

`decks:read`, `buttons:read`, `events:read`. That is enough to draw the grid, show
brightness and follow presses, and cannot change anything, read a secret, or
install code.
