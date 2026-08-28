# Route inventory

Every endpoint the server exposes, grouped by the module that owns it: 96 HTTP
routes plus the `/ws` socket, across 18 modules, listed in `ROUTERS` order (see
[The `api/` package](api-layer.md)). With the `/static` mount, that is the 98
entries the route table reports.

The **Scope** column names the API-token scope the endpoint needs; see
[API tokens](../reference/api-tokens.md). "none" means no token can reach it at
all.

The `Calls` column names the `lib/` function the handler delegates to. Where it
says `config.*`, the route calls `lib/config.py` directly because there is
nothing to add beyond the call.

For request and response payload shapes, see the
[HTTP and WebSocket API reference](../reference/http-api.md); for a worked
example of each call, the [API cookbook](../reference/api-cookbook.md). This
page is about which module owns what, not about payload schemas.

## pages.py

No prefix. HTML pages.

| Method | Path | Calls |
|:---|:---|:---|
| GET | `/` | `page_context.index_view` |
| GET | `/mobile/{deck_id}` | `page_context.mobile_view` |
| GET | `/settings` | `page_context.settings_view` |
| GET | `/settings/{category}` | `page_context.settings_view` |

`/settings` and `/settings/{category}` are stacked decorators on one handler, so
`{category}` registers first and `/settings` second — same as before the split.

## events.py

No prefix. The WebSocket stream.

| Method | Path | Notes |
|:---|:---|:---|
| WEBSOCKET | `/ws` | Repeats the admission check itself; HTTP middleware does not run for websockets. |

## decks.py

Prefix `/api`. Decks, their selection, and their state.

| Method | Path | Calls |
|:---|:---|:---|
| GET | `/api/status` | `config.get_brightness` |
| GET | `/api/devices` | `device_service.list_devices` |
| POST | `/api/devices/select` | `device_service.select_device` |
| GET | `/api/devices/orientation` | `device_service.get_orientation` |
| POST | `/api/devices/orientation` | `device_service.set_orientation` |
| POST | `/api/brightness` | `config.set_brightness` |
| GET | `/api/virtual-decks` | `device_service.list_virtual_decks` |
| POST | `/api/virtual-decks` | `device_service.create_virtual_deck` |
| DELETE | `/api/virtual-decks/{deck_id}` | `device_service.delete_virtual_deck` |

## buttons.py

Prefix `/api`. Button configuration, presses, and rendered faces.

| Method | Path | Calls |
|:---|:---|:---|
| GET | `/api/buttons` | `button_service.load_buttons` |
| POST | `/api/buttons/{btn_id}` | `button_service.save_button` |
| DELETE | `/api/buttons/{btn_id}` | `button_service.delete_button` |
| POST | `/api/buttons/{btn_id}/press` | `button_press.press_button` |
| GET | `/api/buttons/{slot}/image` | `web_render.slot_png` |
| GET | `/api/buttons/{slot}/gif` | `web_render.slot_gif` |
| GET | `/api/buttons/{slot}/image/hires` | `web_render.slot_png_export` |
| GET | `/api/deck/grid` | `web_render.deck_grid_payload` |

The image routes render for the **web grid** only; the hardware is drawn by the
listener subprocess. Every face carries `Cache-Control: no-store`, because a
slot's PNG changes whenever its plugin polls.

`/api/buttons/{slot}/gif` returns 404 when the slot has no image, the file is
not a multi-frame GIF, or a PDK template owns the face. `/image/hires` is gated
on the `export_rightclick` developer option and answers 403 when it is off.

## plugins.py

Prefix `/api/plugins`. `{name}` may be either spelling of a plugin id — the
legacy short slug or the canonical RDNN one.

| Method | Path | Calls |
|:---|:---|:---|
| GET | `/api/plugins` | `plugin_service.list_plugins` |
| GET | `/api/plugins/{name}/functions/{func_name}/form` | `plugin_service.function_form_html` |
| GET | `/api/plugins/{name}/settings/panel` | `plugin_service.settings_panel_path` |
| GET | `/api/plugins/{name}/api/{endpoint:path}` | `plugin_service.call_plugin_api` |
| GET | `/api/plugins/{name}/img/{filename}` | `plugin_service.image_path` |
| GET | `/api/plugins/{name}/storage/{filename}` | `plugin_service.storage_path` |
| GET | `/api/plugins/styles.css` | `plugin_service.combined_styles_css` |

`/api/plugins/{name}/api/{endpoint:path}` is greedy but requires a literal `api`
segment, so it cannot swallow the `img` or `storage` routes.
`/api/plugins/styles.css` is three segments and none of the parameterised
patterns above are shorter than four, so it resolves correctly regardless of
order — but keep it last in the module anyway.

## marketplace.py

Prefix `/api`. Catalogs, installs, and post-install approval.

