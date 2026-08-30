# Plugin documentation (markdown)

A plugin can ship a **markdown documentation file** that PyDeck renders inside the
marketplace and — if you opt in — pops up automatically right after the plugin is
installed. This is the recommended home for setup guides, OAuth instructions, and
troubleshooting tables: the docs travel with the plugin, so they always match the
version a user actually installed.

It is driven entirely by two [`manifest.json`](manifest.md) fields, so
any [PDK](getting-started.md) plugin can opt in.

---

## Manifest fields

Add these to the version's `manifest.json`:

| Field | Type | Description |
|:---|:---|:---|
| `documentation` | string | Path to the markdown file, **relative to the version folder** (e.g. `"DOCS.md"`). |
| `show_markdown_after_install` | bool | `true` → PyDeck pops the rendered doc up automatically once the install finishes. `false` or absent → the doc is only shown when the user opens the plugin in the marketplace. |

```json
{
  "name": "Discord",
  "version": "1.1.4",
  "description": "Control Discord voice state (mute/deafen) via RPC",
  "author": "PyDeck Team",
  "documentation": "DOCS.md",
  "show_markdown_after_install": true
}
```

Drop the markdown file (commonly `DOCS.md`) next to `manifest.json` in the version
folder:

```text
plugins/no.pydeck.discord/2.0.0/
├── manifest.json
├── DOCS.md           ← bundled documentation
├── src/
└── ...
```

!!! tip "Auto-detection"
    If a plugin
    ships a doc file (`DOCS.md`, `README.md`, …) but doesn't declare `documentation`,
    the loader auto-detects it. `show_markdown_after_install` still defaults to
    `false` unless you set it. See [Runtime & Examples](runtime.md).

---

## Where the markdown shows up

The markdown is **only** surfaced in the marketplace flow — it is not rendered onto
button faces.

- **In the marketplace** — plugins that bundle a doc get a small **Docs** button in the
  card's corner group, beside the changelog and licence buttons. It opens the rendered
  guide in a modal. The doc is fetched straight from the catalog's raw URL, so it can be
  read **before** installing, and needs no endpoint on the PyDeck side.
- **After install** — if `show_markdown_after_install` is `true`, PyDeck reads the
  doc from the freshly installed plugin and pops it up automatically (also after a
  successful post-install script). With the flag off, nothing pops up — the doc is
  still available from the card any time.

PyDeck renders a safe subset of markdown — headings, **bold**/_italic_, `inline code`,
fenced code blocks, links, ordered/unordered lists, blockquotes, horizontal rules,
and GFM pipe tables. Raw HTML is escaped and link targets are restricted to safe
schemes, so docs from third-party catalogs can't inject scripts.

---

## How it reaches the catalog

When you run [`generate_manifest.py`](publishing.md), it reads
`documentation` and `show_markdown_after_install` from the **latest** version's
`manifest.json` and writes a repo-relative `doc_path` plus
`show_markdown_after_install` into the plugin's entry in the root `manifest.json`:

```json
{
  "slug": "no.pydeck.discord",
  "latest": "2.0.0",
  "doc_path": "plugins/no.pydeck.discord/2.0.0/DOCS.md",
  "show_markdown_after_install": true,
  "versions": [ ... ]
}
```

`doc_path` is repo-relative. It is resolved against the catalog's **asset base** — the
manifest's declared `root_url` when it has one, otherwise the directory the manifest
itself sits in. See [Publishing → root_url](publishing.md#root_url-where-a-catalogs-files-actually-live).

The marketplace uses `doc_path` to fetch and render the guide on demand, and the
markdown file is downloaded with the plugin like any other file, so the after-install
popup can read it from disk.

!!! note "Compatibility"
    Older PyDeck versions simply ignore the `documentation` and
    `show_markdown_after_install` fields (and the extra `DOCS.md` file is harmless),
    so adding docs to a plugin is backward-compatible.

!!! tip "`DOCS.md` and `CHANGELOG.md` are different things"
    `DOCS.md` is the guide — setup, credentials, what each button does — and only the
    **latest** version's copy is surfaced. `CHANGELOG.md` is per version and holds only
    that version's changes; the marketplace assembles a range from several of them. See
    [Changelog](manifest.md#8-changelog).
