# Web UI, assets, and editor integration

!!! info "Shared platform surface"
    **`style.css`**, **`settings.html`**, the **`PyDeck.popup`** helpers, combined plugin CSS at **`/api/plugins/styles.css`**, and logical asset paths are the **web UI** side of a plugin — separate from how its button **face** is drawn. PDK composes the face from [templates](templates.md); everything on this page is about the editor, the browser UI, and the assets both sides share.

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

## 3. Plugin Images — bundled assets and storage

PyDeck distinguishes between two types of plugin files:

| Type | Location | Endpoint | Use for |
|:---|:---|:---|:---|
| **Static assets** | `~/.local/share/pydeck/plugin/<id>/assets/icons/` | `GET /api/plugins/<id>/img/<filename>` | Icons, state images — shipped with the plugin |
| **Runtime-generated files** | `~/.local/share/pydeck/storage/<id>/` (logical: `plugins/storage/<id>/`) | `GET /api/plugins/<id>/storage/<filename>` | Files the plugin writes at runtime (e.g. downloaded album art) |

### Static images — `assets/icons/`

Ship bundled images in your plugin's **`assets/icons/`** directory (the PDK layout). Reference them from the manifest by a path **relative to the version folder**, e.g. `assets/icons/PlayPause.png`.

They are served at:

```text
GET /api/plugins/<plugin_id>/img/<filename>
```

!!! note "The endpoint is `/img/`, the folder is `assets/icons/`"
    The serving route is historically named `/img/` and takes a **basename only** — the core resolves it against both `assets/icons/<filename>` (PDK plugins) and a legacy top-level `img/<filename>`. So keep your files in `assets/icons/`; the app finds them.

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

**Why separate?** The `assets/` directory ships with the plugin (and is replaced on marketplace update). Files under **`~/.local/share/pydeck/storage/`** survive plugin updates because they live outside the plugin package folder.

### Using Images in default_display

Reference images using their relative path from the project root:

```json
{
  "default_display": {
    "image": "plugins/plugin/no.pydeck.my-plugin/assets/icons/icon.png",
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
  "image": "plugins/plugin/no.pydeck.spotify/assets/icons/icon.png",
  "text_position": "middle",
  "text_size": 11,
  "text_bold": false,
  "text_italic": false,
  "text_underline": false,
  "text_color": "#ffffff"
}
```

#### Priority chain

PyDeck resolves the final text style for every rendered button through a three-layer merge. Lower layers provide fallback values; higher layers win for any field they explicitly set.

```text
┌─────────────────────────────────────────────────────────────────┐
│  Priority (highest → lowest)                                    │
│                                                                 │
│  3. Plugin manifest  default_display  ← wins when <field>_lock  │
│                                          is true, otherwise     │
│                                          suggestion only        │
│  2. User per-button  display settings ← wins over system        │
│  1. System default   (built-in)       ← global fallback         │
└─────────────────────────────────────────────────────────────────┘
```

**Layer 1 — system default.** A global fallback for every button with no per-button override. The values are read from `~/.config/pydeck/core/config.json` under the key `text_style_defaults` (any keys left there by an older install are merged over the built-ins) and exposed read-only at `GET /api/settings/text-style`. The **Settings → Appearance** pane that used to write them was removed, so nothing in the UI changes them any more. The per-button **Title → T↓** popup reads them to fill its placeholders.

| Field | Built-in value |
|:---|:---|
| `show_title` | `true` |
| `text_position` | `"bottom"` |
| `text_size` | `0` (auto) |
| `text_bold` | `false` |
| `text_italic` | `false` |
| `text_underline` | `false` |
| `text_color` | `""` (auto-contrasting) |

**Layer 2 — user per-button settings.** Set through the **Title → T↓** popup in the button editor and saved in the button's `display` object inside `buttons.json`. They override the system default for that button.

**Layer 3 — plugin manifest.** Text-style fields declared inside `default_display` are **suggestions**: applied only when the user has not explicitly set that field. Add `<field>_lock: true` to enforce the manifest value regardless. Only fields **explicitly declared** in the manifest participate at all — omitted fields fall through to layer 2 or 1.

**Worked example.** The system default is `text_position: "top"`, `text_bold: true`. The user sets `text_size: 12` and explicitly saves `text_position: "bottom"` on one button. The plugin declares `text_position: "middle"` and `text_color: "#ffffff"`, neither locked:

| Field | Resolved value | Source |
|:---|:---|:---|
| `text_position` | `"bottom"` | User per-button (manifest suggestion overridden) |
| `text_color` | `"#ffffff"` | Plugin manifest suggestion (user had not set it) |
| `text_size` | `12` | User per-button |
| `text_bold` | `true` | System default |
| All other fields | built-ins | System default |

With `"text_position_lock": true` in the manifest, the resolved `text_position` would be `"middle"` regardless of what the user saved.

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

#### Style: shared, or per row

By default all labels share the button's text-style settings (`text_bold`, `text_color`, `text_size`, and so on).

When `text_size` is `0` (auto) each label finds its own best-fit font size independently — a short label like `"-2:24"` keeps a large font while a long label like `"Bohemian Rhapsody — Queen"` shrinks (or scrolls) to fit. They are **not** forced to a common size driven by the longest label. Set an explicit `text_size` to pin all labels to the same point size.

**Per-row overrides** live in a parallel object, `text_label_styles`, keyed by the same positions:

```json
"display": {
  "text_labels":       { "top": "12", "bottom": "Fri 04" },
  "text_label_styles": { "bottom": { "text_size": 9, "text_color": "#888888" } }
}
```

A row holds only the fields it overrides; everything else falls through the usual chain — system defaults, then the button, then the plugin manifest's `default_display`. A row with no entry simply follows the button.

