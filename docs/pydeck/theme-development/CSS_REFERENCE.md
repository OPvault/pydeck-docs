# Theme Development — CSS Reference

## 1. CSS Variables Reference

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

## 2. Single-File Themes

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

## 3. Multi-Variant Themes (Dark + Light)

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

## 4. Custom Variant Labels

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

## 5. Overriding Non-Color Variables

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

## 6. Full `:root` Override Reference

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
