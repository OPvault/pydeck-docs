# pydeck-docs

Documentation for [PyDeck](https://github.com/opvault/pydeck) — a Python-powered, web-based macro deck that lets you trigger actions from buttons in a browser UI.

---

## What is this repo?

This repository contains the official developer documentation for PyDeck. It covers how to extend PyDeck through plugins and themes, and how to maintain a plugin catalog for the marketplace.

The docs live in the [`docs/`](./docs/) folder.

---

## Documentation

| File | Description |
|:---|:---|
| [`docs/PLUGIN_DEVELOPMENT.md`](./docs/PLUGIN_DEVELOPMENT.md) | How to build, test, and ship a PyDeck plugin — covers `manifest.json`, `plugin.py`, UI fields, credentials, OAuth, WebSocket events, and more. |
| [`docs/THEME_DEVELOPMENT.md`](./docs/THEME_DEVELOPMENT.md) | How to create and ship a PyDeck theme — covers CSS variables, single-file and multi-variant themes, and the theme loader. |
| [`docs/MARKETPLACE_REPO.md`](./docs/MARKETPLACE_REPO.md) | How the PyDeck marketplace works — covers the two-repo architecture, catalog `manifest.json` format, the install flow, and common errors. |

---

## Related repositories

| Repo | Description |
|:---|:---|
| [`opvault/pydeck`](https://github.com/opvault/pydeck) | The main PyDeck application (Flask server, web UI, hardware listener). |
| [`opvault/pydeck-plugins`](https://github.com/opvault/pydeck-plugins) | The official plugin catalog repo used by the PyDeck marketplace. |
