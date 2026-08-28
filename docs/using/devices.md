# Devices

PyDeck drives every connected Stream Deck at once. Each device gets its own buttons, its own profiles, and its own brightness — they are not mirrors of one another.

---

## Supported hardware

| Model | Keys | Grid | Key image |
|:---|:---:|:---:|:---:|
| Stream Deck Mini | 6 | 3 × 2 | 80 px |
| Stream Deck Mini MK2 | 6 | 3 × 2 | 80 px |
| Stream Deck MK2 | 15 | 5 × 3 | 72 px |
| Stream Deck Original V2 | 15 | 5 × 3 | 72 px |
| Stream Deck XL | 32 | 8 × 4 | 96 px |
| Stream Deck XL V2 | 32 | 8 × 4 | 96 px |

This list is exhaustive: PyDeck enumerates Elgato devices and **skips any product id it does not recognise**, so a model that isn't listed above will not appear at all — even though it is plugged in and visible to the OS.

!!! note "Linux permissions"
    Reading a Stream Deck over HID needs access to `/dev/hidraw*`. Install the optional
    udev rules (see [Installation](../get-started/install.md#linux-permissions)) or run PyDeck as root, otherwise
    the device enumerates but never opens. **macOS and Windows need no extra setup** — they grant HID access automatically.

---

## Switching between devices

Connected devices appear as tabs above the deck grid. Clicking one selects it: the grid, the sidebar, the button editor, and the brightness slider all follow the selection.

Selection is global state on the server, not per browser tab — `POST /api/devices/select` sets the device every subsequent request resolves against. Requests can also target a device explicitly with an `X-Device-Id` header or a `?device=` query parameter, which is how the kiosk and phone views stay pinned to their own deck while you work on another.

---

## One process per device

Each connected deck gets its own **listener subprocess** that owns the HID handle, reads key presses, and renders that device's button images. The web server renders the previews you see in the browser separately.

Two consequences worth knowing:

- A plugin's `on_poll` runs **once per process**. A polling plugin placed on two devices polls twice.
- If one device's listener dies, the others keep working. PyDeck notices within about five seconds and cleans up.

### Hotplug

A background scan runs every **5 seconds**. Plugging a deck in adds it to the device list and starts its listener; unplugging removes it. Nothing needs restarting, and the browser updates on its own.

If the device you had selected disappears, PyDeck falls back to whichever device is still connected.

---

## Per-device settings

Buttons, profiles, folders, and brightness are stored **per device**:

```text
~/.config/pydeck/devices/<device-id>/
├── config.json          # active profile, active folder, brightness, orientation
└── profiles/
    └── main/
        ├── buttons.json
        └── folders.json
```

`<device-id>` is the device's USB serial number, stripped to letters, digits, `_`, and `-`.

The first time a device is seen, PyDeck copies your existing global profiles into its directory, so a newly plugged deck starts with the layout you already had rather than an empty grid. From that point the two diverge — editing one device's buttons never touches another's.

### Brightness

The brightness slider writes `0`–`100` (default `70`) into the selected device's `config.json`. Each deck remembers its own value.

### Orientation

**Settings → Device** offers `0`, `90`, `180`, and `270`, for a deck mounted sideways or upside down. The setting rotates the **key images** — both on the hardware and in the web grid, which rotates the whole deck frame and counter-rotates each key so the artwork stays upright.

Button **numbering does not change**: button id `0` is always the same physical key. After a rotation the listener re-renders every non-blank key, so the change shows up without a restart. Like brightness, orientation is stored per device.

---

## Virtual decks

Devices you don't own also show up here: a **virtual deck** is a software deck with no hardware behind it, driven from a browser or a phone. They appear alongside physical decks in the same device list and get the same per-device storage.

See [Virtual decks & phone control](virtual-decks.md).
