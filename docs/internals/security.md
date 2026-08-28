# Access control

All of it lives in `api/security.py`, with the policy tables in
`lib/remote_access.py` and the scope table in `lib/api_scopes.py`. Nothing else
in the codebase decides who may call what.

## The model today

PyDeck binds to `0.0.0.0` when LAN access is turned on, so a phone can drive a
virtual deck. That also puts the whole REST API on the network. The policy is
therefore inverted: **a request from off-box is denied unless something
explicitly allows it.**

There are three credentials:

- **Being on this machine.** Loopback with no token gets everything. This is the
  only credential the editor ever presents.
- **A pairing token.** Minted by the pairing handshake, scoped to one virtual
  deck, stored in `~/.config/pydeck/core/paired_tokens.json`.
- **An API token.** Created in the settings pane, carrying an explicit scope
  list, stored hashed in `~/.config/pydeck/core/api_tokens.json`. Full detail in
  [API tokens](../reference/api-tokens.md).

## The questions

`api/security.py:enforce(request)` answers these in order and returns a `Denial`
or `None`:

### 1. Is the Host header one we answer to?

```python
if not remote_access.is_allowed_host_header(request.headers.get('host', '')):
    return Denial('Invalid host', 421)
```

The header must be an IP literal or `localhost`. `PYDECK_ALLOWED_HOSTS`
(comma-separated) adds hostnames for a reverse proxy.

This is what stops a DNS-rebinding attack: a page on `evil.example.com` whose
DNS resolves to `127.0.0.1` would otherwise reach the API as a loopback client.
Rejecting on the `Host` header catches it before the locality check runs.

There is deliberately no CORS middleware. Every page PyDeck serves — editor,
kiosk, mobile, pairing keypad — is same-origin.

### 2. Does the request carry an API token?

```python
api_secret = request_api_token(request)
if api_secret:
    return _enforce_api_token(request, api_secret)
```

Checked **before** the locality test. A presented credential is authoritative:
it decides the answer wherever the request came from, so a read-only token is
read-only even on localhost. Without that, a token could never be tested from
the machine that issued it, and a script developed locally would break the
moment it moved.

`_enforce_api_token` resolves the token, looks up the scope the route needs
(`api_scopes.required_scope`), and either binds the deck and proceeds or returns
a `Denial` naming what was missing. An invalid token is a hard 401, never a
silent fall-through to the paths below.

A route with **no** scope — the pairing handshake, token management, the HTML
pages — is refused even when it is otherwise public. Waving public routes
through would put `/api/pair/start` back within reach of a token, and a token
that can mint a pairing credential is not a narrow token.

### 3. Is the caller on this machine?

```python
def is_local_request(request) -> bool:
    client = request.client
    return client is not None and remote_access.is_local_host(client.host)
```

`LOCAL_HOSTS` in `lib/remote_access.py` is `127.0.0.1`, `::1`, `localhost` and
`::ffff:127.0.0.1` — the last is how a v4 loopback client appears on a
dual-stack socket.

A local caller skips straight to question 4.

### 4. May this method and path be reached from the network at all?

```python
verdict = remote_access.classify(request.method, request.url.path)
```

Three verdicts:

| Verdict | Meaning |
|:---|:---|
| `PUBLIC` | The pairing handshake, and the assets a pairing page loads before any token exists. |
| `PAIRED` | The handful of endpoints a paired kiosk needs. Requires a valid token; the token decides the deck. |
| `DENY` | Everything else. **This is the default.** |

Because `DENY` is the default, **a new route is unreachable from the network
until it is added to a table in `lib/remote_access.py`.** That is the intended
failure mode: forgetting to list a route makes it localhost-only, not
world-readable.

The current `PUBLIC` table:

```
GET/HEAD  /
GET/HEAD  /mobile/<anything>
GET/HEAD  /static/...
GET/HEAD  /api/themes/<family>/<slot>.css
GET/HEAD  /api/plugins/styles.css
POST      /api/pair/start
POST      /api/pair/verify
```

`/` and `/mobile/<id>` are public because they render the pairing keypad when
the caller has no token. The CSS routes are what that keypad loads.

The current `PAIRED` table:

```
GET/HEAD  /ws
GET/HEAD  /api/status
GET/HEAD  /api/buttons
GET/HEAD  /api/deck/grid
GET/HEAD  /api/buttons/<n>/image
GET/HEAD  /api/buttons/<n>/image/hires
GET/HEAD  /api/buttons/<n>/gif
POST      /api/buttons/<n>/press
GET/HEAD  /api/folders/getall
POST      /api/folders/change/<id>
GET/HEAD  /api/plugins/<name>/img/<file>
```

That is exactly what a kiosk needs: draw its grid, press a key, walk into a
folder. Credentials, settings, the marketplace, profile and button writes, and
the token list itself are all localhost-only.

Keep both tables minimal. A rule added there is a rule the network can reach.

### 5. Which deck may the request touch?

For a `PAIRED` caller, the deck comes from the **token**:

