# The api/ package

Everything a request touches on its way in and out lives here. `start.py` builds
a bare ASGI app and hands it over:

```python
app = FastAPI(lifespan=_lifespan, docs_url=None, redoc_url=None, openapi_url=None)
app.mount('/static', StaticFiles(directory=str(ROOT_DIR / 'app' / 'static')), name='static')
api.install(app)
```

Layout:

```
api/
  api.py            Single entry point: error handler, middleware, ordered routers
  security.py       Who may call, and which deck they are bound to
  payloads.py       Reading a JSON request body
  page_context.py   Template context for the HTML pages
  templating.py     Jinja setup, and rendering a page context
  routes/           One module per resource group, each exposing `router`
```

`api/` imports `lib/`. `lib/` never imports `api/`.

## api/api.py

The single entry point. `install(app)` does three things, in this order:

```python
def install(app: FastAPI) -> None:
    _install_error_handler(app)
    app.middleware('http')(security.gate_middleware)
    for router in ROUTERS:
        app.include_router(router)
```

### The error handler

```python
@app.exception_handler(ServiceError)
async def _service_error(_request, exc: ServiceError):
    return JSONResponse(exc.body(), status_code=exc.status)
```

This is why no route in the codebase has a `try`/`except`. A service raises
`ServiceError` and the response is built here. See "The ServiceError contract"
below.

### The middleware

`security.gate_middleware` wraps `security.enforce()`. It rejects a request that
must not proceed and binds the device context for one that may. Full detail in
[Access control](security.md).

### ROUTERS

An ordered tuple. FastAPI matches routes in registration order and takes the
first hit, so the order is load-bearing, not cosmetic.

```python
ROUTERS = (
    pages.router,
    events.router,
    decks.router,
    buttons.router,
    plugins.router,
    marketplace.router,
    settings.router,
    updates.router,
    pairing.router,
    tokens.router,
    network.router,
    actions.router,
    icons.router,
    themes.router,
    credentials.router,
    profiles.router,
    folders.router,
    oauth.router,
)
```

Two rules keep the order honest:

1. **`oauth` is last.** `/api/{plugin_name}/authorize` matches any three-segment
   path ending in `authorize`. Anything registered after it that shares that
   shape would be unreachable.
2. **Within a router, specific paths go above the parameterised ones that could
   swallow them.** For example `/api/plugins/styles.css` must not be shadowed by
   a three-segment `/api/plugins/{name}` pattern; there is no such pattern
   today, and adding one would need it registered after `styles.css`.

Note that this FastAPI version keeps included routers nested rather than
flattening them into `app.routes`. To enumerate the real route table, walk into
each entry's `original_router`:

```python
def flatten(routes):
    out = []
    for r in routes:
        inner = getattr(r, 'original_router', None)
        out += flatten(inner.routes) if inner is not None else [r]
    return out
```

### Tags

Every router declares a `tags=[...]` group (`buttons`, `marketplace`, `pairing`
and so on). OpenAPI is disabled, so the tags are not published; they exist so
routes are enumerable by group — useful for a future token scope that should
bind to a resource group rather than a list of path strings.

## The ServiceError contract

`lib/errors.py`:

```python
class ServiceError(Exception):
    def __init__(self, message: str, status: int = 400, extra: dict | None = None): ...
    def body(self) -> dict:   # {'error': message, **extra}
```

- `message` becomes the `error` field of the JSON body.
- `status` is the HTTP status code. Default 400.
- `extra` is merged into the body alongside `error`, for the few failures where
  the UI needs more than a message.

`extra` is used in exactly three places today:

| Raiser | Extra fields | Why |
|:---|:---|:---|
| `pairing.start_pairing` | `locked: true` | The keypad shows a different message when pairing is locked out. |
| `pairing.verify_pairing` | `attempts_left`, `regenerated`, `exhausted` | The keypad counts down remaining guesses and reacts to a regenerated code. |
| `marketplace_install.install_plugin` | `installed_path`, `slug`, `version` | A plugin installed but its post-install script was invalid; the UI still needs to know what landed on disk. |

Raising `ServiceError` from a route handler is fine and is done where a check is
genuinely about the request rather than the domain — for example
`api/routes/icons.py` raising `'No file provided'` when the multipart body has
no file at all.

