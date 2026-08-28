# Plugin Development — Rendering

---

## 1. Layout Engine

PDK uses a simplified flexbox layout engine. Every element is laid out inside a square canvas (typically 72–96 px depending on the Stream Deck model).

### Flex Container Model

Any `<box>` element acts as a flex container. The `direction` property sets the main axis:

| Direction | Main Axis | Cross Axis |
|:---|:---|:---|
| `column` (default) | Vertical (top to bottom) | Horizontal |
| `row` | Horizontal (left to right) | Vertical |

### Alignment

| Property | Axis | Values |
|:---|:---|:---|
| `justify` | Main axis | `start`, `center`, `end`, `space-between`, `space-around` |
| `align` | Cross axis | `start`, `center`, `end`, `stretch` |

### Sizing

- **`auto`** — the element sizes to fit its content (text measurement, child elements, or image dimensions).
- **Explicit values** — fixed size in pixels, `%`, `em`, or `rem`.

### Spacer Behaviour

The `<spacer>` element absorbs all remaining free space on the main axis. Multiple spacers in the same container share the space equally:

```xml
<box style="direction: column;">
  <text>Pinned to top</text>
  <spacer />
  <text>Pinned to bottom</text>
</box>
```

### Gap

The `gap` property adds spacing between children on the main axis:

```css
.row {
  direction: row;
  gap: 4;
}
```

---

## 2. Renderer

The PDK renderer walks the layout tree and paints each element to a Pillow `Image` in back-to-front order:

1. **Background** — solid colour or gradient (linear / radial)
2. **Border** — stroke with optional `border-radius`
3. **Content** — text, images, shapes (`rect`, `circle`, `line`), progress bars
4. **Child elements** — recursive rendering
5. **Effects** — `blur` and `glow` applied as post-processing

### Backgrounds

Solid colour:

```css
.container { background: #1a1a2e; }
```

Linear gradient:

```css
.container { background: linear-gradient(180deg, #0091fe, #02cdf9); }
```

Radial gradient:

```css
.container { background: radial-gradient(#ffffff, #000000); }
```

Gradient angles follow CSS convention: `0deg` = bottom-to-top, `90deg` = left-to-right, `180deg` = top-to-bottom (default), `270deg` = right-to-left. Arbitrary angles (e.g. `45deg`, `135deg`) are fully supported.

Color stops with explicit positions are also supported:

```css
.container { background: linear-gradient(135deg, #ff0000 0%, #00ff00 50%, #0000ff 100%); }
```

> **Tip:** For user-configurable gradient backgrounds, see [Gradient backgrounds](../using/gradient-backgrounds.md) and the `_button_gradient` special state key.

### Image Fit Modes

The `fit` attribute on `<img>` controls how the source image is sized within the element bounds:

| Mode | Behaviour |
|:---|:---|
| `cover` (default) | Scale to fill the entire box, cropping excess. |
| `contain` | Scale to fit within the box, preserving aspect ratio. The image is centred within the element bounds. |
| `stretch` | Stretch to exactly match width and height. |

