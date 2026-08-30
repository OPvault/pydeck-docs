# lib/ service modules

The domain layer. None of these import FastAPI or know that HTTP exists; they
raise `lib/errors.py:ServiceError` when something goes wrong and let the route
layer turn that into a response.

This document covers the modules introduced or reshaped by the `start.py` split.
The older `lib/` modules — `button.py`, `config.py`, `streamdeck.py`,
`plugin.py`, `pdk/`, `folders.py`, `scroll.py`, `themes.py`, `app_updater.py`
and the rest — are unchanged and are described in the pydeck repository's
[`AGENTS.md`](https://github.com/opvault/pydeck/blob/main/AGENTS.md).

## errors.py

```python
class ServiceError(Exception):
    def __init__(self, message: str, status: int = 400, extra: dict | None = None)
    def body(self) -> dict
```

Its own module, with no imports, so raising it never drags FastAPI into the
domain layer or the listener process. See [The `api/` package](api-layer.md) for
the contract.

## bootstrap.py

Startup order. Called only from `start.py`'s `__main__` block.

| Function | Does |
|:---|:---|
| `maybe_restart_for_update()` | Apply a pending auto-update and re-exec. |
| `start_services()` | Icon cache, listeners, hot-plug loop, background tasks, background updater. |
| `serve(app)` | Read the configured bind host and run uvicorn on port 8686. |

The bind host is read inside `serve()`, not at import time, because changing it
is a restart.

## device_registry.py

The set of decks the server knows about, and the mutable state every render path
reads. This is the module that owns shared server state.

Data:

| Name | Holds |
|:---|:---|
| `deck_infos` | device id to deck geometry, physical and virtual |
| `listener_procs` | device id to listener `Popen` handle |
| `button_image_state` | device id to slot to runtime image override |
| `devices_lock` | reentrant lock for hot-plug writes |
| `FALLBACK_DECK_INFO` | 3x2 deck used when nothing is connected |

`devices_lock` is a `RLock`, not a `Lock`, so the hot-plug scan can hold it
across a whole pass while still calling `register_deck` / `unregister_deck`,
which take it themselves.

Functions:

| Function | Purpose |
|:---|:---|
| `profile_generation()` | Current staleness counter. |
| `bump_profile_generation()` | Mark every in-flight poll result stale. |
| `reset_all_display_state()` | Bump, then clear images, preloads and scroll for every device. A profile change. |
| `reset_device_display_state(did)` | Same, for one device. A folder change. |
| `selected_device_id()` / `set_selected_device_id(did)` | Which deck the editor is pointed at. |
| `select_first_available_if_unset(did)` | Adopt `did` when nothing is selected. |
| `drop_selection_if(did)` | Move the selection off `did` to any other known deck. |
| `effective_device_id()` | The device for the current request: the bound context if it names a known deck, else the selection. |
| `bind_selected_device()` | Bind the thread's device context to the selection. |
| `selected_deck_info()` | Deck geometry for the current request. |
| `deck_info_from_device(device)` | Describe a physical deck from HID product id plus a live query. |
| `deck_info_from_virtual(vdeck)` | Describe a virtual deck in the same shape. |
| `register_deck(did, info)` / `unregister_deck(did)` | Add or forget a deck. |
| `get_devices_list()` | Serialisable list of all decks, with `selected` flagged. |
| `register_virtual_decks()` | Register every saved virtual deck at startup. |
| `find_physical_devices()` | Connected hardware, over HID. |

**The generation counter.** A profile or folder change invalidates every render
path at once. Anything that started before the change — a poll result in flight,
a preloaded display update about to come due — must discard itself rather than
write onto whatever now occupies that slot. Producers snapshot
`profile_generation()` before they start and pass it as `expected_gen`;
`display_updates.commit_display_update` re-checks it as close to the write as
possible.

## listener_bridge.py

Spawns the per-device listener subprocesses and parses their stdout protocol.

| Function | Purpose |
|:---|:---|
| `start_listener(device_info)` | Spawn one listener and bridge its output on a thread. |
| `start_all_listeners()` | Detect devices, spawn one each, register virtual decks. |
| `start_hotplug_loop()` | Background thread; rescans every `HOTPLUG_INTERVAL_S` (5s). |

The protocol, parsed line by line in `_consume_listener_line`:

| Line | Effect |
|:---|:---|
| `PRESS:{json}` | Forward a press report to the browser; re-poll the plugin's other buttons in this process. |
| `DisplayUpdate slot=N image=...` | Record or clear the runtime image override for that slot, and tell the UI to refetch. |
| `FolderChange slot=N` | Reset that device's display state; emit `folder_change`. |
| `ProfileChange` | Reset every device's display state; emit `profile_change`. |
| `Error executing button id=N: ...` | Emit an `error` deck event. |
| `CrossDeviceUpdate:{json}` | Apply a display update a plugin aimed at a different deck. |

**A `PRESS:` line is a report, not a request.** The listener already executed the
press before printing it. Dispatching it again would run the handler's side
effect twice — that shipped once as double Spotify skips. What the server does
instead is re-poll the pressed plugin's buttons with `_force_refresh`, so the
image the browser refetches is already the new one. The comment saying so lives
in `_handle_press_line`; leave it there.

## server_events.py

The WebSocket fan-out.

| Name | Purpose |
|:---|:---|
| `set_event_loop(loop)` / `get_event_loop()` | The server's loop, set by `start.py`'s lifespan hook. |
| `class WSManager` / `ws_manager` | Tracks sockets and whether each is local. |
| `emit(event, data, *, local_only=False)` | Broadcast from any thread. |
| `emit_deck_event(**fields)` | Shorthand for the `deck_event` envelope. |
| `emit_display_update(button, device_id=None, **extra)` | The "this slot changed" event. |

`emit()` is a no-op before the loop is set, which is why the PDK animation ticker
waits for `get_event_loop()` before its first tick.

## web_render.py

Button faces as the web grid sees them. The hardware is drawn by the listener;
this is the browser's copy. Both ask `lib/button.py:pdk_owns_face()` which
renderer applies, so a slot is never drawn twice in two styles.

| Function | Purpose |
|:---|:---|
| `slot_png(slot, *, hires_scale=1)` | PNG for one slot of the current request's deck. |
| `slot_gif(slot)` | Raw GIF for one slot, or `None` if it is still. |
| `slot_png_export(slot, scale)` | Hi-res PNG plus download filename; gated on `export_rightclick`. |
| `deck_grid_payload()` | Every key preview in one payload, from a single `buttons.json` read. |
| `web_slot_png_bytes(...)` / `web_slot_gif_bytes_if_animated(...)` | The lower-level forms, taking an explicit button list and deck info. |
| `sorted_buttons()` / `button_row_for_slot(buttons, slot)` | Button lookup helpers. |
| `empty_slot_color()` | Face colour for an empty slot; lifted to dark grey on a light theme. |
| `text_style_kwargs(display, plugin, function)` | Resolve the three-layer text-style chain into render kwargs. |

`pdk_animated_slots` is a module-level set of slots whose PDK face is currently
animating. It is **re-earned on every render**: `web_slot_png_bytes` discards the
slot at the top and re-adds it only if `function_animates()` still says so, so a
button that stops moving — or stops being a PDK button at all — drops off the web
animation ticker by itself.

The three-layer text-style merge is: system defaults < per-button `display` <
plugin manifest `default_display`, resolved by
`button.resolve_display_for_render()`.

## display_updates.py

Applying a plugin's `display_update` to a button, once and safely.

| Function | Purpose |
|:---|:---|
| `register_preloads_from_plugin_result(did, btn_id, result)` | Schedule, or cancel, the timed updates a plugin asked for. |
| `commit_display_update(did, btn_id, disp, btn=None, expected_gen=None)` | Persist an update, refresh scroll state, emit. Returns whether it wrote. |

Three producers reach this module — a press result, a poll result, and a preload
that came due — and all three race a profile or folder change. Two defences:

- `expected_gen` is re-checked as close to the write as possible, in addition to
  whatever the caller checked.
- The button row is **re-read from the active profile** rather than trusted from
  whatever the caller was holding when it started. A stale `btn` from a previous
  profile cannot write display state onto a button that no longer exists.

An explicit empty `preload_display_updates: []` cancels pending preloads — that
is how a countdown stops when a track stops playing.

## background_tasks.py

The four background loops.

| Function | Cadence | Does |
|:---|:---|:---|
| `start_display_poller()` | 0.2s tick | Calls each button's `poll` handler at the interval its manifest asks for, per device. |
| `start_display_schedule_loop()` | 0.05s | Applies preloaded display updates when they come due. |
| `start_pdk_animation_ticker()` | 0.2s | Nudges the browser to refetch animating PDK faces. |
| `start_scroll_ticker()` | 0.3s | Advances every marquee and reports which slots moved. |
| `start_all()` | — | Starts all four. |

Animation and marquee ticks stay independent of the poll cycle on purpose.
Folding one into the other stalls animation behind slow handlers.

The poller binds the device context per device per cycle, keys its next-poll
schedule on `(device_id, button_id)` so decks sharing slot numbers stay
independent, and returns early from a device when the generation moves.

## button_service.py

Button CRUD, plus the side effects the server owes the UI.

| Function | Purpose |
|:---|:---|
| `load_buttons()` | The active profile's `buttons.json` payload. |
| `save_button(btn_id, data)` | Upsert: edit, falling back to create. |
| `delete_button(btn_id)` | Remove, cancelling anything scheduled against the slot. |

Both writes drop the slot's runtime image override before emitting, so a plugin
that conditionally shows an icon does not keep drawing the old one.

## button_press.py

A press that came from the browser, and its fan-out. `press_button(btn_id,
requested_device_id='')` is the whole public surface.

One press can change more than the button pressed, and the order matters:

1. Register any preloads the result asked for.
2. Record the pressed button's new runtime image.
3. Re-read the button row and refresh its marquee.
4. Emit the `press` event.
5. Handle `profile_change` / `folder_change`.
6. Apply `related_updates` — other slots the plugin named.
7. Re-poll PDK siblings.
8. Apply `cross_device_updates` — slots on another deck.

Step 7 exists because PDK plugins have no `related_states`: a press advances only
the pressed function's state, so sibling buttons of the same plugin would sit
stale until the poll loop came round. Re-polling them here makes them change
together with the press.

## device_service.py

| Function | Purpose |
|:---|:---|
| `list_devices()` | Every known deck, selected one flagged. |
| `select_device(did)` | Point the editor at a deck; return everything the grid needs. |
| `get_orientation()` / `set_orientation(raw)` | Deck rotation; only right angles accepted. |
| `list_virtual_decks()` | Saved virtual decks plus the layout presets. |
| `create_virtual_deck(data)` | Create one, mirroring a real deck's layout or a preset. |
| `delete_virtual_deck(deck_id)` | Delete and move the selection off it. |
| `welcome_state()` | First-run state, derived from the device registry. |

Create and delete broadcast `devices_changed`, because the device list is in the
header of every page and a deck made in one tab must appear in the others.

## api_scopes.py

The scope catalog, and the path-to-scope table an API token is judged against.
Pure policy: no state, no I/O. Full reference in
[API tokens](../reference/api-tokens.md).

| Name | Purpose |
|:---|:---|
| `SCOPE_GROUPS` | The catalog, in the order the token editor lists it. |
| `ALL_SCOPES` | Every legal `group:level` string. |
| `required_scope(method, path)` | The scope this request needs, or `None`. |
| `group_for_path(path)` | Just the group. |
| `access_for_method(method)` | `read` for GET/HEAD, `write` otherwise. |
| `normalize_scopes(raw)` | Validate a submitted list, dropping unknowns, in catalog order. |
| `catalog()` | The catalog as JSON for the editor. |
| `read_only_scopes()` | Every `:read` scope. |

`required_scope` returning `None` means **refuse**, not "no scope needed". Its
rule table is ordered and first-match-wins, so a path the table does not cover
is unreachable by any token — the same deny-by-default shape
`lib/remote_access.py` has for the network.

Two orderings in that table are load-bearing: the `/api/settings/updater` and
`/api/settings/version-selector` rules precede the generic `/api/settings/`
rule, and `/api/plugins/<n>/api/...` precedes the generic `/api/plugins/` rule.

## api_tokens.py

Storage and validation for API tokens.

| Name | Purpose |
|:---|:---|
| `resolve(secret)` | The record for a presented token, or `None`. |
| `looks_like_api_token(value)` | Whether a string is `pdk_`-shaped. |
| `touch(token_id)` | Record use, at most once per `TOUCH_INTERVAL_S`. |
| `list_tokens()` / `scope_catalog()` | What the settings pane renders. |
| `create_token(data)` | Mint one; the only time the secret exists. |
| `update_token(id, data)` | Rename, or change scopes and deck, without reissuing. |
| `revoke_token(id)` | Delete it. |
| `load_tokens()` | Every stored record. |

Only a SHA-256 digest is stored, alongside a 10-character display prefix. A
plain digest is sufficient because the token is 24 random bytes, not a password:
there is no low-entropy guess to accelerate. `resolve()` returns `None` for
unknown, malformed and expired alike — that difference is only useful to an
attacker.

The file is written `0o600` where the OS supports it, through a temp file and an
atomic rename, under an `RLock`.

## pairing.py

The pairing handshake and its tokens. Covered in [Access control](security.md).

| Function | Purpose |
|:---|:---|
| `start_pairing(deck_id, source, *, local)` | Generate a sequence and broadcast it to local sockets. |
| `verify_pairing(deck_id, raw_sequence, user_agent)` | Score a guess; mint a token on success. Async, because a wrong guess sleeps. |
| `list_tokens()` / `revoke_token(token)` | The settings pane's token list. |
| `parse_device_name(ua)` | Human label for a paired device, from its User-Agent. |
| `sequences_match(a, b)` / `new_pair_sequence()` | Constant-time compare; `secrets`-backed generation. |

## marketplace_catalog.py

Where a catalog lives, and what it currently offers.

| Function | Purpose |
|:---|:---|
| `normalize_manifest_url(url)` | Turn a pasted GitHub URL into a raw `manifest.json` URL, keeping its branch. |
| `is_official_catalog(url)` | Whether PyDeck publishes it: a `pydeck.no` host or an OPvault raw URL. |
| `catalog_root_url(manifest_url)` | The `root_url` the manifest declares, from the manifest cache. |
| `asset_base(manifest_url)` | Base that relative entry paths hang off. |
| `repo_ref(manifest_url)` | The GitHub repo installs download from, following redirects. |
| `config_manifest_urls()` | URLs stored in config only. |
| `manifest_sources()` | Active URLs with origin: `env`, `config`, or `default`. |
| `manifest_urls()` | Just the URLs, in priority order. |
| `repos_settings()` / `save_repos_settings(raw)` | The sources panel's read and write. |
| `fetch_catalog_source(url, force)` | Load one catalog as both a plugin and a theme manifest. |
| `canonical_install_dir(plugin_ref)` | Installed dir for a slug, preferring the RDNN copy. |
| `annotate_installed_plugins(rows)` | Stamp catalog rows with local install state. |
| `build_catalog(q, category, refresh)` | Merge every catalog into one payload. Returns `(payload, status)`. |

Three URLs are in play and they are not interchangeable:

- The **manifest URL** the user configured. The defaults, `plugins.pydeck.no`
  and `themes.pydeck.no`, redirect to the `stable` branch of the catalog repos.
- The **asset base** that relative paths hang off: the declared `root_url` if
  there is one, else the manifest's own directory. Trimming the last path
  segment is only right for a manifest served from the repo holding the files;
  on a bare hostname it yields `https://` with no repo in it, which is why
  `root_url` exists.
- The **GitHub repo** installs download from, which a custom domain only names
  after its redirect. `repo_ref()` tries the stored URL, then `root_url`, then
  the post-redirect URL the manifest cache recorded.

Officialness is judged only on the configured URL, never on anything the
manifest says about itself — a catalog vouching for its own officialness would
be trivially forged.

`build_catalog` fetches catalogs in parallel (one slow repo must not stall the
rest) but merges in configured order so priority stays deterministic. It returns
502 only when every catalog failed; a partial failure returns rows plus
`repo_errors`.

## marketplace_install.py

Installing, upgrading and removing plugins and themes.

| Function | Purpose |
|:---|:---|
| `install_plugin(manifest_url, slug, version='')` | Install into `plugins/plugin/<slug>/`. |
| `uninstall_plugin(slug)` | Remove it, clearing caches under every alias. |
| `install_theme(...)` / `uninstall_theme(slug)` | The same for themes. |
| `installed_documentation(slug)` | The bundled markdown docs for an installed plugin. |
| `plugin_install_dir(slug)` / `theme_install_dir(slug)` | Safe path resolution; `None` for an unsafe slug. |
| `invalidate_plugin_caches(slug)` | Forget everything cached about a plugin. |
| `postinstall_status(id)` / `postinstall_script(id)` | Query a pending post-install request. |
| `approve_postinstall(id, sudo_password)` / `decline_postinstall(id)` | Run it, or refuse it. |
| `postinstall_manager` | The `PluginPostInstallManager` instance. |
| `system_packages_status(id)` | Query a pending or finished system-package request. |
| `approve_system_packages(id, sudo_password)` / `decline_system_packages(id)` | Run the planned commands and then install the plugin, or refuse them (an optional-only refusal still installs). |
| `system_package_manager` | The `SystemPackageManager` instance holding pending plans. |

`install_plugin` is two halves. `_prepare_plugin_install` does everything that can refuse
before a byte lands: catalog lookup, the platform verdict (`marketplace.platform.classify`
→ 409, no override), the version manifest, and `system_packages` resolution
(`marketplace.system_packages.resolve` with the probes in `lib.plugins.system_packages`).
If the plan has anything to install, the request is parked in `system_package_manager`
and the call returns `system_packages_required`; `_finish_plugin_install` — download,
cache invalidation, the post-install gate — only runs from `approve_system_packages`
(or `decline_system_packages` when only optional packages were pending). The
post-install gate rejects a script that calls a package manager
(`lib.plugins.postinstall.PackageInstallInScript`) and removes the freshly written
directory. The two modules split on purpose: `marketplace/system_packages.py` is pure
(manifest parsing, manager table, resolution against callables) and unit-tested
without a machine; `lib/plugins/system_packages.py` is the side that probes `PATH`,
runs `sudo -S`, and writes `plugin_system_packages` / `plugin_services`.

**Cache invalidation is mandatory after files change.** Every operation replaces
a directory underneath a running server. The PDK parse cache has no staleness
check at all, and the manifest and PDK-detection caches key on a directory mtime
that settles before the nested sources finish landing. A read landing in that
window caches "not PDK" against the final mtime and never recomputes, so every
button renders blank until a restart.

Uninstall resolves `plugin_ref_aliases(slug)` **before** deleting the directory,
because one plugin answers to several spellings and dropping a single cache key
leaves the others stale.

## theme_swatches.py

Colour swatches for theme cards in the marketplace.

| Function | Purpose |
|:---|:---|
| `parse_css_swatch(css_text)` | Pull the handful of custom properties a swatch is drawn from. |
| `swatch_key(asset_base, version_path)` | Cache key: the exact immutable file location. |
| `fetch_remote_theme_colors(asset_base, theme_dict)` | At most two requests: manifest, then the CSS it names. |
| `enrich_theme_preview_colors(themes, installed, asset_base_for)` | Fill in `colors` on every theme row. |
| `installed_themes_list()` | Marketplace-installed themes, from their `.marketplace.json` markers. |

Colours resolve cheapest-source-first: an installed copy on disk, then the
persistent `SWATCH_CACHE`, then the network. A swatch is pinned to an immutable
published version, so once fetched it never needs fetching again. Remote lookups
are deduplicated by version path, since the same theme usually appears in
several channels of one repo.

`installed_themes_list()` skips dot-prefixed directories: those are staging or
rollback leftovers from an interrupted install and carry a marker without being
installed themes.

`enrich_theme_preview_colors` takes `asset_base_for` as a parameter rather than
importing it, so the marketplace keeps ownership of the URL rule and this module
stays independent of it.

## plugin_service.py

What the editor needs to know about installed plugins.

| Function | Purpose |
|:---|:---|
| `list_plugins()` | Every plugin and function, as the sidebar reads it. |
| `function_form_html(name, func_name)` | Render one function's manifest `ui` array to the property form. |
| `settings_panel_path(name)` | The plugin's own `settings.html`. |
| `image_path(name, filename)` / `storage_path(name, filename)` | Plugin assets and runtime files. |
| `resolve_plugin_img_file(plugin_dir, filename)` | Basename-only image lookup; accepts `img/` and `assets/icons/`. |
| `combined_styles_css()` | Every plugin `style.css`, concatenated. |
| `call_plugin_api(name, endpoint, query)` | Invoke a plugin's `api_<endpoint>` callable. |

`EMULATED_TIME_FIELD` is appended to every function's form while the emulated
clock developer option is on.

`resolve_plugin_img_file` accepts only a basename and rejects traversal. It
probes `img/<name>` then `assets/icons/<name>`, because the GUI maps manifest
paths to `.../img/<filename>` and drops subdirectories, and PDK plugins commonly
keep icons under `assets/icons/`.

## credentials_service.py

| Function | Purpose |
|:---|:---|
| `build_credentials(include_secrets=False)` | Credential listing, one entry per plugin that declares any. |
| `save_credentials(plugin_name, data)` | Merge submitted values, leaving masked passwords untouched. |

`MASK` is the bullet string the browser sees for a stored password. Saving
treats it as "unchanged", so a form round-trip cannot overwrite a secret with
bullets. Only `?secrets=1` returns real values.

## settings_service.py

| Function | Purpose |
|:---|:---|
| `settings_categories()` | Built-in categories plus one per plugin-declared category. |
| `slugify_category(label)` | Category label to URL-safe id. |
| `licenses_index()` / `license_text(filename)` | The bundled third-party licences. |
| `developer_options()` | Developer flags plus the resolved emulated-clock instant. |
| `set_developer_option(data)` | Toggle a flag, or set its value when one is supplied. |

`BUILTIN_CATEGORIES` is an ordered tuple; plugin categories are appended, sorted
by label. A plugin's chosen `category_id` is stripped to a safe slug, so two
plugins naming the same category land in one entry.

## updater_service.py

| Function | Purpose |
|:---|:---|
| `updater_settings()` / `save_updater_settings(data)` | Auto-update mode, branch, interval. |
| `check_for_updates()` / `perform_update()` | Check and apply. |
| `version_selector_settings()` / `save_version_selector(data)` | The pin. |
| `list_releases()` / `apply_version(version)` | Available releases, and checking one out. |
| `deferred_restart()` | Sleep 1.5s, then restart, so the response flushes first. |

While a version is pinned the auto-updater is blocked, because an update would
silently undo the pin. `apply_version` tries the tag as given, then with a `v`
prefix.

## server_network.py

| Function | Purpose |
|:---|:---|
| `network_settings()` | Bind host, LAN address, port. |
| `lan_ip()` | This machine's LAN address, from the routing table. No packet is sent. |
| `set_host(host)` | Persist and restart, since uvicorn binds only at startup. |
| `qrcode_svg(url)` | An SVG QR code, for pairing without typing an address. |
| `open_in_file_manager(raw_path)` | Reveal a path in the desktop file manager. |

`open_in_file_manager` walks up to the nearest existing directory, so a path
naming a file — or one whose leaf was deleted — still opens something useful.

## icon_gallery.py

| Function | Purpose |
|:---|:---|
| `build_icon_cache()` | Scan every plugin `img/` folder once, at startup. |
| `scan_storage_icons()` | Scan plugin runtime storage, live. |
| `scan_user_uploads()` | Scan the user's gallery, live. |
| `list_icons()` | All three merged, uploads first. |
| `upload_path(filename)` | Where `/api/gallery/<filename>` reads from. |
| `save_upload(filename, data)` | Store an upload and describe it. |

The three sources are scanned on different schedules deliberately: plugin `img/`
folders only change when a plugin is installed, so they are cached once, while
storage files are written by running plugins and uploads appear mid-session —
both are re-scanned per request so a new file shows up without a restart.

Icon names show the bare stem, unless two files in one folder share one
(`icon.png` and `icon.gif`), in which case both show the full filename.

## action_service.py, profile_service.py, folder_service.py, theme_service.py

Thin layers over `manage_actions.py`, `profiles.py`, `folders.py` and
`themes.py`. Their job is to translate what those raise into the answers the
REST layer gives — a missing item is 404, a rejected input is 400 — so route
handlers stay free of `try`/`except`.

Two carry real logic beyond that:

**`profile_service.change_profile`** calls
`device_registry.reset_all_display_state()` and emits `profile_change`. A profile
switch replaces every button at once, so nothing cached from the previous
profile may still be drawn.

**`folder_service.change_folder`** manages the folder stack before switching:
entering the root clears it, an explicit `stack` in the body replaces it (a
breadcrumb jump), and anything else pushes the folder being left. It then calls
`reset_device_display_state()` for that one device.

`folder_service.upsert_folder` picks out only the auto-return keys actually
present in the body, so saving a folder's name never silently rewrites settings
the form did not show.
