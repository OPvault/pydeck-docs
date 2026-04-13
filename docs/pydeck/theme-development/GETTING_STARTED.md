# Theme Development — Getting Started

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
