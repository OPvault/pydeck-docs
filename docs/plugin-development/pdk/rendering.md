# PDK Development — Rendering

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

> **Tip:** For user-configurable gradient backgrounds, see [Gradient backgrounds](../../using/gradient-backgrounds.md) and the `_button_gradient` special state key.

### Image Fit Modes

The `fit` attribute on `<img>` controls how the source image is sized within the element bounds:

| Mode | Behaviour |
|:---|:---|
| `cover` (default) | Scale to fill the entire box, cropping excess. |
| `contain` | Scale to fit within the box, preserving aspect ratio. The image is centred within the element bounds. |
| `stretch` | Stretch to exactly match width and height. |

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
6. The web preview emits periodic update events so the browser refreshes the button image.

### `@keyframes`

Define keyframe animations using standard CSS `@keyframes` syntax:

```css
@keyframes spin {
  from { rotate: 0; }
  to { rotate: 360; }
}

@keyframes pulse {
  0% { opacity: 1.0; }
  50% { opacity: 0.5; }
  100% { opacity: 1.0; }
}
```

- `from` is an alias for `0%`, `to` is an alias for `100%`.
- You can define any number of percentage stops (e.g. `0%`, `25%`, `50%`, `100%`).
- Keyframe values are linearly interpolated between stops.
- Animatable properties: `rotate`, `opacity` (numeric values and hex colours are interpolated).

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

The `.icon-container` box (and its child `<img>`) will rotate continuously. The physical deck renders at ~15 FPS; the web preview updates at a similar rate.

### Performance Notes

- Buttons whose CSS contains `@keyframes` **or** whose template tree contains a `<marquee>` element are re-rendered at the fast animation tick rate (~15 FPS). Other buttons render at normal poll intervals.
- Animation detection is cached per plugin — if you add or remove `@keyframes` or `<marquee>` elements, restart the server.
- The animation tick only calls `render_button` (no `on_poll` dispatch) — it re-renders with the current state at a new timestamp.
