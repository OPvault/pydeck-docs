# PDK Plugin Creator

The **PDK plugin creator** is a small Python CLI shipped in the [pydeck-plugins](https://github.com/opvault/pydeck-plugins) repository (`tools/pdk_create`). It scaffolds a new **PDK-format** plugin into your PyDeck checkout using the **standard layout** (`src/shared.py`, `src/functions/<name>/template.xml`, `handler.py`, and related files) so you start from working stubs instead of an empty directory. For concepts (PDK vs classic) and a guided first run, see [PDK Development — Getting Started](../pydeck/pdk-development/GETTING_STARTED.md); the quick start there is built around this tool.

You run it against a local **pydeck** checkout; it writes into:

```text
<pydeck>/plugins/plugin/<slug>/
```

After generation, restart PyDeck and use the sidebar to add your new plugin to a button.

---

## Requirements

- Python 3.10+
- A local clone of the [pydeck](https://github.com/opvault/pydeck) app repository
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

**Interactive mode** asks for a plugin slug, display name, description, function ids, and preset. It resolves where `plugins/plugin/` lives automatically (see below).

**Non-interactive** example:

```bash
python -m tools.pdk_create --non-interactive \
  --pydeck-source /path/to/pydeck/plugins/plugin \
  --slug my_plugin \
  --name "My Plugin" \
  --functions main,settings \
  --preset counter
```

Using the pydeck **repository root** instead of `plugins/plugin/`:

```bash
python -m tools.pdk_create --non-interactive \
  --pydeck-root /path/to/pydeck \
  --slug my_plugin \
  --name "My Plugin"
```

---

## Resolving `plugins/plugin/`

The tool must find the directory that contains plugin folders (i.e. `…/pydeck/plugins/plugin`). Resolution matches **[Sync From PyDeck](SYNC_FROM_PYDECK.md)**:

1. **`--pydeck-source PATH`** — path directly to `plugins/plugin/`
2. **`--pydeck-root PATH`** — pydeck repo root; the tool uses `<root>/plugins/plugin/` (ignored if `--pydeck-source` is set)
3. **`PYDECK_SOURCE`** — environment variable: path to `plugins/plugin/`
4. **`PYDECK_ROOT`** — environment variable: repo root; uses `$PYDECK_ROOT/plugins/plugin/`
5. **`~/.config/pydeck/pydeck-plugins/path.json`** — key `pydeck_source`, saved when you run `sync_from_pydeck.py` and confirm the path
6. **Built-in candidates** (first existing directory wins), same order as sync:
   - `~/Documents/GitHub/pydeck/plugins/plugin`
   - `<parent-of-pydeck-plugins>/pydeck/plugins/plugin`
   - `~/pydeck/plugins/plugin`

If nothing is found, interactive mode prompts you to confirm a detected path or enter the full path to `plugins/plugin/`.

---

## CLI options

| Option | Description |
|:---|:---|
| `--pydeck-source` | Path to `plugins/plugin/` |
| `--pydeck-root` | PyDeck repository root |
| `--slug` | Folder name under `plugins/plugin/` |
| `--name` | `name` in `manifest.json` |
| `--description` | Short description |
| `--author` | Author string |
| `--version` | Semver |
| `--functions` | Comma-separated function ids (snake_case); defaults to `main` when omitted in `--non-interactive` mode |
| `--preset` | `counter` (increments a number on press) or `static` (label-only demo) |
| `--min-pydeck-version` | Written to `manifest.json` |
| `--non-interactive` | Requires `--slug`, `--name`, and a resolvable `plugins/plugin/` path (`--functions` optional; see above) |
| `--force` | Overwrite a non-empty existing plugin directory |

Run `python -m tools.pdk_create --help` for the full list.

---

## Generated layout

```text
plugins/plugin/<slug>/
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

Edit the generated files, add icons under `assets/icons/` as needed, then iterate. For PDK behavior and APIs, see [PDK Development — Getting Started](../pydeck/pdk-development/GETTING_STARTED.md), [Templates & Elements](../pydeck/pdk-development/TEMPLATES_ELEMENTS.md), and [Runtime & Examples](../pydeck/pdk-development/RUNTIME_EXAMPLES.md).
