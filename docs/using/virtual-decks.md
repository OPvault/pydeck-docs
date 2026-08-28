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
    Anything that can reach the machine can reach port 8686. PyDeck denies remote
    requests by default (see [What a remote client may do](#what-a-remote-client-may-do)),
    but that is not a substitute for a trusted network. Use it on your own LAN, not on a
    public or guest network, and switch the bind back to `127.0.0.1` when you're done.

### 2. Open the deck on the phone

Each mobile deck's card shows a **QR code** pointing at its `/mobile/<deck-id>` URL. Scan it, or type the URL.

### 3. Pair

The first visit shows a pairing screen instead of the deck:

1. Press **Pair** on the deck's card in Settings.
2. PyDeck picks a random **four-step sequence** of the digits 1–4 and shows it in the main web UI.
3. Tap the same sequence on the phone's four keypad buttons. It submits as soon as the fourth is entered.
4. On success the phone stores a token and the deck loads.

The pairing window is open for **60 seconds**; after that, start again.

There are only 4⁴ = 256 possible sequences, so guessing is rate-limited rather than merely rejected:

| After | What happens |
|:---|:---|
| Each wrong guess | Rejected with the number of attempts left, after a **1 second** delay charged server-side — a burst of guesses cannot be pipelined. |
| **5** wrong guesses | The code is thrown away and a **new one** appears on your PyDeck screen. The counter resets. |
| **3** such regenerations | The session is dropped and pairing is **locked out for 5 minutes**. Pressing **Pair** in the PyDeck window clears the lockout immediately — it is a deliberate act by whoever is at the machine. |

The code is broadcast only to browser sockets on the machine itself. Sending it to every
connected socket would let anyone who can open `/ws` ask for a code and read it straight
back.

Only **virtual** decks can be paired. Handing out a token for a physical deck would make
a guessed code worth far more than the kiosk it was meant for.

Paired devices are listed under **Settings → Tokens** (and mirrored in **Settings → Device → Paired Devices**), labelled from the browser's user agent and stamped with the pairing time. Each row can be copied or revoked; revoking takes effect on the device's next request and drops its WebSocket.

!!! tip "Turn off the pairing popup"
    Both panes have a **Show pairing code popup automatically** toggle if you would
    rather not have the sequence appear over the deck grid. It is a per-browser
    preference, stored locally.

---

## What a remote client may do

PyDeck's remote policy is an **allowlist, not a blocklist**: a request that does not come from the machine itself is refused unless it matches one of two short tables.

| Class | Needs a token | What it covers |
|:---|:---:|:---|
| **Public** | no | The pairing handshake (`POST /api/pair/start`, `POST /api/pair/verify`), the pages that render the keypad (`/`, `/mobile/<deck-id>`), and the static assets and theme CSS those pages load. |
| **Paired** | yes | What a deck needs to draw itself and be pressed: `/ws`, `/api/status`, `/api/buttons`, `/api/deck/grid`, the button image / GIF / hi-res endpoints, `POST /api/buttons/<id>/press`, `/api/folders/getall`, `POST /api/folders/change/<id>`, and plugin images. |
| **Denied** | — | **Everything else** — credentials, settings, the marketplace, the token list itself, and every button, profile and action write. `403 Remote access denied`. |

Two details worth knowing:

- **The token picks the deck, not the URL.** For a paired request the device is derived from the token, so an `X-Device-Id` header or `?device=` from a phone paired with one virtual deck can never address another deck.
- **WebSockets are checked separately.** HTTP middleware doesn't run for `/ws`, so the socket repeats the check itself: an off-box socket without a valid token is closed.

Requests are also refused with **421** unless the `Host` header is an IP literal or `localhost` — that is what stops a page on the open web from resolving its own domain to `127.0.0.1` and talking to your PyDeck as if it were a local client. Behind a reverse proxy with a real hostname, list it in the `PYDECK_ALLOWED_HOSTS` environment variable (comma-separated).

There is deliberately **no CORS middleware**: every page PyDeck serves is same-origin, so a cross-origin allowance would only ever help someone else's page.

---

## Kiosk mode

A kiosk deck is meant for a screen attached to the machine PyDeck runs on. Open it with:

```text
http://localhost:8686/?kiosk&device=vdeck-1a2b3c4d5e6f
```

That loads the normal deck view with the editing chrome removed, pinned to that device. Keyboard shortcuts are disabled in kiosk mode, since there is no editing chrome to reach.

It works from another machine too — but only the deck view, and only for a **virtual** deck it has paired with. A remote caller that asks for `/` without `kiosk`, or with a physical device id, gets `403 Remote access denied`; an unpaired one gets the pairing keypad instead of the grid.

!!! warning "A remote kiosk browser has to be paired once"
    Pairing is attached to the **device**, so a kiosk browser on another machine needs a
    token exactly like a phone does. The kiosk page itself renders the keypad when the
    caller has none; complete the sequence and the token is stored in that browser.

    A kiosk opened **on the PyDeck machine itself** (`localhost`) needs no token at all.

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
