# PDK Development — Templates & Elements

---

## 1. template.xml — Templates

Each function's `template.xml` file contains one or more `<template>` blocks. Each template defines a button face layout that can be selected at runtime.

### Template Block Syntax

```xml
<template name="my_view" title="My View" description="Shows something" icon="assets/icons/icon.png">
  <box class="container">
    <text class="title">{heading}</text>
    <img src="assets/icons/logo.png" width="32" height="32" fit="contain" />
  </box>
</template>
```

### Template Attributes

| Attribute | Required | Description |
|:---|:---|:---|
| `name` | Yes | Identifier used to select this template. Maps to a function name in the manifest. |
| `title` | No | Human-readable label shown in the sidebar. Defaults to `name`. |
| `description` | No | Short description shown in the UI. |
| `icon` | No | Path to a sidebar icon image **under the plugin directory** (e.g. `assets/icons/foo.png`). Auto-generated manifests copy this form into `sidebar_icon`; use the same style when writing `manifest.json` by hand (no `plugins/plugin/...` prefix). |

### Multiple Templates

A single plugin can define multiple templates. The active template is selected by setting `ctx.state._template` in your event handler:

```xml
<template name="main">
  <box class="bg">
    <text class="value">{value}</text>
  </box>
</template>

<template name="detail">
  <box class="bg">
    <text class="label">{detail_line1}</text>
    <text class="label">{detail_line2}</text>
  </box>
</template>
```

```python
def on_press(ctx):
    if ctx.state.get("view") == "main":
        ctx.state.view = "detail"
        ctx.state._template = "detail"
    else:
        ctx.state.view = "main"
        ctx.state._template = "main"
```

### Inline Settings (UI Fields)

Templates can embed `<settings>` blocks with `<field>` elements to define UI fields. These are equivalent to the `ui` array in `manifest.json`.

Inline `<settings>` example:

```xml
<template name="weather" title="Weather">
  <settings>
    <field type="input" id="location" label="Location" placeholder="Oslo" default="" />
    <field type="select" id="temperature_unit" label="Unit" default="C">
      <option value="C" label="Celsius" />
      <option value="F" label="Fahrenheit" />
    </field>
  </settings>
  <box class="bg">
    <text class="temp">{temperature}</text>
  </box>
</template>
```

#### Field Attributes

| Attribute | Description |
|:---|:---|
| `type` | Field type: `input`, `select`, `checkbox`, `number`, `slider`, `radio`, `group`, etc. |
| `id` | Key name — available as `ctx.config.get("id")` in handlers. |
| `label` | Label shown in the button editor UI. |
| `placeholder` | Placeholder text for input fields. |
| `default` | Default value. Automatically cast: `checkbox` → boolean, `number`/`slider` → numeric. |
| `visible_if` | Conditionally show/hide this field based on another field's value (see below). |
| `fields` | For `group` type only — an array of child field definitions rendered inside the group container. |

#### Field Type: `group`

The `group` type renders a visual container with nested child fields. Use it to group related settings together:

```json
{
  "type": "group",
  "label": "Advanced Settings",
  "fields": [
    { "type": "checkbox", "id": "option_a", "label": "Option A", "default": false },
    { "type": "input", "id": "option_b", "label": "Option B", "default": "" }
  ]
}
```

In XML settings blocks:

```xml
<field type="group" label="Advanced Settings">
  <field type="checkbox" id="option_a" label="Option A" default="false" />
  <field type="input" id="option_b" label="Option B" default="" />
</field>
```

#### Conditional Visibility: `visible_if`

Fields can be shown or hidden based on another field's value using the `visible_if` attribute. This is set in `manifest.json` (not in XML `<field>` elements):

```json
{
  "type": "checkbox",
  "id": "show_details",
  "label": "Show details",
  "default": false,
  "visible_if": { "field": "mode", "value": "advanced" }
}
```