`.svg` sources are rasterised at the element's own size, so a vector icon stays crisp
at any box. `.gif` sources **play** — see [Animated GIFs](#animated-gifs) below.

### Text Rendering

Text is rendered using the computed font, and positioned according to `text-align`:

- `left` — flush left
- `center` (default) — centred horizontally
- `right` — flush right

Text is always vertically centred within the element's box. Shadow is rendered first (behind the text) when the `shadow` property is set.

#### Text Anchor

The `text-anchor` property centres the text so that a specific character sits at the horizontal midpoint of the canvas. This is useful for aligning colons in clock displays, decimal points in numbers, or any other fixed reference character:

```css
.time { text-anchor: :; }
```

When `text-anchor` is set and the anchor character exists in the text, `text-align` is ignored. If the character is not found, `text-align` applies as normal.

#### Text Stroke

The `text-stroke` property draws an outline around text, rendered behind the fill colour. It works on both `<text>` and `<marquee>` elements:

```css
.title { text-stroke: 1 #000000; }
/*        width  color */
```

#### Emoji Support

`<text>` elements support emoji characters. When text contains emoji codepoints, the renderer splits the string into emoji and non-emoji runs, renders each with the appropriate font, and composites them together. The system emoji font is resolved via `fc-match` and scaled to match the element's `font-size`.

### Font Resolution

Fonts are resolved in this order:

1. If `font-family` names a non-DejaVu font, resolve via `fc-match` (fontconfig).
2. Fall back to bundled DejaVu Sans variants (`Regular`, `Bold`, `Oblique`, `BoldOblique`).
3. Last resort: Pillow's built-in default font.

### Effects

**Shadow** — only applies to `<text>` elements (drawn behind the text):

```css
.title { shadow: 2 2 4 #000000; }
/*        offset-x  offset-y  blur  color */
```

**Glow** — coloured glow around an element:

```css
.active { glow: 4 #00ff88; }
/*        size  color */
```

**Blur** — Gaussian blur applied to the element's region:

```css
.frosted { blur: 3; }
```

---

## 3. Animations

PDK supports CSS `@keyframes` animations and the `rotate` transform. Since PDK renders static PNGs via Pillow (there is no browser or DOM), animations work by re-rendering the button at a higher frame rate (~15 FPS) and computing interpolated property values at each timestamp.

### How It Works

1. `@keyframes` blocks and `animation` properties are parsed from your CSS.
2. A timestamp is passed to the renderer on each frame.
3. The animation resolver computes the current position in the animation cycle, applies a timing function, and interpolates keyframe property values.
4. Transforms like `rotate` are applied during Pillow drawing (render to temp layer → rotate → composite).
5. The listener re-renders animated buttons on a fast tick (~15 FPS) for the physical deck.
6. The server runs its own, slower ticker (~5 FPS) and pushes update events so the browser refreshes the preview.

### `@keyframes`

Define keyframe animations using standard CSS `@keyframes` syntax:

```css
@keyframes spin {
  from { rotate: 0; }
  to { rotate: 360; }
}

@keyframes pulse {
  0%   { background: #1a1a2e; }
  50%  { background: #3a2a6e; }
  100% { background: #1a1a2e; }
}
```

- `from` is an alias for `0%`, `to` is an alias for `100%`.
- You can define any number of percentage stops (e.g. `0%`, `25%`, `50%`, `100%`).
- Keyframe values are linearly interpolated between stops: numbers numerically, hex
  colours channel by channel.
- **What actually moves** is `rotate` and any property the renderer reads at draw
  time — `background`, `color`, `border-color`, `border-radius`, `border-width`,
  `width`, `height`, `padding`, `gap`, `blur`. There is no `opacity` compositing
  step, so animating `opacity` parses but changes nothing on the canvas; fade
  between two colours instead.

### `animation` Property

Apply an animation to any element using the `animation` shorthand:

```css
.icon {
  animation: spin 2s linear infinite;
}
```

#### Shorthand Format

```text
animation: <name> <duration> [timing] [delay] [iteration] [direction]
```

| Part | Required | Values | Default |
|:---|:---|:---|:---|
| `name` | Yes | Name of a `@keyframes` block | — |
| `duration` | Yes | `2s`, `500ms`, etc. | — |
| `timing` | No | `linear`, `ease`, `ease-in`, `ease-out`, `ease-in-out` | `linear` |
| `delay` | No | `0.5s`, `200ms`, etc. | `0s` |
| `iteration` | No | `infinite` or a number (e.g. `3`) | `infinite` |
| `direction` | No | `normal`, `reverse`, `alternate`, `alternate-reverse` | `normal` |

#### Examples

```css
/* Spin forever at constant speed */
animation: spin 2s linear infinite;

/* Pulse 3 times with easing */
animation: pulse 1s ease-in-out 3;

/* Spin in reverse */
animation: spin 3s linear infinite reverse;

/* Alternate direction (ping-pong) */
animation: spin 2s ease infinite alternate;

/* Start after 500ms delay */
animation: spin 2s linear 0.5s infinite;
```

### `rotate` Property

The `rotate` property sets a rotation angle in degrees. It can be used statically or animated via `@keyframes`.

```css
/* Static rotation */
.tilted { rotate: 15; }

/* Animated rotation */
@keyframes spin {
  from { rotate: 0; }
  to { rotate: 360; }
}
.spinning { animation: spin 2s linear infinite; }
```

When `rotate` is non-zero, the element and all its children are rendered to a temporary RGBA layer, rotated using Pillow's bicubic resampling, and composited back onto the main canvas.

### Timing Functions

| Function | Behaviour |
|:---|:---|
| `linear` | Constant speed, no acceleration |
| `ease` | Smooth start and end (S-curve) |
| `ease-in` | Starts slow, accelerates |
| `ease-out` | Starts fast, decelerates |
| `ease-in-out` | Starts slow, speeds up, then slows down |

### Complete Example — Spinning Weather Icon

```css
@keyframes spin {
  from { rotate: 0; }
  to { rotate: 360; }
}

.icon-container {
  animation: spin 2s linear infinite;
}
```

```xml
<template name="weather">
  <box class="bg">
    <box class="icon-container">
      <img src="{icon_src}" width="24" height="24" fit="contain" />
    </box>
    <text class="temp">{temperature}</text>
  </box>
</template>
```

The `.icon-container` box (and its child `<img>`) will rotate continuously. The physical deck renders at ~15 FPS; the web preview refreshes at ~5 FPS.

### What joins the animation tick

A button is put on the fast tick when **any** of these is true for the template it is
currently rendering — not for the plugin as a whole, so one animated function does not
drag a plugin's static buttons onto the ticker:

| Trigger | Detected from |
|:---|:---|
| CSS contains `@keyframes` | the template sources — cached |
| The template contains a `<marquee>` | the template sources — cached |
| The template has a `<buttonlabel>` that can scroll **and** the button has a title | the sources (cached) plus the button's live title |
| An `<img>` resolves to a multi-frame GIF | the **live state** — deliberately not cached |

Notes:

- The static answers are cached per plugin function. If you add or remove `@keyframes`
  or a `<marquee>`, restart the server.
- The GIF answer is **not** cached, because `<img src="{media}" />` is unresolvable
  without state — the handler may pick a GIF at runtime.
- A handler that points `ctx.state._template` at a different template is followed: the
  template actually in state is the one checked.
- The animation tick only re-renders (no `on_poll` dispatch) — it draws the current
  state at a new timestamp. Keep the two independent: folding animation into `on_poll`
  stalls it behind whatever your poll is waiting for.

### Animated GIFs

An `<img>` whose `src` resolves to a multi-frame `.gif` plays. The renderer picks the
frame for the current render timestamp and the button joins the animation tick, so no
handler code and no `@keyframes` are involved:

```xml
<template name="media">
  <box class="bg">
    <img src="{art_src}" width="72" height="72" fit="cover" />
  </box>
</template>
```

`art_src` may be a bundled asset (`assets/icons/spinner.gif`) or a file the handler wrote
under `ctx.storage_path`. Frame timing comes from the GIF itself.

Because the detection consults live state, a button showing a still image stays off the
tick and starts ticking the moment the handler swaps in a GIF.

---

## 3.5 Button-owned faces

By default, a **user-set button icon replaces the PDK face entirely** — PyDeck falls back
to its built-in renderer and your template is not drawn at all. Two manifest flags opt a
function out of that, so the template keeps control and paints the image itself:

| Function flag | Meaning |
|:---|:---|
| `display_states` | The image is the per-state glyph the user picked. See [User-picked per-state icons](runtime.md#user-picked-per-state-icons). |
| `draws_button_image` | The template draws the button's own image as its content — a media tile, an album-art background, an avatar. |

With `draws_button_image` set, the image path arrives in the render state as the reserved
key **`_button_image`**, resolved per button:

```json
"functions": {
  "now_playing": {
    "label": "Now Playing",
    "draws_button_image": true
  }
}
```

```xml
<template name="now_playing">
  <box class="tile">
    <img src="{_button_image}" width="72" height="72" fit="cover" />
    <box class="overlay">
      <buttonlabel class="caption">Now Playing</buttonlabel>
    </box>
  </box>
</template>
```

!!! note "`_button_image` never travels through a handler"
    PDK state is per **function**, so every button running the same function shares one
    state dict — a value written from one button's config is overwritten by the next
    button's poll. All the `_button_*` keys are therefore resolved per button at render
    time and injected directly into the render state. Read them in templates and CSS;
    never write them from a handler.

---

## 3.6 The button's own title style

The editor's **Title style** controls (size, colour, bold, italic, underline, scroll
speed) reach the built-in renderer directly. A PDK template has to read them itself, so
they are handed over as render keys that are legal CSS tokens by construction:

| Key | Value |
|:---|:---|
| `_button_text_size` | Font size in px. Never `0` — the classic "auto" sentinel resolves to PDK's base size (14). |
| `_button_text_color` | Hex colour. Never blank — "auto" resolves to the colour that contrasts with the button's own background. |
| `_button_text_weight` | `bold` or `normal` |
| `_button_text_style` | `italic` or `normal` |
| `_button_text_decoration` | `underline` or `none` |
| `_button_scroll_speed` | Pixels per second, or `0` when the user turned scrolling off. |

```css
.caption {
    font-size: {_button_text_size};
    color: {_button_text_color};
    font-weight: {_button_text_weight};
    font-style: {_button_text_style};
    text-decoration: {_button_text_decoration};
}
```

!!! warning "Never let one of these interpolate to nothing"
    A stylesheet cannot fall back on its own: `font-size: ;` drops the declaration and
    takes the layout with it. That is exactly why the two classic sentinels
    (`text_size: 0`, `text_color: ""`) are resolved *before* injection rather than passed
    through. Declare `default_display.text_size` / `text_color` in the manifest to choose
    where a template starts; those are suggestions, so the user's own choice still wins.

### Per-row styles

A template with more than one `<buttonlabel>` gets a **numbered variant of every key
above**, 1-based in document order — `{_button_text_color_1}`, `{_button_text_size_2}`,
and so on, up to three rows. The un-suffixed keys stay the button-wide style, which is
what a single-label template wants.

```css
.line-1 { font-size: {_button_text_size_1}; color: {_button_text_color_1}; }
.line-2 { font-size: {_button_text_size_2}; color: {_button_text_color_2}; }
```

The values come from the per-row style expanders in the editor's Title section (stored as
`display.text_label_styles`). A row that overrides nothing inherits the whole chain —
system defaults, the button, then your manifest's `default_display`. Only PDK honours
per-row styles; the built-in renderer draws every label in one style.

