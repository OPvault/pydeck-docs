# Install plugins & themes

PyDeck ships with **no plugins** and a single built-in theme — you add exactly what you want from the built-in **Marketplace**. This page covers finding, installing, updating, and removing them from the PyDeck UI. (If you want to *build* a plugin or theme, see [Build Plugins](../plugins/getting-started.md) and [Build Themes](../themes/getting-started.md).)

## Open the Marketplace

Open PyDeck at [http://localhost:8686](http://localhost:8686) and click **Marketplace** in the sidebar.

The left panel is filters, the middle is the catalog:

| Filter | What it does |
|---|---|
| **Search** | Matches name and description as you type. |
| **Sort** | A–Z or Z–A. |
| **Grid / list** | Two card layouts; your choice is remembered. |
| **Status** | All, **Installed**, or **Updates** (things you have with a newer version available). |
| **Type** | **Plugins** (buttons that *do* things) or **Themes** (restyle the UI). |
| **Category** | Plugin categories from the catalog — media, utilities, system, and so on. |
| **Sources** | Shown when more than one catalog is active — filter to one catalog. |
| **Platform** | Shows what PyDeck detected about this machine (*Detected: Linux · Wayland · x86_64*) and a **Works on my system** switch, **on by default**, that only lists plugins whose declared platform matches. Turn it off to also see plugins that never said where they run (marked *Unverified*). |
| **Platform tags** | Filter by a platform word a plugin declares — `linux`, `x11`, `wayland`, `dbus`, `mpris`, … Tags this machine offers are marked *Detected*. |
| **Show incompatible** | Appears only when some plugin can't run here — it needs a different PyDeck version, or a different platform (Linux-only on Windows, X11-only on Wayland). Off by default. |

Every plugin card carries a small **compatibility pill**: the platform it declares when that matches yours, *not compatible* with the reason on hover when it doesn't, or *Unverified* when the author declared nothing.

The **refresh** button in the filter header re-fetches every catalog, bypassing the cache.

## Install a plugin

1. Browse or search the plugin list.
2. Click **Install**. PyDeck downloads it and it appears in the sidebar right away.
3. To install a specific release instead of the newest, use the **arrow** on the right of the Install button and pick a version from the list.

That's usually all there is to it. Three things can add an extra step:

- **Python dependencies.** Some plugins need additional Python packages. PyDeck installs them automatically and then restarts itself — this is normal and only happens once per plugin.
- **System packages.** Some plugins need a program from your operating system — `xdotool` for keyboard control on X11, say. If it's already installed, nothing happens. If not, PyDeck opens a **System packages** dialog *before* downloading anything: it lists each package, why the plugin wants it, and the **exact command** it will run with your system's own package manager (`apt`, `dnf`, `pacman`, …). Click **Install** to run it — you'll be asked for your sudo password when the package manager needs it; the password is used for that one step and never stored. Packages marked *optional* can be **skipped** and the plugin installs without them; declining a *required* one cancels the install and leaves nothing behind. PyDeck never removes a system package again — it belongs to your OS, not to the plugin.
- **Setup scripts.** A few plugins run a one-time setup script (for example, to add you to a system group). PyDeck **will not run it without your approval** — you'll see a prompt showing the script's actual contents. Review it and approve or decline. Declining removes the plugin. Some setup steps need administrator rights, which PyDeck will tell you. Once you've approved a script, an update that ships the identical script won't ask again; a changed script will.

If a plugin **can't run on this machine** — wrong operating system, wrong display session, or a PyDeck version it doesn't support — its card is hidden until you press **Show incompatible**, and even then the button reads **Not compatible** (hover it for the reason). There is no way to force the install.

An install downloads into a staging directory and swaps it into place in one move, so an interrupted download never leaves a half-installed plugin behind.

### The corner buttons

Cards carry up to three small buttons in the corner:

| Button | Opens |
|---|---|
| **Docs** | The plugin's bundled guide, fetched straight from the catalog — readable **before** you install. |
| **Changelog** | The full version history, newest first. |
| **Licenses** | Third-party licence texts the plugin declares, one tab per licence. |

Plugins that bundle documentation can also pop it up automatically right after install, if the author opted in.

A card can also show a **Local** chip instead of the catalog's badges. That means the installed copy is a version no catalog has published — typically a development checkout — so the catalog can't vouch for it.

## Using a plugin's buttons

Once installed, a plugin adds one or more **functions** you can put on a key:

1. Drag the function from the sidebar onto a key (or select a key and pick it).
2. Fill in any options the function offers (a city for weather, a display mode for Spotify, and so on).
3. Save.

Some plugins need **credentials** — a login, an API key, or an OAuth sign-in (Spotify, Discord). You enter those in **Settings → Credentials**, not on the button. See [Authentication & credentials](../plugins/authentication.md) for how a given plugin's login works.

## Install a theme

Themes work the same way: switch **Type** to **Themes**, pick one, and click **Install**. Then apply it in **Settings → Appearance**. Many themes offer light and dark variants. Full details are in [Appearance & themes](appearance.md).

## Update or remove

- **Update** — a card with a newer version available shows an **update badge**. Click **Upgrade** for the newest release, or use the arrow beside it to pick a specific newer version. Downgrades are deliberately not offered here. Your settings and any data the plugin saved are preserved.
- **What's new** — when the newer versions ship changelogs, the update badge itself is clickable and opens *"What's new since v&lt;your version&gt;"*: every version above the one you have, newest first. If none of them ship a changelog the badge is just a label.

    Each version's changelog is a separate file fetched from the catalog, so the log is
    assembled from several of them. A version whose file can't be fetched doesn't blank
    the modal — everything that did arrive is shown, followed by a note saying how many
    versions are missing.
- **Remove** — click **Uninstall**. This removes the plugin's files; buttons that used it will need to be reassigned. (Uninstall is hidden while an upgrade is running.) System packages the plugin had you install stay — they're part of your OS. If the plugin enabled a service (an SSH server, say) that no other installed plugin needs any more, PyDeck tells you how to stop it (`sudo systemctl disable --now <service>`) but doesn't do it for you.

To keep the PyDeck **app itself** up to date (separate from plugins), see [Updating PyDeck](updates.md).

## Catalogs and channels

A **catalog** is a repo that lists installable plugins or themes. PyDeck ships with two, and they are always active:

```text
https://plugins.pydeck.no     ← the official plugin catalog
https://themes.pydeck.no      ← the official theme catalog
```

Both redirect to the **stable** branch of their repo.

### Official badge

Catalogs PyDeck itself publishes are marked **Official**. PyDeck decides that from the URL a catalog was configured with — a `pydeck.no` host, or a `raw.githubusercontent.com` URL under `OPvault` — and **never** from anything the catalog claims about itself, since a catalog vouching for its own officialness would be trivially forged.

### Release channels

Each official catalog is published on **channels** — parallel branches of the same repo that differ in how finished a release is:

| Channel | What it means |
|---|---|
| **Stable** | Recommended for everyone. What the built-in catalogs point at. |
| **Canary** | Pre-release builds getting a final check. |
| **Testing** | The active development line — newest, least tested. |

Stick with **Stable** unless you're helping test new releases. To follow another channel, add that branch as an extra catalog (below); its channel name shows as a badge on the source row and on the cards it provides.

### Adding your own catalog

Open the **+** button in the filter header to reach **Catalog sources**. The panel lists every active catalog and lets you add more.

Paste any of these shapes into **Add a catalog** — PyDeck normalises them into a raw manifest URL:

```text
https://raw.githubusercontent.com/owner/repo/branch/manifest.json
github.com/owner/repo
github.com/owner/repo/tree/canary
github.com/owner/repo/blob/stable/manifest.json
```

A user-added catalog can be **edited in place** (fix a typo without removing and re-adding) or **removed**. The two built-in catalogs can't be edited or removed — they show a dash instead of buttons. Setting the `PYDECK_MARKETPLACE_MANIFEST_URL` environment variable (comma-separated) adds catalogs on top of your saved list; those rows are marked **Environment** and are likewise not editable here.

!!! warning "A catalog is code you're about to run"
    Installing from a third-party catalog runs that author's Python on your machine.
    Add catalogs you trust, and read the post-install prompt when one appears.

## Where files live

Installed plugins and themes are stored under your data directory, separate from the PyDeck program:

- Plugins: `~/.local/share/pydeck/plugin/`
- Themes: `~/.local/share/pydeck/themes/`
- Data a plugin saves (caches, tokens): `~/.local/share/pydeck/storage/` — this survives updates.

(PyDeck honors `$XDG_DATA_HOME` if you've set it.) You normally never touch these by hand; the full layout is in [Config & file paths](../reference/paths.md).

## Maintaining your own catalog

Want to publish plugins or themes for others to install? That's a separate, technical workflow — see **[Publishing to the catalog](../plugins/publishing.md)** and **[Publishing themes](../themes/publishing.md)**.