| Key | Description |
|:---|:---|
| `field` | The `id` of the field to watch. |
| `value` | Show this field when the watched field equals this value. |
| `not_value` | Show this field when the watched field does **not** equal this value. Use `not_value` instead of `value` for inverse conditions. |

Example using `not_value`:

```json
{
  "type": "checkbox",
  "id": "exclude_current",
  "label": "Skip current time",
  "default": false,
  "visible_if": { "field": "forecast_interval", "not_value": "24" }
}
```

This field is visible whenever `forecast_interval` is set to anything other than `"24"`.

---

## 2. Elements Reference

PDK templates use XML elements. Each element has a tag name, allowed attributes, and default style values.

### Common Attributes

All elements support these attributes:

| Attribute | Description |
|:---|:---|
| `class` | Space-separated CSS class names for styling. |
| `id` | Unique identifier for `#id` CSS selectors. |
| `width` | Explicit width (pixels, `%`, `em`, `rem`, or `auto`). |
| `height` | Explicit height (pixels, `%`, `em`, `rem`, or `auto`). |
| `style` | Inline style declarations (highest specificity). |

### Element Tags

#### `<box>` — Container

The primary layout container. Arranges children using flexbox-like rules.

```xml
<box class="row" style="direction: row; gap: 4;">
  <text>Left</text>
  <text>Right</text>
</box>
```

- **Container:** Yes
- **Default direction:** `column`

#### `<text>` — Text Label

Renders a text string. The element's text content is its display value.

```xml
<text class="title" style="font-size: 18; font-weight: bold;">{heading}</text>
```

- **Container:** No
- **Default size:** auto (fits text content)
- **Single-line only** — text is rendered on a single line with no wrapping or multi-line support.

#### `<img>` — Image

Displays an image file. The `src` path is resolved relative to the plugin directory.

```xml
<img src="assets/icons/icon.png" width="32" height="32" fit="contain" />
```

| Attribute | Description |
|:---|:---|
| `src` | Path to the image file. **Install-dir assets** resolve relative to the plugin directory (e.g. `assets/icons/<file>`). **Runtime files** under `ctx.storage_path` may use a **short path relative to that storage folder** (e.g. `_art.jpg`, `icons/cache.png`). Supports `{variable}` interpolation. **Legacy:** global logical paths `plugins/plugin/...` / `plugins/storage/...`, and `../../storage/<plugin_name>/...` from the plugin directory, still work. |
| `fit` | Sizing mode: `cover` (default — fill and crop), `contain` (fit within bounds), or `stretch` (exact size). |

- **Container:** No
- **Default size:** auto (source image dimensions)

> **Note:** The layout engine does not read the image file to determine intrinsic size — `<img>` without explicit `width` and `height` is treated as 0×0 during layout. The renderer compensates by using the image's natural dimensions at draw time, but this can cause unexpected flex layout results. Always set explicit `width` and `height` on `<img>` for predictable sizing.

#### `<rect>` — Rectangle

Draws a filled or stroked rectangle.

```xml
<rect width="40" height="20" fill="#ff0000" stroke="#ffffff" stroke-width="2" />
```

| Attribute | Description |
|:---|:---|
| `fill` | Fill colour (hex or `rgb()`). Falls back to `background` style. |
| `stroke` | Stroke colour. Falls back to `border-color` style. |
| `stroke-width` | Stroke width in pixels. Default: `1`. |

- **Container:** No

#### `<circle>` — Circle

Draws a filled or stroked circle.

```xml
<circle radius="16" fill="#00ff88" />
```

| Attribute | Description |
|:---|:---|
| `fill` | Fill colour. |
| `stroke` | Stroke colour. |
| `stroke-width` | Stroke width. Default: `1`. |
| `radius` | Circle radius in pixels. |

- **Container:** No

#### `<line>` — Line

Draws a straight line between two points.

```xml
<line x1="0" y1="0" x2="72" y2="72" stroke="#ffffff" stroke-width="2" />
```