---

## 4. Gradient backgrounds

Users can give any button a gradient fill through a built-in editor (see [Gradient backgrounds](../using/gradient-backgrounds.md) for the editor itself). As a plugin author you decide **which functions expose the gradient editor**, and you read the user's choice through a render-state key.

### Opting a function into the editor

Add `"gradient": true` to a function in `manifest.json`. That function's color picker then shows **Solid / Gradient** tabs; functions without the flag show the solid picker only.

```json
{
  "functions": {
    "gradient_demo": {
      "label": "Gradient Demo",
      "gradient": true,
      "default_display": { "color": "#1a1a2e", "text": "Gradient" },
      "ui": [
        { "type": "input", "id": "message", "label": "Message", "default": "Hello" }
      ]
    }
  }
}
```

### The `_button_gradient` state key

The core injects two keys into every render, whether or not `gradient` is enabled:

| Key | When a gradient is set | Otherwise |
|---|---|---|
| `_button_color` | the solid hex color (e.g. `#1a1a2e`) | the solid hex color |
| `_button_gradient` | a CSS gradient string (e.g. `linear-gradient(135deg, #ff0000 0%, #0000ff 100%)`) | falls back to `_button_color` |

Because `_button_gradient` falls back to a plain color, you can use it unconditionally as a `background` value — it's always valid CSS, and it's available to **all** plugins regardless of the manifest flag. The flag only controls whether the editor UI appears.

