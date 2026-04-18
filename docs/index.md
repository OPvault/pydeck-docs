# Installation

**PyDeck** is a Python-powered macro deck you extend with plugins and themes. This page covers installing and running the main [PyDeck](https://github.com/opvault/pydeck) application from a git checkout on **Linux**, **macOS**, and **Windows**.

When the app is running, use the sidebar or jump to [Marketplace & catalog](using/marketplace.md), [PDK development](plugin-development/pdk/getting-started.md) (recommended for new plugins), or [Theme development](theme-development/getting-started.md).

## Requirements

- Python 3.9+
- Linux, macOS, or Windows (HID access is provided by [`hidapi`](https://pypi.org/project/hidapi/), which ships prebuilt wheels for all three platforms)
- `libcairo2` system library (required by `cairosvg` for SVG icon rendering)

### Platform notes

- **Linux**: hidapi uses `/dev/hidraw` under the hood; unprivileged access requires either running PyDeck as root or installing the optional udev rules shipped with the installer (see [Linux](#linux) below).
- **macOS**: no extra setup — the system grants HID access to user processes.
- **Windows**: no extra setup — Stream Deck devices appear as standard HID devices.

PyDeck ships platform-specific installers. All of them do the same thing: check Python, create a virtualenv, install dependencies (including `hidapi`), copy default configs to `~/.config/pydeck/core/` (or the platform equivalent), and register an autostart entry for your platform.

## Install from git

### Linux

```bash
git clone https://github.com/opvault/pydeck.git
cd pydeck
sudo bash install.sh
```

The installer will:

1. Check your Python version
2. Create a virtualenv and install dependencies (`fastapi`, `uvicorn`, `pillow`, `cairosvg`, `watchdog`, `hidapi`, and others)
3. Optionally install udev rules for unprivileged Stream Deck access (opt-in — pass `--with-udev` to auto-install, or answer the prompt)
4. Detect your init system (systemd, OpenRC, runit, s6, Upstart, SysV)
5. Create the appropriate service file
6. Ask if you want PyDeck to start automatically at boot

### macOS

Run the same installer script **without** `sudo` — on macOS it installs a per-user LaunchAgent instead of a system service:

```bash
git clone https://github.com/opvault/pydeck.git
cd pydeck
bash install.sh
```

The installer will:

1. Check your Python version
2. Create a virtualenv and install dependencies
3. Copy default configs to `~/.config/pydeck/core/`
4. Write a LaunchAgent to `~/Library/LaunchAgents/com.pydeck.agent.plist` and register it with `launchctl` so PyDeck starts automatically at login
5. Write logs to `~/Library/Logs/PyDeck/pydeck.log`

### Windows

Run the PowerShell installer from the PyDeck checkout:

```powershell
git clone https://github.com/opvault/pydeck.git
cd pydeck
powershell -ExecutionPolicy Bypass -File .\install.ps1
```

The installer will:

1. Check for Python 3.9+ (via the `py` launcher, `python`, or `python3`)
2. Create a virtualenv in `venv\` and install dependencies
3. Copy default configs to `%USERPROFILE%\.config\pydeck\core\`
4. Register a Task Scheduler entry named **PyDeck** that starts `pydeck-start.ps1` at user logon

Flags:

- `-Yes` — answer every prompt with yes (non-interactive install)
- `-SkipAutostart` — don't register the scheduled task
- `-Force` — overwrite an existing PyDeck scheduled task without prompting

## Running manually

```bash
# Linux / macOS
bash pydeck-start.sh
```

```powershell
# Windows
powershell -ExecutionPolicy Bypass -File .\pydeck-start.ps1
```

Then open `http://localhost:8686` in your browser.

## Uninstallation

```bash
# Linux
sudo bash uninstall.sh

# macOS
bash uninstall.sh
```

```powershell
# Windows
powershell -ExecutionPolicy Bypass -File .\uninstall.ps1
```

This stops and removes the platform's autostart entry (systemd unit / OpenRC script / runit service / s6 service / Upstart job / SysV init script / macOS LaunchAgent / Windows scheduled task), any installed udev rules on Linux, and the virtualenv. Optionally removes your config and logs (you will be asked before anything is deleted).

For device support tables, project layout, and other details, see the [PyDeck README](https://github.com/opvault/pydeck/blob/main/README.md) in the application repository.
