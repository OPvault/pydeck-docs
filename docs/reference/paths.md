# Config & file paths

Where PyDeck keeps its settings, your button layouts, and installed plugins and themes. You rarely need to touch these by hand, but knowing the layout helps with backups, debugging, and writing plugins.

PyDeck splits its files across two roots:

- **Settings & layout** live under your **config** directory.
- **Installed plugins/themes & their data** live under your **data** directory.

!!! info "Same layout on Linux, macOS, and Windows"
    PyDeck uses the **same paths relative to your home folder** on every platform — it does not use the native macOS `~/Library` or Windows `%APPDATA%` locations. Throughout this page, `~` means your home directory:

    | Platform | `~` (home) expands to |
    |---|---|
    | Linux | `/home/<you>` |
    | macOS | `/Users/<you>` |
    | Windows | `C:\Users\<you>` |

    So on Windows the config directory is `C:\Users\<you>\.config\pydeck\` and the data directory is `C:\Users\<you>\.local\share\pydeck\` (forward slashes below just become backslashes).

## Server basics

| Setting | Value |
|---|---|
| Web UI address | `http://localhost:8686` |
| Default bind host | `127.0.0.1` (local only) |
| LAN bind host | `0.0.0.0` — enable in **Settings &rarr; Device &rarr; Network** |

The port (`8686`) is fixed. Binding to the LAN does **not** open the API up: remote requests are denied by default and the editor stays localhost-only. See [What a remote client may do](../using/virtual-decks.md#what-a-remote-client-may-do).

### Environment variables

| Variable | Effect |
|---|---|
| `XDG_DATA_HOME` | Moves the **data** directory to `$XDG_DATA_HOME/pydeck`. |
| `PYDECK_ALLOWED_HOSTS` | Comma-separated hostnames accepted in the `Host` header, for a reverse proxy. Without it, only IP literals and `localhost` are accepted (**421** otherwise). |
| `PYDECK_MARKETPLACE_MANIFEST_URL` | Comma-separated catalog URLs, loaded **in addition to** your saved list. Not editable from the UI. |

## Config directory

**`~/.config/pydeck/`** on every platform (e.g. `C:\Users\<you>\.config\pydeck\` on Windows). All files are JSON, written atomically. The config directory is a fixed location — it is not affected by `$XDG_CONFIG_HOME`.

```text
~/.config/pydeck/
├── core/
│   ├── config.json            # global settings — see the table below
│   ├── credentials.json       # plugin credentials (secrets)
│   ├── paired_tokens.json     # tokens for paired phones / remote decks
│   ├── virtual_decks.json     # virtual deck definitions
│   ├── actions.json           # saved Action Builder sequences
│   └── profiles/
│       └── <name>/
│           ├── buttons.json   # button layout for a profile (global fallback)
│           └── folders.json   # that profile's folders
├── devices/
│   └── <device_id>/
│       ├── config.json        # per-device settings (brightness, orientation)
│       └── profiles/
│           └── <name>/
│               ├── buttons.json   # per-device button layout
│               └── folders.json
└── gallery/                   # icons you've uploaded
```

**Per-device vs. global.** When a specific device is active, PyDeck reads that device's `devices/<device_id>/…` files; the first time a device is used, it copies the global profiles in as a starting point. Without a bound device, the global `core/…` paths are used.

**Folders belong to a profile**, not to the install — deleting a profile directory takes its folders with it.

### What's in `core/config.json`

| Key | Meaning |
|---|---|
| `buttonProfiles` / `activeButtonProfile` | The active profile name. |
| `brightness` | Deck brightness, `0`–`100` (global fallback; each device keeps its own). |
| `ui_theme` | Selected theme, as `<family>/<variant>` — e.g. `nord/dark`. |
| `keybinds` | Rebound [keyboard shortcuts](../using/keyboard-shortcuts.md). Only actions you changed are stored. |
| `server_host` | Bind address: `127.0.0.1` or `0.0.0.0`. |
| `marketplace_manifest_urls` | Catalog URLs you added. The two built-in catalogs are not listed here. |
| `developer_options` | `export_rightclick`, `emulated_clock`, `emulated_clock_time`. See [Developer options](developer-options.md). |
| `welcome_seen` | Whether the first-run welcome screen has been dismissed. Kept here rather than in the browser, so a reinstall introduces itself again. |
| `text_style_defaults` | Layer 1 of the button text-style merge. Read-only in the UI now. |
| `app_updater_mode` · `app_updater_branch` · `app_updater_interval_minutes` · `app_updater_last_check` | [Updater](../using/updates.md) settings. |
| `version_selector_mode` · `version_selector_pinned_version` | Version pin. |

## Data directory

**`~/.local/share/pydeck/`** on every platform (e.g. `C:\Users\<you>\.local\share\pydeck\` on Windows). This is where the marketplace installs things. If you set `$XDG_DATA_HOME`, PyDeck uses `$XDG_DATA_HOME/pydeck` instead.

```text
~/.local/share/pydeck/
├── plugin/
│   └── <plugin-id>/           # installed plugin, e.g. no.pydeck.spotify/
├── storage/
│   └── <plugin-id>/           # data a plugin saves (caches, tokens) — survives updates
├── themes/
│   └── <family>/              # installed theme family, e.g. catppuccin/
└── cache/
    └── theme_swatches.json    # marketplace theme colour previews
```

Plugin ids are **reverse-DNS** (for example `no.pydeck.spotify`), and the install directory name matches the id. On first run, PyDeck migrates any plugins/themes from an older in-checkout location into this layout automatically, and seeds the bundled default theme into `themes/default/`.

!!! note "Dot-prefixed directories are installs in flight"
    An install downloads into `.<slug>.incoming` and is renamed into place in one move,
    keeping the previous tree at `.<slug>.previous` until the swap lands. Both discovery
    paths skip dot-prefixed directories, so an interrupted install leaves nothing that
    looks installed. They are safe to delete.

## Version & channel

The app records its own version and update channel in **`release.json`** at the root of the PyDeck install (e.g. `{"version": "1.1.0", "branch": "dev"}`). See [Updating PyDeck](../using/updates.md).

The install directory itself defaults to `/opt/pydeck` (Linux), `~/.local/opt/pydeck` (macOS), or `%LOCALAPPDATA%\Programs\PyDeck` (Windows) — see [Install](../get-started/install.md#where-pydeck-is-installed). Nothing under the two directories above lives inside it, so reinstalling never touches your settings.

## Logs

Where logs go depends on how PyDeck was started — see [Troubleshooting → Where are the logs?](../get-started/troubleshooting.md#where-are-the-logs).