### Using it in a template

Interpolate the key into your `src/shared.css` (or a per-function `style.css`):

```css
:root { --bg: {_button_gradient}; }

.bg {
  width: 100%;
  height: 100%;
  background: var(--bg);
  border-radius: 8px;
}
```

```xml
<template name="gradient_demo" title="Gradient Demo">
  <box class="bg" direction="column" align="center" justify="center">
    <text class="label">{message}</text>
  </box>
</template>
```

### Data format

The user's choice is stored in the button's `display.gradient` object:

```json
{
  "display": {
    "color": "#1a1a2e",
    "gradient": {
      "enabled": true,
      "type": "linear",
      "angle": 135,
      "stops": [
        { "color": "#ff0000", "position": 0 },
        { "color": "#0000ff", "position": 100 }
      ]
    }
  }
}
```

| Key | Type | Meaning |
|---|---|---|
| `enabled` | boolean | When `false`, the solid `color` is used. |
| `type` | string | `"linear"` or `"radial"`. |
| `angle` | number | Degrees, 0–360 (linear only). `0` = bottom-to-top, `90` = left-to-right, `180` = top-to-bottom. |
| `stops` | array | `{color, position}` objects; `position` is 0–100. |

You normally don't read this object directly — use `_button_gradient` instead. Gradients render server-side with Pillow to both the browser preview and the hardware, with arbitrary angles and position-accurate stops.
