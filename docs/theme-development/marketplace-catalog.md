# Themes and the marketplace catalog

Themes you edit under **`~/.local/share/pydeck/themes/`** are local. To ship a theme through the **official PyDeck marketplace**, it lives in the same **[pydeck-plugins](https://github.com/opvault/pydeck-plugins)** GitHub catalog repo as plugins. That repo is the source PyDeck downloads from when users install or update from the marketplace.

Theme and plugin maintainers there use the **same scripts** at the repo root. The sections below describe what theme authors typically need; the linked pages are the full references (options, edge cases, and plugin-focused examples apply to themes too).

---

## Regenerate the catalog manifest

After you change what the catalog repo publishes (new versions, removed entries, metadata fixes), the root **`manifest.json`** usually needs to be regenerated so the marketplace UI and PyDeck clients stay in sync.

- **Full reference:** [Generate manifest](../plugin-development/catalog/generate-manifest.md) (`generate_manifest.py`)

Run it from the root of your `pydeck-plugins` clone when your maintainer workflow calls for a fresh manifest. The linked guide documents discovery rules (including the `plugins/` tree), `catalog.json`, and output format.

---

## Promote a release to `stable`

Marketplace consumers usually track the **`stable`** branch or tag. When your theme changes on `canary` are ready for general installs, use the release workflow to promote them.

- **Full reference:** [Release stable](../plugin-development/catalog/release-stable.md)

---

## Copy a theme from a local PyDeck install into the catalog

If you develop or tweak a theme under your local **PyDeck data directory** and want those files in the `pydeck-plugins` repo (for example before opening a PR), use the sync script so paths and version bumps follow the repo’s rules.

- **Full reference:** [Sync from PyDeck](../plugin-development/catalog/sync-from-pydeck.md)

---

## Where this lives in the docs site

The three guides above are maintained once under **Plugin development → Catalog tools**, because one script set serves both plugins and themes. This page is the **theme maintainer entry point** so that workflow stays visible under **Theme development** in the sidebar without duplicating the long-form documentation.
