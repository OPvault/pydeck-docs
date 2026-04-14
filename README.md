# pydeck-docs

[![Deploy Docs](https://github.com/OPvault/pydeck-docs/actions/workflows/deploy.yml/badge.svg)](https://github.com/OPvault/pydeck-docs/actions/workflows/deploy.yml)

Documentation for [PyDeck](https://github.com/opvault/pydeck) — a Python-powered, web-based macro deck that lets you trigger actions from buttons in a browser UI.

**Live site:** [docs.pydeck.no](https://docs.pydeck.no)

---

## What is this repo?

This repository contains the official developer documentation for PyDeck. It covers how to extend PyDeck through plugins and themes, and how to maintain a plugin catalog for the marketplace.

The docs live in the [`docs/`](./docs/) folder and are published to [docs.pydeck.no](https://docs.pydeck.no) via GitHub Pages. The published **home page** is [`docs/index.md`](./docs/index.md) — it mirrors the MkDocs navigation and links to every guide.

---

## Documentation layout

### `docs/pydeck/` — main application (pydeck repo)

| Topic | Entry |
|:---|:---|
| Marketplace | [`docs/pydeck/MARKETPLACE_REPO.md`](./docs/pydeck/MARKETPLACE_REPO.md) |
| Classic plugins | [`docs/pydeck/plugin-development/GETTING_STARTED.md`](./docs/pydeck/plugin-development/GETTING_STARTED.md) |
| PDK plugins | [`docs/pydeck/pdk-development/GETTING_STARTED.md`](./docs/pydeck/pdk-development/GETTING_STARTED.md) |
| Themes | [`docs/pydeck/theme-development/GETTING_STARTED.md`](./docs/pydeck/theme-development/GETTING_STARTED.md) |
| Gradient backgrounds | [`docs/pydeck/GRADIENT_BACKGROUNDS.md`](./docs/pydeck/GRADIENT_BACKGROUNDS.md) |
| Spotify | [`docs/pydeck/SPOTIFY_SETUP.md`](./docs/pydeck/SPOTIFY_SETUP.md) |
| Discord | [`docs/pydeck/DISCORD_SETUP.md`](./docs/pydeck/DISCORD_SETUP.md) |

Additional chapters live alongside those entry points (Core, Auth, API reference, PDK templates/rendering, theme CSS, and so on). Follow links from each getting-started page or open [`mkdocs.yml`](./mkdocs.yml).

### `docs/pydeck-plugins/` — catalog repo tools (pydeck-plugins)

| File | Description |
|:---|:---|
| [`PDK_CREATE.md`](./docs/pydeck-plugins/PDK_CREATE.md) | Scaffold a new PDK plugin (`python -m tools.pdk_create`). |
| [`GENERATE_MANIFEST.md`](./docs/pydeck-plugins/GENERATE_MANIFEST.md) | Regenerate the root `manifest.json` from the `plugins/` tree. |
| [`SYNC_FROM_PYDECK.md`](./docs/pydeck-plugins/SYNC_FROM_PYDECK.md) | Sync plugin sources from a local PyDeck checkout into the catalog. |
| [`RELEASE_STABLE.md`](./docs/pydeck-plugins/RELEASE_STABLE.md) | Promote `canary` to `stable` on the catalog repo. |

---

## Related repositories

| Repo | Description |
|:---|:---|
| [`opvault/pydeck`](https://github.com/opvault/pydeck) | The main PyDeck application (FastAPI server, web UI, hardware listener). |
| [`opvault/pydeck-plugins`](https://github.com/opvault/pydeck-plugins) | The official plugin catalog repo used by the PyDeck marketplace. |
