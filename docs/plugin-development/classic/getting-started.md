# Plugin Development — Getting Started

!!! warning "Classic plugins are deprecated"
    The **classic** plugin model described on this page — **`manifest.json` + root `plugin.py`**, with PyDeck’s built‑in text/image/button renderer — is **deprecated for new development**.

    **It is no longer an active product area:** new features and documentation will focus on **[PDK](../pdk/getting-started.md)** (templates, CSS, Python handlers under `src/`). Classic plugins may receive **only critical maintenance** (for example security or breakage fixes), not ongoing enhancements.

    **Start new plugins as PDK.** Existing classic plugins can keep running; migrate when you need new UI or behaviour.

By the end of this guide you will have run a minimal plugin in PyDeck, know where plugin files live, and know which docs cover manifest details, Python handlers, and shipping.

**Where files live:** On your machine, each plugin is a folder under **`~/.local/share/pydeck/plugin/<name>/`** (or **`$XDG_DATA_HOME/pydeck/plugin/<name>/`** when `XDG_DATA_HOME` is set). Runtime files a plugin writes go under **`~/.local/share/pydeck/storage/<name>/`**. In `manifest.json`, `buttons.json`, and API payloads, PyDeck still uses **logical** paths such as `plugins/plugin/...` and `plugins/storage/...` — keep those in JSON; the core maps them to the data directory when loading.

**Plugin identifiers (RDNN):** The install folder name should be a **reverse-DNS** id (RDNN), e.g. `com.example.myplugin` or `no.pydeck.spotify`, so names stay unique across authors. The manifest `name` field is the **human-readable title** (shown in the UI); it does not have to match the folder name. For official catalog plugins, PyDeck still accepts legacy short folder names (e.g. `spotify`) and maps them to the canonical RDNN id when resolving paths and credentials.

---

## 1. Quick Start — Hello World

The fastest way to see how plugins work. This creates a plugin with one button that prints a greeting.

### Step 1: Create the plugin folder

```text
~/.local/share/pydeck/plugin/com.example.helloworld/
```

### Step 2: Create `manifest.json`

```json
{
  "name": "Hello World",
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
        "message": f"Hello, {name}!",
        "display_update": {"text": f"Hi {name}!"},
    }
```

### Step 4: Done

Restart PyDeck. The plugin appears in the sidebar under **Hello World** with a **Say Hello** function. Drag it onto a button and press it. The optional `message` string is shown in the UI as feedback; the `display_update` dict merges into the button's persisted `display` (here, `text`), so the deck face and web UI show **Hi …** after each press. You can also drive the face with `state` + `display_states` in the manifest — see [Core development](core.md#3-display-states-and-toggling).

---

## 2. Plugin Directory Structure

Every plugin lives on disk under **`~/.local/share/pydeck/plugin/<plugin_id>/`** (or `$XDG_DATA_HOME/pydeck/plugin/<plugin_id>/`). The folder name **is** the plugin id: use **RDNN** (e.g. `com.example.myplugin`, `no.pydeck.clock`) for new work.

