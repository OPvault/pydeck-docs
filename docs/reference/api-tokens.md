# API tokens

A token lets a script drive PyDeck over HTTP. Unlike a pairing token — which is
minted by tapping a code on a phone and unlocks one fixed set of kiosk endpoints
— an API token is created deliberately in the settings pane and carries an
explicit list of permissions.

!!! tip "Related pages"
    Once you have a token, the [API cookbook](api-cookbook.md) shows a worked
    example for every endpoint it can reach. For the deny-by-default policy the
    server enforces around it, see [Access control](../internals/security.md).

## Creating one

Settings, then Tokens, then "New API token" under the API tokens heading.

You choose four things:

| Field | Meaning |
|:---|:---|
| Name | How you will recognise the token later. It is not a secret and not part of the credential. |
| Expires | Never, 30 days, 90 days, or 1 year. An expired token stops working; it is not deleted. |
| Deck | "Any deck" lets the caller pick with `X-Device-Id`. Pinning to one deck makes every request with this token resolve to that deck, and the header is ignored. |
| Permissions | The scopes, below. |

**The token is shown once.** PyDeck stores only a SHA-256 digest of it, so there
is no way to recover it afterwards. If you lose it, revoke it and make another.
The list shows a short prefix (`pdk_a1b2c3…`) so you can tell rows apart.

A plain digest is enough here because the token is 24 random bytes, not a
password: there is no low-entropy guess for an attacker to accelerate.

## Using one

Send the token as `X-API-Key`, or in the standard bearer header:

```bash
curl -H 'X-API-Key: pdk_...' http://127.0.0.1:8686/api/buttons
curl -H 'Authorization: Bearer pdk_...' http://127.0.0.1:8686/api/buttons
```

Both credentials share the bearer header, so they are told apart by shape: an
API token always starts with `pdk_`, a pairing token never does.

For the WebSocket stream, pass it in the query string — a handshake carries no
header a browser script can set:

```
ws://127.0.0.1:8686/ws?api_key=pdk_...
```

That needs the `events:read` scope.

### It restricts you on localhost too

A local request with **no** token keeps full access, exactly as before — that is
how the web UI works. But a request that *carries* a token is judged on that
token's scopes wherever it came from. A read-only token is read-only even from
the machine that issued it.

This is deliberate. The alternative — localhost silently ignoring scopes — would
mean a token could never be tested from the host, and a script developed locally
would fail the moment it moved.

### Errors

| Status | Body | Means |
|:---|:---|:---|
| 401 | `{"error": "Invalid or expired API token"}` | Unknown, malformed, or past its expiry. These are not told apart on purpose. |
| 403 | `{"error": "...", "missing_scope": "buttons:write"}` | The token is valid but lacks the scope named. |
| 403 | `{"error": "...", "reason": "endpoint_not_scopable"}` | No token can reach this endpoint at all. See "Off limits" below. |

A wrong token fails loudly rather than falling back to whatever access the
caller would have had without it. A typo in a script is therefore diagnosable
instead of mysterious.

## Scopes

A scope is `<group>:<access>`. `read` covers GET and HEAD; `write` covers POST,
PUT, PATCH and DELETE. There is no hierarchy — `buttons:write` does **not**
imply `buttons:read`.

| Group | Levels | Covers |
|:---|:---|:---|
| `decks` | read, write | Connected and virtual decks, selection, orientation, brightness |
| `buttons` | read, write | Button configuration, rendered previews, pressing keys |
| `profiles` | read, write | Switching, renaming, deleting profiles |
| `folders` | read, write | Folder navigation and management |
| `actions` | read, write | Named multi-step action sequences |
| `plugins` | read | Plugin metadata, property forms, static assets |
| `plugin_api` | read | Calls a plugin's own `api_*` functions — **executes plugin code** |
| `icons` | read, write | Icon gallery listing and uploads |
| `themes` | read, write | Installed themes and the active selection |
| `settings` | read, write | Settings pane data, keybinds, developer options, licences |
| `marketplace` | read, write | Catalogs; writing **installs third-party code** |
| `updates` | read, write | App updater and pinning; writing **can restart PyDeck** |
| `network` | read, write | Bind host and QR codes; writing **restarts PyDeck** |
| `credentials` | read, write | Plugin credentials, **including stored secrets in clear text** |
| `events` | read | The WebSocket feed of deck events |

The five marked sensitive in the picker are `plugin_api`, `marketplace`,
`updates`, `network` and `credentials` — each grants more than its name suggests.

