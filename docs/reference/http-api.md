# HTTP and WebSocket API reference

!!! info "Core HTTP surface"
    These routes and payloads are how **PyDeck’s core** exposes plugins to the web UI and to integrations. Plugin **discovery**, forms, credentials, and action APIs all run through them, whatever your handlers do internally. This reference does not document PDK template tags — see [Templates and elements](../plugins/templates.md) and [Rendering](../plugins/rendering.md).

!!! tip "Looking for worked examples?"
    This page documents the **payload schemas**. For a runnable `curl` example of
    every endpoint, see the [API cookbook](api-cookbook.md); for creating and
    scoping a token, [API tokens](api-tokens.md).

## Unified button model in HTTP and WebSocket payloads

Plugin discovery and editor APIs use **one schema** for every installed plugin. JSON may therefore include **`default_display`**, **`display_states`**, and WebSocket events such as **`display_update`** — fields rooted in the persisted **`buttons.json`** display object. **PDK** draws the hardware button **face** from **templates** and **`ctx.state`**; those display fields still matter for the **web editor**, sidebar metadata, and per-state icons, but they are not how PDK composes the PNG face. See [`manifest.json` reference](../plugins/manifest.md) for the manifest side and [Web UI and assets](../plugins/assets.md) for the `buttons.json` display object.

## Reaching the API

All endpoints are served by `start.py` on port **8686**.

Two gates sit in front of every route. Both are enforced in middleware, before any handler runs.

### The `Host` header

A request is rejected with **421 `{"error": "Invalid host"}`** unless its `Host` header is
an **IP literal** or `localhost` / `localhost.localdomain`. This is what stops a page on
the open web from pointing its own domain at `127.0.0.1` and talking to PyDeck as a local
client. Behind a reverse proxy under a real hostname, add it to the
`PYDECK_ALLOWED_HOSTS` environment variable (comma-separated).

There is deliberately **no CORS middleware** — every page PyDeck serves is same-origin.

### Remote requests are denied by default

A request whose client address is not loopback is refused unless it matches one of two
allowlists. Adding a route does **not** make it reachable from the network.

| Class | Token | Routes |
|:---|:---|:---|
| **Public** | none | `GET /`, `GET /mobile/{deck_id}`, `GET /static/…`, `GET /api/themes/{family}/{slot}.css`, `GET /api/plugins/styles.css`, `POST /api/pair/start`, `POST /api/pair/verify` |
| **Paired** | required | `/ws`, `GET /api/status`, `GET /api/buttons`, `GET /api/deck/grid`, `GET /api/buttons/{n}/image`, `…/image/hires`, `…/gif`, `POST /api/buttons/{n}/press`, `GET /api/folders/getall`, `POST /api/folders/change/{id}`, `GET /api/plugins/{name}/img/{file}` |
| **Denied** | — | everything else → **403 `{"error": "Remote access denied"}`** |

A **paired** request presents its token as `Authorization: Bearer <token>` or `?token=…`,
and gets **403 `{"error": "Pairing required"}`** without a valid one. The **token decides
the device** — `X-Device-Id` and `?device=` are ignored for remote callers — so a client
paired with one virtual deck can never address another.

WebSockets skip HTTP middleware, so `/ws` repeats the check itself: an off-box socket
without a valid `?token=` is closed with code `1008`.

