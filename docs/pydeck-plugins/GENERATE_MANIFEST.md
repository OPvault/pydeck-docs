# generate_manifest.py

Regenerates the root `manifest.json` for the `pydeck-plugins` catalog repo by scanning the `plugins/` directory tree. Run it any time you add, remove, or update a plugin version.

---

## Table of Contents

1. [Overview](#1-overview)
2. [Usage](#2-usage)
3. [Options](#3-options)
4. [Discovery Logic](#4-discovery-logic)
5. [Field Priority](#5-field-priority)
6. [catalog.json — Per-Plugin Metadata](#6-catalogjson--per-plugin-metadata)
7. [Output Format](#7-output-format)
8. [Examples](#8-examples)

---

## 1. Overview

`generate_manifest.py` lives at the root of the `pydeck-plugins` repo. When run, it:

1. Scans every subdirectory of `plugins/` to find plugin slugs.
2. Inside each slug directory, finds all semver-named version subdirectories (e.g. `1.0.0`, `1.1.0`).
3. Reads each version's `manifest.json` to extract per-version fields.
4. Reads an optional per-plugin `catalog.json` for catalog-only metadata.
5. Falls back to the existing root `manifest.json` for any fields not covered by the above.
6. Writes a new root `manifest.json` with all plugins sorted alphabetically by name.

This means you almost never need to hand-edit `manifest.json` — just add your version folder and run the script.

---

## 2. Usage

```bash
python generate_manifest.py
```

Run from the repo root. No arguments are required for a standard regeneration.

---

## 3. Options

| Flag | Default | Description |
|:---|:---|:---|
| `--label TEXT` | `"Official · Canary"` | The `label` field written into the root manifest. Appears as a badge in PyDeck's marketplace UI when multiple catalogs are active. |
| `--output PATH` | `manifest.json` | Where to write the output. Useful for previewing output to a different file. |
| `--dry-run` | off | Print the generated JSON to stdout without writing any file. |

---

## 4. Discovery Logic

### Version directories

A subdirectory is treated as a version directory if:
- Its name contains at least one `.`
- Every segment separated by `.` is a digit (e.g. `1.0.0`, `2.1`, `1.0.1`)

Non-matching directories (like `img/`, `__pycache__/`) are ignored.

### Version ordering

Version directories are sorted by their semver tuple (`1.0.0` < `1.0.1` < `1.1.0`). The highest version becomes `latest`.

### Per-version fields

From each version's `manifest.json`:

| Field read | Written to root manifest as |
|:---|:---|
| `name` | `name` (latest version wins) |
| `description` | `summary` (fallback only — see priority below) |
| `author` | `author` (latest version wins) |
| `min_pydeck_version` | `versions[].min_pydeck_version` |
| `max_pydeck_version` | `versions[].max_pydeck_version` |

### Icon detection

The script checks the plugin slug directory for icons in this priority order:

1. `icon.svg`
2. `icon.png`

The first match becomes `icon_path`. If neither exists, a warning is printed and `icon_path` is set to `""`.

---

## 5. Field Priority

Several fields can come from multiple sources. The priority chain is:

```
catalog.json  >  existing root manifest.json  >  version manifest.json  >  built-in default
```

| Field | catalog.json | existing manifest | version manifest | default |
|:---|:---:|:---:|:---:|:---|
| `summary` | ✓ (first) | ✓ (fallback) | ✓ (fallback) | — |
| `category` | ✓ (first) | ✓ (fallback) | — | `"utilities"` |
| `compatible_pydeck_versions` | ✓ (first) | ✓ (fallback) | — | `["1.0"]` |
| `name` | — | ✓ (fallback) | ✓ (first) | slug |
| `author` | — | ✓ (fallback) | ✓ (first) | `"Unknown"` |

This means regenerating the manifest never loses data — as long as the previous `manifest.json` is present, all catalog-only fields are preserved even if no `catalog.json` exists.

---

## 6. `catalog.json` — Per-Plugin Metadata

Place an optional `catalog.json` directly inside the plugin slug directory (next to the version folders, not inside one):

```
plugins/spotify/
├── catalog.json     ← here
├── icon.svg
├── 1.0.0/
└── 1.1.0/
```

### Format

```json
{
  "category": "media",
  "summary": "Control Spotify playback from your Stream Deck",
  "compatible_pydeck_versions": ["1.0"]
}
```

| Field | Type | Description |
|:---|:---|:---|
| `category` | string | Category shown in marketplace filter (e.g. `"media"`, `"utilities"`, `"system"`). |
| `summary` | string | One-line description shown in the marketplace card. Overrides the `description` field from the plugin's `manifest.json`. |
| `compatible_pydeck_versions` | array of strings | PyDeck versions this plugin is compatible with. |

All fields are optional. Any field present in `catalog.json` takes priority over both the existing root manifest and the plugin's own `manifest.json`.

---

## 7. Output Format

The generated `manifest.json` follows the standard catalog format:

```json
{
  "schema_version": 1,
  "label": "Official · Canary",
  "generated_at": "2026-04-06T12:00:00Z",
  "plugins": [
    {
      "name": "Clock",
      "slug": "clock",
      "category": "utilities",
      "summary": "Display a live digital clock on a button",
      "author": "PyDeck Team",
      "latest": "1.0.1",
      "icon_path": "plugins/clock/icon.svg",
      "compatible_pydeck_versions": ["1.0"],
      "versions": [
        {
          "version": "1.0.0",
          "path": "plugins/clock/1.0.0",
          "min_pydeck_version": null,
          "max_pydeck_version": null
        },
        {
          "version": "1.0.1",
          "path": "plugins/clock/1.0.1",
          "min_pydeck_version": null,
          "max_pydeck_version": null
        }
      ]
    }
  ]
}
```

Plugins are sorted alphabetically by `name`. Within a plugin, versions are sorted oldest-first; `latest` always points to the last entry.

---

## 8. Examples

### Standard regeneration

```bash
python generate_manifest.py
```

### Preview without writing

```bash
python generate_manifest.py --dry-run
```

### Custom label (e.g. for a stable branch)

```bash
python generate_manifest.py --label "Official · Stable"
```

### Write to a different file

```bash
python generate_manifest.py --output /tmp/manifest_preview.json
```