| Attribute | Description |
|:---|:---|
| `x1`, `y1` | Start point coordinates (relative to element position). |
| `x2`, `y2` | End point coordinates. |
| `stroke` | Line colour. Falls back to `color` style. |
| `stroke-width` | Line width. Default: `1`. |

- **Container:** No

#### `<progress>` — Progress Bar

Draws a horizontal progress bar.

```xml
<progress value="{percent}" fill-color="#00ff88" track-color="#333333" />
```

| Attribute | Description |
|:---|:---|
| `value` | Progress percentage (0–100). Supports `{variable}` interpolation. |
| `fill-color` | Colour of the filled portion. Supports gradients. Default: `#00ff88`. |
| `track-color` | Colour of the track background. Falls back to `background` style. Default: `#333333`. |

- **Container:** No
- **Default height:** `6px`
- **Default border-radius:** `3px`

#### `<spacer>` — Flexible Space

Absorbs remaining space in a flex layout. Equivalent to a flex-grow spacer.

```xml
<box style="direction: column;">
  <text>Top</text>
  <spacer />
  <text>Bottom</text>
</box>
```

When multiple spacers exist in the same container, the available space is divided equally among them.

- **Container:** No
- **Default size:** auto (expands to fill)

#### `<marquee>` — Scrolling Text

Renders horizontally scrolling text, clipped to the element bounds. When the rendered text fits within the box, it behaves identically to `<text>` (no scrolling). When the text overflows, it scrolls continuously from right to left.

```xml
<marquee class="song-title" speed="30">{track_name}</marquee>
```

| Attribute | Description |
|:---|:---|
| `speed` | Scroll speed in pixels per second. Default: `30`. |

