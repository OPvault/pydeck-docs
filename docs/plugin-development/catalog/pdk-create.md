# PDK Plugin Creator

The **PDK plugin creator** is a small Python CLI shipped in the [pydeck-plugins](https://github.com/opvault/pydeck-plugins) repository (`tools/pdk_create`). It scaffolds a new **PDK-format** plugin into your PyDeck **plugin data directory** using the **standard layout** (`src/shared.py`, `src/functions/<name>/template.xml`, `handler.py`, and related files) so you start from working stubs instead of an empty directory. For concepts (PDK vs classic) and a guided first run, see [PDK Development — Getting Started](../pdk/getting-started.md); the quick start there is built around this tool.

On a normal install, PyDeck keeps plugins under **`$XDG_DATA_HOME/pydeck/plugin/`** (default **`~/.local/share/pydeck/plugin/`**). The tool writes:

```text
~/.local/share/pydeck/plugin/<rdnn-plugin-id>/
```

Use a **reverse-DNS** id (RDNN), e.g. `com.example.myplugin` or `no.pydeck.myplugin`, as the install folder name. PyDeck resolves legacy short names for official catalog plugins during a transition period; new plugins should use RDNN only.

After generation, restart PyDeck and use the sidebar to add your new plugin to a button.

---

## Requirements

- Python 3.10+
- A local clone of the [pydeck](https://github.com/opvault/pydeck) app repository (optional if you only use `--pydeck-source` pointing at the live plugin directory)
- The [pydeck-plugins](https://github.com/opvault/pydeck-plugins) repo checked out (the tool lives there, not in pydeck)

---

## How to run

From the root of your **pydeck-plugins** clone:

```bash
python -m tools.pdk_create
```

or:

```bash
python3 -m tools.pdk_create
```

**Interactive mode** asks for an RDNN **plugin id** (folder name), display name, description, function ids, and preset. It resolves the **plugin root** (the directory whose immediate subfolders are plugin packages) automatically (see below).

**Non-interactive** example:

```bash
python -m tools.pdk_create --non-interactive \
  --pydeck-source ~/.local/share/pydeck/plugin \
  --plugin-id no.pydeck.my_plugin \
  --name "My Plugin" \
  --functions main,settings \
  --preset counter
```

Using the pydeck **repository root** (legacy checkout layout; only if `plugins/plugin` still exists there):

```bash
python -m tools.pdk_create --non-interactive \
  --pydeck-root /path/to/pydeck \
  --plugin-id no.pydeck.my_plugin \
  --name "My Plugin"
```

`--slug` is still accepted as a **deprecated** alias for `--plugin-id` (non-interactive only).

---

## Resolving the plugin root directory

The tool must find the directory that contains plugin folders (each child directory is one plugin). On current PyDeck this is **`$XDG_DATA_HOME/pydeck/plugin/`** (default **`~/.local/share/pydeck/plugin/`**). Older documentation referred to **`<pydeck>/plugins/plugin/`**; that path existed only under the app checkout and is **migrated into the data directory on first PyDeck start**, so prefer the `~/.local/share/pydeck/plugin` form.

Resolution matches **[Sync From PyDeck](sync-from-pydeck.md)**:

1. **`--pydeck-source PATH`** — path directly to the plugin root (e.g. `~/.local/share/pydeck/plugin`)
2. **`--pydeck-root PATH`** — pydeck repo root; the tool may use `<root>/plugins/plugin/` when that directory still exists (ignored if `--pydeck-source` is set)
3. **`PYDECK_SOURCE`** — environment variable: path to the plugin root directory
4. **`PYDECK_ROOT`** — environment variable: repo root; may resolve `$PYDECK_ROOT/plugins/plugin/` when present
5. **`~/.config/pydeck/pydeck-plugins/path.json`** — key `pydeck_source`, saved when you run `sync_from_pydeck.py` and confirm the path (should point at the plugin root, e.g. `~/.local/share/pydeck/plugin`)
6. **Built-in candidates** (first existing directory wins), same order as sync:
   - `~/.local/share/pydeck/plugin`
   - `~/Documents/GitHub/pydeck/plugins/plugin` (legacy checkout, before migration)
   - `<parent-of-pydeck-plugins>/pydeck/plugins/plugin`
   - `~/pydeck/plugins/plugin`

If nothing is found, interactive mode prompts you to confirm a detected path or enter the full path to the **plugin root**.

---

## CLI options

| Option | Description |
|:---|:---|
| `--pydeck-source` | Path to the plugin root (directory containing `<rdnn-id>/` folders) |
| `--pydeck-root` | PyDeck repository root |
| `--plugin-id` | RDNN plugin id / folder name under the plugin root |
| `--slug` | Deprecated alias for `--plugin-id` |
| `--name` | `name` in `manifest.json` |
| `--description` | Short description |
| `--author` | Author string |
| `--version` | Semver |
| `--functions` | Comma-separated function ids (snake_case); defaults to `main` when omitted in `--non-interactive` mode |
| `--preset` | `counter` (increments a number on press) or `static` (label-only demo) |
| `--min-pydeck-version` | Written to `manifest.json` |
| `--non-interactive` | Requires `--plugin-id` (or `--slug`), `--name`, and a resolvable plugin root path (`--functions` optional; see above) |
| `--force` | Overwrite a non-empty existing plugin directory |

Run `python -m tools.pdk_create --help` for the full list.

---

## Generated layout

Under the plugin root, the tool creates:

```text
<plugin-root>/<rdnn-id>/
├── manifest.json
├── src/
│   ├── shared.py
│   ├── shared.css
│   └── functions/<func>/
│       ├── template.xml
│       ├── handler.py
│       └── style.css
├── assets/icons/      (.gitkeep)
├── assets/fonts/      (.gitkeep)
├── scripts/setup.sh
└── meta/
    ├── options.json
    └── licenses/LICENSE-main
```

Edit the generated files, add icons under `assets/icons/` as needed, then iterate. For PDK behavior and APIs, see [PDK Development — Getting Started](../pdk/getting-started.md), [Templates & Elements](../pdk/templates-elements.md), and [Runtime & Examples](../pdk/runtime-examples.md).