| Method | Path | Calls |
|:---|:---|:---|
| GET | `/api/marketplace/catalog` | `marketplace_catalog.build_catalog` |
| GET | `/api/marketplace/repos` | `marketplace_catalog.repos_settings` |
| PUT | `/api/marketplace/repos` | `marketplace_catalog.save_repos_settings` |
| POST | `/api/marketplace/install` | `marketplace_install.install_plugin` |
| POST | `/api/marketplace/uninstall` | `marketplace_install.uninstall_plugin` |
| GET | `/api/marketplace/installed-doc` | `marketplace_install.installed_documentation` |
| GET | `/api/marketplace/postinstall/status/{request_id}` | `marketplace_install.postinstall_status` |
| GET | `/api/marketplace/postinstall/script/{request_id}` | `marketplace_install.postinstall_script` |
| POST | `/api/marketplace/postinstall/decline` | `marketplace_install.decline_postinstall` |
| POST | `/api/marketplace/postinstall/approve` | `marketplace_install.approve_postinstall` |
| POST | `/api/marketplace/theme-install` | `marketplace_install.install_theme` |
| POST | `/api/marketplace/theme-uninstall` | `marketplace_install.uninstall_theme` |
| POST | `/api/open-folder` | `server_network.open_in_file_manager` |

`/api/marketplace/catalog` is the one route that returns a status code chosen by
its service: `build_catalog` returns `(payload, status)` and the route wraps it
in a `JSONResponse`. The status is 502 only when every catalog failed and there
is nothing at all to show; a partial failure still returns rows with
`repo_errors` alongside them.

`/api/open-folder` lives here because the marketplace UI is its only caller
(`app/static/js/marketplace/marketplace-actions.js`).

## settings.py

Prefix `/api`. The settings pane's own furniture. Anything with a home of its
own — themes, updates, credentials, the marketplace — is routed from that module
instead.

| Method | Path | Calls |
|:---|:---|:---|
| GET | `/api/settings/categories` | `settings_service.settings_categories` |
| GET | `/api/licenses` | `settings_service.licenses_index` |
| GET | `/api/licenses/file/{filename:path}` | `settings_service.license_text` |
| GET | `/api/settings/developer` | `settings_service.developer_options` |
| POST | `/api/settings/developer` | `settings_service.set_developer_option` |
| GET | `/api/settings/text-style` | `config.get_text_style_defaults` |
| GET | `/api/settings/keybinds` | `config.get_keybinds` |
| POST | `/api/settings/keybinds` | `config.set_keybinds` |
| GET | `/api/welcome` | `device_service.welcome_state` |
| POST | `/api/welcome/seen` | `config.set_welcome_seen` |

`/api/welcome` is served from `device_service` because first-run state is
derived from the device registry — how many decks are known, and whether any of
them is physical.

## updates.py

Prefix `/api/settings`. Updating PyDeck itself.

| Method | Path | Calls |
|:---|:---|:---|
| GET | `/api/settings/updater` | `updater_service.updater_settings` |
| POST | `/api/settings/updater` | `updater_service.save_updater_settings` |
| POST | `/api/settings/updater/check` | `updater_service.check_for_updates` |
| POST | `/api/settings/updater/update` | `updater_service.perform_update` |
| GET | `/api/settings/version-selector` | `updater_service.version_selector_settings` |
| GET | `/api/settings/version-selector/releases` | `updater_service.list_releases` |
| POST | `/api/settings/version-selector` | `updater_service.save_version_selector` |
| POST | `/api/settings/version-selector/apply` | `updater_service.apply_version` |

Both "apply" routes answer before the process restarts. The restart is deferred
1.5 seconds by `updater_service.deferred_restart()` so the response reaches the
browser first.

While a version is pinned, the auto-updater is blocked: `check_for_updates`
returns `update_available: false` with an explanatory `error`, and
`perform_update` raises 409.

## pairing.py

Prefix `/api/pair`.

| Method | Path | Calls |
|:---|:---|:---|
| POST | `/api/pair/start` | `pairing.start_pairing` |
| POST | `/api/pair/verify` | `pairing.verify_pairing` |
| GET | `/api/pair/tokens` | `pairing.list_tokens` |
| DELETE | `/api/pair/tokens/{token}` | `pairing.revoke_token` |

`start` and `verify` are two of the few endpoints reachable from off-box before
any credential exists. `tokens` is localhost-only.

## tokens.py

Prefix `/api/tokens`. **Localhost only.** This group appears in neither table in
`lib/remote_access.py`, so a remote caller cannot reach it, and it maps to no
scope, so an API token cannot reach it either — including the token making the
request. A credential that can mint credentials is not a scoped credential.

| Method | Path | Calls |
|:---|:---|:---|
| GET | `/api/tokens` | `api_tokens.list_tokens` |
| GET | `/api/tokens/scopes` | `api_tokens.scope_catalog` |
| POST | `/api/tokens` | `api_tokens.create_token` |
| PATCH | `/api/tokens/{token_id}` | `api_tokens.update_token` |
| DELETE | `/api/tokens/{token_id}` | `api_tokens.revoke_token` |

