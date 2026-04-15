# Installation

**PyDeck** is a Python-powered macro deck you extend with plugins and themes. This page covers installing and running the main [PyDeck](https://github.com/opvault/pydeck) application on Linux from a git checkout.

When the app is running, use the sidebar or jump to [Marketplace & catalog](using/marketplace.md), [PDK development](plugin-development/pdk/getting-started.md) (recommended for new plugins), or [Theme development](theme-development/getting-started.md).

## Requirements

- Python 3.9+
- Linux (udev required for HID access)
- `libcairo2` system library (required by `cairosvg` for SVG icon rendering)

## Install from git

```bash
git clone https://github.com/opvault/pydeck.git
cd pydeck
sudo bash install.sh
```

The installer will:

1. Check your Python version
2. Create a virtualenv and install dependencies (`fastapi`, `uvicorn`, `pillow`, `cairosvg`, `watchdog`, and others)
3. Install udev rules so the Stream Deck is accessible without root
4. Detect your init system (systemd, OpenRC, runit, s6, Upstart, SysV)
5. Create the appropriate service file
6. Ask if you want PyDeck to start automatically at boot

## Running manually

From the cloned repository:

```bash
bash pydeck-start.sh
```

Then open `http://localhost:8686` in your browser.

For the canonical copy of this information (including device support and project layout), see the [PyDeck README](https://github.com/opvault/pydeck/blob/main/README.md) in the application repository.