### Which scope an endpoint needs

`lib/api_scopes.py` maps paths to groups with an ordered table, first match wins
— the same discipline the router uses, and for the same reason. Two orderings
matter:

- `/api/settings/updater` and `/api/settings/version-selector` are listed before
  the generic `/api/settings/...` rule, so they land in `updates`, not
  `settings`. `/api/settings/theme` lands in `themes`.
- `/api/plugins/<name>/api/...` is listed before the generic `/api/plugins/...`
  rule, so calling a plugin's own API needs `plugin_api:read`, not
  `plugins:read`.

### Off limits

Some endpoints are reachable by **no** token, whatever it holds:

| Path | Why |
|:---|:---|
| `/api/pair/*` | Minting a pairing token from an API token is privilege escalation — the narrowest token in the system would be one request away from a kiosk credential. |
| `/api/tokens/*` | A token must never read, create or revoke tokens, including itself. Token management is localhost-only. |
| `/`, `/settings`, `/mobile/*`, `/static/*` | HTML pages, for a browser with a human in front of it. |
| `/oauth/*`, `/api/<plugin>/authorize` | A browser redirect flow; meaningless to a script. |

These answer 403 with `"reason": "endpoint_not_scopable"`.

Note that this holds even for endpoints that are otherwise **public**.
`/api/pair/start` needs no credential at all from a browser, but presenting a
token does not get you there: waving public routes through would put the pairing
handshake back within reach.

## Managing tokens

`GET`, `POST`, `PATCH` and `DELETE` on `/api/tokens` — localhost only, and not
reachable by any token. See the [route inventory](../internals/routes.md) for
the endpoint list.

`PATCH /api/tokens/<id>` changes a token's name, scopes or deck **without
reissuing it**, so you can widen or narrow a running script's access without
redeploying its credential.

Revoking deletes the record. The token stops working on its next request.

### Last-used tracking

Each token records when it was last used, so the pane can show which are still
live. The timestamp is rewritten at most once a minute per token
(`api_tokens.TOUCH_INTERVAL_S`), so a busy token does not turn every request into
a file write.

## The tester

`api_tester.py` in the repo root checks what a token can actually do.

```bash
venv/bin/python api_tester.py --token pdk_...
venv/bin/python api_tester.py --token pdk_... --url http://192.168.1.20:8686
venv/bin/python api_tester.py --self-test
```

**Probe mode** sends one request per scope and reports which were granted and
which were refused, then confirms that the endpoints no token should reach are
still blocked.

**Self-test mode** runs on the PyDeck host: it mints a token with a known scope
set, verifies the server grants exactly those and refuses everything else,
checks the escalation paths, checks that an unknown token gives 401, then
revokes the token and confirms it stops working.

Neither mode changes your configuration. Write scopes are probed with
deliberately invalid bodies — `POST /api/devices/select {}`, `PUT
/api/actions/__pydeck_api_tester__ {}` — so the request is rejected by the
endpoint's own validation *after* the scope check has already passed. A 403
means the scope was refused; any other status means it was allowed. Presses,
installs and profile switches never actually happen.

One probe is skipped rather than sent: `network:write` would change the bind
host and restart the server. `--show-skipped` lists it.

## Storage

`~/.config/pydeck/core/api_tokens.json`, written `0o600` where the OS supports
it, via a temp file and an atomic rename.

```json
{
  "version": 1,
  "tokens": [
    {
      "id": "tok_1a2b3c4d5e6f7a8b",
      "name": "Home Assistant",
      "token_hash": "<sha256 hex>",
      "prefix": "pdk_a1b2c3",
      "scopes": ["buttons:read", "buttons:write"],
      "device_id": "",
      "created_at": "2026-08-28T20:00:00+00:00",
      "expires_at": null,
      "last_used_at": "2026-08-28T20:41:00+00:00"
    }
  ]
}
```

The `prefix` is the first 10 characters of the token. With 48 hex characters of
entropy in the secret, showing 6 of them leaves the rest far beyond guessing.

## Where the code is

| File | Owns |
|:---|:---|
| `lib/api_scopes.py` | The scope catalog and the path-to-scope table. No state. |
| `lib/api_tokens.py` | Storage, creation, hashing, lookup, revocation. |
| `api/security.py` | The admission check: `_enforce_api_token` and `admit_websocket`. |
| `api/routes/tokens.py` | The management endpoints. |
| `app/static/js/settings/settings-api-tokens.js` | The settings pane. |
| `api_tester.py` | The tester. |