`POST` returns **201** and is the only response that ever carries the secret;
only its SHA-256 digest is stored. `PATCH` changes a token's name, scopes or
deck without reissuing it.

`GET /api/tokens/scopes` and `DELETE /api/tokens/{token_id}` do not collide:
different methods.

## network.py

Prefix `/api`.

| Method | Path | Calls |
|:---|:---|:---|
| GET | `/api/network` | `server_network.network_settings` |
| POST | `/api/network` | `server_network.set_host` |
| GET | `/api/qrcode` | `server_network.qrcode_svg` |

`POST /api/network` restarts the process, because uvicorn binds only at startup.

## actions.py

Prefix `/api/actions`.

| Method | Path | Calls |
|:---|:---|:---|
| GET | `/api/actions` | `action_service.list_actions` |
| GET | `/api/actions/{name}` | `action_service.get_action` |
| POST | `/api/actions` | `action_service.create_action` |
| PUT | `/api/actions/{name}` | `action_service.update_action` |
| DELETE | `/api/actions/{name}` | `action_service.delete_action` |

`POST /api/actions` returns **201**, which is why its handler wraps the result in
a `JSONResponse` rather than returning the dict directly.

## icons.py

Prefix `/api`.

| Method | Path | Calls |
|:---|:---|:---|
| GET | `/api/icons` | `icon_gallery.list_icons` |
| GET | `/api/gallery/{filename}` | `icon_gallery.upload_path` |
| POST | `/api/icons/upload` | `icon_gallery.save_upload` |

Upload returns **201**. It answers 400 for a missing file or empty filename, 415
for an unsupported extension, 413 for a file over 10 MB.

## themes.py

Prefix `/api`.

| Method | Path | Calls |
|:---|:---|:---|
| GET | `/api/themes` | `theme_service.list_themes` |
| GET | `/api/themes/{family}/{slot}.css` | `theme_service.theme_css_path` |
| GET | `/api/settings/theme` | `theme_service.get_theme` |
| POST | `/api/settings/theme` | `theme_service.set_theme` |

`/api/settings/theme` lives here rather than in `settings.py` because selecting a
theme is a theme operation; the settings pane is only one of its callers.

## credentials.py

Prefix `/api/credentials`.

| Method | Path | Calls |
|:---|:---|:---|
| GET | `/api/credentials` | `credentials_service.build_credentials` |
| POST | `/api/credentials/{plugin_name}` | `credentials_service.save_credentials` |

`?secrets=1` returns real password values and adds `Cache-Control: no-store`.
Without it, a stored password comes back as the mask string. Saving treats the
mask as "unchanged", so a form round-trip cannot overwrite a secret with
bullets.

## profiles.py

Prefix `/api/profiles`.

| Method | Path | Calls |
|:---|:---|:---|
| POST | `/api/profiles/change/{profile_name}` | `profile_service.change_profile` |
| POST | `/api/profiles/changename/` | `profile_service.rename_profile` |
| GET | `/api/profiles/getall` | `profile_service.list_profiles` |
| DELETE | `/api/profiles/delete/{profile_name}` | `profile_service.delete_profile` |

## folders.py

Prefix `/api/folders`.

| Method | Path | Calls |
|:---|:---|:---|
| POST | `/api/folders/{folder_id}` | `folder_service.upsert_folder` |
| POST | `/api/folders/change/{folder_id}` | `folder_service.change_folder` |
| POST | `/api/folders/changename/` | `folder_service.rename_folder` |
| GET | `/api/folders/getall` | `folder_service.list_folders` |
| DELETE | `/api/folders/{folder_id}` | `folder_service.delete_folder` |

`POST /api/folders/{folder_id}` is three segments and `POST
/api/folders/change/{folder_id}` is four, so they do not collide.
`/api/folders/changename/` carries a trailing slash and is registered after the
upsert route, matching the pre-split order.

## oauth.py

No prefix. **Registered last.**

| Method | Path | Calls |
|:---|:---|:---|
| GET | `/api/{plugin_name}/authorize` | `oauth.authorize_url` |
| GET | `/oauth/{plugin_name}/callback` | `oauth.callback_message` |

`/api/{plugin_name}/authorize` matches any three-segment path ending in
`authorize`, which is the whole reason this router is included last. Neither
route is reachable by an API token: an OAuth redirect flow needs a browser. The
callback returns HTML rather than JSON, because it lands in a browser tab the
user is watching: `callback_message` returns `(text, status)` and the route
wraps it in `<h2>`.

Note that `authorize` answers 500, not 400, when the named plugin is not
installed. `oauth.get_oauth_config` raises `FileNotFoundError` in that case,
which is not mapped. This matches the behaviour before the split and was left
unchanged.
