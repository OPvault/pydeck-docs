# PyDeck Theme Development Guide

Everything you need to create, customize, and ship a PyDeck theme.

---

## Table of Contents

1. [Quick Start — Minimal Theme](#1-quick-start--minimal-theme)
2. [Theme Directory Structure](#2-theme-directory-structure)
3. [manifest.json Reference](#3-manifestjson-reference)
4. [CSS Variables Reference](#4-css-variables-reference)
5. [Single-File Themes](#5-single-file-themes)
6. [Multi-Variant Themes (Dark + Light)](#6-multi-variant-themes-dark--light)
7. [Custom variant labels](#7-custom-variant-labels)
8. [Overriding Non-Color Variables](#8-overriding-non-color-variables)
9. [Full `:root` Override Reference](#9-full-root-override-reference)
10. [How the Theme Loader Works](#10-how-the-theme-loader-works)
11. [Theme Selection IDs](#11-theme-selection-ids)
12. [Real-World Examples](#12-real-world-examples)
13. [Tips and Best Practices](#13-tips-and-best-practices)

---

## 1. Quick Start — Minimal Theme

The fastest way to add a new color palette. This creates a dark-only theme in four lines of CSS.

### Step 1: Create the theme folder

```
themes/my-theme/
```

The folder name is the theme's **family ID**. It must be a single path component — no slashes, no dots, no `..`.

### Step 2: Create `manifest.json`

```json
{
  "label": "My Theme",
  "description": "A custom dark theme",
  "scheme": "dark",
  "variants": {
    "dark": "theme.css"
  }
}
```

Wait — for a true single-file theme (no dark/light switcher), use this simpler form instead:

```json
{
  "label": "My Theme",
  "description": "A custom dark theme",
  "scheme": "dark"
}
```

### Step 3: Create `theme.css`

```css
/* My Theme */
:root {
    --bg-0: #1a1a2e;
    --bg-1: #16213e;
    --bg-2: #0f3460;
    --bg-3: #533483;
    --surface: rgba(255, 255, 255, 0.04);
    --surface-hover: rgba(255, 255, 255, 0.08);
    --border: rgba(255, 255, 255, 0.1);
    --border-focus: rgba(229, 57, 53, 0.5);
    --text-0: #e2e2e2;
    --text-1: #a0a0b8;
    --text-2: #606070;
    --accent: #e53935;
    --accent-glow: rgba(229, 57, 53, 0.2);
    --success: #43a047;
    --error: #e53935;
    --ha-on: #43a047;
    --ha-off: #606070;
}
```

### Step 4: Done

Restart PyDeck. Your theme appears in **Settings → Appearance**. No registration, no code changes — just a folder, a manifest, and a CSS file.

---

## 2. Theme Directory Structure

All themes live under `themes/` in the project root:

```
themes/
├── default/               # Built-in dark/light default
│   ├── manifest.json
│   ├── dark.css           # Empty — base variables come from style.css
│   └── light.css
├── nord/                  # Nord palette
│   ├── manifest.json
│   ├── dark.css
│   └── light.css
└── my-theme/              # Your custom theme
    ├── manifest.json
    └── theme.css          # Single-variant themes use this name
```

### File Summary

| File | Required | Purpose |
|:---|:---|:---|
| `manifest.json` | **Yes** | Declares the theme label, description, scheme/variants, and variant labels. The loader ignores any folder without one. |
| `theme.css` | For single-variant themes | The CSS file loaded when the user selects the theme. Must be referenced by `manifest.json`. |
| `dark.css` / `light.css` | For multi-variant themes | One CSS file per variant. Names are configurable in `manifest.json`. |

---

## 3. manifest.json Reference

The manifest is a JSON object at the root of the theme folder. It controls how the theme appears in the UI and which CSS files are loaded for each variant.

### Full manifest (all fields)

```json
{
  "label":       "My Theme",
  "description": "A warm dark palette inspired by old terminals",
  "scheme":      "dark",
  "variants": {
    "dark":  "dark.css",
    "light": "light.css"
  },
  "variant_labels": {
    "dark":  "Dark",
    "light": "Light"
  }
}
```

### Field Reference

| Field | Type | Required | Description |
|:---|:---|:---|:---|
| `label` | string | **Yes** | Human-readable theme name shown in **Settings → Appearance**. A folder without a `label` is silently skipped by the loader. |
| `description` | string | No | One-line description shown below the theme name in the UI. |
| `scheme` | string | No | For **single-file themes only**. Tells the UI whether this theme is `"dark"` or `"light"` so the correct color-scheme CSS property is applied. Defaults to `"dark"` if omitted. Ignored when `variants` is present. |
| `variants` | object | No | Maps `"dark"` and/or `"light"` to CSS filenames. When present, the theme shows a dark/light switcher in the UI. Omit it for a single-variant theme. |
| `variant_labels` | object | No | Custom display labels for each variant key. When omitted, `"dark"` shows as **Dark** and `"light"` shows as **Light**. |

### Rules

- `label` must be a non-empty string. Themes without it are invisible to the UI.
- `variants` filenames must be simple basenames — no path separators or `..`.
- The corresponding CSS file(s) must exist on disk. If a variant's file is missing, that variant is excluded from the discovered list.
- `scheme` only matters for single-file themes. Multi-variant themes infer the scheme from the variant key (`dark` → `"dark"`, `light` → `"light"`).

---

## 4. CSS Variables Reference

PyDeck's entire UI is driven by CSS custom properties defined in `:root`. A theme only needs to override the variables it wants to change. All structural CSS (layout, spacing, typography, animations) lives in `app/static/css/style.css` and is never duplicated inside a theme file.

### Color Layers

| Variable | Purpose | Dark example | Light example |
|:---|:---|:---|:---|
| `--bg-0` | Main page/canvas background | `#111111` | `#f0f0f2` |
| `--bg-1` | Panel / sidebar / header surface | `#1a1a1a` | `#e4e4e8` |
| `--bg-2` | Elevated surface (device frame, inputs) | `#242424` | `#d8d8de` |
| `--bg-3` | Highest surface (active tabs, toggle track) | `#2e2e2e` | `#cacad2` |

Background layers form a depth stack. `--bg-0` is the deepest (furthest back); `--bg-3` is closest to the user.

### Surface Overlays

| Variable | Purpose |
|:---|:---|
| `--surface` | Semi-transparent fill for cards, tiles, and input backgrounds |
| `--surface-hover` | Fill applied on hover — should be slightly more opaque than `--surface` |

Use `rgba()` values so the underlying background color shows through:

```css
--surface:       rgba(255, 255, 255, 0.04);
--surface-hover: rgba(255, 255, 255, 0.09);
```

For light themes, flip the channel:

```css
--surface:       rgba(0, 0, 0, 0.04);
--surface-hover: rgba(0, 0, 0, 0.08);
```

### Borders

| Variable | Purpose |
|:---|:---|
| `--border` | Default border color for all UI elements |
| `--border-focus` | Border highlight when an input or control has focus |

```css
/* Dark */
--border:       rgba(255, 255, 255, 0.1);
--border-focus: rgba(120, 80, 200, 0.5);

/* Light */
--border:       rgba(0, 0, 0, 0.1);
--border-focus: rgba(77, 111, 255, 0.45);
```

### Text

| Variable | Typical use |
|:---|:---|
| `--text-0` | Primary text — headings, labels, active values |
| `--text-1` | Secondary text — descriptions, placeholders, subdued labels |
| `--text-2` | Tertiary text — timestamps, disabled states, hint text |

```css
/* Dark */
--text-0: #ebebeb;
--text-1: #999999;
--text-2: #555555;

/* Light */
--text-0: #1a1a1c;
--text-1: #5c5c66;
--text-2: #8a8a96;
```

### Accent

| Variable | Purpose |
|:---|:---|
| `--accent` | Brand/highlight color — buttons, selected borders, links, toggle track |
| `--accent-glow` | Transparent version of accent used for glows and selected halos |

`--accent-glow` should be `rgba()` of `--accent` at around 15–25% opacity:

```css
--accent:      #7aa2f7;
--accent-glow: rgba(122, 162, 247, 0.2);
```

### Semantic Colors

| Variable | Purpose |
|:---|:---|
| `--success` | Success states, positive feedback, green indicators |
| `--error` | Error states, destructive actions, red indicators |

### Home Assistant Variables

| Variable | Purpose |
|:---|:---|
| `--ha-on` | Color of HA entity state badge and preview when the entity is **on** |
| `--ha-off` | Color of HA entity state badge when the entity is **off** |

These are used by the Home Assistant plugin's entity picker and preview panel. If you don't use HA, you can set them to `--success` and `--text-2`:

```css
--ha-on:  var(--success);
--ha-off: var(--text-2);
```

### Shape and Typography

| Variable | Default | Purpose |
|:---|:---|:---|
| `--radius` | `10px` | Corner radius for cards, buttons, and modals |
| `--radius-sm` | `6px` | Smaller corner radius for inputs and tags |
| `--font` | `"Inter", system-ui, …` | Font stack for all UI text |

These are set in `style.css`. Override them in your theme only when you intentionally want a different shape or typeface:

```css
:root {
    --radius:    12px;   /* rounder than default */
    --radius-sm: 8px;
    --font: "JetBrains Mono", monospace;
}
```

---

## 5. Single-File Themes

The simplest theme format. One manifest, one CSS file, one variant. No dark/light toggle in the UI.

### Folder layout

```
themes/monokai/
├── manifest.json
└── theme.css
```

### manifest.json

```json
{
  "label": "Monokai",
  "description": "Classic Monokai dark palette",
  "scheme": "dark"
}
```

The CSS file **must** be named `theme.css` for single-file themes.

### theme.css

```css
/* Monokai */
:root {
    --bg-0: #272822;
    --bg-1: #1e1f1c;
    --bg-2: #2d2e27;
    --bg-3: #3e3d32;
    --surface: rgba(255, 255, 255, 0.04);
    --surface-hover: rgba(255, 255, 255, 0.08);
    --border: rgba(255, 255, 255, 0.09);
    --border-focus: rgba(174, 129, 255, 0.5);
    --text-0: #f8f8f2;
    --text-1: #cfcfc2;
    --text-2: #75715e;
    --accent: #ae81ff;
    --accent-glow: rgba(174, 129, 255, 0.2);
    --success: #a6e22e;
    --error: #f92672;
    --ha-on: #a6e22e;
    --ha-off: #75715e;
}
```

### How the selection ID looks

```
monokai/theme
```

This is the string stored in `config.json` when the user picks this theme.

---

## 6. Multi-Variant Themes (Dark + Light)

When a theme ships two palettes (dark and light), use the `variants` object. The UI shows both options in the same row under **Settings → Appearance**.

### Folder layout

```
themes/ocean/
├── manifest.json
├── dark.css
└── light.css
```

### manifest.json

```json
{
  "label": "Ocean",
  "description": "Deep blue ocean palette — dark and light",
  "variants": {
    "dark": "dark.css",
    "light": "light.css"
  }
}
```

When `variants` is present, `scheme` is ignored — the scheme is derived from the variant key.

### dark.css

```css
/* Ocean Dark */
:root {
    --bg-0: #0d1b2a;
    --bg-1: #0a1628;
    --bg-2: #112236;
    --bg-3: #1a3248;
    --surface: rgba(173, 216, 230, 0.05);
    --surface-hover: rgba(173, 216, 230, 0.1);
    --border: rgba(173, 216, 230, 0.1);
    --border-focus: rgba(30, 150, 220, 0.55);
    --text-0: #cce7f5;
    --text-1: #85b9d4;
    --text-2: #4a7a96;
    --accent: #1e96dc;
    --accent-glow: rgba(30, 150, 220, 0.22);
    --success: #26c281;
    --error: #e85d75;
    --ha-on: #26c281;
    --ha-off: #4a7a96;
}
```

### light.css

```css
/* Ocean Light */
:root {
    --bg-0: #eaf5fb;
    --bg-1: #dceef7;
    --bg-2: #cde5f2;
    --bg-3: #b8d8eb;
    --surface: rgba(13, 27, 42, 0.04);
    --surface-hover: rgba(13, 27, 42, 0.08);
    --border: rgba(13, 27, 42, 0.12);
    --border-focus: rgba(10, 100, 170, 0.45);
    --text-0: #0d1b2a;
    --text-1: #2a5470;
    --text-2: #5a7d96;
    --accent: #0a64aa;
    --accent-glow: rgba(10, 100, 170, 0.18);
    --success: #1a8c5a;
    --error: #c0324a;
    --ha-on: #1a8c5a;
    --ha-off: #5a7d96;
}
```

### How the selection IDs look

```
ocean/dark
ocean/light
```

Both appear in the Appearance settings as one group, letting the user switch between them independently.

---

## 7. Custom Variant Labels

By default, `"dark"` shows as **Dark** and `"light"` shows as **Light** in the UI. Override them with `variant_labels`:

```json
{
  "label": "Catppuccin",
  "description": "Soothing pastel theme",
  "variants": {
    "dark": "dark.css",
    "light": "light.css"
  },
  "variant_labels": {
    "dark": "Mocha",
    "light": "Latte"
  }
}
```

This is useful when your dark and light variants have proper names from the upstream palette (like Mocha/Latte for Catppuccin, or Night/Day for Tokyo Night).

Another example — Nord's variants could use the palette section names:

```json
{
  "label": "Nord",
  "variants": {
    "dark": "dark.css",
    "light": "light.css"
  },
  "variant_labels": {
    "dark": "Polar Night",
    "light": "Snow Storm"
  }
}
```

---

## 8. Overriding Non-Color Variables

Most themes only touch the color variables. But `--radius`, `--radius-sm`, and `--font` can also be overridden when your design calls for it.

### Rounder corners

```css
/* Rounded design — softer than the 10px/6px defaults */
:root {
    --bg-0: #1e1e2e;
    /* ... color vars ... */
    --radius:    14px;
    --radius-sm: 9px;
}
```

### Sharper corners

```css
/* Flat / Windows-style — no rounding at all */
:root {
    --bg-0: #1e1e1e;
    /* ... color vars ... */
    --radius:    3px;
    --radius-sm: 2px;
}
```

### Custom font

```css
:root {
    --bg-0: #1a1a2e;
    /* ... color vars ... */
    --font: "JetBrains Mono", "Fira Code", monospace;
}
```

> **Note:** `--font` must be a font already installed on the system. PyDeck does not bundle or load web fonts. Setting an unavailable font falls back to the browser default.

---

## 9. Full `:root` Override Reference

This is the complete list of every variable a theme can set, with the default dark values from `style.css` shown as a starting point:

```css
:root {
    /* ── Background layers ── */
    --bg-0: #111111;     /* main background */
    --bg-1: #1a1a1a;     /* panels / sidebar / header */
    --bg-2: #242424;     /* inputs / device frame */
    --bg-3: #2e2e2e;     /* active tabs / toggles */

    /* ── Surfaces (semi-transparent overlays) ── */
    --surface:       rgba(255, 255, 255, 0.05);
    --surface-hover: rgba(255, 255, 255, 0.09);

    /* ── Borders ── */
    --border:       rgba(255, 255, 255, 0.09);
    --border-focus: rgba(168, 130, 255, 0.45);

    /* ── Text ── */
    --text-0: #ebebeb;   /* primary */
    --text-1: #999999;   /* secondary */
    --text-2: #555555;   /* tertiary / disabled */

    /* ── Accent ── */
    --accent:      #a882ff;
    --accent-glow: rgba(168, 130, 255, 0.15);

    /* ── Semantic ── */
    --success: #22c55e;
    --error:   #ef4444;

    /* ── Home Assistant ── */
    --ha-on:  #22c55e;
    --ha-off: #555555;

    /* ── Shape ── */
    --radius:    10px;
    --radius-sm: 6px;

    /* ── Typography ── */
    --font: "Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
}
```

A theme's CSS file only needs to declare the variables it actually wants to change. Any variable not listed falls through to the default value from `style.css`.

---

## 10. How the Theme Loader Works

Understanding the loader helps you debug theme issues.

### Discovery

On startup and whenever the theme list is requested, PyDeck scans every immediate subdirectory of `themes/`:

1. Skip folders whose name contains `/`, `\`, or `..`
2. Read `manifest.json` — skip if missing or invalid JSON
3. Skip if `label` is missing or empty
4. If `variants` is present → **multi-variant theme** (see below)
5. If `variants` is absent → look for `theme.css` → **single-file theme**
6. Any variant whose CSS file does not exist on disk is silently excluded

### Single-file loading

```
themes/<family>/theme.css
```

Selection ID: `<family>/theme`

The `scheme` field from the manifest is used to set the CSS `color-scheme` property.

### Multi-variant loading

```
themes/<family>/<filename>   ← filename comes from the variants object
```

Only `"dark"` and `"light"` are recognized variant keys. Any other key in `variants` is ignored.

Selection ID: `<family>/dark` or `<family>/light`

### CSS injection

The selected CSS file is served at:

```
GET /api/themes/<family>/<slot>.css
```

The HTML template injects it as:

```html
<link id="theme-css" rel="stylesheet" href="/api/themes/nord/dark.css">
```

This loads **after** `style.css`, so theme variables override the base defaults cleanly. The theme CSS never needs to re-declare structural rules — only `:root` variable overrides.

---

## 11. Theme Selection IDs

Each selectable variant has a unique string ID stored in `config.json`:

| Theme type | Format | Example |
|:---|:---|:---|
| Single-file | `<family>/theme` | `monokai/theme` |
| Multi-variant dark | `<family>/dark` | `nord/dark` |
| Multi-variant light | `<family>/light` | `nord/light` |

These IDs are used internally and in the Settings API. They are also what gets stored in `~/.config/pydeck/core/config.json` under `ui_theme`.

---

## 12. Real-World Examples

### Nord — Minimal Multi-Variant

The simplest possible multi-variant theme. Each CSS file is a single `:root {}` block.

**`themes/nord/manifest.json`:**

```json
{
  "label": "Nord",
  "description": "Official Nord palette — Polar Night, Snow Storm, Frost",
  "variants": {
    "dark": "dark.css",
    "light": "light.css"
  },
  "variant_labels": {
    "dark": "Dark",
    "light": "Light"
  }
}
```

**`themes/nord/dark.css`:**

```css
/* Nord Dark — Polar Night + Frost */
:root {
    --bg-0: #2e3440;
    --bg-1: #3b4252;
    --bg-2: #434c5e;
    --bg-3: #4c566a;
    --surface: rgba(236, 239, 244, 0.06);
    --surface-hover: rgba(236, 239, 244, 0.11);
    --border: rgba(236, 239, 244, 0.1);
    --border-focus: rgba(136, 192, 208, 0.55);
    --text-0: #eceff4;
    --text-1: #d8dee9;
    --text-2: #aeb4c0;
    --accent: #88c0d0;
    --accent-glow: rgba(136, 192, 208, 0.18);
    --success: #a3be8c;
    --error: #bf616a;
    --ha-on: #a3be8c;
    --ha-off: #4c566a;
}
```

**`themes/nord/light.css`:**

```css
/* Nord Light — Snow Storm + Frost */
:root {
    --bg-0: #eceff4;
    --bg-1: #e5e9f0;
    --bg-2: #d8dee9;
    --bg-3: #c8d0e0;
    --surface: rgba(46, 52, 64, 0.045);
    --surface-hover: rgba(46, 52, 64, 0.09);
    --border: rgba(46, 52, 64, 0.12);
    --border-focus: rgba(94, 129, 172, 0.5);
    --text-0: #2e3440;
    --text-1: #4c566a;
    --text-2: #6f7a8c;
    --accent: #5e81ac;
    --accent-glow: rgba(94, 129, 172, 0.2);
    --success: #a3be8c;
    --error: #bf616a;
    --ha-on: #a3be8c;
    --ha-off: #7b8494;
}
```

**Takeaway:** No structural CSS at all. Just two files of pure color overrides.

---

### El Clásico — Rounded Corners Override

Same structure as Nord, but also overrides `--radius` and `--radius-sm` for a softer look.

**`themes/el-clasico/manifest.json`:**

```json
{
  "label": "El clásico",
  "description": "Rounded modern layout — dark and light palettes",
  "variants": {
    "dark": "dark.css",
    "light": "light.css"
  },
  "variant_labels": {
    "dark": "Dark",
    "light": "Light"
  }
}
```

**`themes/el-clasico/dark.css`:**

```css
/* El Clásico — dark variant */
:root {
    --bg-0: #0c0c14;
    --bg-1: #13131f;
    --bg-2: #1a1a2e;
    --bg-3: #22223a;
    --surface: rgba(255, 255, 255, 0.04);
    --surface-hover: rgba(255, 255, 255, 0.07);
    --border: rgba(255, 255, 255, 0.08);
    --border-focus: rgba(120, 160, 255, 0.45);
    --text-0: #eaeaf0;
    --text-1: #a0a0b8;
    --text-2: #60607a;
    --accent: #6c8cff;
    --accent-glow: rgba(108, 140, 255, 0.25);
    --success: #3dd68c;
    --error: #f0506e;
    --ha-on: #3dd68c;
    --ha-off: #60607a;
    --radius: 12px;
    --radius-sm: 8px;
}
```

**Takeaway:** Non-color variables like `--radius` can sit in the same `:root` block. Only declare the ones that differ from the base.

---

### Minimal Single-File Theme

A standalone dark theme with a single CSS file. No light/dark toggle.

**`themes/solarized-dark/manifest.json`:**

```json
{
  "label": "Solarized Dark",
  "description": "Ethan Schoonover's precision colors for machines and people",
  "scheme": "dark"
}
```

**`themes/solarized-dark/theme.css`:**

```css
/* Solarized Dark — https://ethanschoonover.com/solarized/ */
:root {
    --bg-0: #002b36;
    --bg-1: #073642;
    --bg-2: #094b56;
    --bg-3: #0b5663;
    --surface: rgba(253, 246, 227, 0.04);
    --surface-hover: rgba(253, 246, 227, 0.08);
    --border: rgba(253, 246, 227, 0.1);
    --border-focus: rgba(38, 139, 210, 0.5);
    --text-0: #fdf6e3;
    --text-1: #eee8d5;
    --text-2: #657b83;
    --accent: #268bd2;
    --accent-glow: rgba(38, 139, 210, 0.2);
    --success: #859900;
    --error: #dc322f;
    --ha-on: #859900;
    --ha-off: #657b83;
}
```

**Takeaway:** Single-file themes use `theme.css` and declare `"scheme"` in the manifest instead of `"variants"`.

---

### Catppuccin — Named Variants

Catppuccin's two variants have proper palette names. `variant_labels` renames them in the UI.

**`themes/catppuccin/manifest.json`:**

```json
{
  "label": "Catppuccin",
  "description": "Soothing pastel theme — Mocha dark and Latte light",
  "variants": {
    "dark": "dark.css",
    "light": "light.css"
  },
  "variant_labels": {
    "dark": "Mocha",
    "light": "Latte"
  }
}
```

The Settings UI shows **Catppuccin (Mocha)** and **Catppuccin (Latte)** as separate selectable items.

---

### High-Contrast Accessibility Theme

A single-file theme built for maximum legibility.

**`themes/high-contrast/manifest.json`:**

```json
{
  "label": "High Contrast",
  "description": "Maximum legibility — pure black background, white text",
  "scheme": "dark"
}
```

**`themes/high-contrast/theme.css`:**

```css
/* High Contrast */
:root {
    --bg-0: #000000;
    --bg-1: #0d0d0d;
    --bg-2: #1a1a1a;
    --bg-3: #2a2a2a;
    --surface: rgba(255, 255, 255, 0.06);
    --surface-hover: rgba(255, 255, 255, 0.12);
    --border: rgba(255, 255, 255, 0.25);
    --border-focus: rgba(255, 255, 0, 0.8);
    --text-0: #ffffff;
    --text-1: #dddddd;
    --text-2: #aaaaaa;
    --accent: #ffff00;
    --accent-glow: rgba(255, 255, 0, 0.2);
    --success: #00ff88;
    --error: #ff4444;
    --ha-on: #00ff88;
    --ha-off: #aaaaaa;
    --radius: 4px;
    --radius-sm: 2px;
}
```

---

### Corporate Brand Theme

A theme that uses a company's brand colors and custom font.

**`themes/acme/manifest.json`:**

```json
{
  "label": "ACME Corp",
  "description": "ACME brand palette",
  "variants": {
    "dark": "dark.css",
    "light": "light.css"
  },
  "variant_labels": {
    "dark": "Professional Dark",
    "light": "Professional Light"
  }
}
```

**`themes/acme/dark.css`:**

```css
/* ACME Corp Dark */
:root {
    --bg-0: #0a0e1a;
    --bg-1: #111827;
    --bg-2: #1c2333;
    --bg-3: #263044;
    --surface: rgba(255, 255, 255, 0.04);
    --surface-hover: rgba(255, 255, 255, 0.08);
    --border: rgba(255, 255, 255, 0.08);
    --border-focus: rgba(0, 120, 212, 0.6);
    --text-0: #f3f4f6;
    --text-1: #9ca3af;
    --text-2: #4b5563;
    --accent: #0078d4;
    --accent-glow: rgba(0, 120, 212, 0.2);
    --success: #107c10;
    --error: #c50f1f;
    --ha-on: #107c10;
    --ha-off: #4b5563;
    --font: "Segoe UI", -apple-system, sans-serif;
}
```

---

## 13. Tips and Best Practices

### Keep CSS files to `:root {}` only

Themes should only override CSS variables. Structural rules (layout, spacing, selectors) belong in `app/static/css/style.css`. Adding layout rules in a theme creates a maintenance burden — every time the core CSS changes, theme CSS needs updating too.

```css
/* Good — only variable overrides */
:root {
    --bg-0: #1e1e2e;
    --accent: #cba6f7;
}

/* Bad — duplicating structural CSS */
.deck-btn {
    width: 88px;
    height: 88px;
    border-radius: var(--radius);  /* this is already in style.css */
}
```

### Pick accessible color combinations

Ensure sufficient contrast between text and backgrounds. The WCAG AA standard requires at least 4.5:1 for normal text and 3:1 for large text.

A quick sanity check:
- `--text-0` against `--bg-1` should be clearly readable
- `--text-1` against `--bg-0` should be subdued but legible
- `--accent` against `--bg-1` should stand out

### Keep `--surface` and `--surface-hover` as `rgba()`

Using `rgba()` for surfaces lets them blend naturally with any background layer. A hardcoded hex color for `--surface` will look wrong when surface elements appear on different background layers.

```css
/* Good */
--surface:       rgba(255, 255, 255, 0.04);
--surface-hover: rgba(255, 255, 255, 0.09);

/* Bad — breaks on different bg layers */
--surface:       #1e1e2e;
```

### Match `--accent-glow` to `--accent`

`--accent-glow` is used for button selection halos and focus shadows. It should always be a transparent version of `--accent`. Extract the RGB channels and set opacity to 15–25%:

```css
--accent:      #88c0d0;                      /* solid */
--accent-glow: rgba(136, 192, 208, 0.18);   /* same color, 18% opacity */
```

### `--ha-on` can reuse `--success`

If your theme doesn't specifically design for Home Assistant, point both to the same green:

```css
--success: #43a047;
--ha-on:   #43a047;   /* same as success */
--ha-off:  var(--text-2);
```

### Test both variants before shipping

If you build a dark/light pair, verify both variants in the Settings → Appearance panel. Common issues:
- Light theme with `rgba(255,255,255,…)` surfaces (should be `rgba(0,0,0,…)` for light)
- Text color that works on dark but disappears on light backgrounds
- `--border-focus` that's invisible because it has the same hue as the background

### Folder name is the permanent ID

The folder name becomes the theme's family ID and is stored in user config files. Renaming the folder after users have saved this theme as their preference will break their selection and fall back to the default. Choose a stable, slug-friendly name from the start: lowercase, hyphens instead of spaces, no special characters.

```
themes/tokyo-night/    ✓  stable
themes/Tokyo Night/    ✗  spaces not allowed in paths
themes/my_theme_v2/    ✓  underscores are fine too
```
