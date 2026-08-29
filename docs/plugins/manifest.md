# Shared platform — `manifest.json` reference

Every plugin ships a **`manifest.json`**: the file PyDeck reads to discover the plugin, build its sidebar entries, and render the button editor. This page is the field-by-field reference. It applies to every plugin — the [PDK](getting-started.md) runtime reads the same manifest and simply draws the button **face** from templates instead of the built-in renderer.

**Where files live:** each plugin is a folder under **`~/.local/share/pydeck/plugin/<plugin_id>/`** (or **`$XDG_DATA_HOME/pydeck/plugin/<plugin_id>/`** when `XDG_DATA_HOME` is set). Runtime files a plugin writes go under **`~/.local/share/pydeck/storage/<plugin_id>/`**. In `manifest.json`, `buttons.json`, and API payloads, PyDeck also accepts **logical** paths such as `plugins/plugin/...` and `plugins/storage/...`; the core maps them onto the data directory when loading.

**Plugin identifiers (RDNN):** the install folder name **is** the plugin id, and it should be a **reverse-DNS** name (RDNN) — e.g. `com.example.myplugin` or `no.pydeck.spotify` — so ids stay unique across authors. The manifest `name` field is the **human-readable title** shown in the UI; it does not have to match the folder name. For official catalog plugins, PyDeck still accepts legacy short folder names (e.g. `spotify`) and maps them to the canonical RDNN id when resolving paths and credentials.

!!! tip "PDK plugins can omit the manifest"
    A PDK plugin without a `manifest.json` gets one generated from its templates,
    `<settings>` blocks, and `on_poll` interval. See
    [Auto-generated manifest](runtime.md) under *Runtime & examples*.
    Ship a real manifest whenever you need credentials, permissions, dependencies,
    or licences — those cannot be inferred.

---

## 1. Top-level fields

```json
{
  "name": "My Plugin",
  "version": "1.0.0",
  "description": "What the plugin does",
  "author": "Your Name",
  "python_dependencies": [ ... ],
  "licenses": [ ... ],
  "credentials": [ ... ],
  "oauth": { ... },
  "permissions": { ... },
  "post_install_script": "scripts/setup.sh",
  "post_install_requires_sudo": false,
  "documentation": "DOCS.md",
  "changelog": "CHANGELOG.md",
  "functions": { ... }
}
```

