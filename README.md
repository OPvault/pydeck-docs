# pydeck-docs

[![Deploy Docs](https://github.com/OPvault/pydeck-docs/actions/workflows/deploy.yml/badge.svg)](https://github.com/OPvault/pydeck-docs/actions/workflows/deploy.yml)

Documentation for [PyDeck](https://github.com/opvault/pydeck) — a Python-powered, web-based macro deck that lets you trigger actions from buttons in a browser UI.

**Live site:** [docs.pydeck.no](https://docs.pydeck.no)

---

## What is this repo?

This repository contains the official developer documentation for PyDeck. It covers how to extend PyDeck through plugins and themes, and how to maintain a plugin catalog for the marketplace.

The docs live in the [`docs/`](./docs/) folder and are published to [docs.pydeck.no](https://docs.pydeck.no) via GitHub Pages. The published **landing page** is [`docs/index.md`](./docs/index.md) (installation and run instructions).

---

## Run it locally before pushing

`main` is the deploy branch: every push to it triggers [`.github/workflows/deploy.yml`](./.github/workflows/deploy.yml), which runs `mkdocs gh-deploy --force` and replaces what [docs.pydeck.no](https://docs.pydeck.no) serves. There is no staging site, so host your own copy and check the change there first.

The only dependency is `mkdocs-material` (it pulls in `mkdocs`) — there is no `requirements.txt`.

```bash
pip install mkdocs-material     # one-time setup

mkdocs serve                    # live-reload preview on http://localhost:8000
mkdocs serve -a 0.0.0.0:8000    # same, reachable from other machines on the LAN
mkdocs build --strict           # render to ./site, failing on any warning
```

`mkdocs serve` rebuilds on every save, so leave it running while you edit — it renders the same `docs/` tree and `mkdocs.yml` nav the workflow does, so what you see locally is what gets published.

Use `mkdocs build --strict` as the pre-push check: it turns MkDocs warnings — a broken relative link, a page missing from `nav:` — into a non-zero exit, catching the things a quick browse of the preview will not.

To get the change reviewed before it goes live, push a branch and open a PR: only pushes to `main` deploy.

> [!WARNING]
> Never run `mkdocs gh-deploy` by hand — it force-pushes your working tree to `gh-pages` and bypasses the workflow. The build output in `site/` is gitignored; do not commit it.

---

## Documentation layout

### `docs/` — site root

| Page | Path |
|:---|:---|
| Installation (home) | [`docs/index.md`](./docs/index.md) |

### `docs/using/` — running PyDeck and the marketplace

| Topic | Path |
|:---|:---|
| Marketplace & catalog | [`docs/using/marketplace.md`](./docs/using/marketplace.md) |
| Gradient backgrounds | [`docs/using/gradient-backgrounds.md`](./docs/using/gradient-backgrounds.md) |
| Discord (official plugin) | [`docs/using/discord.md`](./docs/using/discord.md) |
| Spotify (official plugin) | [`docs/using/spotify.md`](./docs/using/spotify.md) |

### `docs/plugin-development/platform/` — shared platform surface

[`manifest-reference.md`](./docs/plugin-development/platform/manifest-reference.md) and [`ui-fields.md`](./docs/plugin-development/platform/ui-fields.md) (the `manifest.json` schema and every `ui` field type), plus [`authentication.md`](./docs/plugin-development/platform/authentication.md), [`web-ui-and-assets.md`](./docs/plugin-development/platform/web-ui-and-assets.md), [`documentation.md`](./docs/plugin-development/platform/documentation.md), [`press-and-hold.md`](./docs/plugin-development/platform/press-and-hold.md), and [`http-api-reference.md`](./docs/plugin-development/platform/http-api-reference.md).

### `docs/plugin-development/plugin/` — writing a plugin (PDK format)

Entry: [`getting-started.md`](./docs/plugin-development/plugin/getting-started.md). Additional chapters: `templates-elements.md`, `rendering.md`, `runtime-examples.md`.

### `docs/plugin-development/catalog/` — [pydeck-plugins](https://github.com/opvault/pydeck-plugins) repo tooling

| File | Description |
|:---|:---|
| [`pdk-create.md`](./docs/plugin-development/catalog/pdk-create.md) | Scaffold a new PDK plugin (`python -m tools.pdk_create`). |
| [`generate-manifest.md`](./docs/plugin-development/catalog/generate-manifest.md) | Regenerate the root `manifest.json` from the `plugins/` tree. |
| [`sync-from-pydeck.md`](./docs/plugin-development/catalog/sync-from-pydeck.md) | Sync plugin sources from a local PyDeck checkout into the catalog. |
| [`release-stable.md`](./docs/plugin-development/catalog/release-stable.md) | Promote `canary` to `stable` on the catalog repo. |

### `docs/theme-development/` — UI themes

Entry: [`getting-started.md`](./docs/theme-development/getting-started.md). Additional chapters: `css-reference.md`, `loader-examples.md`, [`marketplace-catalog.md`](./docs/theme-development/marketplace-catalog.md) (how theme releases use the shared `pydeck-plugins` catalog scripts).

Navigation order and labels are defined in [`mkdocs.yml`](./mkdocs.yml).

---

## Related repositories

| Repo | Description |
|:---|:---|
| [`opvault/pydeck`](https://github.com/opvault/pydeck) | The main PyDeck application (FastAPI server, web UI, hardware listener). |
| [`opvault/pydeck-plugins`](https://github.com/opvault/pydeck-plugins) | The official plugin catalog repo used by the PyDeck marketplace. |
