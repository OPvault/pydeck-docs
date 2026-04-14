# PyDeck Docs

Welcome to the developer documentation for **PyDeck** — a Python-powered deck you extend with plugins and themes. Use the sidebar for the full outline; this page is a **reading map** with the same order as the site navigation.

---

## Choose a path

| You want to… | Start here |
|:---|:---|
| Ship plugins through the GitHub catalog | [Marketplace repo](pydeck/MARKETPLACE_REPO.md) |
| Build a **classic** plugin (`manifest.json` + `plugin.py`) | [Plugin development — Getting started](pydeck/plugin-development/GETTING_STARTED.md) |
| Build a **PDK** plugin (templates, CSS, custom button faces) | [PDK — Getting started](pydeck/pdk-development/GETTING_STARTED.md) (uses [PDK Plugin Creator](pydeck-plugins/PDK_CREATE.md) first) |
| Build a **theme** | [Theme development — Getting started](pydeck/theme-development/GETTING_STARTED.md) |
| Set up Discord or Spotify in PyDeck | [Discord setup](pydeck/DISCORD_SETUP.md) · [Spotify setup](pydeck/SPOTIFY_SETUP.md) |

---

## PyDeck

- [Marketplace repo](pydeck/MARKETPLACE_REPO.md) — Two-repo architecture, catalog layout, install flow, and common errors.

---

## Plugin development

**Classic plugins** (manifest + Python):

1. [Getting started](pydeck/plugin-development/GETTING_STARTED.md) — Hello world and folder layout  
2. [Core development](pydeck/plugin-development/CORE.md) — `plugin.py`, `manifest.json`, display states, polls  
3. [Authentication](pydeck/plugin-development/AUTH.md) — Credentials and OAuth patterns  
4. [UI & assets](pydeck/plugin-development/UI_ASSETS.md) — UI fields, images, CSS  
5. [API reference](pydeck/plugin-development/API_REFERENCE.md) — HTTP and WebSocket APIs  
6. [Examples & tips](pydeck/plugin-development/EXAMPLES.md)

**PDK** (template-driven buttons):

1. [Getting started](pydeck/pdk-development/GETTING_STARTED.md) — What PDK is; quick start with **PDK Plugin Creator**  
2. [PDK Plugin Creator](pydeck-plugins/PDK_CREATE.md) — Full CLI, paths, and layout reference for `python -m tools.pdk_create`  
3. [Templates & elements](pydeck/pdk-development/TEMPLATES_ELEMENTS.md)  
4. [Rendering](pydeck/pdk-development/RENDERING.md)  
5. [Runtime & examples](pydeck/pdk-development/RUNTIME_EXAMPLES.md)

**Shared guides and catalog tooling**

- [Gradient backgrounds](pydeck/GRADIENT_BACKGROUNDS.md) — User-facing gradients and `_button_gradient`  
- [Release stable](pydeck-plugins/RELEASE_STABLE.md) — Promote `canary` to `stable` on the catalog repo  
- [Sync from PyDeck](pydeck-plugins/SYNC_FROM_PYDECK.md) — Copy plugins from a local PyDeck checkout into the catalog  

---

## Themes development

1. [Getting started](pydeck/theme-development/GETTING_STARTED.md)  
2. [CSS reference](pydeck/theme-development/CSS_REFERENCE.md)  
3. [Loader & examples](pydeck/theme-development/LOADER_EXAMPLES.md)  

**Catalog tooling** (same scripts plugin maintainers use; themes live in the same marketplace repo):

- [Generate manifest](pydeck-plugins/GENERATE_MANIFEST.md)  
- [Release stable](pydeck-plugins/RELEASE_STABLE.md)  
- [Sync from PyDeck](pydeck-plugins/SYNC_FROM_PYDECK.md)  

---

## PyDeck official plugins

- [Discord setup](pydeck/DISCORD_SETUP.md)  
- [Spotify setup](pydeck/SPOTIFY_SETUP.md)  