| Field | Type | Required | Description |
|:---|:---|:---|:---|
| `name` | string | Yes | Human-readable plugin title shown in the sidebar and marketplace (e.g. `"Home Assistant"`). The **id** is the install folder name, not this field. |
| `version` | string | No | Semantic version string (e.g. `"1.0.0"`). |
| `description` | string | No | One-line description shown in the sidebar. |
| `author` | string | No | Plugin author name. |
| `min_pydeck_version` / `max_pydeck_version` | string | No | Compatibility range for this plugin version. The catalog generator mirrors these into the marketplace entry — see [Generate Manifest](publishing.md). |
| `python_dependencies` | array | No | List of pip package names the plugin requires. The backend installs missing packages automatically at startup and restarts itself. See [Python dependencies](#3-python-dependencies). |
| `licenses` | array | No | Third-party license declarations. Each entry names a license and points to its file inside the plugin folder. Shown in the marketplace as a **Licenses** button. See [Licenses](#5-licenses). |
| `credentials` | array | No | Credential fields shown under **Settings → Credentials** on the web UI. See [Credentials](authentication.md#1-credentials). |
| `settings` | object | No | Optional category for a plugin-defined settings panel. See [Plugin settings panel](authentication.md#plugin-settings-panel). |
| `oauth` | object | No | OAuth2 Authorization Code flow config. See [OAuth](authentication.md#2-oauth-integration). |
| `permissions` | object | No | Module-level permission whitelist for the RPC system. See [Permissions](#4-permissions). |
| `post_install_script` | string | No | Relative path to a `.sh` script that runs after the plugin is installed from the marketplace. See [Post-install scripts](#6-post-install-scripts). |
| `post_install_requires_sudo` | boolean | No | When `true`, the user is prompted for their sudo password before the post-install script executes. Defaults to `false`. |
| `documentation` | string | No | Path to a bundled markdown guide, relative to the plugin folder (e.g. `"DOCS.md"`). Auto-detected from `DOCS.md`/`README.md` when absent. See [Plugin documentation](documentation.md). |
| `show_markdown_after_install` | boolean | No | Only meaningful alongside `documentation`. When `true`, PyDeck pops the rendered doc up right after install. Defaults to `false`. |
| `changelog` | string | No | Path to the plugin's changelog, relative to the plugin folder. Defaults to `CHANGELOG.md`, which the catalog picks up whether or not you declare it — so the field only matters if you name the file something else. Every plugin is expected to ship one. See [Changelog](#7-changelog). |
| `pdk` | boolean | No | **Do not set this in a new plugin.** PyDeck reads the generation off the plugin's *sources*, not the manifest, and ignores a `pdk` key if one is present. Pre-PDK plugins carry `"pdk": false` to flag themselves as classic; a leftover `"pdk": true` still parses but does nothing. |
| `functions` | object | Yes | Maps function names to their metadata. This is the core of the manifest. |

---

## 2. Functions object

Each key in `functions` is a function name. For a **PDK** plugin the key matches a template name and, when you split logic per function, the module directory under `src/functions/<name>/` — see [Plugin directory structure](getting-started.md#4-plugin-directory-structure).

```json
{
  "functions": {
    "toggle": {
      "label": "HA Toggle",
      "description": "Toggle a Home Assistant entity on/off",
      "sidebar_icon": "assets/icons/toggle.svg",
      "default_display": {
        "color": "#1a3a6e",
        "text": ""
      },
      "display_states": {
        "default": { "image": "plugins/plugin/com.example.myplugin/assets/icons/off.png" },
        "active":  { "image": "plugins/plugin/com.example.myplugin/assets/icons/on.png" }
      },
      "poll": { "function": "on_poll", "interval_ms": 3000 },
      "ui": [ ... ]
    }
  }
}
```

| Field | Type | Required | Description |
|:---|:---|:---|:---|
| `label` | string | Yes | Human-readable name shown in the sidebar and editor. |
| `description` | string | No | Short description shown below the label. |
| `sidebar_icon` | string | No | Image for the **sidebar** action tile only. Use a path relative to the plugin package (e.g. `assets/icons/K.svg`). Omitted or empty → generic “+” tile. **Not** derived from `default_display.image`. Legacy alias: `action_tile_icon`. |
| `default_display` | object | No | Initial button appearance when dragged onto a slot: `color` (hex), `text` (string), `image` (relative path), optional **`scroll_enabled`** / **`scroll_speed`**, and the text-style fields (`show_title`, `text_position`, `text_size`, `text_bold`, `text_italic`, `text_underline`, `text_color`). Text-style fields are **suggestions** unless you add a companion `<field>_lock: true`. See [Text style in `default_display`](assets.md#text-style-in-default_display). |
| `display_states` | object | No | Maps state keys (like `"default"`, `"active"`) to partial display overrides — the per-state icons offered in the editor's gallery. PDK handlers receive the resolved result as `ctx.config["_state_images"]`; see [User-picked per-state icons](runtime.md). |
| `poll` | object | No | Background polling config: `function` (the callable to run, `on_poll` for PDK) and `interval_ms` (default `3000`, floored to `100` — the deck listener and the server both check poll schedules every 100 ms). PDK plugins normally let the core derive this from `on_poll`'s `interval` default — see [Runtime & examples](runtime.md). |
| `ui` | array | Yes | List of UI field definitions for the button editor. See [UI field types](ui-fields.md). Use `[]` for no fields. PDK templates may declare the same fields inline in a `<settings>` block instead — see [Inline settings](templates.md). |
| `title_readonly` | boolean | No | When `true`, the web editor shows the Title field as read-only with a **Read-only** badge. Use when the plugin or its poller owns the label. The title is still persisted like any other field; this flag is UI-only. |
| `disableGallary` / `disableGallery` | boolean | No | When `true`, the button editor hides the icon/image picker for that function. Use it for buttons whose image is part of the function's own presentation. |
| `draws_button_image` | boolean | No | **PDK only.** When `true`, a user-set button icon does *not* replace the PDK face — the template draws the image itself through the reserved `_button_image` key. See [Button-owned faces](rendering.md#35-button-owned-faces). Declaring `display_states` has the same effect. |
| `gradient` | boolean | No | When `true`, this function's colour picker offers **Solid / Gradient** tabs. The `_button_gradient` render key is available either way — the flag only controls whether the editor UI appears. See [Gradient backgrounds](rendering.md#4-gradient-backgrounds). |
| `actionable` | boolean | No | When `true`, the function can be used as a step inside an [Action](../using/actions.md). Defaults to `false`. |
| `log_format` | string | No | Format string used when the function's press result is written to the notification log. |
| `autosave` | — | — | Not a function-level field. The editor shows a **Save** button automatically when any field in the `ui` array sets `"autosave": "off"`. See [Common properties](ui-fields.md#common-properties). |

!!! note "Two fields the core adds for you"
    `GET /api/plugins` reports `pdk_buttonlabel_count` and `pdk_buttonlabel_defaults` per
    function, counted from the `<buttonlabel>` elements in the template (max 3). They
    drive how many Title rows the button editor offers. Do not put them in
    `manifest.json` — they are derived from your template and overwritten on load.

---

## 3. Python dependencies

Declares the pip packages your plugin needs. PyDeck reads this list every time the backend starts and automatically installs any package that is not yet present in the venv. If anything is newly installed the process restarts itself so the packages are importable before any plugin code runs.

```json
{
  "python_dependencies": ["evdev", "requests"]
}
```

| Field | Type | Description |
|:---|:---|:---|
| `python_dependencies` | array of strings | Pip package names (the same names you would pass to `pip install`). Import names and pip names may differ — use the pip name (e.g. `"pillow"`, not `"PIL"`). |

**Example — Keyboard plugin** (`~/.local/share/pydeck/plugin/no.pydeck.keyboard/manifest.json`):

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

## 4. Permissions

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

## 5. Licenses

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

The marketplace reads this list and shows a small **Licenses** button in the plugin card's corner group, beside the docs and changelog buttons. Clicking it opens a viewer modal. When a plugin declares more than one license, the viewer renders a tab for each entry — clicking a tab loads that license's full text.

**Plugin folder layout example** (F1 plugin with two licenses):

```text
~/.local/share/pydeck/plugin/no.pydeck.f1/
├── manifest.json        ← declares both licenses
├── src/
├── LICENSE-openf1       ← OpenF1 API license
└── LICENSE-jolpica      ← Jolpica F1 license
```

> **Note:** The `file` value must be a plain filename with no path separators. The backend only serves files that appear in the `licenses` list, so listing a file here is both the declaration and the access grant.

> **Tip:** Always include license files when your plugin uses an external API, dataset, or library that requires attribution — it keeps the project legally clean and lets users understand the data sources at a glance.

---

## 6. Post-install scripts

A plugin can include a shell script that runs once after installation from the marketplace. This is useful for system-level setup that cannot be handled by `python_dependencies` alone — for example, installing a system package, compiling a native extension, or writing a config file.

### Declaring a post-install script

Add `post_install_script` to the manifest's top-level object. The value is a relative path (from the plugin root) to a `.sh` file:

```json
{
  "name": "My Plugin",
  "version": "1.0.0",
  "description": "Plugin with post-install setup",
  "author": "Your Name",
  "post_install_script": "scripts/setup.sh",
  "post_install_requires_sudo": true,
  "functions": { ... }
}
```

| Field | Type | Required | Description |
|:---|:---|:---|:---|
| `post_install_script` | string | No | Relative path to a `.sh` file inside the plugin folder. Must not contain `..`, must not be absolute, and must not be a symlink. |
| `post_install_requires_sudo` | boolean | No | When `true`, the UI prompts for the user's sudo password before executing the script. Defaults to `false`. |

### Plugin folder layout example

```text
~/.local/share/pydeck/plugin/com.example.myplugin/
├── manifest.json
├── src/
└── scripts/
    └── setup.sh          ← post-install script
```

### How it works

1. The user installs the plugin from the marketplace.
2. If the manifest declares `post_install_script`, a **pending post-install request** is created and the UI shows a review prompt.
3. The prompt displays the script contents so the user can inspect it before approving.
4. If the script requires sudo, the user must provide their password.
5. On **Approve**, the script is executed with `/bin/bash` in the plugin directory. The result (`succeeded`, `failed`, or `timeout`) is reported back.
6. On **Decline**, the plugin directory is deleted and the installation is cancelled. Declining always removes the plugin — there is no way to keep a plugin while skipping its post-install script.

### Script constraints

- The path must be relative and stay inside the plugin directory (no `..` traversal).
- The file must have a `.sh` extension.
- Symlinks are not allowed.
- The script runs with a minimal environment (`PATH`, `HOME`, `LANG`) and has a default timeout of 120 seconds.
- If the script times out, the process is killed and the result is reported as `timeout`.

### Security

Post-install scripts run arbitrary shell commands on the host machine. The review prompt exists so the user can read the script source before deciding. When `post_install_requires_sudo` is set, the password is used for a single `sudo -S` invocation and is not persisted.

> **Tip:** Keep post-install scripts short, idempotent, and well-commented. Users are more likely to approve a script they can understand at a glance.

---

## 7. Changelog

Every plugin ships a `CHANGELOG.md` at the root of its folder, holding **only the
changes that version introduced**. One bare section — no title, no preamble:

```markdown
## 2.0.6 — 2026-08-28

### Fixed

- The track label sat off-centre. A percentage width resolves against the
  parent box rather than its content box, so horizontal padding pushed every
  full-width child right; the inset is now vertical only.
- Dropped an invalid `text-anchor` declaration from the shared stylesheet.
```

That is the whole file. Group entries under `### Added` / `### Changed` /
`### Fixed` / `### Removed`; only the `##` line is parsed, so the groups are
free-form and optional.

PyDeck assembles the range it needs by fetching one file per version and joining
them newest-first. When an update is available, the update badge on the plugin
card shows every version above the one installed; the changelog button shows the
full history. Nothing is repeated across versions, and a released version's
changelog never has to be edited again.

### Rules that matter

- **Head the section with the version:** `## 2.0.6 — 2026-08-28` is the shape
  PyDeck parses (a leading `v` and `[…]` brackets are tolerated).
- **One version per file.** Don't accumulate history — the older versions'
  files are still there and still get shown.
- **Write for the person deciding whether to upgrade** — what changed for them,
  not which files you touched. Say why it mattered: "fixed a bug" is not an
  entry, "buttons went blank on the hardware because the listener dispatches
  poll without credentials" is.
- **Name the file something else only if you must**, and then declare it with the
  `changelog` manifest key. `CHANGELOG.md` is found without any declaration.
- A version with no changelog is simply skipped when assembling, so coverage
  does not have to be complete.

While you work, the `CHANGELOG.md` in your **installed** plugin folder acts as the
draft for whatever ships next: jot bullets into it and `sync_from_pydeck.py` will
turn them into the published section (or pass `--changelog`). See
[Publishing](publishing.md).

---

## 8. Related reading

- [UI field types](ui-fields.md) — every field type the `ui` array accepts.
- [Plugin development — Getting started](getting-started.md) — plugin layout, templates, handlers.
- [Authentication](authentication.md) — `credentials`, `oauth`, and the settings panel.
- [Web UI and assets](assets.md) — `style.css`, images, `default_display` text styling.