The editor writes this from the small style expander on each Title row. **Only PDK templates honour it** — the built-in renderer draws every label in one style. A PDK template reads the resolved values as `{_button_text_size_1}`, `{_button_text_color_2}`, … — see [Per-row styles](rendering.md#per-row-styles).

#### In display_update

!!! warning "`display_update` is the built-in renderer's protocol, not PDK's"
    A **PDK** plugin does not return `display_update`. It writes to `ctx.state` and its
    template draws the face, and a `<buttonlabel>` picks up the button's own labels for
    it. The `display_update` / `preload_display_updates` return protocol described in the
    rest of this section belongs to the retired classic plugin format; the core still
    honours it, and it is documented here because it is what the `display` object in
    `buttons.json` is made of — but do not build a new plugin on it.

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

Users can add multiple labels from the **Title** section of the button editor by clicking **+ Label**. Each row has its own position selector (top / middle / bottom); a position already used by another row is disabled to prevent duplicates. Each row also has a collapsed **style expander** (size, colour, bold, italic, underline) which writes `text_label_styles`.

For a **PDK** function, the number of rows the editor offers is not open-ended — it is the count of `<buttonlabel>` elements in the template, capped at three. A template with one label gets one Title row.

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
        "image": "plugins/plugin/spotify/assets/icons/PlayPause.png",
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
    "default": { "image": "plugins/plugin/my_plugin/assets/icons/off.png" },
    "active":  { "image": "plugins/plugin/my_plugin/assets/icons/on.png" }
  }
}
```

These manifest-level images serve as defaults. Users can override them per-button via the web editor's state selector dots — see [User-level per-state image overrides](#user-level-per-state-image-overrides) below.

### User-level per-state image overrides

The web editor lets users customise the image for each state independently. When a function defines `display_states`, the editor shows **state selector dots** below the icon preview. Clicking a dot switches to that state so the user can browse the icon gallery and pick a different image for it.

User overrides are stored on the button itself in a `display_states` field that mirrors the manifest structure:

```json
{
  "id": 0,
  "type": "plugin",
  "plugin": "no.pydeck.discord",
  "function": "toggle_mute",
  "config": {},
  "display": { "color": "#000000", "text": "" },
  "display_states": {
    "default": { "image": "/api/gallery/my_custom_unmuted.png" },
    "active":  { "image": "/api/gallery/my_custom_muted.png" }
  }
}
```

The core resolves the final per-state image in two steps:

1. **Manifest lookup** — read the state's partial display from the function's `display_states` in `manifest.json`.
2. **User override merge** — if the button has its own `display_states` entry for that key, those values are merged on top (user wins).

Plugins therefore always define the *default* image for each state, while users can replace it per-button without editing the manifest.

For a **PDK** function the resolved result does **not** replace the button face — that would suppress the template. The core hands it to the handler as **`ctx.config["_state_images"]`**, a `{state_key: image_path}` dict the handler puts into state for the template to draw. See [User-picked per-state icons](runtime.md).

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
  "plugin": "no.pydeck.spotify",
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
  "plugin": "no.pydeck.discord",
  "function": "toggle_mute",
  "config": {},
  "display": { "color": "#000000", "text": "", "image": "plugins/plugin/no.pydeck.discord/assets/icons/mute_on.png" },
  "display_states": {
    "default": { "image": "/api/gallery/custom_unmuted.png" },
    "active":  { "image": "/api/gallery/custom_muted.png" }
  }
}
```

| Field | Description |
|:---|:---|
| `display_states` | Optional. Per-state display overrides set by the user in the web editor. Keys match the state names from the manifest's `display_states`. When a state change occurs, these values are merged on top of the manifest defaults (user wins). See [User-level per-state image overrides](#user-level-per-state-image-overrides). |

### plugin_loop — Repeating Press

Calls the function repeatedly at a fixed interval. Used for live-updating displays (e.g. a clock, system monitor).

```json
{
  "id": 1,
  "type": "plugin_loop",
  "plugin": "no.pydeck.clock",
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
| `interval_ms` | Positive integer. How often (in milliseconds) the function is called. It is a **top-level** field on the button, not a `config` key, and a `plugin_loop` button without a positive value is rejected when saved. The value is echoed back in the press result so the caller knows the cadence. |

Dispatch is otherwise identical to `plugin` — the same handler, the same injected config keys. Only the repetition differs.

!!! tip "A PDK plugin usually wants `poll`, not `plugin_loop`"
    `on_poll` with an `interval` runs from the plugin's own manifest and needs nothing
    from the user. `plugin_loop` is a per-button setting a user chooses. See
    [`on_poll`](runtime.md#on_pollctx-intervalms).

### action — Multi-Step Sequence

Runs a named sequence of plugin calls and delays defined in `actions.json`. See [Actions](#6-actions-multi-step-sequences).

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
      { "plugin": "no.pydeck.discord", "function": "toggle_mute" },
      { "delay": 2000 },
      { "plugin": "no.pydeck.discord", "function": "toggle_deafen" }
    ]
  }
}
```

A step is **exactly one** of eight shapes:

| Key | Step |
|:---|:---|
| `plugin` (+ `function`, `config`) | Run one plugin function |
| `delay` | Pause N milliseconds |
| `action` | Run another named action |
| `switch` | Cycle through options, one per press |
| `grouped_actions` | A bundle of steps, nestable inside a switch |
| `set_image` / `set_text` / `set_color` | Change the button's own face |

A step object carrying two of these is rejected when saved. `delay` is not allowed inside a `switch` or a `grouped_actions` — put the wait in the top-level sequence.

The full step schema and the builder UI are covered in **[Action Builder](../using/actions.md)**.

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
