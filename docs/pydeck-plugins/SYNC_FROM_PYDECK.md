# sync_from_pydeck.py

Syncs plugin source files from a local `pydeck` checkout into the `pydeck-plugins` catalog repo, automatically detecting changes, bumping patch versions, and regenerating the root `manifest.json`.

---

## Table of Contents

1. [Overview](#1-overview)
2. [Prerequisites](#2-prerequisites)
3. [Usage](#3-usage)
4. [Options](#4-options)
5. [Source Path Config](#5-source-path-config)
6. [Sync Workflow](#6-sync-workflow)
7. [Version Bumping Rules](#7-version-bumping-rules)
8. [Change Detection](#8-change-detection)
9. [Diff Output](#9-diff-output)
10. [Files That Are Always Ignored](#10-files-that-are-always-ignored)
11. [Examples](#11-examples)

---

## 1. Overview

`sync_from_pydeck.py` lives at the root of the `pydeck-plugins` repo. It bridges the development repo (`pydeck`) and the catalog repo (`pydeck-plugins`):

```
pydeck/plugins/plugin/<slug>/   →   pydeck-plugins/plugins/<slug>/<version>/
      (source of truth)                    (catalog, versioned)
```

On each run it:

1. Scans every plugin directory in the pydeck source.
2. Compares source files against the latest version already in the catalog repo.
3. Skips plugins where nothing has changed.
4. For changed plugins, bumps the version (or uses the source version if it is already higher), copies the files into a new version folder, and updates the version in the source `manifest.json`.
5. Runs `generate_manifest.py` to regenerate the root `manifest.json`.

---

## 2. Prerequisites

- Python 3.10+
- A local clone of the `pydeck` repo (the main app repo, not the catalog)
- Both repos checked out on the correct branches

---

## 3. Usage

```bash
python sync_from_pydeck.py
```

On first run the script auto-detects the pydeck source path and asks you to confirm it. The confirmed path is saved to `~/.config/pydeck/pydeck-plugins/path.json` so subsequent runs need no input.

---

## 4. Options

| Flag | Description |
|:---|:---|
| `--pydeck-source PATH` | Override the saved source path for this run only. Points to `pydeck/plugins/plugin/`. |
| `--dry-run` | Show what would happen without writing any files. The diff is still printed. |
| `--no-diff` | Suppress the coloured per-file diff (shown by default for every changed plugin). |
| `--no-generate` | Skip running `generate_manifest.py` after syncing. |
| `--yes` | Accept the auto-detected or saved source path without prompting. |
| `--regen-conf` | Re-prompt for the source path and overwrite the saved config. |

---

## 5. Source Path Config

The confirmed source path is stored at:

```
~/.config/pydeck/pydeck-plugins/path.json
```

```json
{
  "pydeck_source": "/home/user/Documents/GitHub/pydeck/plugins/plugin"
}
```

Auto-detection checks these candidate paths in order:

1. `~/Documents/GitHub/pydeck/plugins/plugin`
2. `<catalog-repo-parent>/pydeck/plugins/plugin`
3. `~/pydeck/plugins/plugin`

Use `--regen-conf` to update the saved path, or `--pydeck-source` to override it for a single run.

---

## 6. Sync Workflow

For each plugin directory found in the pydeck source:

### New plugin (slug not in catalog repo)

The source `manifest.json` version is used as-is. All source files are copied into `plugins/<slug>/<version>/`.

### Existing plugin — no changes

Skipped. The output line reads:

```
  SKIP    spotify  (unchanged, latest=1.1.0)
```

### Existing plugin — files changed, source version ≤ repo version

The patch segment of the repo version is incremented (e.g. `1.1.0` → `1.1.1`). The source `manifest.json` is updated in-place with the new version string, then all files are copied into `plugins/<slug>/1.1.1/`.

```
  UPDATE  spotify  →  plugins/spotify/1.1.1  (bumped 1.1.0 → 1.1.1)
```

### Existing plugin — source version already higher than repo

The source version is used without further bumping. Files are copied into `plugins/<slug>/<src_version>/`.

```
  UPDATE  spotify  →  plugins/spotify/1.2.0  (source version 1.2.0 > repo 1.1.0)
```

### After all plugins

`generate_manifest.py` is run automatically (unless `--no-generate` is passed) to keep the root `manifest.json` current.

---

## 7. Version Bumping Rules

| Condition | Action |
|:---|:---|
| Source version == repo latest | Bump patch: `1.1.0` → `1.1.1` |
| Source version < repo latest | Bump patch from repo version |
| Source version > repo latest | Use source version as-is |

The source `manifest.json` is always updated to match the final version before the files are copied, so the file inside the new version folder always shows the correct version.

The update uses a targeted string replacement (`"version": "x.y.z"` → `"version": "x.y.z+1"`) that preserves the rest of the file's JSON formatting exactly, preventing false positives on the next sync run.

---

## 8. Change Detection

Files are compared between the pydeck source directory and the latest version folder in the catalog repo. A change is detected when:

- A file exists in the source but not in the latest version folder (new file).
- A file exists in the latest version folder but not in the source (deleted file).
- A file exists in both but the contents differ.

### JSON files

`.json` files (including `manifest.json`) are compared **semantically** — the parsed Python objects are compared, not the raw bytes. This means differences in whitespace, indentation, or key ordering do not count as changes.

### Other files

All other files are compared byte-for-byte using `filecmp.cmp` with `shallow=False`.

### Ignored files

See [Files That Are Always Ignored](#10-files-that-are-always-ignored).

---

## 9. Diff Output

When a plugin has changes, a coloured unified diff is printed before the update line — similar to `git diff`:

```
diff  home-assistant  (1.1.0 → new)
--- a/ha_client.py
+++ b/ha_client.py
@@ -34,7 +34,9 @@
     _HAS_CAIROSVG = False

 _PLUGIN_DIR = Path(__file__).parent
-_IMG_DIR = _PLUGIN_DIR / "img"
+# Runtime-generated icons go to plugins/storage/
+_STORAGE_DIR = _PLUGIN_DIR.parents[1] / "storage" / "home-assistant"

 BUTTON_SIZE = 80
```

| Line prefix | Meaning |
|:---|:---|
| `-` (red) | Line present in the current repo version, removed in the new version |
| `+` (green) | Line added in the new version |
| (dim) | Context lines (unchanged, shown for reference) |

New files print a single green notice: `new file: plugin.py  (264 lines)`.  
Deleted files print a single red notice: `deleted file: old_helper.py  (40 lines)`.  
Binary files print: `binary file changed: icon.png`.

Suppress with `--no-diff`.

---

## 10. Files That Are Always Ignored

The following files are excluded from both change detection and copying, because they belong to the catalog repo and are not part of the versioned plugin source:

| File | Reason |
|:---|:---|
| `catalog.json` | Catalog-only metadata, managed in the catalog repo |
| `icon.svg` / `icon.png` | Plugin icon, lives at the slug root, not in version folders |
| `license.txt` / `lisence.txt` / `LICENSE` / `LICENSE.txt` / `LICENSE.md` | License files downloaded by pydeck alongside the plugin source; not versioned |

Python cache files (`__pycache__/`, `*.pyc`, `*.pyo`) are also excluded from both comparison and copying.

---

## 11. Examples

### Standard sync

```bash
python sync_from_pydeck.py
```

### Preview changes without writing anything

```bash
python sync_from_pydeck.py --dry-run
```

### Sync without the coloured diff

```bash
python sync_from_pydeck.py --no-diff
```

### Non-interactive sync (CI / scripted)

```bash
python sync_from_pydeck.py --yes --no-generate
```

### Override the source path for one run

```bash
python sync_from_pydeck.py --pydeck-source ~/code/pydeck/plugins/plugin
```

### Re-configure the saved source path

```bash
python sync_from_pydeck.py --regen-conf
```
