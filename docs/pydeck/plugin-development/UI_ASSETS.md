# Plugin Development — UI & Assets

**Paths:** On disk, each plugin lives under **`~/.local/share/pydeck/plugin/<name>/`** and runtime files under **`~/.local/share/pydeck/storage/<name>/`** (or **`$XDG_DATA_HOME/pydeck/...`**). In `buttons.json` and `display` fields, **`plugins/plugin/...`** and **`plugins/storage/...`** remain the **logical** image paths the core understands.

## 1. Custom CSS — style.css

Each plugin can provide its own CSS by placing a `style.css` file in the plugin folder. The core automatically scans all plugins and serves their CSS combined at `/api/plugins/styles.css`.

### How It Works

1. Place `style.css` in your plugin folder: **`~/.local/share/pydeck/plugin/my_plugin/style.css`**
2. The route `GET /api/plugins/styles.css` scans every installed plugin directory for `style.css`
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

## 2. Client-Side Popup API — PyDeck.popup

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

## 3. Plugin Images — img/ and storage/

PyDeck distinguishes between two types of plugin files:

| Type | Location | Endpoint | Use for |
|:---|:---|:---|:---|
| **Static assets** | `~/.local/share/pydeck/plugin/<name>/img/` (logical: `plugins/plugin/<name>/img/`) | `GET /api/plugins/<name>/img/<filename>` | Icons, state images — shipped with the plugin |
| **Runtime-generated files** | `~/.local/share/pydeck/storage/<name>/` (logical: `plugins/storage/<name>/`) | `GET /api/plugins/<name>/storage/<filename>` | Files the plugin writes at runtime (e.g. downloaded album art) |

### Static images — img/

Place bundled image files in **`~/.local/share/pydeck/plugin/my_plugin/img/`**. They are served at:

```text
GET /api/plugins/<plugin_name>/img/<filename>
```

Supported formats: `.png`, `.jpg`, `.jpeg`, `.gif`, `.bmp`, `.webp`

### Runtime storage

If your plugin **writes files at runtime** (e.g. fetching an image from the internet), write them under **`~/.local/share/pydeck/storage/<plugin_name>/`** instead of inside the plugin folder. In `display_update["image"]` and manifests, use the **logical** path `plugins/storage/<plugin_name>/<filename>` — the core resolves it like any other image.

```python
from pathlib import Path

_DATA = Path.home() / ".local" / "share" / "pydeck"
_STORAGE_DIR = _DATA / "storage" / "my_plugin"

def _write_runtime_file(data: bytes, name: str) -> str:
    """Write data to the plugin storage folder and return the logical image path."""
    _STORAGE_DIR.mkdir(parents=True, exist_ok=True)
    (_STORAGE_DIR / name).write_bytes(data)
    return f"plugins/storage/my_plugin/{name}"
```

Use the returned logical path as `display_update["image"]` — the core fetches it via `GET /api/plugins/my_plugin/storage/<filename>`.

**Why separate?** The `img/` directory ships with the plugin (and is replaced on marketplace update). Files under **`~/.local/share/pydeck/storage/`** survive plugin updates because they live outside the plugin package folder.

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

These manifest-level images serve as defaults. Users can override them per-button via the web editor's state selector dots — see [User-Level Per-State Image Overrides](#user-level-per-state-image-overrides).

### Icon Gallery

All plugin images are automatically discovered and shown in the Icon Gallery (the image picker in the button editor). Users can browse and select any plugin's icons for any button.

The **sidebar** library tile uses only `sidebar_icon` (see functions table), not `default_display.image`.

If a function sets `disableGallary` or `disableGallery` in its manifest, the editor hides the entire **Button Icon** field for that function, including the label and browse button. This is useful for single-purpose buttons where the image is part of the function's own presentation and should not be user-editable.

---

## 4. options.json (Marketplace Metadata)

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

## 5. Button Types

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

When the function defines `display_states` in its manifest and the user has customised per-state images via the editor, the button also carries a `display_states` field:

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

| Field | Description |
|:---|:---|
| `display_states` | Optional. Per-state display overrides set by the user in the web editor. Keys match the state names from the manifest's `display_states`. When a state change occurs, these values are merged on top of the manifest defaults (user wins). See [User-Level Per-State Image Overrides](#user-level-per-state-image-overrides). |

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

## 6. Actions (Multi-Step Sequences)

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
