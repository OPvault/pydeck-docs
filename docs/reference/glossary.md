# Glossary

PyDeck-specific terms you'll meet across these docs.

**Action**
: A sequence of steps you build in the [Action Builder](../using/actions.md) and put on a button — open a URL, press a hotkey, switch profiles, and so on. Actions are built into PyDeck; no plugin required.

**Button / key**
: One physical key on the Stream Deck, mirrored by one square in the web UI. A button runs an action or a plugin function when pressed.

**Catalog**
: A GitHub repo that lists installable plugins or themes. PyDeck reads the catalog's `manifest.json` index and downloads from it. Two are built in; you can add your own. See [Publishing to the catalog](../plugins/publishing.md).

**Channel**
: A release stream of a catalog — **testing**, **canary**, or **stable** for plugins; **canary** or **stable** for themes. Channels differ only by how tested they are, and are separate branches of the same repo. See [Install plugins & themes](../using/marketplace.md#release-channels).

**Official (catalog)**
: A badge PyDeck applies to a catalog it publishes, decided from the URL the catalog was configured with — never from anything the catalog claims about itself. See [Official badge](../using/marketplace.md#official-badge).

**Credentials**
: Secrets a plugin needs — an API key, a login, or an OAuth token. Stored per-plugin and entered in Settings, not on a button. See [Authentication & credentials](../plugins/authentication.md).

**Deck**
: A Stream Deck — physical hardware, or a [virtual deck](../using/virtual-decks.md).

**Folder**
: A key that opens a sub-page of more keys, with an automatic back button. Lets one deck hold far more than its key count. See [Profiles & folders](../using/profiles-and-folders.md).

**Function**
: One button type a plugin provides (e.g. Spotify's *Play / Pause*). A plugin can offer several functions.

**Handler**
: The Python module for one plugin function (`handler.py`), exposing `on_load` / `on_press` / `on_poll`. See [Runtime & the ctx object](../plugins/runtime.md).

**Listener**
: The per-device subprocess that owns the USB connection, reads key presses, and renders images to the hardware. One listener runs per connected deck.

**Marketplace**
: The in-app browser for installing plugins and themes from the catalogs.

**Pairing token**
: A 64-character secret a remote device receives after entering the pairing sequence. It authorises that device for one virtual deck, and is the only thing that gets a non-local request past the deny-by-default rule. Revoke them in **Settings → Tokens**. See [Virtual decks & phone control](../using/virtual-decks.md).

**PDK (PyDeck Development Kit)**
: The current plugin format: XML `template.xml` files for the button face plus Python handlers. The older "classic" format is retired. See [Build Plugins](../plugins/getting-started.md).

**Poll**
: A plugin function's periodic refresh (`on_poll`), used for buttons that update on their own — clocks, now-playing, sensors.

**Profile**
: A complete named button layout you switch between (e.g. *Work* vs *Gaming*). See [Profiles & folders](../using/profiles-and-folders.md).

**RDNN (reverse domain-name notation)**
: The id scheme for plugins, e.g. `no.pydeck.spotify`. The id is also the install folder name.

**Reserved state key**
: A `_`-prefixed key the core injects into a PDK render — `_button_color`, `_button_image`, the title-style keys, and so on. Templates and stylesheets read them; handlers never write them. See [Reserved state keys](../plugins/runtime.md#reserved-state-keys).

**Template**
: The XML markup describing a button's face for a PDK plugin. A function can have several named templates and switch between them at runtime. See [Templates & elements](../plugins/templates.md).

**Theme**
: A set of CSS variables that restyle the PyDeck web UI. See [Appearance & themes](../using/appearance.md) and [Build Themes](../themes/getting-started.md).

**Variant**
: A named version of a theme, usually light vs. dark (e.g. Catppuccin *Latte* / *Mocha*).

**Virtual deck**
: A software deck with no hardware — shown in the browser, on a phone, or on a spare screen (kiosk). See [Virtual decks & phone control](../using/virtual-decks.md).