See [Virtual decks & phone control](../using/virtual-decks.md#what-a-remote-client-may-do).

### Selecting a device

Every read of config, profiles, folders, and buttons resolves against a **currently bound
device**. For a local request the middleware binds it from, in order:

1. the `X-Device-Id` request header,
2. the `?device=` query parameter,
3. the globally selected device (`POST /api/devices/select`).

---

## 1. REST API Reference

### Plugin Discovery

#### `GET /api/plugins`

Returns all discovered plugins with their functions.

**Response:**

```json
{
  "plugins": [
    {
      "name": "no.pydeck.spotify",
      "display_name": "Spotify",
      "version": "2.0.6",
      "description": "Control Spotify playback via the Web API",
      "pdk": true,
      "functions": {
        "play_pause": {
          "label": "Play / Pause",
          "description": "Toggle Spotify play/pause",
          "default_display": { "color": "#1DB954", "text": "" },
          "display_states": {},
          "sidebar_icon": "assets/icons/PlayPause.png",
          "title_readonly": false,
          "disableGallary": false,
          "disableGallery": false,
          "has_ui": true,
          "autosave": "on",
          "actionable": true,
          "gradient": false,
          "log_format": null,
          "pdk": true,
          "pdk_buttonlabel_count": 0,
          "pdk_buttonlabel_defaults": []
        }
      }
    }
  ]
}
```

| Response field | Description |
|:---|:---|
| `name` | Plugin id: the install directory name (RDNN, e.g. `no.pydeck.spotify`). |
| `display_name` | Human-readable name from the manifest `name` field. |
| `version` | Plugin version string. |
| `description` | Plugin description from the manifest. |
| `pdk` | Whether the plugin is PDK. **Detected from the installed sources**, never from a `pdk` key in its manifest — one there is ignored. Repeated on every function for convenience. |
| `functions.<fn>.label` | Button label shown in the sidebar. |
| `functions.<fn>.description` | Short description shown under the label. |
| `functions.<fn>.default_display` | The function's `default_display` object, verbatim from the manifest. |
| `functions.<fn>.sidebar_icon` | Icon for the function picker. Falls back to the legacy `action_tile_icon` / `action-tile-icon` manifest keys. `null` when the function declares none. |
| `functions.<fn>.display_states` | Object mapping state keys to partial display overrides, from the manifest. Empty `{}` when the function has no states. The editor uses this to show state selector dots. |
| `functions.<fn>.title_readonly` | When `true`, the button title cannot be edited by the user. |
| `functions.<fn>.disableGallary` / `disableGallery` | When `true`, the editor hides the icon picker. Both spellings are reported; the misspelling is the historical one. |
| `functions.<fn>.has_ui` | Whether the function has a configurable UI form. |
| `functions.<fn>.autosave` | The **string** `"off"` when any field in the function's `ui` array sets `"autosave": "off"`, otherwise `"on"`. Not a boolean. |
| `functions.<fn>.actionable` | When `true`, the function can be used as a step inside an Action sequence. |
| `functions.<fn>.gradient` | When `true`, the button's colour picker offers gradient tabs for this function. |
| `functions.<fn>.log_format` | Format string for the notification log entry, or `null`. |
| `functions.<fn>.pdk_buttonlabel_count` | Number of `<buttonlabel>` elements in the function's PDK template (max 3 are used). Drives how many Title rows the editor offers. Derived from the template, not the manifest. |
| `functions.<fn>.pdk_buttonlabel_defaults` | The body text of those elements, in document order — the per-row fallbacks. |

#### `GET /api/plugins/<name>/functions/<func_name>/form`

Returns the HTML form fragment for one plugin function's UI fields.

**Response:** Raw HTML (`text/html`) for the editor panel.

#### `GET /api/settings/categories`

Returns sidebar categories for the Settings page. Built-in categories are always present; plugins can add their own via the manifest `settings` object.

**Built-in category IDs**, in the order the server returns them:

| ID | Label | Covers |
|:---|:---|:---|
| `marketplace` | Marketplace | Plugin & theme catalog |
| `device` | Device | Brightness, orientation, virtual decks, network, paired devices |
| `appearance` | Appearance | Theme picker |
| `keybinds` | Keybinds | [Keyboard shortcuts](../using/keyboard-shortcuts.md) |
| `api` | Credentials | Plugin credentials & OAuth |
| `tokens` | Tokens | Pairing tokens for remote decks |
| `updates` | Updates | App updater & version selector |
| `licenses` | Licenses | Third-party licence texts |
| `developer` | Developer | [Developer options](developer-options.md) |

**Response:**

```json
{
  "categories": [
    { "id": "marketplace", "label": "Marketplace", "builtin": true,  "plugins": [] },
    { "id": "device",      "label": "Device",      "builtin": true,  "plugins": [] },
    { "id": "appearance",  "label": "Appearance",  "builtin": true,  "plugins": [] },
    { "id": "keybinds",    "label": "Keybinds",    "builtin": true,  "plugins": [] },
    { "id": "api",         "label": "Credentials", "builtin": true,  "plugins": [] },
    { "id": "tokens",      "label": "Tokens",      "builtin": true,  "plugins": [] },
    { "id": "updates",     "label": "Updates",     "builtin": true,  "plugins": [] },
    { "id": "licenses",    "label": "Licenses",    "builtin": true,  "plugins": [] },
    { "id": "developer",   "label": "Developer",   "builtin": true,  "plugins": [] },
    { "id": "integrations","label": "Integrations","builtin": false, "plugins": [{ "name": "my_plugin", "order": 0 }] }
  ]
}
```

Built-ins are always present; the web UI decides what to show (the Device pane, for
example, adapts to whether a hardware deck is connected). Plugin categories follow,
sorted by label, each listing the plugins that contribute a panel to it and the `order`
each declared.

#### `GET /api/plugins/<name>/settings/panel`

Returns **`~/.local/share/pydeck/plugin/<name>/settings.html`** if it exists (exact path depends on `XDG_DATA_HOME`).

**Response:** Raw HTML (`text/html`), or **404** if the file is missing.

#### `GET /api/plugins/<name>/img/<filename>`

Serves a static image from a plugin's `img/` directory.

#### `GET /api/plugins/<name>/storage/<filename>`

Serves a runtime-generated file from **`~/.local/share/pydeck/storage/<name>/<filename>`** (logical path in JSON: `plugins/storage/<name>/<filename>`). Use this endpoint when a plugin writes files at runtime (e.g. downloaded album art) instead of serving pre-packaged static assets.

**Response:** The file's raw bytes with `Cache-Control: no-store`.

#### `GET /api/plugins/styles.css`

Serves all plugin `style.css` files concatenated into one stylesheet.

#### `GET /api/plugins/<name>/api/<path:endpoint>`

Generic plugin data API. Any plugin can expose a data function by defining `api_<endpoint>(config)` as a top-level callable in **`src/shared.py`**. It is then reachable at this URL with the plugin's stored credentials merged into `config` automatically.

**Example — a plugin that exposes an `api_entities` function:**

```python
# src/shared.py
def api_entities(config: Dict[str, Any]) -> list:
    client = _get_client(config)
    return client.list_entities()
```

This function becomes available at `GET /api/plugins/<plugin_id>/api/entities`.

**Response:** Whatever the `api_<endpoint>` function returns, serialized as JSON.

This is the mechanism used by the [`api_select` field type](../plugins/ui-fields.md#api_select-dynamic-api-dropdown) to populate dynamic dropdowns. Query parameters sent to the endpoint are automatically merged into the `config` dict, enabling server-side filtering (e.g. scoping an entity list to a specific domain).

**Well-known endpoint — `api_record`**

When a function's `ui` contains a `hotkey_recorder` field, the editor calls `GET /api/plugins/<name>/api/record` when the user clicks the **Record** button. The endpoint must block until a key combo is pressed (or a timeout expires) and return:

```json
{ "success": true,  "hotkey": "ctrl+c" }
{ "success": false, "error":  "Timeout: no key combo was pressed." }
```

The `hotkey` string uses `+`-delimited lowercase key names identical to the format accepted by the **Keyboard** plugin's `press_key` function. See the [`hotkey_recorder` field type](../plugins/ui-fields.md#hotkey_recorder-keyboard-shortcut-recorder) for implementation details.

### Icons

#### `GET /api/icons`

Returns metadata for all discovered icons, combining three sources:

- **Static assets** — files under **`~/.local/share/pydeck/plugin/<name>/img/`** (scanned once at startup); `rel` values use the logical prefix `plugins/plugin/...`
- **Runtime-generated files** — files under **`~/.local/share/pydeck/storage/<name>/`** (scanned live on every request, so newly written files like album art appear without a server restart); `rel` uses `plugins/storage/...`
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

Returns all buttons in the active profile. Buttons that have user-level per-state image overrides include a `display_states` field.

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
    },
    {
      "id": 3,
      "type": "plugin",
      "plugin": "discord",
      "function": "toggle_mute",
      "config": {},
      "display": { "color": "#000000", "text": "", "image": "plugins/plugin/discord/img/mute_on.png" },
      "display_states": {
        "default": { "image": "/api/gallery/custom_unmuted.png" },
        "active":  { "image": "/api/gallery/custom_muted.png" }
      }
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

To save user-level per-state image overrides (for functions that define `display_states` in their manifest), include a `display_states` field:

```json
{
  "id": 3,
  "type": "plugin",
  "plugin": "discord",
  "function": "toggle_mute",
  "config": {},
  "display": { "color": "#000000", "text": "", "image": "plugins/plugin/discord/img/mute_on.png" },
  "display_states": {
    "default": { "image": "/api/gallery/custom_unmuted.png" },
    "active":  { "image": "/api/gallery/custom_muted.png" }
  }
}
```

When omitted or empty, only the manifest's `display_states` are used during state changes. See [User-level per-state image overrides](../plugins/assets.md#user-level-per-state-image-overrides).

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

The Actions API provides full CRUD access to named multi-step action sequences stored in `~/.config/pydeck/core/actions.json`. Each step is either a plugin call or a delay (see [§15](../plugins/assets.md#6-actions-multi-step-sequences) for the step schema).

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
      "slug": "no.pydeck.spotify",
      "name": "Spotify",
      "summary": "Control Spotify playback",
      "category": "media",
      "latest": "2.0.6",
      "icon_path": "plugins/no.pydeck.spotify/icon.svg",
      "versions": [ { "version": "2.0.6", "path": "…", "changelog_path": "…" } ],
      "manifest_url": "https://plugins.pydeck.no"
    }
  ],
  "themes": [ … ],
  "installed_themes": [ … ],
  "generated_at": "2026-08-28T11:45:26Z",
  "schema_version": 1,
  "configured": true,
  "manifest_urls": ["https://plugins.pydeck.no", "https://themes.pydeck.no"],
  "catalog_labels":    { "https://plugins.pydeck.no": "Stable" },
  "catalog_root_urls": { "https://plugins.pydeck.no": "https://raw.githubusercontent.com/OPvault/pydeck-plugins/stable/" },
  "official_catalogs": ["https://plugins.pydeck.no", "https://themes.pydeck.no"],
  "pydeck_version": "1.1.0"
}
```

| Field | Description |
|:---|:---|
| `plugins` / `themes` | Merged entries from every configured catalog, deduplicated by `(slug, manifest_url)` and annotated with install state. Each row carries the `manifest_url` it came from. |
| `installed_themes` | Themes present in the data directory, whether or not a catalog lists them. |
| `catalog_labels` | Channel label per catalog URL, as declared in that catalog's manifest. |
| `catalog_root_urls` | The `root_url` each catalog declared, if any — the base its relative entry paths resolve against. Absent for a catalog that declares none, in which case the manifest's own directory is used. |
| `official_catalogs` | The subset of `manifest_urls` PyDeck considers official. Decided from the **configured URL** (a `pydeck.no` host, or a `raw.githubusercontent.com` URL under `OPvault`), never from the manifest. |
| `pydeck_version` | The running version, used to mark entries `incompatible`. |
| `repo_errors` | Present only when at least one catalog failed; a list of `{manifest_url, error}`. |

An entry that has no version compatible with `pydeck_version` is returned with its full
version list plus `"incompatible": true`, so the UI can offer to show it anyway.

Catalogs are fetched in parallel with TTL + `If-None-Match` caching; pass `refresh=1` to
bypass the cache. Returns `"configured": false` when no catalogs are configured, and
**502** with `"error"` if every configured catalog fails.

#### `GET /api/marketplace/repos`

Returns the currently configured marketplace repository URLs.

**Response:**

```json
{
  "manifest_urls": ["https://github.com/me/my-catalog"],
  "active_catalogs": [
    { "url": "https://plugins.pydeck.no",           "source": "default", "official": true },
    { "url": "https://themes.pydeck.no",            "source": "default", "official": true },
    { "url": "https://github.com/me/my-catalog",    "source": "config",  "official": false }
  ],
  "env_manifest_set": false
}
```

| Field | Description |
|:---|:---|
| `manifest_urls` | Only the URLs **saved in config** — what `PUT` replaces. The built-in defaults are not in this list. |
| `active_catalogs` | Every catalog actually in play, in load order, each tagged with where it came from: `env`, `config`, or `default`. `official` is decided from the URL. |
| `env_manifest_set` | `true` when `PYDECK_MARKETPLACE_MANIFEST_URL` is set. Those URLs load **in addition to** the saved list and cannot be edited here. |

Only `source: "config"` rows can be edited or removed.

#### `PUT /api/marketplace/repos`

Replace the list of marketplace repository URLs.

Replaces the **saved** list; the built-in defaults and any `PYDECK_MARKETPLACE_MANIFEST_URL` entries are unaffected.

**Request body:**

```json
{ "manifest_urls": ["https://github.com/me/my-catalog/tree/canary"] }
```

Each entry is **normalised to a raw manifest URL** before it is stored, so the shapes
people actually paste all work:

| Input | Stored as |
|:---|:---|
| `github.com/owner/repo` | `https://raw.githubusercontent.com/owner/repo/main/manifest.json` |
| `github.com/owner/repo/tree/canary` | `…/owner/repo/canary/manifest.json` |
| `github.com/owner/repo/blob/stable/manifest.json` | `…/owner/repo/stable/manifest.json` |
| `raw.githubusercontent.com/owner/repo/branch` | `…/owner/repo/branch/manifest.json` |
| anything else | passed through unchanged |

Only a bare repo page falls back to `main`. Duplicates and non-strings are dropped.

**Response:**

```json
{ "ok": true, "manifest_urls": ["https://raw.githubusercontent.com/me/my-catalog/canary/manifest.json"] }
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

**Response — 200 (no post-install):**

```json
{
  "ok": true,
  "installed_path": "/home/user/.local/share/pydeck/plugin/spotify",
  "slug": "spotify",
  "version": "1.0.3",
  "postinstall_required": false
}
```

**Response — 200 (post-install required):**

When the plugin declares a `post_install_script`, the response includes post-install details and a `request_id` for the pending request. The UI should present the review prompt before calling the approve/decline endpoints.

```json
{
  "ok": true,
  "installed_path": "/home/user/.local/share/pydeck/plugin/spotify",
  "slug": "spotify",
  "version": "1.0.3",
  "postinstall_required": true,
  "request_id": "abc123",
  "requires_sudo": false,
  "script_rel_path": "scripts/setup.sh",
  "script_abs_path": "/home/user/.local/share/pydeck/plugin/spotify/scripts/setup.sh"
}
```

**Response — 400** if required fields are missing or the post-install script declaration is invalid.  
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

#### `GET /api/marketplace/postinstall/status/{request_id}`

Returns the current status of a pending or completed post-install request.

**Response — pending:**

```json
{
  "found": true,
  "request_id": "abc123",
  "slug": "spotify",
  "version": "1.0.3",
  "status": "pending",
  "requires_sudo": false,
  "script_rel_path": "scripts/setup.sh",
  "script_abs_path": "/home/user/.local/share/pydeck/plugin/spotify/scripts/setup.sh"
}
```

**Response — completed:**

```json
{
  "found": true,
  "request_id": "abc123",
  "slug": "spotify",
  "version": "1.0.3",
  "status": "succeeded",
  "exit_code": 0,
  "error": "",
  "script_abs_path": "/home/user/.local/share/pydeck/plugin/spotify/scripts/setup.sh",
  "deleted_plugin_on_decline": false
}
```

| `status` value | Description |
|:---|:---|
| `pending` | Waiting for user to approve or decline. |
| `succeeded` | Script ran and exited with code 0. |
| `failed` | Script ran but exited with a non-zero code. |
| `timeout` | Script exceeded the timeout (default 120s) and was killed. |
| `declined_and_deleted` | User declined; plugin directory was removed. |
| `declined_delete_failed` | User declined but the directory could not be removed. |
| `bad_password` | Incorrect sudo password was provided. |

Returns `{"found": false, "request_id": "..."}` if the request ID is unknown.

#### `GET /api/marketplace/postinstall/script/{request_id}`

Returns a preview of the post-install script contents so the user can review it before approving.

**Response — 200:**

```json
{
  "ok": true,
  "request_id": "abc123",
  "slug": "spotify",
  "version": "1.0.3",
  "script_abs_path": "/home/user/.local/share/pydeck/plugin/spotify/scripts/setup.sh",
  "script_rel_path": "scripts/setup.sh",
  "content": "#!/bin/bash\napt install -y libfoo...",
  "truncated": false
}
```

`truncated` is `true` when the script exceeds the preview size limit (default 128 KB), in which case `content` contains only the first portion.

**Response — 404** if the request ID is unknown.

#### `POST /api/marketplace/postinstall/decline`

Decline a pending post-install request. The plugin directory is deleted and the installation is cancelled.

**Request body:**

```json
{ "request_id": "abc123" }
```

**Response — 200:**

```json
{
  "ok": true,
  "request_id": "abc123",
  "slug": "spotify",
  "version": "1.0.3",
  "status": "declined_and_deleted",
  "deleted_plugin_on_decline": true,
  "error": "",
  "script_abs_path": "/home/user/.local/share/pydeck/plugin/spotify/scripts/setup.sh"
}
```

**Response — 400** if `request_id` is missing.  
**Response — 404** if the request ID is unknown.

#### `POST /api/marketplace/postinstall/approve`

Approve and execute a pending post-install script.

**Request body:**

```json
{
  "request_id": "abc123",
  "sudo_password": "optional — required when post_install_requires_sudo is true"
}
```

| Field | Required | Description |
|:---|:---|:---|
| `request_id` | Yes | The pending request ID returned by the install endpoint. |
| `sudo_password` | Conditional | Required when the manifest sets `post_install_requires_sudo: true`. |

**Response — 200:**

```json
{
  "ok": true,
  "request_id": "abc123",
  "slug": "spotify",
  "version": "1.0.3",
  "status": "succeeded",
  "exit_code": 0,
  "output": "setup complete\n",
  "error": "",
  "script_abs_path": "/home/user/.local/share/pydeck/plugin/spotify/scripts/setup.sh"
}
```

**Response — 400** if `request_id` is missing, `sudo_password` is not a string, or the password is required but empty.  
**Response — 404** if the request ID is unknown.

When the sudo password is incorrect, the response has status `200` with `"status": "bad_password"` so the UI can re-prompt.

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

#### `GET /api/marketplace/installed-doc`

Reads the bundled markdown documentation of an **already installed** plugin straight from disk — used for the after-install popup and for viewing docs without a catalog round trip.

**Query parameters:** `slug` (required).

**Response:**

```json
{
  "ok": true,
  "slug": "no.pydeck.spotify",
  "documentation": "DOCS.md",
  "markdown": "# Spotify\n…",
  "show_markdown_after_install": true
}
```

**400** for an invalid slug, **404** when the plugin is not installed.

#### `POST /api/marketplace/theme-install`

Install a theme version into `~/.local/share/pydeck/themes/<slug>/`.

**Request body:** `{ "manifest_url": "…", "slug": "nord", "version": "1.0.1" }` — `version` optional (defaults to `latest`).

**400** when `manifest_url` or `slug` is missing, or when the catalog URL cannot be resolved to a `raw.githubusercontent.com` repo (directly or after redirects) — theme files are downloaded from that repo, so the URL has to name one.

#### `POST /api/marketplace/theme-uninstall`

**Request body:** `{ "slug": "nord" }`. Removes the theme's directory.

---

### Pairing and tokens

See [Virtual decks & phone control](../using/virtual-decks.md) for the user-facing flow.

#### `POST /api/pair/start`

Generate a random four-button sequence for a virtual deck and broadcast it to the **local** browser sockets only. Broadcasting the code to every socket would let anyone who can open `/ws` request one and read it straight back.

**Request body:** `{ "deck_id": "vdeck-…", "source": "settings" }`

**Response:** `{ "ok": true }`, or `{ "ok": true, "existing": true }` when a remote caller asks while a session is already live — a remote caller may request a code, but must not be able to clobber one already on screen.

| Status | When |
|:---|:---|
| **400** | `deck_id` missing, or the deck is not virtual — only virtual decks are pairable. |
| **404** | Unknown `deck_id`. |
| **429** | `{"locked": true}` — pairing is locked out after repeated failures. A local request clears the lockout; a remote one cannot. |

#### `POST /api/pair/verify`

**Request body:** `{ "deck_id": "vdeck-…", "sequence": [1, 4, 2, 3] }`

**Response — 200:** `{ "ok": true, "token": "<64 hex chars>" }`

The sequence is compared in constant time. Every failure costs a **1 second** server-side delay, charged outside the lock so guesses cannot be pipelined.

| Status | Body | Meaning |
|:---|:---|:---|
| **400** | `No active pairing session` / `Pairing session expired` / `Deck ID mismatch` | The window is **60 s**. |
| **403** | `{"error": "Wrong sequence", "attempts_left": n}` | Wrong, with guesses remaining. |
| **403** | `{"regenerated": true, "attempts_left": 5}` | 5 wrong guesses — the code was thrown away and a **new one** is on the PyDeck screen. |
| **403** | `{"exhausted": true}` | 3 regenerations — the session is dropped and pairing is locked out for **5 minutes**. |

#### `GET /api/pair/tokens`

```json
{
  "tokens": [
    { "token": "a1b2c3d4…", "token_full": "<64 hex>", "deck_id": "vdeck-…",
      "label": "iPhone", "created_at": "2026-08-28T09:12:44Z" }
  ]
}
```

`label` is derived from the pairing browser's user agent. Tokens do not expire on their own.

#### `DELETE /api/pair/tokens/{token}`

Revoke one token. Takes effect on the device's next request and closes its WebSocket.

---

### Virtual decks

#### `GET /api/virtual-decks`

```json
{ "decks": [ … ], "presets": ["mini", "standard", "xl"] }
```

#### `POST /api/virtual-decks`

**Request body:**

| Field | Description |
|:---|:---|
| `name` | Display name. Defaults to `"Virtual Deck"`. |
| `type` | `"kiosk"` or `"mobile"`. Defaults to `"kiosk"`. |
| `preset` | `"mini"` (3 × 2), `"standard"` (5 × 3), or `"xl"` (8 × 4). |
| `source_device` | A connected device id to clone the grid of, instead of a preset. Wins over `preset`. |

**Response:** `{ "ok": true, "deck": { "id": "vdeck-…", … } }`. Emits `devices_changed`.

#### `DELETE /api/virtual-decks/{deck_id}`

Deletes the deck **and** its per-device directory — profiles, folders, and buttons. Not recoverable.

#### `GET /api/qrcode`

**Query parameters:** `url` (required). Returns an SVG QR code (`image/svg+xml`, `Cache-Control: no-store`) for that URL — used for the phone-pairing link on a mobile deck's card. **400** with no `url`.

---

### Network

#### `GET /api/network`

```json
{ "host": "127.0.0.1", "lan_ip": "192.168.1.20", "port": 8686 }
```

`host` is the bind address; `lan_ip` is this machine's address on the local network, discovered by opening a throwaway UDP socket (empty if that fails). The port is fixed at 8686.

#### `POST /api/network`

**Request body:** `{ "host": "0.0.0.0" }` — only `127.0.0.1` and `0.0.0.0` are accepted; anything else is coerced to `127.0.0.1`.

**Response:** `{ "ok": true, "host": "0.0.0.0" }`, and then **PyDeck restarts itself** half a second later to rebind. Expect the connection to drop.

---

### Welcome screen

#### `GET /api/welcome`

First-run state. The flag lives in `config.json` rather than the browser, so a fresh install introduces itself again even to a browser that has already seen it.

```json
{ "seen": false, "devices": 1, "physical_devices": 1, "device_name": "Stream Deck MK2" }
```

#### `POST /api/welcome/seen`

Marks the welcome screen dismissed. `{ "ok": true, "seen": true }`.

---

### App updates

Backing [Updating PyDeck](../using/updates.md).

#### `GET /api/settings/updater`

```json
{
  "mode": "github_release",
  "branch": "dev",
  "interval_minutes": 30,
  "last_check": "2026-08-28T09:00:00Z",
  "current_version": "1.1.0",
  "is_pinned": false,
  "available_branches": ["main", "dev"],
  "valid_intervals": [0, 15, 30, 60, 120, 360, 720, 1440],
  "last_auto_update_error": null
}
```

`current_version` comes from `release.json`, not from git. `last_auto_update_error` keeps a failed background update visible instead of only logging it.

#### `POST /api/settings/updater`

**Request body:** any of `mode` (`none` / `git_pull` / `github_release`), `branch`, `interval_minutes`.

#### `POST /api/settings/updater/check`

Checks for an update without applying one. In `git_pull` mode it reports how many commits behind the branch is rather than a version number. Reports "no update" with a note while a version is pinned.

#### `POST /api/settings/updater/update`

Applies the update in the configured mode and **replaces the running process** (`os.execv`), so the service manager is not involved. Returns **409** while a version is pinned. A `git pull` that conflicts is aborted (`git merge --abort`) and reported as an error rather than left half-applied.

#### `GET /api/settings/version-selector`

```json
{ "mode": "none", "pinned_version": null, "current_version": "1.1.0" }
```

#### `GET /api/settings/version-selector/releases`

`{ "releases": [ … ] }` — the GitHub releases available to pin to.

#### `POST /api/settings/version-selector`

Set the pin mode. Pinning sets the updater mode to `none` and stops background checks.

#### `POST /api/settings/version-selector/apply`

Check out the pinned release tag and restart.

---

### Licenses

#### `GET /api/licenses`

Third-party licences of PyDeck's own dependencies, read from `licenses/licenses.json`:

```json
{
  "licenses": [
    { "name": "FastAPI", "fileLink": "licenses/fastapi.license",
      "websiteLink": "https://github.com/fastapi/fastapi", "license": "MIT" }
  ]
}
```

#### `GET /api/licenses/file/{filename}`

The raw text of one licence file. The filename is sanitised; only files under the app's `licenses/` directory are served.

*(A **plugin's** own licences are declared in its manifest and surfaced by the marketplace — see [`licenses`](../plugins/manifest.md#5-licenses).)*

---

### Keybinds

#### `GET /api/settings/keybinds`

```json
{
  "keybinds": { "toggle_settings": "alt+m", "profile_next": "alt+arrowdown", … },
  "defaults": { "toggle_settings": "alt+m", … }
}
```

`keybinds` is the user's set merged over the built-in defaults, so it is always complete. See [Keyboard shortcuts](../using/keyboard-shortcuts.md) for the action list.

#### `POST /api/settings/keybinds`

**Request body:** a flat `{action_id: "combo"}` object. **Keys that are not known action ids are silently dropped**, so a partial update is safe.

**Response:** `{ "ok": true, "keybinds": { … } }` — the full merged set.

Combos are lowercase, `+`-separated, modifiers first in the order `ctrl`, `alt`, `shift`, then the key (`alt+shift+m`, `alt+arrowdown`). `ctrl` covers ⌘ on macOS.

---

### Developer options

Backing [Developer options](developer-options.md).

#### `GET /api/settings/developer`

```json
{
  "export_rightclick": false,
  "emulated_clock": false,
  "emulated_clock_time": "",
  "emulated_clock_resolved": ""
}
```

`emulated_clock_resolved` is what `emulated_clock_time` actually parsed to (`YYYY-MM-DDTHH:MM:SS`), or `""` when it is blank or unparseable.

#### `POST /api/settings/developer`

Sets **one** option per call:

```json
{ "key": "export_rightclick", "enabled": true }
{ "key": "emulated_clock_time", "value": "19:43:43" }
```

A body with `value` writes a text value; otherwise `enabled` is written as a boolean. **400** when `key` is missing. The response is the full payload above.

#### `GET /api/buttons/{slot}/image/hires`

A high-resolution PNG of one button's face, re-rendered at `scale`× the deck's native key size (**not** an upscale).

**Query parameters:** `scale` (1–10, clamped; default `4`).

**403** while the *Export right-click* developer option is off.

---

### Miscellaneous

#### `GET /api/settings/text-style`

Read-only. The system-wide text-style defaults that form layer 1 of the [three-layer merge](../plugins/assets.md#priority-chain). There is no `POST` — the settings pane that used to write these was removed, so they are effectively the built-ins plus anything an older install left in `config.json`.

#### `POST /api/open-folder`

Opens a directory in the host's file manager (`xdg-open` / `open` / `explorer`).

**Request body:** `{ "path": "/home/you/.local/share/pydeck/plugin/no.pydeck.spotify" }`

A file path resolves to its parent, and a path that does not exist walks up until it finds a directory that does. **404** when nothing resolves, **500** on an unsupported platform.

---

## 2. WebSocket Events

The server exposes a native WebSocket endpoint at `ws://<host>:<port>/ws`. Connect to the same host/port as the HTTP server — no Socket.IO client library is required.

```js
const ws = new WebSocket(`ws://${location.host}/ws`);
ws.addEventListener('message', (ev) => {
  const msg = JSON.parse(ev.data);
  // msg.event identifies the event type
});
```

The connection is **push-only** from the server side — the client does not send messages over this socket.

!!! warning "An off-box socket needs a pairing token"
    HTTP middleware does not run for WebSockets, so `/ws` repeats the remote check itself.
    A socket from another machine must pass `?token=<pairing token>`; without a valid one
    it is closed with code `1008`. The token also pins the socket to its own deck. See
    [Reaching the API](#remote-requests-are-denied-by-default).

### Message format

All messages are JSON objects with an `event` field that identifies the event type:

```json
{ "event": "<event_name>", ...payload }
```

### Event: `deck_event`

Emitted whenever something changes on the deck (button press, display update, folder change, etc.).

```json
{
  "event": "deck_event",
  "type": "press",
  "button": 3,
  "device_id": "abc123",
  "result": { ... }
}
```

| `type` value | Additional fields | Description |
|:---|:---|:---|
| `press` | `button`, `device_id`, `result?` | A button was pressed (physical or web). `result` contains the plugin return dict. |
| `error` | `button`, `device_id`, `error` | A button press failed. `error` is the error message string. |
| `display_update` | `button`, `device_id` | A button's display was updated (by poller or cross-device sync). GUI should refresh that button's image. |
| `folder_change` | `device_id` | The active folder changed. GUI should reload all button images. |
| `profile_change` | — | The active profile changed. GUI should reload the profile tabs and every button image. |
| `postinstall_prompt` | `request_id`, `slug`, `version`, `requires_sudo`, `script_rel_path`, `script_abs_path` | A newly installed plugin has a post-install script awaiting user review. |
| `postinstall_result` | `request_id`, `slug`, `version`, `status`, `exit_code?`, `error?`, `script_abs_path`, `deleted_plugin_on_decline?` | A post-install request was resolved (approved, declined, timed out, or failed). See [Post-install scripts](../plugins/manifest.md#6-post-install-scripts) for `status` values. |

Most events include a `device_id` field so the GUI can scope updates to the correct device. Cross-device sync emits `display_update` events for **all** affected devices simultaneously — a client viewing Device B will see its buttons update live when Device A is pressed.

### Event: `devices_changed`

Emitted when the device list changes — a deck plugged in or removed (the hotplug scan runs about every 5 seconds), or a virtual deck created or deleted.

```json
{ "event": "devices_changed", "devices": ["serial1", "vdeck-1a2b3c4d5e6f"] }
```

### Event: `pairing_request`

A pairing code was generated and is waiting to be entered on the remote device.

```json
{
  "event": "pairing_request",
  "sequence": [1, 4, 2, 3],
  "deck_id": "vdeck-1a2b3c4d5e6f",
  "deck_name": "Kitchen tablet",
  "source": "settings",
  "regenerated": false
}
```

`regenerated: true` means the previous code was burned after too many wrong guesses and this is its replacement.

### Event: `pairing_complete`

```json
{ "event": "pairing_complete", "deck_id": "vdeck-1a2b3c4d5e6f" }
```

!!! danger "Both pairing events are local-only"
    They are broadcast **only to sockets on the PyDeck machine itself**. The code is the
    whole secret — sending it to every connected socket would let anyone who can open
    `/ws` ask for a code and read it straight back.

---

## 3. Persisted shapes

The on-disk layout — which directories, which files, and what `config.json` holds — is documented in **[Config & file paths](paths.md)**. This section covers only the two JSON shapes the API hands back and forth.

### buttons.json

One entry per configured key, in the active profile of the currently bound device. Buttons are sorted by `id`, and the listener maps them to physical slots in that order.

```json
{
  "buttons": [
    {
      "id": 0,
      "type": "plugin",
      "plugin": "no.pydeck.spotify",
      "function": "play_pause",
      "config": { "show_time_left": true },
      "display": { "color": "#1DB954", "text": "", "image": null }
    },
    {
      "id": 3,
      "type": "plugin_loop",
      "plugin": "no.pydeck.home-assistant",
      "function": "toggle",
      "config": { "entity_id": "light.desk", "interval_ms": 5000 },
      "display": { "color": "#000000", "text": "Desk", "image": null },
      "display_states": {
        "default": { "image": "/api/gallery/custom_off.png" },
        "active":  { "image": "/api/gallery/custom_on.png" }
      }
    },
    {
      "id": 7,
      "type": "action",
      "action": "Start Streaming",
      "config": {},
      "display": { "color": "#a882ff", "text": "Go Live", "image": null }
    }
  ]
}
```

| Field | Description |
|:---|:---|
| `id` | The key's numeric slot in the profile. |
| `type` | `plugin`, `plugin_loop`, or `action`. See [Button types](../plugins/assets.md#5-button-types). |
| `plugin` / `function` | For the two plugin types. `plugin` may be a legacy short slug or the RDNN id — the core resolves either. |
| `action` | For `type: "action"` — the action's **name**, looked up in `actions.json`. |
| `config` | The function's saved UI field values. `plugin_loop` additionally requires a positive `interval_ms`. `press_mode: "hold"` here is what makes releases dispatch at all. |
| `display` | Appearance: `color`, `text`, `image`, plus the optional `gradient`, `text_labels`, `text_label_styles`, and the text-style fields. See [Text style in `default_display`](../plugins/assets.md#text-style-in-default_display). |
| `display_states` | Optional. **User-level** per-state image overrides, merged on top of the manifest's `display_states` (user wins). Buttons with no custom per-state images omit the field entirely. |

Paths written here may use the logical `plugins/plugin/…` and `plugins/storage/…` prefixes; the core maps them onto the data home at load time.

### actions.json

One file for the whole install — not per device or per profile. See [Action Builder](../using/actions.md#where-actions-are-stored) for the step schema.