`ServiceError` has no FastAPI import. That is deliberate: `lib/` modules raise it
freely without the web framework becoming a dependency of the domain layer or of
the listener process.

## api/security.py

Covered in full in [Access control](security.md). Public surface:

| Function | Purpose |
|:---|:---|
| `is_local_request(request)` | Whether the caller is on this machine. |
| `request_api_token(request)` | API token from `X-API-Key` or a `pdk_`-shaped bearer header. |
| `request_pair_token(request)` | Pairing token from `Authorization: Bearer` or `?token=`. |
| `remote_paired_deck(request)` | The deck a remote caller's token entitles it to, or `None`. |
| `enforce(request)` | Admission + device binding. Returns `Denial` or `None`. |
| `gate_middleware(request, call_next)` | ASGI wrapper around `enforce`. |
| `websocket_is_local(ws)` | Whether a socket was opened from this machine. |
| `websocket_deck(ws)` | The deck an off-box socket's `?token=` entitles it to. |
| `admit_websocket(ws)` | The whole `/ws` decision: may it connect, and is it local. |

`Denial` is a frozen dataclass with `error`, `status` and an optional `extra`
dict, rendered by `Denial.body()`. A scope refusal uses `extra` to name the
scope it wanted (`missing_scope`), so a caller can react to it without parsing
prose — `api_tester.py` relies on exactly that.

`SocketAdmission` is the websocket equivalent: `allowed` and `local`.

## api/payloads.py

Two body parsers, because routes want two different answers to "the body is not
JSON":

| Function | Bad body returns | Used by |
|:---|:---|:---|
| `json_body(request)` | `{}` | Most routes. A malformed body is treated as "no fields supplied" and the service's own validation produces the message. |
| `json_body_or_none(request)` | `None` | Routes that answer `400 invalid JSON` outright: button save, action create/update, credential save, open-folder. |

`json_body` also returns `{}` when the body parses to something that is not a
dict (a list, a bare string), so a route can always call `.get()` on it.

## api/page_context.py

Builds the template context for the three HTML pages, and carries the refusal
case in the same object so a route never has to branch.

```python
@dataclass
class PageView:
    template: str = ''
    context: dict = field(default_factory=dict)
    error: str = ''
    status: int = 200
```

| Function | Returns |
|:---|:---|
| `index_view(*, local, kiosk_mode, device, pair_token)` | The editor locally; a kiosk grid, the pairing keypad, or a 403 remotely. |
| `settings_view(category)` | The editor page with the settings overlay open. |
| `mobile_view(deck_id, pair_token)` | The phone kiosk view, or the pairing keypad, or a 404 for an unknown deck. |
| `pairing_view(deck_id, redirect)` | The pairing keypad, returning to `redirect` on success. |

Rules encoded here:

- The editor is localhost-only. A remote caller may only reach a kiosk view.
- A remote kiosk must name a **virtual** deck. Only virtual decks can be paired,
  so anything else is a dead end and is refused rather than shown a keypad it
  could never satisfy.
- A pairing token must name *this* deck. Pairing with one virtual deck is not a
  licence to drive another.

`_editor_context()` and `_deck_layout()` assemble the shared keys — brightness,
theme family and slot, deck geometry, orientation, device list — so `index_view`
and `settings_view` cannot drift apart.

## api/templating.py

Owns the Jinja environment and the one call that turns a `PageView` into a
response:

```python
def render(request: Request, view: PageView) -> Response:
    if view.error:
        return JSONResponse({'error': view.error}, status_code=view.status)
    return templates.TemplateResponse(request, view.template, view.context)
```

It also installs the `tojson` filter as `markupsafe.Markup(json.dumps(v))`, which
stops Jinja's autoescape from double-encoding JSON quotes in the page's inline
data.

Every page route is therefore one expression:

```python
@router.get('/settings')
@router.get('/settings/{category}')
def settings_page(request: Request, category: str = ''):
    return templating.render(request, page_context.settings_view(category))
```

## api/routes/

One module per resource group. Each exposes a `router`. A route module is pure
HTTP: read arguments, call one `lib/` function, return the result.

The full endpoint inventory is in the [route inventory](routes.md).
