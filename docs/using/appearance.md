# Appearance & themes

A **theme** restyles the whole PyDeck web UI — backgrounds, surfaces, accent color, and the colors used for status. PyDeck ships with one built-in theme; everything else is installed from the marketplace.

## Apply a theme

1. Open **Settings → Appearance**.
2. Pick a theme from the picker.
3. It applies instantly — no restart, no reload. Your choice is saved as you click.

Each theme shows a **swatch** built from its own CSS: background, panel, accent, success, and error colors, at the theme's own corner radius. For a theme you haven't installed yet, the marketplace fetches the same swatch straight from the catalog, so the card previews the palette before you install.

The toolbar above the picker has two controls:

| Control | What it does |
|---|---|
| **All / Dark / Light** | Filter the list to one scheme. |
| **Grid / list** | Two layouts for the picker. |

## Light and dark variants

Many themes come in more than one **variant** — usually a light and a dark version. When a theme has variants they sit side by side in one row, so switching between them is one click.

Variants are often named after the upstream palette rather than "Dark" and "Light" — Catppuccin's *Mocha* and *Latte*, for example. The built-in theme is called **PyDeck** and offers **Default** (the dark look the app ships with) and **Light**.

Your selection is stored as `<family>/<variant>` — e.g. `nord/dark` — in `~/.config/pydeck/core/config.json`.

## The built-in theme

PyDeck bundles one theme and seeds it into your data directory (`~/.local/share/pydeck/themes/default/`) the first time it runs, so a fresh install always has something to select. It only overrides a handful of variables; everything else comes from PyDeck's own stylesheet.

## Get more themes

The default list is short on purpose. Open the **Marketplace**, switch **Type** to **Themes**, and install any you like — Nord, Dracula, Gruvbox, Tokyo Night, Catppuccin, Solarized, and more. Installed themes show up in **Settings → Appearance** immediately. See [Install plugins & themes](marketplace.md).

## Build your own

Themes are just a small set of CSS variables — no build step, no framework. If you want your own colors, it takes about ten lines of CSS. See **[Build Themes](../themes/getting-started.md)**.

## Related

- [Gradient backgrounds](gradient-backgrounds.md) — per-button gradient fills (separate from UI themes).
- [Devices](devices.md) — brightness and orientation, which affect how the deck itself looks.
- [Keyboard shortcuts](keyboard-shortcuts.md) — `Alt` + `Shift` + `A` jumps straight to Appearance.
