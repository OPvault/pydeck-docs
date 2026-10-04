# Plugin settings

The `ui` fields on a function are per **button**: every button carries its own copy. Some options
belong to the whole plugin instead — a default location, a unit system, a server address, how often
to refresh. Declare those in **`plugin-settings.json`** and PyDeck gives your plugin a section under
**Settings → Plugin settings**, stores what the user picks, and hands it to every handler as
**`ctx.settings`**.

The file is optional. A plugin without it does not appear on the page.

!!! note "Needs PyDeck 2.0.0"
    Plugin settings and the [shared settings](#shared-settings) arrived in PyDeck 2.0.0. A plugin
    that ships `plugin-settings.json` or reads `ctx.preferences` must declare
    `"min_pydeck_version": "2.0.0"` in its `manifest.json`. An older PyDeck has no settings page, so
    its users could never change them.

---

## The file

`plugin-settings.json` sits at the root of the plugin, next to `manifest.json`:

```text
no.pydeck.weather/
├── manifest.json
├── plugin-settings.json
└── src/…
```

It is an object with two keys:

| Key | Type | Description |
|:---|:---|:---|
| `fields` | array | The settings, in the order they are shown. Same field objects as a function's [`ui` array](ui-fields.md). |
| `save_button` | boolean | `false` (default): every change saves as the user makes it. `true`: changes wait for one **Save** button at the bottom of your plugin's section, which saves them all together. Pick one for the whole plugin. |

```json
{
  "save_button": false,
  "fields": [
    {
      "type": "input",
      "id": "default_location",
      "label": "Default location",
      "default": "Oslo",
      "placeholder": "Oslo or 59.91,10.75",
      "description": "Used by any weather button that leaves its own location empty."
    },
    {
      "type": "radio",
      "id": "temperature_unit",
      "label": "Temperature unit",
      "default": "C",
      "options": [
        { "label": "Celsius (°C)", "value": "C" },
        { "label": "Fahrenheit (°F)", "value": "F" }
      ]
    },
    {
      "type": "number",
      "id": "refresh_minutes",
      "label": "Refresh every (minutes)",
      "default": 10,
      "min": 5,
      "max": 120
    }
  ]
}
```

Use `save_button: true` when changes are costly to apply one at a time (each one makes a network
request, say) or only make sense together, like a host and a port. The page tells the user which
kind of section they are in and marks unsaved changes.

!!! warning "Never write to `plugin-settings.json`"
    The file is part of your plugin and is replaced on every update. What the user chooses is
    stored in PyDeck's database, not in the file.

### Field types

Every type from [UI field types](ui-fields.md) works here, including `group`, `visible_if`,
`api_select` and `hotkey_recorder`. They render the same way as in the button editor. Settings add
nothing new, apart from how `autosave` works:

- **`description`**: one line of help under the field. It works in a button's `ui` array too.
- **`autosave`** on a single field is ignored on this page. `save_button` decides for the whole plugin.

Values are checked before they are stored. A `number` or `slider` outside `min`/`max`, or a `select`
or `radio` value that is not one of its `options`, is refused and the error is shown under the
field.

---

## Reading settings in a handler

`ctx.settings` is a dict with one entry per field id (children of a `group` included). Each entry is
the value the user chose, or the field's `default` if they never changed it:

```python
def on_poll(ctx):
    location = ctx.config.get("location") or ctx.settings.get("default_location", "Oslo")
    unit = ctx.settings.get("temperature_unit", "C")
    ...
```

- It is filled on **every** dispatch (`on_load`, `on_press`, `on_poll`, …) in both the server and
  the hardware listener. A plugin without the file gets `{}`.
- **Button and plugin values are never merged.** `ctx.config` stays the button's own values. Your
  handler decides which one wins, as in the example above.
- It is a copy. Writing to it changes nothing the user chose. The user changes settings only from
  the settings page.
- A default you change in a new version reaches every user who never touched that field. Only
  values the user actually changed are stored, and **Reset to defaults** on the settings page
  forgets them all.
- Always read with `.get()` and a fallback. A broken `plugin-settings.json` gives `{}` rather than
  stopping your buttons.

### When a setting changes

Your buttons are polled again straight away with `_force_refresh` set in `ctx.config`, on every
deck. A handler that caches (a forecast, an API response) should rebuild when it sees
`_force_refresh`, so the new setting shows without waiting out the cache. You don't need a
separate hook.

---

## Reading settings in an `api_<endpoint>` function

Functions behind [`api_select`](ui-fields.md) and `hotkey_recorder` get the settings under
**`config["_settings"]`**, next to the credentials and query parameters. They are kept separate so a
setting can never hide a credential with the same name:

```python
def api_entities(config):
    host = config["_settings"].get("host", "localhost")
    ...
```

---

## Shared settings

Some choices belong to the user rather than to any one plugin. Someone in the US wants °F on the
weather, the CPU and the GPU alike. PyDeck asks once, in **Shared by all plugins** at the top of
**Settings → Plugin settings**, and hands the answers to every plugin as **`ctx.preferences`**:

| Key | Values | Default |
|:---|:---|:---|
| `temperature_unit` | `"C"`, `"F"`, `"K"` | `"C"` |
| `time_format` | `"24"`, `"12"` | `"24"` |
| `time_strftime` | `"%H:%M"` or `"%I:%M %p"`, from `time_format` | `"%H:%M"` |
| `date_format` | `"dmy_dot"` (DD.MM.YYYY), `"dmy"` (DD/MM/YYYY), `"mdy"` (MM/DD/YYYY), `"iso"` (YYYY-MM-DD) | `"dmy_dot"` |
| `date_strftime` | The `strftime` pattern for `date_format` | `"%d.%m.%Y"` |
| `decimal_separator` | `"."`, `","` | `"."` |
| `color_ok`, `color_warn`, `color_crit` | Lowercase `#rrggbb` colors for a good, worrying or critical value, chosen with a color picker | `#3fb950`, `#d29922`, `#f85149` |
| `max_fps` | `"5"`, `"10"`, `"15"`, `"20"`, `"30"`: how often animated keys are redrawn on the deck | `"15"` |
| `reduce_motion` | `true`: no decorative movement on the deck | `false` |

PyDeck applies two of these itself, so you don't have to:

- **`max_fps`** is how often animated keys are redrawn.
- **`reduce_motion`** stops `@keyframes` animations. One that runs a set number of times is drawn at its last
  frame, so a press-triggered roll shows its result at once. One that loops forever stands still. `<marquee>`
  text and GIFs keep moving.

Read `reduce_motion` yourself only for motion PyDeck can't see, such as a face you animate by changing state on
every poll. The other settings are up to your plugin.

### Following a shared setting

Don't replace a field of your own with a shared setting. Let the field **follow** it: offer the
option value `"global"`, make it the default, and resolve it with **`ctx.preference(key, value)`**.
That call returns `value`, unless `value` is empty or `"global"`, in which case it returns the
shared setting. A button the user set to °C on purpose keeps °C. Every other button changes when
the shared setting does.

```json
{
  "type": "select",
  "id": "temperature_unit",
  "label": "Temperature unit",
  "default": "global",
  "options": [
    { "label": "Use global", "value": "global" },
    { "label": "Celsius (°C)", "value": "C" },
    { "label": "Fahrenheit (°F)", "value": "F" }
  ]
}
```

```python
def on_poll(ctx):
    unit = ctx.preference("temperature_unit", ctx.config.get("temperature_unit"))
    today = datetime.now().strftime(ctx.preferences.get("date_strftime", "%Y-%m-%d"))
```

The same works for a field in `plugin-settings.json`: pass `ctx.settings.get(...)` instead.
`api_<endpoint>` functions get the dict as `config["_preferences"]`. When the user changes a shared
setting, every plugin's buttons are polled again with `_force_refresh`, as for a plugin setting.

---

## Related reading

- [UI field types](ui-fields.md): the field objects `fields` is made of.
- [Runtime & the ctx object](runtime.md): everything else on `ctx`.
- [Authentication & credentials](authentication.md): for secrets. Put API keys and passwords in
  `credentials`, not in plugin settings. Credentials are encrypted at rest; settings are not.
