# Plugin Development — Examples & Tips

## 1. Real-World Plugin Examples

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

## 2. Tips and Best Practices

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

## 3. Text Style Priority Chain

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

The **System Default** is a global fallback that applies to every button that has no per-button override. It is configured in the PyDeck web UI under **Settings → Appearance** (scroll down past the theme picker to the text-defaults section).

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
