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
  "system_packages": [ ... ],
  "compatibility": { ... },
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
| `post_install_script` | string | No | Relative path to a `.sh` script that runs after the plugin is installed from the marketplace, once the user has read and approved it. **Must not install packages** — a script that calls a package manager is rejected and the install fails. See [Post-install scripts](#6-post-install-scripts). |
| `post_install_requires_sudo` | boolean | No | When `true`, the user is prompted for their sudo password before the post-install script executes. Defaults to `false`. |
| `system_packages` | array | No | OS packages the plugin needs (`xdotool`, an SSH server, …), named per package manager. PyDeck resolves them against the user's machine before anything is written, shows the exact install command, and runs it only on approval. See [System packages](#7-system-packages). |
| `documentation` | string | No | Path to a bundled markdown guide, relative to the plugin folder (e.g. `"DOCS.md"`). Auto-detected from `DOCS.md`/`README.md` when absent. See [Plugin documentation](documentation.md). |
| `show_markdown_after_install` | boolean | No | Only meaningful alongside `documentation`. When `true`, PyDeck pops the rendered doc up right after install. Defaults to `false`. |
| `changelog` | string | No | Path to the plugin's changelog, relative to the plugin folder. Defaults to `CHANGELOG.md`, which the catalog picks up whether or not you declare it — so the field only matters if you name the file something else. Every plugin is expected to ship one. See [Changelog](#8-changelog). |
| `compatibility` | object | No | Which platforms the plugin runs on and what it needs from them — `os`, `requires`, `optional`, `min_os_version`. The marketplace classifies the plugin against the user's machine and **refuses** an incompatible install — there is no override. Omit it and the plugin shows as **Unverified**. See [Platform compatibility](#9-platform-compatibility). |
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

A plugin can include a shell script that runs once after installation from the marketplace, for setup that neither `python_dependencies` nor [`system_packages`](#7-system-packages) can express — adding the user to a group, writing a config file, registering a udev rule.

!!! danger "A post-install script may not install packages"
    Package installs belong in the declarative [`system_packages`](#7-system-packages) block, where the user sees the exact command and the system's own package manager runs it. Before a script is ever shown for approval, PyDeck scans it (comments stripped) for a package-manager call — `apt`, `apt-get`, `dpkg`, `dnf`, `yum`, `pacman`, `zypper`, `apk`, `snap`, `flatpak`, `brew`, `winget`, `choco`, `scoop`, `yay`, `paru`, `makepkg` — or an `install` verb on `pip`/`pip3`/`pipx`/`npm`/`pnpm`/`yarn`/`cargo`/`gem`/`port`. One hit and the install fails with **400**: the plugin directory is removed again and the response lists the offending tokens as `blocked_tokens`. This is a text scan, not a sandbox — catalog review is the backstop.

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

1. The user installs the plugin from the marketplace. If the manifest also declares `system_packages`, that step runs first — the plugin's files are only downloaded once the packages are settled.
2. If the manifest declares `post_install_script`, the script is scanned for package-manager calls (above). If it passes, a **pending post-install request** is created and the UI shows a review prompt.
3. The prompt displays the script contents so the user can inspect it before approving.
4. If the script requires sudo, the user must provide their password.
5. On **Approve**, the script is executed with `/bin/bash` in the plugin directory. The result (`succeeded`, `failed`, or `timeout`) is reported back.
6. On **Decline**, the plugin directory is deleted and the installation is cancelled. Declining always removes the plugin — there is no way to keep a plugin while skipping its post-install script.

### Approvals are remembered

When a script runs successfully, PyDeck stores its SHA-256 in the database (`plugin_postinstall`). An upgrade that ships the **byte-identical** script is not asked about again — the user already read and ran exactly that text. Any change to the script, a declined or failed run, or an uninstall brings the prompt back.

### Script constraints

- The path must be relative and stay inside the plugin directory (no `..` traversal).
- The file must have a `.sh` extension.
- Symlinks are not allowed.
- No package-manager calls (see the warning above).
- The script runs with a minimal environment (`PATH`, `HOME`, `LANG`) and has a default timeout of 120 seconds.
- If the script times out, the process is killed and the result is reported as `timeout`.

### Security

Post-install scripts run arbitrary shell commands on the host machine. The review prompt exists so the user can read the script source before deciding. When `post_install_requires_sudo` is set, the password is used for a single `sudo -S` invocation and is not persisted.

> **Tip:** Keep post-install scripts short, idempotent, and well-commented. Users are more likely to approve a script they can understand at a glance. The official Keyboard plugin's script, for instance, only adds the user to the `input` group — the `xdotool` it can use is declared in `system_packages`.

---

## 7. System packages

Some plugins need an OS package — `xdotool` for X11 key injection, an SSH server, a media tool. Declare those in `system_packages` instead of installing them from a script. PyDeck then:

1. **Detects** the package managers on the user's `PATH` and the display session (X11 / Wayland), reusing the [platform](#9-platform-compatibility) probes.
2. **Picks** the entry that applies to this machine and its name on the manager the distro ships with.
3. **Skips** anything already installed (and new enough), and refuses up front if a required package cannot be provided at all.
4. **Shows the exact command** it intends to run and installs only when the user approves — with a sudo password typed for that step where the manager needs root.

Nothing is downloaded until that step is over, so a declined install leaves no plugin behind.

```json
{
  "system_packages": [
    {
      "name": "xdotool",
      "reason": "Faster, layout-aware key injection on X11. Without it the plugin falls back to evdev.",
      "when": ["x11"],
      "optional": true,
      "managers": { "apt|dnf|pacman|zypper|apk": "xdotool" }
    },
    {
      "name": "OpenSSH server",
      "reason": "Lets buttons trigger remote commands over SSH.",
      "service": "sshd",
      "managers": {
        "apt|dnf": "openssh-server",
        "pacman|zypper|apk|brew": "openssh",
        "aur": { "name": "openssh", "min_version": "9.0" }
      }
    }
  ]
}
```

Each entry is one *logical* dependency with its name on every package manager that carries it.

| Field | Type | Required | Description |
|:---|:---|:---|:---|
| `name` | string | Yes | Human-readable name shown in the prompt (`"OpenSSH server"`). |
| `reason` | string | No | One line on why the plugin needs it — shown under the package in the prompt. Write it; users approve what they understand. |
| `managers` | object | Yes | Package name per manager key. A key may group managers that share a name with a pipe (`"apt|dnf": "openssh-server"`). The value is either the package name or `{"name", "min_version"}`. An entry that maps no manager, or names a manager PyDeck does not know, makes the whole manifest invalid (**400** at install). |
| `optional` | boolean | No | `false` by default. A **required** package that cannot be provided on this machine refuses the install; an optional one is simply skipped, and declining an optional-only list still installs the plugin. |
| `when` | array | No | Environment tags that must *all* match for the entry to apply, e.g. `["x11"]`. `x11` / `wayland` mean the **native session** here (a Wayland desktop has XWayland, but a package declared for X11 sessions is not wanted on it); any other tag — `linux`, `x86_64`, `dbus`, … — is looked up in the [detected capabilities](#the-reserved-vocabulary). An entry that does not apply is listed as *not needed here* and never installed. |
| `service` | string | No | A service to enable once the package is in (`sshd`). PyDeck runs `systemctl enable --now <service>` on Linux (`brew services start` on macOS) after the install command, and records that this plugin depends on it. |

**Names are validated**: a package name must match `[A-Za-z0-9][A-Za-z0-9._+@:-]{0,127}` (so a manifest cannot smuggle a flag into the command line), a service `[A-Za-z0-9][A-Za-z0-9._@-]{0,127}`, a `min_version` `[0-9][0-9A-Za-z._+~:-]{0,63}`.

### Package managers PyDeck knows

| Key | OS | Install command | Needs root |
|:---|:---|:---|:---|
| `apt` | Linux | `apt-get install -y` | yes |
| `dnf` | Linux | `dnf install -y` | yes |
| `pacman` | Linux | `pacman -S --noconfirm --needed` | yes |
| `zypper` | Linux | `zypper --non-interactive install` | yes |
| `apk` | Linux | `apk add` | yes |
| `aur` | Linux (Arch) | `yay -S --noconfirm --needed` (or `paru`, whichever is on `PATH`) | no — builds from source as the user |
| `brew` | macOS | `brew install` | no |
| `winget` | Windows | `winget install -e --accept-package-agreements --accept-source-agreements --id` | yes |
| `choco` | Windows | `choco install -y` | yes |

Which manager is used is decided by what is on `PATH`, native managers first; `/etc/os-release` (`ID` / `ID_LIKE`) only moves the distro's own manager to the front when several are installed. The AUR is offered only when `pacman` is present *and* `yay` or `paru` is, and always after `pacman` — a native package wins. Packages are passed as separate arguments, never through a shell.

### How an entry is resolved

Every entry ends up in exactly one state, and the prompt shows all of them:

| Status | Meaning |
|:---|:---|
| `not_applicable` | A `when` tag did not match — *not needed here*. |
| `satisfied` | Already installed, and at least `min_version` if one is set. |
| `install` | Will be installed (or upgraded, when the installed version is below `min_version`). |
| `unresolvable` | **Required**, but no manager on this machine is mapped. Refuses the install (**409**). |
| `too_old` | **Required** with `min_version`, and the repo's candidate is older. Refuses the install (**409**). |
| `optional_skipped` | Optional and either unresolvable or too old — skipped silently. |

A version PyDeck cannot read counts as "cannot verify", never as "too old". Version strings are compared with epoch and packaging release stripped (`1:9.0p1-2` → `9.0p1`).

### What the user sees

If everything is satisfied or not applicable, there is no prompt at all — the plugin just installs. Otherwise the install call returns before touching disk and the browser opens a **System packages** dialog listing each package with its manager, its `reason`, an *optional* / *service* / *≥ version* tag, the already-installed and not-needed entries greyed out, and the exact command(s) — one install command per manager, then one `systemctl enable --now` per service. Commands that need root are prefixed `sudo` and the dialog says a password will be asked for. For an AUR package the `PKGBUILD` is fetched and shown in a collapsible block, since that is what will build as the user.

- **Install** runs the commands in order (each with a 15-minute timeout, `DEBIAN_FRONTEND=noninteractive`), then downloads the plugin and continues with its post-install script, if any. The password is checked with `sudo -v` first so a typo re-prompts instead of failing halfway, is passed to each `sudo -S` on stdin, and is never stored.
- **Decline** (required packages pending) cancels the install; nothing was written.
- **Skip** (only optional packages pending) installs the plugin without them.
- A failed command stops the sequence; the plugin is not installed, and the output is returned so the user can see what went wrong.

PyDeck records which packages it installed for which plugin (`plugin_system_packages`) and which plugins depend on each service (`plugin_services`). It **never uninstalls a system package** — it is shared with the rest of the OS. Uninstalling a plugin drops its rows; when a service has no dependent plugin left, the UI tells the user they *can* stop it (`sudo systemctl disable --now <service>`) but does not do it.

!!! note "Not lifted into the catalog"
    Unlike `compatibility`, `system_packages` is **not** copied onto the catalog's root index. It is read from the version's own `manifest.json` at install time, so it can differ per version. Use `compatibility.requires` for what the marketplace should filter on *before* install, and `system_packages` for what PyDeck should install.

---

## 8. Changelog

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

## 9. Platform compatibility

Some plugins depend on things that only exist on certain platforms — xdotool on X11, MPRIS over D-Bus, AppleScript. Declare that so the marketplace can tell a user *before* they install:

```json
{
  "compatibility": {
    "os": ["linux"],
    "requires": ["dbus", "mpris"],
    "optional": ["x11"],
    "min_os_version": { "windows": "10" }
  }
}
```

| Field | Meaning |
|:---|:---|
| `compatibility.os` | OSes the plugin supports: `linux`, `windows`, `macos`. A plugin for every platform lists all three. |
| `compatibility.requires` | Capabilities that **must** be present or the plugin cannot work. A missing one makes the plugin **incompatible**: the marketplace names what is missing, the Install button is disabled, and `POST /api/marketplace/install` answers **409** — there is no "install anyway". |
| `compatibility.optional` | Capabilities the plugin uses when present but does not need. Never blocks — use it when the plugin has more than one way to do its job (X11 *or* Wayland, say). |
| `compatibility.min_os_version` | Per-OS floor, e.g. `{"windows": "11"}` or `{"macos": "13"}`. |

What the plugin is *for* is not part of this block — that is its `category` in the catalog's `catalog.json`, which has its own picker in the marketplace. The marketplace's **Platform tags** filter is derived from `compatibility` (every OS, requirement and optional capability a plugin mentions), so there is no separate tag list to keep in step.

### The reserved vocabulary

These are the tags the compatibility engine can actually check for. Anything else in `requires` is never satisfiable and always reads as missing, so keep `requires` to this list.

| Category | Tags | How PyDeck detects it |
|:---|:---|:---|
| Operating system | `linux`, `windows`, `macos` | `sys.platform` |
| OS version | `windows-10`, `windows-11`, `macos-13`, … | Windows build number (≥ 22000 is 11), `platform.mac_ver()` |
| Linux session | `x11`, `wayland` | `XDG_SESSION_TYPE` / `WAYLAND_DISPLAY` / `DISPLAY`. `x11` is present under Wayland too when XWayland is running (`DISPLAY` is set) — most X11 tools work through it. |
| Protocol / subsystem | `dbus`, `mpris`, `evdev`, `xdotool`, `hidraw`, `applescript`, `win32` | Session bus socket, `xdotool`/`osascript` on `PATH`, `evdev` importable, `/dev/hidraw*` |
| Architecture | `x86_64`, `arm64` | `platform.machine()` |

Probes are cheap on purpose — "on `PATH`", "socket exists" — so a capability means *looks available*, not *verified working*.

### What the user sees

Each catalog card carries a compatibility pill: the declared platform (*Linux · D-Bus · MPRIS*) when it matches, the same marked *not compatible* with the reason on hover when it does not, or *Unverified* when the plugin never declared anything. The **Platform** filter group shows what was detected (*Detected: Linux · Wayland · x86_64*) and a **Works on my system** switch — on by default — that narrows the grid to declared matches, so unverified plugins only appear once it is turned off. The **Platform tags** group filters by any platform word a plugin declares; tags the machine offers are marked *Detected*.

Incompatible plugins — with the platform or with the PyDeck version — are hidden until **Show incompatible** is pressed, and even then their Install / Upgrade button reads **Not compatible**, disabled, with the reason as its tooltip. The server refuses the install regardless of the UI (**409**, with the verdict in the body), so a script cannot get around it either. The catalog generator lifts `compatibility` onto the root index so none of this needs a download — see [Publishing](publishing.md#platform-compatibility).

---

## 10. Related reading

- [UI field types](ui-fields.md) — every field type the `ui` array accepts.
- [Plugin development — Getting started](getting-started.md) — plugin layout, templates, handlers.
- [Authentication](authentication.md) — `credentials`, `oauth`, and the settings panel.
- [Web UI and assets](assets.md) — `style.css`, images, `default_display` text styling.
