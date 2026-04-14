# Theme Development — Getting Started

After this page you can add a new color palette to PyDeck as a theme folder and see it in **Settings → Appearance** without touching application code.

---

## 1. Quick Start — Minimal Theme

The fastest way to add a new palette: one folder, one `manifest.json`, and one or two CSS files.

### Step 1: Create the theme folder

```text
themes/my-theme/
```

The folder name is the theme's **family ID**. It must be a single path component — no slashes, no dots, no `..`.

### Step 2: Create `manifest.json`

Pick **one** of the shapes below. They differ only in whether PyDeck shows a **dark/light switcher** for your theme.

#### Path A — Single stylesheet (no switcher)

Use this when you ship exactly one CSS file (for example `theme.css`). PyDeck loads that file whenever the user selects your theme.

```json
{
  "label": "My Theme",
  "description": "A custom dark theme",
  "scheme": "dark"
}
```

With this shape, the loader looks for `theme.css` in the same folder (convention for single-variant themes). Set `"scheme"` to `"dark"` or `"light"` so the UI applies the matching `color-scheme`.

#### Path B — Dark and light variants (switcher in the UI)

Use this when you ship separate `dark.css` and `light.css` files. The user can flip between them in **Settings → Appearance**.

```json
{
  "label": "My Theme",
  "description": "A theme with dark and light modes",
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

When `variants` is present, the `scheme` field is ignored; each variant key supplies the scheme for its CSS file.

### Step 3: Create the CSS file(s)

Use the same variable names PyDeck expects (you can copy the block below into **Path A** as `theme.css`, or split / tune values across **Path B** `dark.css` and `light.css`).

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

For **Path B**, create both `dark.css` and `light.css` (you can start by duplicating the block above into each file, then adjust the light palette).

### Step 4: Done

Restart PyDeck. Your theme appears in **Settings → Appearance**. No registration beyond these files — the theme loader discovers folders under `themes/` automatically.

---

## 2. Theme Directory Structure

All themes live under `themes/` in the project root:

```text
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
