# fields.xml — Unified UI Field Definitions

A standalone XML file format for declaring button editor UI fields. When present in a plugin directory, `fields.xml` becomes the single source of truth for all UI field definitions, replacing both JSON `ui` arrays in `manifest.json` and `<settings>` blocks in `plugin.xml`.

---

## Table of Contents

1. [Overview](#1-overview)
2. [File Structure](#2-file-structure)
3. [Block Attributes](#3-block-attributes)
4. [Field Attributes](#4-field-attributes)
5. [Field Types](#5-field-types)
6. [Options (select / radio)](#6-options-select--radio)
7. [Conditional Visibility](#7-conditional-visibility)
8. [Nested Fields (group)](#8-nested-fields-group)
9. [Priority and Backwards Compatibility](#9-priority-and-backwards-compatibility)
10. [Migration Guide](#10-migration-guide)
11. [Complete Example](#11-complete-example)

---

## 1. Overview

Currently, UI fields can be defined in two places depending on plugin type:

| Plugin Type | Where fields are defined |
|:---|:---|
| Classic | `"ui"` array inside `manifest.json` |
| PDK | `<settings>` block inside `plugin.xml` templates |

Both formats produce the same internal structure, but the syntactic difference creates friction when writing plugins, migrating between plugin types, or sharing field definitions across functions.

`fields.xml` unifies this into a single file that works identically for both plugin types. The parser outputs the same internal structure as the existing JSON `ui` array, so the frontend and editor UI require no changes.

### Why XML?

- PDK plugins already use XML for templates — `fields.xml` fits naturally alongside `plugin.xml`.
- XML attributes map cleanly to the existing field properties (type, id, label, default, min, max, etc.).
- Child elements (`<option>`, `<visible_if>`) are a natural fit for structured sub-properties.
- Classic plugins benefit from the same format without needing to adopt the full PDK template system.

---

## 2. File Structure

Place `fields.xml` in the plugin root alongside `manifest.json` and `plugin.py`:

```
plugins/plugin/my_plugin/
├── manifest.json
├── plugin.py
├── fields.xml          ← new
├── plugin.xml          # PDK only
└── style.css           # PDK only
```

The file contains one `<fields>` block per function, wrapped in a `<plugin>` root element. Each `<fields>` block is identified by a `function` attribute matching the function name in the manifest:

```xml
<plugin>

<fields function="get_weather">
  <field type="input" id="location" label="Location" placeholder="Oslo" default="" />
</fields>

<fields function="get_forecast">
  <field type="number" id="days" label="Days" min="1" max="7" default="3" />
</fields>

</plugin>
```

Functions that have no UI fields simply omit their `<fields>` block.

---

## 3. Block Attributes

The `<fields>` element itself supports optional attributes that enable features for the entire function:

| Attribute | Description | Default |
|:---|:---|:---|
| `function` | **(required)** The function name matching `manifest.json`. | — |
| `gradient` | Enable gradient background support for this function's buttons. | `false` |

### Gradient Backgrounds

Adding `gradient="true"` to a `<fields>` block enables the gradient color picker for that function. Users can create linear or radial gradients with multiple color stops, angles, and precise position control.

```xml
<fields function="my_button" gradient="true">
  <field type="input" id="label" label="Label" default="" />
</fields>
```

When enabled, the button color picker shows **Solid** and **Gradient** tabs. Functions without `gradient="true"` show only the standard solid color picker.

Accepted truthy values: `true`, `1`, `yes`, `on`.

> **Note:** See [Gradient Backgrounds](GRADIENT_BACKGROUNDS.md) for a complete guide on the gradient editor, data format, and rendering details.

---

## 4. Field Attributes

Field attributes map directly to their JSON equivalents. All attributes are strings in XML; the parser automatically casts values to the correct type.

| Attribute | Description | Auto-cast |
|:---|:---|:---|
| `type` | Field type (see [Field Types](#4-field-types)). | — |
| `id` | Unique key within the function. Becomes the config key in Python. | — |
| `label` | Human-readable label shown in the editor. | — |
| `default` | Default value. | `checkbox` → boolean, `number`/`slider` → numeric |
| `placeholder` | Hint text for `input` and `hotkey_recorder` fields. | — |
| `min` | Minimum value for `number` fields. | numeric |
| `max` | Maximum value for `number` fields. | numeric |
| `autosave` | `"on"` (default), `"off"`, or `"change"`. | — |
| `visible_if` | Shorthand conditional visibility (see [Conditional Visibility](#6-conditional-visibility)). | parsed to object |
| `readonly` | `"true"` to make the field read-only. | — |
| `api` | API endpoint name for `api_select` fields. | — |
| `filter_field` | Field id to watch for `api_select` filtering. | — |
| `filter_by` | Query parameter name for `api_select` filtering. | — |

### Default Value Casting

The `default` attribute is always a string in XML. The parser casts it based on the field's `type`:

| Field Type | Cast Rule | Example |
|:---|:---|:---|
| `checkbox` | `"true"`, `"1"`, `"yes"`, `"on"` → `true`; everything else → `false` | `default="true"` → `true` |
| `number`, `slider` | Parsed as integer; falls back to float | `default="10"` → `10` |
| All others | Kept as string | `default="oslo"` → `"oslo"` |

---

## 5. Field Types

All existing field types are supported:

### input

```xml
<field type="input" id="url" label="URL" placeholder="https://example.com" default="" />
```

### number

```xml
<field type="number" id="volume_step" label="Volume Step (%)" min="1" max="100" default="10" />
```

### checkbox

```xml
<field type="checkbox" id="auto_reconnect" label="Auto-reconnect" default="true" />
```

### slider

```xml
<field type="slider" id="brightness" label="Brightness" default="50" />
```

### select

```xml
<field type="select" id="action" label="Action" default="play_pause">
  <option value="play_pause" label="Play/Pause" />
  <option value="next_track" label="Next Track" />
  <option value="stop"       label="Stop" />
</field>
```

### radio

```xml
<field type="radio" id="mode" label="Mode" default="normal">
  <option value="fast"   label="Fast" />
  <option value="normal" label="Normal" />
  <option value="slow"   label="Slow" />
</field>
```

### hotkey_recorder

```xml
<field type="hotkey_recorder" id="hotkey" label="Key / Shortcut" placeholder="ctrl+c" default="" />
```

### api_select

```xml
<field type="api_select" id="entity_id" label="Entity" api="entities" default="">
  <!-- display mapping is set via attributes -->
</field>
```

> **Note:** The `display` object from JSON (`display.label`, `display.value`) maps to `display_label` and `display_value` attributes in XML. The `filter_field` and `filter_by` attributes work identically to their JSON counterparts.

### group

See [Nested Fields](#7-nested-fields-group).

---

## 6. Options (select / radio)

For `select` and `radio` fields, options are declared as `<option>` child elements:

```xml
<field type="select" id="unit" label="Unit" default="C">
  <option value="C" label="Celsius" />
  <option value="F" label="Fahrenheit" />
</field>
```

Each `<option>` requires:

| Attribute | Description |
|:---|:---|
| `value` | The value sent to the Python function via `config["id"]`. |
| `label` | The display text shown in the editor UI. |

---

## 7. Conditional Visibility

Fields can be shown or hidden based on another field's value. There are two syntaxes depending on the complexity of the condition.

### Inline Attribute (single condition)

Use the `visible_if` attribute with a short expression:

```xml
<field type="number" id="interval" label="Interval" default="60"
       visible_if="show_details=true" />
```

| Expression | Meaning |
|:---|:---|
| `visible_if="unit=F"` | Show when `unit` equals `F` |
| `visible_if="interval!=24"` | Show when `interval` does **not** equal `24` |

The parser converts these into the same JSON structure the editor already uses:

- `"field=value"` → `{"field": "field", "value": "value"}`
- `"field!=value"` → `{"field": "field", "not_value": "value"}`

### Child Elements (OR conditions)

When a field should be visible for multiple values of another field, use `<visible_if>` child elements instead. Each element represents one condition — the field is shown when **any** condition matches (OR logic):

```xml
<field type="number" id="step" label="Volume Step">
  <visible_if field="action" value="volume_up" />
  <visible_if field="action" value="volume_down" />
</field>
```

This field is visible when `action` is either `"volume_up"` or `"volume_down"`.

Each `<visible_if>` element supports:

| Attribute | Description |
|:---|:---|
| `field` | The `id` of the field to watch. |
| `value` | Show when the watched field equals this value. |
| `not_value` | Show when the watched field does **not** equal this value. |

> **Note:** If both an inline `visible_if` attribute and `<visible_if>` child elements are present, the child elements take priority.

---

## 8. Nested Fields (group)

The `group` type renders a visual container with nested child fields. Declare child fields as nested `<field>` elements:

```xml
<field type="group" label="Advanced Settings">
  <field type="checkbox" id="option_a" label="Option A" default="false" />
  <field type="input"    id="option_b" label="Option B" default="" />
</field>
```

This is equivalent to the JSON:

```json
{
  "type": "group",
  "label": "Advanced Settings",
  "fields": [
    { "type": "checkbox", "id": "option_a", "label": "Option A", "default": false },
    { "type": "input",    "id": "option_b", "label": "Option B", "default": "" }
  ]
}
```

---

## 9. Priority and Backwards Compatibility

### Priority

When `fields.xml` is present, it takes priority over:

- JSON `ui` arrays in `manifest.json`
- `<settings>` blocks in `plugin.xml`

If a function's UI fields are defined in both `fields.xml` and another source, `fields.xml` wins and a warning is logged:

```
fields.xml: overriding existing ui for function 'get_weather' (had 3 field(s))
```

### Backwards Compatibility

- Existing JSON `ui` arrays in `manifest.json` continue to work unchanged.
- Existing `<settings>` blocks in `plugin.xml` continue to work unchanged.
- No existing plugins will break. The `fields.xml` file is entirely optional.
- When migrating, remove the old `ui` arrays or `<settings>` blocks to avoid the warning.

---

## 10. Migration Guide

### From JSON `ui` arrays (classic plugins)

**Before** — `manifest.json`:

```json
{
  "functions": {
    "weather": {
      "label": "Weather",
      "ui": [
        { "type": "input", "id": "location", "label": "Location", "placeholder": "Oslo", "default": "" },
        { "type": "select", "id": "unit", "label": "Unit", "default": "C",
          "options": [
            { "value": "C", "label": "Celsius" },
            { "value": "F", "label": "Fahrenheit" }
          ]
        }
      ]
    }
  }
}
```

**After** — `fields.xml`:

```xml
<plugin>

<fields function="weather">
  <field type="input"  id="location" label="Location" placeholder="Oslo" default="" />
  <field type="select" id="unit"     label="Unit"     default="C">
    <option value="C" label="Celsius" />
    <option value="F" label="Fahrenheit" />
  </field>
</fields>

</plugin>
```

Then remove the `"ui"` key from `manifest.json`.

### From PDK `<settings>` blocks

**Before** — `plugin.xml`:

```xml
<template name="weather" title="Weather">
  <settings>
    <field type="input" id="location" label="Location" placeholder="Oslo" default="" />
  </settings>
  <box class="bg">
    <text class="temp">{temperature}</text>
  </box>
</template>
```

**After** — move the `<settings>` content to `fields.xml`:

```xml
<plugin>

<fields function="weather">
  <field type="input" id="location" label="Location" placeholder="Oslo" default="" />
</fields>

</plugin>
```

Then remove the `<settings>` block from `plugin.xml`:

```xml
<template name="weather" title="Weather">
  <box class="bg">
    <text class="temp">{temperature}</text>
  </box>
</template>
```

---

## 11. Complete Example

A Spotify plugin with four functions, some with UI fields and some without:

```xml
<plugin>

<fields function="play_pause">
  <field type="radio" id="display_mode" label="Track Label" default="song">
    <option value="none"        label="None" />
    <option value="song"        label="Song" />
    <option value="song_artist" label="Song - Artist" />
    <option value="artist"      label="Artist" />
  </field>
  <field type="checkbox" id="show_time_left" label="Show Time Left" default="false" />
</fields>

<fields function="volume_up">
  <field type="number"   id="volume_step"      label="Volume Step (%)" min="1" max="100" default="10" />
  <field type="checkbox" id="show_volume_label" label="Show Volume %"   default="false" />
</fields>

<fields function="volume_down">
  <field type="number"   id="volume_step"      label="Volume Step (%)" min="1" max="100" default="10" />
  <field type="checkbox" id="show_volume_label" label="Show Volume %"   default="false" />
</fields>

<fields function="set_volume">
  <field type="number"   id="volume_percent"    label="Volume (%)"    min="0" max="100" default="50" />
  <field type="checkbox" id="show_volume_label" label="Show Volume %" default="false" />
</fields>

</plugin>
```

Functions without UI fields (`next_track`, `prev_track`, `toggle_shuffle`, `cycle_repeat`) simply have no `<fields>` block. Their metadata (label, description, poll, etc.) stays in `manifest.json` as before — `fields.xml` only handles UI field definitions.
