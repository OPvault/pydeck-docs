# Developer options

**Settings → Developer** holds two switches that are off by default and only useful while you are building a plugin or producing screenshots of one. Neither changes anything a user would notice until you turn it on.

---

## Export right-click

With this on, **right-clicking a key in the web grid** opens a context menu:

| Menu entry | What it does |
|:---|:---|
| **Export as PNG** → *1x · 2x · 4x · 6x · 8x · 10x* | Downloads the button face as a PNG at that multiple of the deck's native key size. |
| **Copy to Clipboard** → *1x … 10x* | Puts the same image on the clipboard. |

The image is rendered fresh at the requested resolution — it is not an upscale of the 72–96 px key bitmap, so a PDK template's text and vectors come out crisp at 10x. A Stream Deck MK2 key at 10x is 720 px square; an XL key is 960 px.

The endpoint behind it is `GET /api/buttons/{slot}/image/hires?scale=<n>`, and it returns **403** while the option is off. `scale` is clamped to 1–10.

---

## Emulated clock

Time-aware plugins render whatever "now" is, which makes a screenshot of a clock face impossible to reproduce. Switching the emulated clock on freezes the instant PyDeck hands to plugins.

Type the instant into the **Time** field. PyDeck accepts these shapes:

```text
19:43:43                 ← today, at that time
19:43
2023-02-09 19:43:43
2023-02-09 19:43
2023-02-09T19:43:43
2023-02-09T19:43
```

A time with no date resolves against today's date. The field shows what it resolved to as you type; anything PyDeck cannot parse is treated as no override and the current time is used.

### Per-button override

While the emulated clock is on, **every function's properties panel grows an extra field**, *Emulated time (developer)*, appended below the plugin's own fields. Leave it blank to use the global value, or set a different instant for that one button — handy for a row of clock buttons in a screenshot, each showing a different time.

The resolved instant reaches your handler as the injected config key **`_dev_time`**: an ISO string `YYYY-MM-DDTHH:MM:SS`, or `""` when there is no override. Read it if your function draws time:

```python
def on_poll(ctx, interval: int = 1000) -> None:
    override = ctx.config.get("_dev_time") or ""
    now = datetime.fromisoformat(override) if override else datetime.now()
    ctx.state.time = now.strftime("%H:%M")
```

Turning the switch off clears the override everywhere, so a stale per-button `dev_time` can never leave a clock frozen.

---

## Where the settings live

Both options are stored under `developer_options` in `~/.config/pydeck/core/config.json`:

```json
{
  "developer_options": {
    "export_rightclick": false,
    "emulated_clock": false,
    "emulated_clock_time": ""
  }
}
```

The per-button override is an ordinary config value (`dev_time`) inside that button's entry in `buttons.json`.

Read and written over `GET` / `POST /api/settings/developer` — see the [HTTP API reference](http-api.md#get-apisettingsdeveloper).