- **Container:** No
- **Inherits all text styling** — `font-size`, `color`, `font-weight`, `font-style`, `shadow`, `text-stroke`, etc.
- **Automatically triggers the animation tick** (~15 FPS) — no `@keyframes` needed. See [Performance Notes](RENDERING.md#performance-notes) in the Animations section.
- Scroll offset is derived from the render timestamp, so no plugin-side state is required.

> **Tip:** Use `<marquee>` for labels that may overflow, such as song titles or long status messages. For text that always fits, prefer `<text>`.

---

## 3. Styling

PDK uses a CSS-like styling system. Styles can come from three sources, listed here from lowest to highest precedence (for rules with the same specificity, the higher-precedence source wins):

1. Linked stylesheets via `<link href="file.css" />` in `template.xml` (lowest precedence)
2. `src/shared.css` file in the plugin's `src/` directory (auto-loaded)
3. `<style>` blocks inside `template.xml` (highest precedence)

All sources are concatenated and parsed together. Inline `style=""` attributes on elements always have the highest specificity regardless of source.

### Selector Types

| Selector | Example | Matches |
|:---|:---|:---|
| Tag | `box` | All `<box>` elements |
| Class | `.highlight` | Elements with `class="highlight"` |
| ID | `#main` | Element with `id="main"` |
| Compound | `box.highlight` | `<box>` elements with class `highlight` |
| Compound multi-class | `.a.b` | Elements with both classes `a` and `b` |
| Comma-separated | `box, text` | All `<box>` and `<text>` elements |

### CSS Variables

Define variables in `:root` and reference them with `var()`:

```css
:root {
  --primary: #1DB954;
  --bg: #222222;
}

.container {
  background: var(--bg);
  color: var(--primary);
}
```

Variables can also use state interpolation:

```css
:root {
  --bg: {_button_color};
}
```

This reads `_button_color` from the render state, allowing the plugin to pick up the user's configured button colour.

### Specificity

Styles cascade using CSS-like specificity: `(id count, class count, tag count)`. Higher specificity wins. When specificity is equal, the rule defined later in the stylesheet takes precedence. Inline `style=""` attributes have the highest specificity.

### Supported Properties

#### Layout

| Property | Values | Default |
|:---|:---|:---|
| `direction` | `row`, `column` | `column` |
| `align` | `start`, `center`, `end`, `stretch` | `start` |
| `justify` | `start`, `center`, `end`, `space-between`, `space-around` | `start` |
| `gap` | pixels | `0` |
| `padding` | shorthand (1–4 values) | `0` |
| `padding-top/right/bottom/left` | pixels | `0` |
| `width` | pixels, `%`, `em`, `rem`, `auto` | `auto` |
| `height` | pixels, `%`, `em`, `rem`, `auto` | `auto` |

#### Typography

| Property | Values | Default |
|:---|:---|:---|
| `font-family` | Font name (resolved via fontconfig, falls back to DejaVu Sans) | `DejaVu Sans` |
| `font-size` | pixels, `em`, `rem`, `%`, named sizes | `14` |
| `font-weight` | `normal`, `bold` | `normal` |
| `font-style` | `normal`, `italic` | `normal` |
| `text-align` | `left`, `center`, `right` | `center` |
| `text-anchor` | A single character (e.g. `:`) or `none` | `none` |
| `text-decoration` | `none`, `underline` | `none` |
| `color` | hex, `rgb()` | `#ffffff` |

#### Visual

| Property | Values | Default |
|:---|:---|:---|
| `background` | hex, `rgb()`, `linear-gradient(...)`, `radial-gradient(...)`, `transparent` | `transparent` |
| `border` | shorthand: `<width> <color>` or `none` | `none` |
| `border-width` | pixels | `0` |
| `border-color` | hex, `rgb()`, `transparent` | `transparent` |
| `border-radius` | pixels | `0` |

#### Transform

| Property | Values | Default |
|:---|:---|:---|
| `rotate` | degrees (numeric) | `0` |

#### Effects

| Property | Values | Default |
|:---|:---|:---|
| `shadow` | `<offset-x> <offset-y> <blur> <color>` or `none` | `none` |
| `glow` | `<size> <color>` or `none` | `none` |
| `blur` | pixels (Gaussian blur radius) | `0` |
| `text-stroke` | `<width> <color>` or `none` | `none` |

#### Animation

| Property | Values | Default |
|:---|:---|:---|
| `animation` | `<name> <duration> [timing] [iteration] [direction]` or `none` | `none` |

See [Animations](RENDERING.md#3-animations) for full details and examples.

### CSS Units

| Unit | Description | Example |
|:---|:---|:---|
| `px` (or bare number) | Absolute pixels | `font-size: 14px;` or `font-size: 14;` |
| `em` | Relative to the element's own computed font-size | `font-size: 1.5em;` |
| `rem` | Relative to the root element's font-size | `font-size: 1.2rem;` |
| `%` | Relative to parent dimension (width for horizontal, height for vertical; font-size `%` is relative to parent font-size) | `width: 50%;` |

#### Named Font Sizes

| Name | Pixels |
|:---|:---|
| `xx-small` | 7 |
| `x-small` | 8 |
| `small` | 10 |
| `medium` | 14 |
| `large` | 18 |
| `x-large` | 22 |
| `xx-large` | 28 |

The keywords `smaller` and `larger` scale relative to the parent's font-size by a factor of `1.2`.

### Property Inheritance

The following properties are inherited from parent to child elements (matching CSS behaviour):

`color`, `font-family`, `font-size`, `font-weight`, `font-style`, `text-align`, `text-decoration`, `direction`

### Shorthand Expansion

**`padding`** — supports 1–4 value syntax identical to CSS:

```css
padding: 8;                /* all sides */
padding: 4 8;              /* vertical horizontal */
padding: 4 8 12;           /* top horizontal bottom */
padding: 4 8 12 16;        /* top right bottom left */
```

**`border`** — `<width> <color>` or `none`:

```css
border: 2 #ffffff;
border: none;
```
