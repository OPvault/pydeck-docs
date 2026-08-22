# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this repo is

This is a **documentation-only** repository — an [MkDocs Material](https://squidfunk.github.io/mkdocs-material/) static site published to **docs.pydeck.no**. It contains no application code. It documents three external projects:

- [`opvault/pydeck`](https://github.com/opvault/pydeck) — the PyDeck app (FastAPI server, web UI, HID hardware listener) and its installers.
- [`opvault/pydeck-plugins`](https://github.com/opvault/pydeck-plugins) — the official plugin/theme catalog repo whose `tools/` scripts (e.g. `python -m tools.pdk_create`) the `catalog/` and `theme-development/marketplace-catalog.md` pages describe.

**Consequence for editing:** the commands, flags, file paths, and APIs documented here are defined in those *other* repos. You cannot verify them by grepping this repo. When a page claims e.g. a CLI flag or a config path exists, treat that as an assertion about the `pydeck` / `pydeck-plugins` source — confirm against those repos (or ask) rather than inventing or "fixing" details.

## Commands

There is no `requirements.txt`; the single dependency is `mkdocs-material` (it pulls in `mkdocs`).

```bash
pip install mkdocs-material   # one-time setup
mkdocs serve                  # live-reload preview at http://localhost:8000
mkdocs build                  # render to ./site (sanity-check build)
```

Do **not** run `mkdocs gh-deploy` manually. Deployment is automated: pushing to `main` triggers `.github/workflows/deploy.yml`, which runs `mkdocs gh-deploy --force` to the `gh-pages` branch.

## Structure & conventions

- **`docs/`** holds all page content (Markdown). `docs/index.md` is the published landing page (install/run instructions). The content domains: `using/` (running PyDeck + marketplace), `plugin-development/` (split into `platform/` shared docs, `pdk/` template-driven plugins, `classic/` the deprecated `plugin.py` model, and `catalog/` for pydeck-plugins tooling), and `theme-development/`.
- **`mkdocs.yml`** defines the `nav:` tree — section labels and ordering. **Adding or renaming a page requires a matching `nav:` edit**; a new `.md` file alone won't appear in the sidebar.
- **`site/`** is the build output. It is gitignored and **not** tracked — never edit, commit, or reference files under `site/` (they are regenerated on every build/deploy).
- **`docs/CNAME`** sets the custom domain (`docs.pydeck.no`); MkDocs copies it into the build so the GitHub Pages domain survives each deploy.
- **`docs/stylesheets/extra.css`** is hand-maintained custom theming (dark `slate` + light `default` palettes, accent `#a882ff`). Edit it directly for visual changes — there is no build step for CSS.

### Writing pages

`mkdocs.yml` enables these Material extensions — use them rather than raw HTML: admonitions (`!!! note` / `??? ...` collapsible via `pymdownx.details`), content tabs (`=== "Tab"` via `pymdownx.tabbed`), fenced code with highlighting and copy button, `pymdownx.keys` (`++ctrl+c++`), and `attr_list`. Cross-page links use **relative paths to the `.md` file** (e.g. `[Marketplace](using/marketplace.md)`), not the published URL — MkDocs rewrites them and validates they resolve at build time.
