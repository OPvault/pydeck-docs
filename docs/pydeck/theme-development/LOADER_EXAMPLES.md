# Theme Development — Loader & Examples

## 1. How the Theme Loader Works

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

```text
themes/<family>/theme.css
```

Selection ID: `<family>/theme`

The `scheme` field from the manifest is used to set the CSS `color-scheme` property.

### Multi-variant loading

```text
themes/<family>/<filename>   ← filename comes from the variants object
```

Only `"dark"` and `"light"` are recognized variant keys. Any other key in `variants` is ignored.

Selection ID: `<family>/dark` or `<family>/light`

### CSS injection

The selected CSS file is served at:

```text
GET /api/themes/<family>/<slot>.css
```

The HTML template injects it as:

```html
<link id="theme-css" rel="stylesheet" href="/api/themes/nord/dark.css">
```

This loads **after** `style.css`, so theme variables override the base defaults cleanly. The theme CSS never needs to re-declare structural rules — only `:root` variable overrides.

---

## 2. Theme Selection IDs

Each selectable variant has a unique string ID stored in `config.json`:

| Theme type | Format | Example |
|:---|:---|:---|
| Single-file | `<family>/theme` | `monokai/theme` |
| Multi-variant dark | `<family>/dark` | `nord/dark` |
| Multi-variant light | `<family>/light` | `nord/light` |

These IDs are used internally and in the Settings API. They are also what gets stored in `~/.config/pydeck/core/config.json` under `ui_theme`.

---

## 3. Real-World Examples

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

## 4. Tips and Best Practices

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

```text
themes/tokyo-night/    ✓  stable
themes/Tokyo Night/    ✗  spaces not allowed in paths
themes/my_theme_v2/    ✓  underscores are fine too
```
