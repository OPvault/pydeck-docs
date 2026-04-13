# pydeck-docs

[![Deploy Docs](https://github.com/OPvault/pydeck-docs/actions/workflows/deploy.yml/badge.svg)](https://github.com/OPvault/pydeck-docs/actions/workflows/deploy.yml)

Documentation for [PyDeck](https://github.com/opvault/pydeck) — a Python-powered, web-based macro deck that lets you trigger actions from buttons in a browser UI.

**Live site:** [docs.pydeck.no](https://docs.pydeck.no)

---

## What is this repo?

This repository contains the official developer documentation for PyDeck. It covers how to extend PyDeck through plugins and themes, and how to maintain a plugin catalog for the marketplace.

The docs live in the [`docs/`](./docs/) folder and are published to [docs.pydeck.no](https://docs.pydeck.no) via GitHub Pages.

---

## Documentation

### `docs/pydeck/` — main app repo

| File | Description |
|:---|:---|
| [`docs/pydeck/PLUGIN_DEVELOPMENT.md`](./docs/pydeck/PLUGIN_DEVELOPMENT.md) | How to build, test, and ship a PyDeck plugin — covers `manifest.json`, `plugin.py`, UI fields, credentials, OAuth, WebSocket events, and more. |
| [`docs/pydeck/THEME_DEVELOPMENT.md`](./docs/pydeck/THEME_DEVELOPMENT.md) | How to create and ship a PyDeck theme — covers CSS variables, single-file and multi-variant themes, and the theme loader. |
| [`docs/pydeck/MARKETPLACE_REPO.md`](./docs/pydeck/MARKETPLACE_REPO.md) | How the PyDeck marketplace works — covers the two-repo architecture, catalog `manifest.json` format, the install flow, and common errors. |
| [`docs/pydeck/SPOTIFY_SETUP.md`](./docs/pydeck/SPOTIFY_SETUP.md) | Step-by-step guide to connecting Spotify — create a Developer Dashboard app, configure the redirect URI, authorize, and add playback buttons. |
| [`docs/pydeck/DISCORD_SETUP.md`](./docs/pydeck/DISCORD_SETUP.md) | Step-by-step guide to connecting Discord — create a Developer Portal application, enable RPC, authorize, and add mute/deafen buttons. |

### `docs/pydeck-plugins/` — catalog repo tools

| File | Description |
|:---|:---|
| [`docs/pydeck-plugins/GENERATE_MANIFEST.md`](./docs/pydeck-plugins/GENERATE_MANIFEST.md) | How to use `generate_manifest.py` — regenerates the root `manifest.json` by scanning the `plugins/` directory tree. |
| [`docs/pydeck-plugins/SYNC_FROM_PYDECK.md`](./docs/pydeck-plugins/SYNC_FROM_PYDECK.md) | How to use `sync_from_pydeck.py` — syncs plugin source files from a local pydeck checkout into the catalog repo with automatic version bumping. |
| [`docs/pydeck-plugins/RELEASE_STABLE.md`](./docs/pydeck-plugins/RELEASE_STABLE.md) | How to use `release_stable.py` — promotes the `canary` branch to `stable` and restores the canary label in one automated step. |

---

## Related repositories

| Repo | Description |
|:---|:---|
| [`opvault/pydeck`](https://github.com/opvault/pydeck) | The main PyDeck application (FastAPI server, web UI, hardware listener). |
| [`opvault/pydeck-plugins`](https://github.com/opvault/pydeck-plugins) | The official plugin catalog repo used by the PyDeck marketplace. |
