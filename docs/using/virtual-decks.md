# Virtual decks & phone control

A **virtual deck** is a Stream Deck with no hardware behind it — a grid of buttons rendered in a browser. It behaves like a real device everywhere else in PyDeck: it appears in the device list, gets its own profiles and folders, and runs the same plugins.

Two flavours:

| Type | Opened as | For |
|:---|:---|:---|
| **Mobile / Phone** | `/mobile/<deck-id>` | A phone, over the LAN. Requires pairing. |
| **Kiosk / Touchscreen** | `/?kiosk&device=<deck-id>` | A spare monitor or tablet on the same machine. |

---

## Creating one

**Settings → Device → Virtual Decks → Add Virtual Deck**:

1. Pick a **type** — Mobile or Kiosk.
2. Give it a **name**.
3. Choose a **layout**: `mini` (3 × 2), `standard` (5 × 3), or `xl` (8 × 4) — or clone the grid of a physical device you already own.

The deck appears in the device tabs immediately, with an empty `main` profile of its own. Its id looks like `vdeck-1a2b3c4d5e6f`.

Deleting a virtual deck also deletes its profiles, folders, and buttons — `~/.config/pydeck/devices/<deck-id>/` is removed outright.

---

## Reaching it from a phone

By default PyDeck binds to `127.0.0.1`, which no other machine can reach. To use a phone you have to open that up.

### 1. Bind to the network

In **Settings → Device → Network**, allow local-network access — this switches the bind from `127.0.0.1` to `0.0.0.0`. **PyDeck restarts itself** when you save.

The same panel shows the LAN address to use, e.g. `http://192.168.1.20:8686`.

!!! warning "This exposes the port to your whole network"
    Anything that can reach the machine can reach port 8686. PyDeck's own guard is
    narrow: remote requests are refused for `/` (unless it carries `kiosk`) and for
    everything under `/settings`, and virtual-deck API calls require a pairing token —
    but that is not a substitute for a trusted network. Use it on your own LAN, not on
    a public or guest network, and switch the bind back to `127.0.0.1` when you're done.

### 2. Open the deck on the phone

Each mobile deck's card shows a **QR code** pointing at its `/mobile/<deck-id>` URL. Scan it, or type the URL.

### 3. Pair

The first visit shows a pairing screen instead of the deck:

1. Press **Pair** on the deck's card in Settings.
2. PyDeck picks a random **four-step sequence** of the digits 1–4 and shows it in the main web UI.
3. Tap the same sequence on the phone's four keypad buttons. It submits as soon as the fourth is entered.
4. On success the phone stores a token and the deck loads.

The pairing window is open for **60 seconds**; after that, start again. A wrong sequence is rejected outright.

Paired phones are listed under **Settings → Device → Paired Devices**, labelled from the browser's user agent and stamped with the pairing time, and can be revoked one by one. Revoking takes effect on the phone's next request.

!!! tip "Turn off the pairing popup"
    The same panel has a **Show pairing code popup automatically** toggle if you would
    rather not have the sequence appear over the deck grid.

---

## Kiosk mode

A kiosk deck is meant for a screen attached to the machine PyDeck runs on. Open it with:

```text
http://localhost:8686/?kiosk&device=vdeck-1a2b3c4d5e6f
```

That loads the normal deck view with the editing chrome removed, pinned to that device. It works from another machine too — but only the deck view; `/settings` stays blocked for remote clients, and `/` is refused remotely unless the URL carries `kiosk`.

!!! warning "A kiosk browser still has to be paired once"
    The pairing requirement is attached to the **device**, not to the page: any request
    that targets a `vdeck-*` id needs a token, local or not. The kiosk page itself loads
    without one, but its API calls come back `403 Pairing required` in a browser that has
    never paired.

    Pair that browser first by visiting `/mobile/<deck-id>` and completing the sequence —
    the token is kept in the browser's local storage and satisfies the check for every
    virtual deck afterwards. Pointing kiosk mode at a **physical** device id needs no
    token at all.

---

## What a virtual deck can and can't do

**Can:** run any plugin, use profiles, folders, and actions, hold its own layout per device, and stay in sync live — presses and display updates travel over the same WebSocket the main UI uses.

**Can't:** control hardware brightness (there is no screen to dim), and it has no physical key mapping, so orientation is only a layout choice.

Because each device runs its own polling, a plugin placed on both a physical deck and a virtual one polls twice. See [Devices](devices.md#one-process-per-device).

---

## Storage

```text
~/.config/pydeck/core/virtual_decks.json   # the deck definitions
~/.config/pydeck/core/paired_tokens.json   # issued pairing tokens
~/.config/pydeck/devices/vdeck-<id>/       # that deck's config, profiles, folders
```

Pairing tokens are 64 hex characters and do not expire on their own — revoke them from Settings when a phone should no longer have access.
