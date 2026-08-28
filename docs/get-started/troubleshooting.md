# Troubleshooting

Common problems and how to fix them. If your issue isn't here, check PyDeck's logs (see [below](#where-are-the-logs)) — they usually say what went wrong.

## The web UI won't open

**Symptom:** `http://localhost:8686` doesn't load.

- **Is PyDeck running?** If you installed with autostart, it should be. Try [running it manually](install.md#running-manually) in a terminal so you can see any startup errors.
- **Is something else using port 8686?** PyDeck always serves on port **8686**. If another program has that port, PyDeck can't start. Stop the other program (or find it with `lsof -i :8686` on Linux/macOS).
- **Wrong address?** PyDeck listens on `localhost` (`127.0.0.1`) by default. Use `http://localhost:8686`, not your machine's LAN IP — LAN access is a separate, opt-in setting (see [below](#i-cant-reach-pydeck-from-another-device)).
- **`421 Invalid host`?** PyDeck only answers requests addressed to an IP literal or
  `localhost`, which is what stops a hostile web page from pointing its own domain at
  your machine. If you reach PyDeck through a reverse proxy under a real hostname, list
  that hostname in the `PYDECK_ALLOWED_HOSTS` environment variable (comma-separated).

## My Stream Deck isn't detected

**Symptom:** the UI loads but shows no device, or a device that keeps disappearing.

=== "Linux"

    This is almost always a **permissions** problem. Talking to USB HID devices needs access to `/dev/hidraw*`, which normal users don't have by default.

    - **Install the udev rules.** Re-run the installer and accept the udev prompt, or pass `--with-udev`. Then unplug and replug the Stream Deck.
    - **Or run PyDeck as root** (not recommended for daily use).
    - After installing rules, they take effect on the next plug-in event — `sudo udevadm control --reload-rules && sudo udevadm trigger` applies them immediately.

=== "macOS"

    macOS grants HID access automatically, so detection problems are usually a cable or port issue. Try a different USB port and a data-capable cable. Make sure Elgato's own Stream Deck software isn't running and holding the device.

=== "Windows"

    Windows sees the Stream Deck as a standard HID device. If it isn't detected, close Elgato's Stream Deck software (only one program can own the device at a time), then restart PyDeck.

**Unsupported model?** PyDeck supports six specific models — see the [supported hardware list](install.md#supported-hardware). Other models (including Neo and Stream Deck +) are not currently recognized.

## A button shows nothing / a broken image

- **SVG icons need Cairo.** PyDeck rasterizes SVG icons with `cairosvg`, which needs the system library **`libcairo2`**. On Linux, install it from your package manager (e.g. `apt install libcairo2`) and restart PyDeck. macOS and Windows get it through the installed Python wheels.
- **Plugin still loading?** Some plugins fetch data on a timer (weather, Spotify). Give it a poll cycle or two to draw.

## A plugin won't install or run

- **Post-install approval.** Some plugins run a setup script or install extra Python packages on first install. PyDeck **pauses and asks you to approve** this before it runs — check the marketplace for a pending approval. See [Install plugins & themes](../using/marketplace.md).
- **Buttons blank after an install or update?** Restarting PyDeck clears it. An install
  replaces a plugin's files while the render loop is reading them, and PyDeck drops its
  caches for exactly that reason — but a restart is the reliable fix if a button is
  still blank.
- **Extra dependencies.** If a plugin declares Python dependencies, PyDeck installs them and then restarts itself. If that fails, the log will show the pip error.
- **Wrong channel or version.** A plugin version may require a newer PyDeck than you're running. [Update PyDeck](../using/updates.md), or pick a compatible version in the marketplace.

## I can't reach PyDeck from another device

By default PyDeck binds to `127.0.0.1`, so it's only reachable from the same computer. To control it from a phone or another machine on your network, switch it to listen on your LAN in **Settings → Device → Network** (this binds to `0.0.0.0` and restarts PyDeck). For phone control specifically, see **[Virtual decks & phone control](../using/virtual-decks.md)**, which also covers the pairing step.

**Getting `403 Remote access denied` or `403 Pairing required`?** That is PyDeck working
as designed. Everything except the pairing handshake is refused for off-box callers, and
the handful of endpoints a paired deck needs require a pairing token. Pair the device
first — see [Virtual decks & phone control](../using/virtual-decks.md#3-pair). The editor
and every settings screen stay localhost-only no matter what.

!!! warning "Only expose PyDeck on networks you trust"
    Binding to the LAN puts port 8686 in front of every device on that network. PyDeck
    denies remote requests by default, but that is not a substitute for a trusted
    network — switch the bind back to `127.0.0.1` when you're done.

## Where are the logs?

PyDeck logs where it started tell you what's wrong:

=== "Linux (systemd)"

    ```bash
    journalctl --user -u pydeck        # or without --user if installed system-wide
    ```

    For other init systems, check the service's own log location, or run PyDeck manually to see output in the terminal.

=== "macOS"

    ```
    ~/Library/Logs/PyDeck/pydeck.log
    ```

=== "Windows"

    Run `pydeck-start.ps1` in a PowerShell window to see live output.

Running manually with `bash pydeck-start.sh` (or the PowerShell equivalent) always prints logs straight to the terminal — the quickest way to see a startup error.

## Still stuck?

Open an issue on the **[PyDeck GitHub repo](https://github.com/opvault/pydeck/issues)** with your OS, Stream Deck model, and the relevant log output.