```text
~/.local/share/pydeck/plugin/com.example.myplugin/
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
| `*.sh` | Post-install shell script executed once after marketplace installation. Declared via `post_install_script` in the manifest. See [Post-Install Scripts](#post-install-scripts). |
| `*.py` | Additional Python modules. Import them from `plugin.py` using a path insert (see [Spotify example](examples.md#spotify-oauth-api-client-token-refresh)). |

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
  "post_install_script": "scripts/setup.sh",
  "post_install_requires_sudo": false,
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
| `credentials` | array | No | Credential fields shown under **Settings → Credentials** on the web UI. See [Credentials](../platform/authentication.md#1-credentials). |
| `settings` | object | No | Optional category for a plugin-defined settings panel. See [Plugin settings panel](../platform/authentication.md#plugin-settings-panel) under Credentials. |
| `oauth` | object | No | OAuth2 Authorization Code flow config. See [OAuth](../platform/authentication.md#2-oauth-integration). |
| `permissions` | object | No | Module-level permission whitelist for the RPC system. |
| `post_install_script` | string | No | Relative path to a `.sh` script that runs after the plugin is installed from the marketplace. See [Post-Install Scripts](#post-install-scripts). |
| `post_install_requires_sudo` | boolean | No | When `true`, the user is prompted for their sudo password before the post-install script executes. Defaults to `false`. |
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
| `default_display` | object | No | Initial button appearance when dragged onto a slot. Supports `color` (hex), `text` (string), `image` (relative path), optional **`scroll_enabled`** / **`scroll_speed`** (title marquee), and all text-style fields: `show_title`, `text_position`, `text_size`, `text_bold`, `text_italic`, `text_underline`, `text_color`. Text-style fields act as **suggestions** by default (applied only when the user has not set the field); add a companion `<field>_lock: true` to hard-lock a field so the manifest always wins. See [Display states and toggling](core.md#3-display-states-and-toggling) and [Title marquee](core.md#title-marquee-scroll_enabled-and-scroll_speed). |
| `display_states` | object | No | Maps state keys (like `"default"`, `"active"`) to partial display overrides. Used for toggling button images. See [Display states and toggling](core.md#3-display-states-and-toggling). |
| `poll` | object | No | Background display polling config. See [Display polling](core.md#4-display-polling). |
| `ui` | array | Yes | List of UI field definitions for the button editor. See [UI field types](core.md#2-ui-field-types). Use `[]` for no fields. |
| `title_readonly` | boolean | No | When `true`, the web editor shows the title field as read-only with a **Read-only** badge. Use when the plugin or its poller owns the label (for example live clock text or transport state). The title is still persisted with the button like any other field; this flag is UI-only. |
| `disableGallary` / `disableGallery` | boolean | No | When `true`, the button editor hides the icon/image picker for that function. Use this for buttons that should not let users browse or replace the displayed image. The current MET current-temperature function uses this to remove the gallery UI. |
| `autosave` | — | — | Not a function-level field. The editor shows a **Save** button automatically when any field in the `ui` array sets `"autosave": "off"`. See [Common properties](core.md#common-properties) under UI Field Types. |

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

**Example — keyboard plugin** (`~/.local/share/pydeck/plugin/keyboard/manifest.json`):

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

```text
~/.local/share/pydeck/plugin/f1/
├── manifest.json        ← declares both licenses
├── plugin.py
├── LICENSE-openf1       ← OpenF1 API license
└── LICENSE-jolpica      ← Jolpica F1 license
```

> **Note:** The `file` value must be a plain filename with no path separators. The backend only serves files that appear in the `licenses` list, so listing a file here is both the declaration and the access grant.

> **Tip:** Always include license files when your plugin uses an external API, dataset, or library that requires attribution — it keeps the project legally clean and lets users understand the data sources at a glance.

---

### Post-Install Scripts

A plugin can include a shell script that runs once after installation from the marketplace. This is useful for system-level setup that cannot be handled by `python_dependencies` alone — for example, installing a system package, compiling a native extension, or writing a config file.

#### Declaring a Post-Install Script

Add `post_install_script` to the manifest's top-level object. The value is a relative path (from the plugin root) to a `.sh` file:

```json
{
  "name": "my_plugin",
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

#### Plugin folder layout example

```text
~/.local/share/pydeck/plugin/my_plugin/
├── manifest.json
├── plugin.py
└── scripts/
    └── setup.sh          ← post-install script
```

#### How It Works

1. The user installs the plugin from the marketplace.
2. If the manifest declares `post_install_script`, a **pending post-install request** is created and the UI shows a review prompt.
3. The prompt displays the script contents so the user can inspect it before approving.
4. If the script requires sudo, the user must provide their password.
5. On **Approve**, the script is executed with `/bin/bash` in the plugin directory. The result (`succeeded`, `failed`, or `timeout`) is reported back.
6. On **Decline**, the plugin directory is deleted and the installation is cancelled. Declining always removes the plugin — there is no way to keep a plugin while skipping its post-install script.

#### Script Constraints

- The path must be relative and stay inside the plugin directory (no `..` traversal).
- The file must have a `.sh` extension.
- Symlinks are not allowed.
- The script runs with a minimal environment (`PATH`, `HOME`, `LANG`) and has a default timeout of 120 seconds.
- If the script times out, the process is killed and the result is reported as `timeout`.

#### Security

Post-install scripts run arbitrary shell commands on the host machine. The review prompt exists so the user can read the script source before deciding. When `post_install_requires_sudo` is set, the password is used for a single `sudo -S` invocation and is not persisted.

> **Tip:** Keep post-install scripts short, idempotent, and well-commented. Users are more likely to approve a script they can understand at a glance.

---