```python
if verdict == remote_access.PAIRED:
    deck_id = remote_paired_deck(request)
    if deck_id is None:
        return Denial('Pairing required', 403)
    config.set_current_device_id(deck_id)
    return None
```

Not from `X-Device-Id`, and not from `?device=`. A phone paired with one virtual
deck can never address another one, no matter what headers it sends.

For everyone else — local callers, and `PUBLIC` requests still resolving a page —
the request gets the deck it asked for, falling back to the globally selected
one:

```python
override = request.headers.get('x-device-id', '') or request.query_params.get('device', '')
if override and override in devices.deck_infos:
    config.set_current_device_id(override)
else:
    devices.bind_selected_device()
```

## Where the pairing token comes from

`request_pair_token()` accepts either shape:

```
Authorization: Bearer <token>
?token=<token>
```

The query-parameter form exists because a kiosk page is opened from a QR code
and cannot set a header on the initial navigation.

## Websockets

HTTP middleware does not run for websockets, so the whole decision is repeated
for `/ws` — in `security.admit_websocket()`, not in the route, so there is still
one place that decides access:

```python
admission = security.admit_websocket(ws)
if not admission.allowed:
    await ws.close(code=1008)
    return
await server_events.ws_manager.connect(ws, local=admission.local)
```

A socket is admitted when it is local, or carries a pairing token naming a known
deck, or carries an API token holding `events:read`. An API token arrives as
`?api_key=`, because a handshake carries no header a browser script can set.

The same "a presented credential is authoritative" rule applies: a socket that
presents a bad API token is refused rather than falling back to loopback trust.

An API-authenticated socket is never tagged local, wherever it dialled from —
its holder is a script, not the person at the machine.

The socket is tagged local or remote at connect time, because the fan-out needs
to know. `server_events.emit(..., local_only=True)` skips remote sockets, and
the pairing code is broadcast that way: sending it to every socket would let
anyone who can open `/ws` request a code and read it straight back.

## Pairing hardening

The pairing sequence is four keys out of four, so 256 possibilities. That is
small enough that brute force is the threat model, and `lib/pairing.py` answers
it with four separate measures:

| Constant | Value | Effect |
|:---|:---|:---|
| `PAIRING_TIMEOUT_S` | 60 | A code expires a minute after it is shown. |
| `PAIRING_MAX_ATTEMPTS` | 5 | Wrong guesses before the code is thrown away. |
| `PAIRING_MAX_REGENERATIONS` | 3 | Regenerations before the session is dropped entirely. |
| `PAIRING_WRONG_DELAY_S` | 1.0 | Wall-clock cost per wrong guess, charged outside the lock so guesses cannot be pipelined. |
| `PAIRING_LOCKOUT_S` | 300 | After the budget is spent, the network cannot ask for a fresh code. |

Only the Pair button in the PyDeck window — a deliberate act by whoever is at
the machine — clears the lockout early.

Other properties worth preserving:

- Sequences are generated with `secrets.randbelow`, not `random`. `random`'s
  internal state is recoverable from its output.
- `sequences_match` uses `secrets.compare_digest`, so a wrong guess does not
  leak how many positions matched.
- A remote caller may ask for a code but cannot clobber a session already on
  screen. Otherwise anyone on the network could spam pairing overlays and reset
  a legitimate attempt at will.
- Only virtual decks are pairable. Physical hardware is driven from the machine
  it is plugged into, and handing out a token for it would make a guessed
  pairing code worth far more than the kiosk it was meant for.

## API token scopes

The scope model lives in `lib/api_scopes.py` and is documented in
[API tokens](../reference/api-tokens.md). Two properties matter for security review:

**Deny by construction.** `required_scope()` returns `None` for any path its
ordered table does not cover, and `None` means *refuse*, not *allow*. A new
route is therefore unreachable by API token until someone adds it to that table
— the same failure mode `lib/remote_access.py` has for the network.

**No self-service.** `/api/tokens/*` maps to no scope and appears in neither
`remote_access` table, so it is reachable only from localhost with no token at
all. A token cannot read, mint or revoke tokens, including itself.

A regression test for both lives in `api_tester.py`: `--self-test` mints a
narrow token and asserts that every out-of-scope endpoint and every escalation
path is refused.

## Adding another credential type

The pattern is set by `_enforce_api_token`. A new credential needs to answer the
same two questions every credential answers — *may this caller proceed*, and
*which deck do they get* — and it plugs in as another branch before the locality
test:

1. Read it off the request, next to `request_pair_token()` and
   `request_api_token()`. Give it a distinguishable shape if it shares the
   bearer header, the way `pdk_` distinguishes API tokens.
2. Decide what it reaches. Reuse `api_scopes` if scopes fit, or add a table
   beside it. Whatever it is, make the unlisted case *deny*.
3. Bind the deck, mirroring `_bind_token_device`.
4. Give it its own storage and accessors rather than sharing another
   credential's file — different scoping rules mean different revocation UIs.

Keep the `Host` check first: it is not about credentials and applies to
everyone. And remember `/ws` is a separate path through `admit_websocket()`.
