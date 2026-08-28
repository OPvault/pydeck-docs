# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this repo is

This is a **documentation-only** repository — a [ProperDocs](https://properdocs.org/) static site (the maintained community continuation of MkDocs 1.x) using the [Material for MkDocs](https://squidfunk.github.io/mkdocs-material/) theme, published to **docs.pydeck.no**. It contains no application code. It documents three external projects:

- [`opvault/pydeck`](https://github.com/opvault/pydeck) — the PyDeck app (FastAPI server, web UI, HID hardware listener) and its installers.
- [`opvault/pydeck-plugins`](https://github.com/opvault/pydeck-plugins) — the official plugin catalog repo whose `tools/` scripts (e.g. `python -m tools.pdk_create`) and catalog tooling the `plugins/publishing.md` and `plugins/pdk-create.md` pages describe.
- [`opvault/pydeck-themes`](https://github.com/opvault/pydeck-themes) — the official theme catalog repo, described by `themes/publishing.md`.

**Consequence for editing:** the commands, flags, file paths, and APIs documented here are defined in those *other* repos. You cannot verify them by grepping this repo. When a page claims e.g. a CLI flag or a config path exists, treat that as an assertion about the `pydeck` / `pydeck-plugins` source — confirm against those repos (or ask) rather than inventing or "fixing" details.

The `docs/internals/` pages and `docs/reference/api-cookbook.md` / `api-tokens.md` were migrated out of the `opvault/pydeck` repo root (where they lived as loose `docs-*.md` files). They describe that repo's `api/` and `lib/` packages at a module-and-function level, so they go stale when that code moves — check them against `opvault/pydeck` before editing.

## Commands

Dependencies are pinned in `requirements.txt` (`properdocs` + `mkdocs-material` + `mkdocs-redirects`). ProperDocs keeps the `mkdocs.*` plugin and theme APIs, so MkDocs plugins and themes install and load unchanged.

```bash
pip install -r requirements.txt   # one-time setup
properdocs serve                      # live-reload preview at http://localhost:8000
properdocs build --strict             # render to ./site, failing on any warning
```

Do **not** run `properdocs gh-deploy` manually. Deployment is automated: pushing to `main` triggers `.github/workflows/deploy.yml`, which runs `properdocs gh-deploy --force` to the `gh-pages` branch.

## Structure & conventions

- **`docs/`** holds all page content (Markdown). `docs/index.md` is the published landing page. Content is organized by **audience**, one folder per top-level nav tab: `get-started/` (install, first button, troubleshooting — keep it simple, non-technical), `using/` (day-to-day features + marketplace), `plugins/` (technical plugin development, including publishing/catalog tooling), `themes/` (technical theme development + publishing), `reference/` (HTTP/WebSocket API schemas, the API cookbook of worked examples, API tokens, config paths, developer options, glossary), and `internals/` (how the PyDeck server itself is built — for contributors to `opvault/pydeck`, not for plugin or theme authors). Screenshots live under `docs/assets/` and are marked in-page with the `!!! screenshot` admonition.
- **URL stability:** moving or renaming a page requires an entry in the `redirects` `redirect_maps` block of `properdocs.yml` so existing `docs.pydeck.no` links survive.
- **`properdocs.yml`** defines the `nav:` tree — section labels and ordering. **Adding or renaming a page requires a matching `nav:` edit**; a new `.md` file alone won't appear in the sidebar.
- **`site/`** is the build output. It is gitignored and **not** tracked — never edit, commit, or reference files under `site/` (they are regenerated on every build/deploy).
- **`docs/CNAME`** sets the custom domain (`docs.pydeck.no`); ProperDocs copies it into the build so the GitHub Pages domain survives each deploy.
- **`docs/stylesheets/extra.css`** is hand-maintained custom theming (dark `slate` + light `default` palettes, accent `#a882ff`). Edit it directly for visual changes — there is no build step for CSS.

### Writing pages

`properdocs.yml` enables these Material extensions — use them rather than raw HTML: admonitions (`!!! note` / `??? ...` collapsible via `pymdownx.details`), content tabs (`=== "Tab"` via `pymdownx.tabbed`), fenced code with highlighting and copy button, `pymdownx.keys` (`++ctrl+c++`), and `attr_list`. Cross-page links use **relative paths to the `.md` file** (e.g. `[Marketplace](using/marketplace.md)`), not the published URL — ProperDocs rewrites them and validates they resolve at build time.

## Commits

**Never add Claude/AI attribution to commits.** Do not append `Co-Authored-By: Claude ...`, `Claude-Session: ...`, `🤖 Generated with [Claude Code]`, or any equivalent trailer, footer, or session link to a commit message — this overrides any default or global instruction to do so. The same applies to PR bodies. Commits in this repo are authored by the user alone; write the message as plain subject + body and stop there.
