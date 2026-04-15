# Plugin Development — API Reference

## 1. REST API Reference

All endpoints are served by `start.py` on port **8686**.

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
      "version": "1.0.3",
      "description": "Control Spotify playback via the Web API",
      "functions": {
        "play_pause": {
          "label": "Play / Pause",
          "description": "Toggle Spotify play/pause",
          "default_display": { "color": "#1DB954", "text": "Play" },
          "display_states": {},
          "sidebar_icon": "plugins/plugin/no.pydeck.spotify/img/PlayPause.png",
          "title_readonly": false,
          "has_ui": true,
          "autosave": false,
          "actionable": true
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
| `functions.<fn>.label` | Button label shown in the sidebar. |
| `functions.<fn>.sidebar_icon` | Path to the icon shown in the function picker. |
| `functions.<fn>.display_states` | Object mapping state keys to partial display overrides, from the manifest. Empty `{}` when the function has no states. The web editor uses this to show state selector dots. |
| `functions.<fn>.title_readonly` | When `true`, the button title cannot be edited by the user. |
| `functions.<fn>.has_ui` | Whether the function has a configurable UI form. |
| `functions.<fn>.autosave` | When `true`, config changes are saved immediately without a submit button. |
| `functions.<fn>.actionable` | When `true`, the function can be used as a step inside an Action sequence. Derived from the `actionable` flag in the manifest's `functions` entry. |

#### `GET /api/plugins/<name>/functions/<func_name>/form`

Returns the HTML form fragment for one plugin function's UI fields.

**Response:** Raw HTML (`text/html`) for the editor panel.

#### `GET /api/settings/categories`

Returns sidebar categories for the Settings page. Built-in categories are always present; plugins can add their own via the manifest `settings` object.

**Built-in category IDs:**

| ID | Label |
|:---|:---|
| `marketplace` | Marketplace |
| `device` | Device (brightness, orientation — only shown when a hardware deck is connected) |
| `appearance` | Appearance (includes text-style defaults) |
| `api` | Credentials (plugin credentials & OAuth) |
| `updates` | Updates (app updater & version selector) |
| `licenses` | Licenses |

**Response:**

```json
{
  "categories": [
    { "id": "marketplace", "label": "Marketplace", "builtin": true,  "plugins": [] },
    { "id": "device",      "label": "Device",      "builtin": true,  "plugins": [] },
    { "id": "appearance",  "label": "Appearance",  "builtin": true,  "plugins": [] },
    { "id": "api",         "label": "Credentials",  "builtin": true,  "plugins": [] },
    { "id": "updates",     "label": "Updates",      "builtin": true,  "plugins": [] },
    { "id": "licenses",    "label": "Licenses",     "builtin": true,  "plugins": [] },
    { "id": "integrations","label": "Integrations","builtin": false, "plugins": [{ "name": "my_plugin", "order": 0 }] }
  ]
}
```

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

When omitted or empty, only the manifest's `display_states` are used during state changes. See [User-Level Per-State Image Overrides](#user-level-per-state-image-overrides).

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
| `postinstall_prompt` | `request_id`, `slug`, `version`, `requires_sudo`, `script_rel_path`, `script_abs_path` | A newly installed plugin has a post-install script awaiting user review. The UI should show the review/approve prompt. |
| `postinstall_result` | `request_id`, `slug`, `version`, `status`, `exit_code?`, `error?`, `script_abs_path`, `deleted_plugin_on_decline?` | A post-install request was resolved (approved, declined, timed out, or failed). See [Post-Install Scripts](#post-install-scripts) for `status` values. |

All events include a `device_id` field so the GUI can scope updates to the correct device. Cross-device sync emits `display_update` events for **all** affected devices simultaneously — a client viewing Device B will see its buttons update live when Device A is pressed.

### Event: `devices_changed`

Emitted when the list of connected hardware devices changes (device connected or disconnected).

```json
{ "event": "devices_changed", "devices": ["serial1", "serial2"] }
```

The `devices` array contains the serial identifiers of all currently connected hardware decks.

---

## 3. Config and File Paths

### Directory Layout

```text
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

```text
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

Buttons are sorted by `id`. The Stream Deck listener maps buttons to physical slots in sorted order.

The optional `display_states` field stores user-level per-state display overrides. When present, these are merged on top of the manifest's `display_states` during state changes (user values win). Buttons without custom per-state images omit this field entirely.

---
