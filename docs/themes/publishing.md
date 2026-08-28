# Themes and the marketplace catalog

Themes you edit under **`~/.local/share/pydeck/themes/`** are local to your machine. To ship a theme through the **official PyDeck marketplace**, it has to land in the **[pydeck-themes](https://github.com/opvault/pydeck-themes)** GitHub catalog repo — a separate repo from the plugin catalog, with its own `manifest.json` and its own copy of the tooling.

PyDeck loads both catalogs by default:

```text
https://plugins.pydeck.no    ← plugins
https://themes.pydeck.no     ← themes
```

Both are vanity hosts that redirect to the `stable` branch of their repo.

!!! warning "Two catalogs, two repos"
    Themes do **not** live in `pydeck-plugins`. The scripts in the two repos share a
    design but are separate files: `pydeck-themes` has `generate_manifest.py` and
    `sync_from_pydeck.py`, and **no** `release_stable.py`.

---

## 1. Authoring happens upstream, not in the repo

Themes are authored in your **PyDeck data directory** and pulled into the catalog repo afterwards:

```text
~/.local/share/pydeck/themes/<slug>/     ← you edit here
        │  python sync_from_pydeck.py
        ▼
pydeck-themes/themes/<slug>/<version>/   ← the catalog stores a copy
```

Editing theme CSS directly inside the catalog repo is overwritten by the next sync unless you make the same edit upstream. See [Getting started](getting-started.md) for the local theme format.

---

## 2. Repo layout

```text
pydeck-themes/
├── manifest.json                   # generated — never hand-edit
├── generate_manifest.py
├── sync_from_pydeck.py
└── themes/
    └── nord/
        ├── catalog.json            # hand-maintained, repo-only
        ├── icon.svg | icon.png     # optional
        ├── 1.0.0/
        │   ├── manifest.json       # synced from upstream
        │   ├── dark.css
        │   └── light.css
        └── 1.0.1/
            └── …
```

### Three JSON layers

Confusing these is the main hazard in this repo.

| File | Owner | Contents |
|:---|:---|:---|
| `manifest.json` (root) | **generated — never hand-edit** | `schema_version`, `generated_at`, `label`, `themes[]` |
| `themes/<slug>/catalog.json` | hand-maintained, repo-only | `summary`, `author`, optional `licenses` |
| `themes/<slug>/<version>/manifest.json` | **synced from upstream** | `label`, `description`, and `variants` or `scheme` |

---

## 3. Regenerate the root manifest

Run this from the repo root after anything under `themes/` changes. `sync_from_pydeck.py` runs it for you at the end of a sync.

```bash
python generate_manifest.py
python generate_manifest.py --dry-run                     # print, don't write
python generate_manifest.py --label "Official · Stable"   # for the stable channel
python generate_manifest.py --output /tmp/preview.json
```

| Flag | Default | Description |
|:---|:---|:---|
| `--label TEXT` | `"Official · Canary"` | The `label` written into the root manifest and shown as a channel badge in the marketplace UI. |
| `--output PATH` | `manifest.json` | Where to write. |
| `--dry-run` | off | Print the JSON to stdout without writing. |

### Field precedence

```text
catalog.json  >  existing root manifest.json  >  version manifest.json  >  default
```

| Root field | Source |
|:---|:---|
| `name` | version manifest `label` → previous root entry → slug |
| `summary` | `catalog.json` → previous root entry → version manifest `description` |
| `author` | `catalog.json` → previous root entry → `"Unknown"` |
| `licenses` | `catalog.json` → previous root entry (omitted when empty) |
| `icon_path` | `icon.svg` (preferred) or `icon.png` in `themes/<slug>/` → previous root entry → `""` + a warning |
| `latest` | highest semver version directory |

!!! danger "The fallback to the previous manifest is load-bearing"
    Most themes have no `catalog.json` field for every value, so regeneration reads
    `author`, `summary`, and `licenses` back out of the **existing** root manifest.
    Deleting or truncating `manifest.json` before regenerating silently drops them.

### Generated entry

```json
{
  "schema_version": 1,
  "generated_at": "2026-08-22T12:00:00Z",
  "label": "Official · Canary",
  "themes": [
    {
      "name": "Nord",
      "slug": "nord",
      "summary": "Arctic, north-bluish palette",
      "author": "PyDeck Team",
      "latest": "1.0.1",
      "icon_path": "themes/nord/icon.svg",
      "versions": [
        { "version": "1.0.0", "path": "themes/nord/1.0.0" },
        { "version": "1.0.1", "path": "themes/nord/1.0.1" }
      ]
    }
  ]
}
```

Themes are sorted alphabetically by `name`; versions oldest-first, with `latest` pointing at the last one. Unlike plugin entries, theme entries carry **no** `category`, `compatible_pydeck_versions`, `min_pydeck_version`, or `max_pydeck_version`.

---

## 4. Sync a theme from your local install

```bash
python sync_from_pydeck.py                    # coloured diff, prompts on first run
python sync_from_pydeck.py --dry-run          # preview only, writes nothing
python sync_from_pydeck.py --yes --no-diff    # non-interactive
python sync_from_pydeck.py --pydeck-source ~/some/themes
python sync_from_pydeck.py --regen-conf       # re-prompt for the source path
```

| Flag | Description |
|:---|:---|
| `--pydeck-source PATH` | Override the saved/auto-detected themes directory for this run. |
| `--regen-conf` | Re-prompt for the source path and save it again. |
| `--dry-run` | Show what would happen; write nothing (also suppresses the upstream version bump). |
| `--no-diff` | Suppress the coloured per-file diff, which is shown by default. |
| `--no-generate` | Skip running `generate_manifest.py` at the end. |
| `--yes` | Accept the auto-detected/saved path without prompting. |

The confirmed source path is cached at **`~/.config/pydeck/pydeck-themes/path.json`**.

### What the sync decides, per theme

| Situation | Action |
|:---|:---|
| Slug absent from the repo (or has no non-empty version dir) | **NEW** — copy into the source manifest's version and stub out a `catalog.json` (`summary` from `description`, author `"PyDeck Team"`). |
| Files byte-identical to the latest version dir | **SKIP** — `.json` files are compared semantically, not byte-wise. |
| Files differ, source version ≤ repo latest | **UPDATE** — patch-bump, write the new version back into the *upstream* `manifest.json`, then copy into the new version dir. |
| Files differ, source version > repo latest | Copy into that version as-is. |

!!! note "The sync writes to your local install too"
    An UPDATE rewrites the `version` field in the theme's **upstream** `manifest.json`
    (a targeted string replace, to preserve formatting). `--dry-run` suppresses it.

### Excluded from comparison

If a sync ever reports every theme as changed, suspect a new file the installer writes that none of these cover:

- **`.marketplace.json`** — the install stamp PyDeck writes into every installed theme. Never compared, copied, or diffed; left unfiltered it makes every theme look modified.
- **`default`** — PyDeck's built-in appearance. It lives in the local themes directory like any other theme, so it is skip-listed to keep every sync from re-adding it.
- **`catalog.json`, `icon.*`, licence files** — repo-only files, so they never count as "missing from source".

---

## 5. Version directories are immutable

Version directories are semver-named and treated as **released**: a change never edits an existing version folder, it creates a new one.

!!! danger "Never edit a file inside an existing version directory"
    Installed clients recorded that version in `.marketplace.json` and only re-fetch when
    `latest` changes — they keep the old bytes forever. The sync cannot protect you here:
    it compares the source against the repo **working tree**, not git HEAD, so a hand-edit
    already sitting in a version directory reads as "unchanged" and reports SKIP.

    If `git status` shows a modified file under `themes/<slug>/<version>/`, that is a
    mistake to undo — restore the file and let the sync create a new version instead.

---

## 6. Branches and channels

| Branch | Role |
|:---|:---|
| `canary` | Working branch — sync and regenerate here. |
| `stable` | Default branch and PR target; what the marketplace installs from. |

The catalog `label` defaults to `"Official · Canary"`, so pass `--label "Official · Stable"` when generating for the stable channel. There is no `release_stable.py` in this repo — promotion is a pull request from `canary` into `stable`.

!!! note "Not the same as the plugin channels"
    The plugin catalog has three channels (`testing` → `canary` → `stable`), labels them
    with the bare channel name, declares a `root_url`, and automates the last hop with a
    script. This repo does none of those. See
    [Publishing to the catalog](../plugins/publishing.md) — that page describes
    `pydeck-plugins`, not this repo.

!!! warning "The **Official** badge does not come from the label"
    PyDeck marks a catalog Official from the **URL it was configured with** — a
    `pydeck.no` host, or a `raw.githubusercontent.com` URL under `OPvault` — and never
    from anything the manifest says about itself. This repo's labels still carry the
    `Official · ` prefix for historical reasons; it is cosmetic, and a fork that copied
    it would gain nothing.

### `root_url` and vanity hosts

This catalog's manifest does **not** declare a `root_url`, so PyDeck resolves entry paths
against the manifest's own directory. That works for a raw GitHub URL. It does *not* work
for a manifest served from a bare hostname, where trimming the last path segment leaves
`https://` with no repo in it.

If you host a theme catalog behind a vanity domain, declare a `root_url` in the root
manifest pointing at the raw base your files actually live under — see
[the plugin catalog's `root_url`](../plugins/publishing.md#root_url-where-a-catalogs-files-actually-live)
for the full explanation.
