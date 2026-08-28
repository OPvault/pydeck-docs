# Adding endpoints, route groups and services

## Adding an endpoint to an existing group

Two edits.

**1. The service function**, in the `lib/` module that owns the state it
touches. It takes plain values, returns a plain dict or bytes, and raises
`ServiceError` for anything the caller did wrong:

```python
# lib/device_service.py
def rename_device(did: str, name: str) -> dict:
    """Give a deck a friendly name."""
    if did not in devices.deck_infos:
        raise ServiceError('Unknown device_id', 404)
    if not name.strip():
        raise ServiceError('name is required', 400)
    ...
    _announce_devices()
    return {'ok': True, 'name': name}
```

**2. The route**, in the matching `api/routes/` module:

```python
# api/routes/decks.py
@router.post('/devices/rename')
async def api_devices_rename(request: Request):
    data = await json_body(request)
    return device_service.rename_device(data.get('device_id', ''), data.get('name', ''))
```

That is the whole pattern. No `try`/`except`, no `JSONResponse`, no status codes
in the route.

Then decide who may reach it. Two separate tables, both deny-by-default, so
doing nothing leaves the endpoint localhost-only with no token — which is the
right default:

- **From off the machine**, with a pairing token or none: add it to
  `_PUBLIC_RULES` or `_PAIRED_RULES` in `lib/remote_access.py`.
- **With an API token**: it needs a rule in `_RULES` in `lib/api_scopes.py`.
  A path under an existing prefix (`/api/buttons/...`) is already covered by
  that group's rule and needs nothing. A genuinely new prefix needs a new rule,
  and possibly a new `ScopeGroup`.

### When the route may hold logic

Three cases, and only three:

- **Choosing a response type.** Returning `Response(..., media_type='image/png')`
  or `FileResponse(path)` is a route concern.
- **A non-200 success code.** `POST /api/actions` returns 201, so it wraps its
  result: `return JSONResponse(result, status_code=201)`.
- **A check that is genuinely about the request, not the domain.**
  `api/routes/icons.py` raises `ServiceError('No file provided', 400)` when the
  multipart body has no file at all, because "the body had no file part" is not
  something the icon gallery should know about.

Anything else belongs in the service.

## Adding a whole route group

1. Write `api/routes/<name>.py`:

```python
"""One sentence on what this group is, and any non-obvious rule about it."""

from __future__ import annotations

from fastapi import APIRouter, Request

from api.payloads import json_body
from lib import my_service

router = APIRouter(prefix='/api/<name>', tags=['<name>'])


@router.get('')
def api_list():
    return my_service.list_things()
```

2. Add it to `ROUTERS` in `api/api.py`, **before `oauth.router`**:

```python
ROUTERS = (
    ...
    folders.router,
    my_group.router,   # new
    oauth.router,      # must stay last
)
```

3. Add remote-access rules if the group should be reachable off-box.

### Where to put it in ROUTERS

Order matters because FastAPI takes the first match. Ask: could an existing
pattern swallow one of my paths, or could one of mine swallow an existing path?

- A group with a distinct literal prefix (`/api/backups/...`) can go anywhere
  before `oauth`.
- A group with a parameterised first segment (`/api/{something}/...`) has the
  same problem `oauth` has and must go late, after everything more specific.
- `oauth` stays last regardless. `/api/{plugin_name}/authorize` matches any
  three-segment path ending in `authorize`.

Verify rather than assume. This snippet resolves a concrete path the way the
router does, which is how the split was checked:

```python
from starlette.routing import Match

def flatten(routes):
    out = []
    for r in routes:
        inner = getattr(r, 'original_router', None)
        out += flatten(inner.routes) if inner is not None else [r]
    return out

def resolve(app, path, method):
    scope = {'type': 'http', 'path': path, 'method': method, 'headers': [],
             'root_path': '', 'query_string': b'', 'path_params': {}}
    for r in flatten(app.routes):
        if r.matches(scope)[0] == Match.FULL:
            return r.name
    return None
```

The `flatten` step is needed because this FastAPI version keeps included routers
nested rather than merging them into `app.routes`.

## Adding a service module

Put it in `lib/`, named for what it owns. It must not import `api/`, and it must
not import FastAPI.

Docstring first: say what the module owns and, more importantly, what is
non-obvious about it — the ordering constraint, the race it guards, the reason a
cache exists. That is the part a reader cannot reconstruct from the code.

If it needs shared server state, reach for `lib/device_registry.py` rather than
adding a new module-level global. If it needs to tell the browser something, use
`lib/server_events.py:emit()` — it is safe from any thread.

If it touches state that a profile or folder change invalidates, take
`expected_gen` and re-check `device_registry.profile_generation()` as close to
the write as you can.

## Adding a background loop

Add a `start_*()` function to `lib/background_tasks.py` and call it from
`start_all()`. Use the module's `_spawn()` helper so the thread is a daemon.

Keep it on its own cadence. Animation and marquee ticks are deliberately
independent of the poll cycle; folding a fast tick into a slow loop stalls it
behind whatever the slow loop is waiting on.

If the loop emits WebSocket events at startup, wait for the loop to exist:

```python
while server_events.get_event_loop() is None:
    _time.sleep(0.5)
```

## Adding a page

1. Add a builder to `api/page_context.py` returning a `PageView`. Put the
   refusal case in the same object — `PageView(error='...', status=403)` — so the
   route does not branch.
2. Add the route to `api/routes/pages.py`:

```python
@router.get('/my-page')
def my_page(request: Request):
    return templating.render(request, page_context.my_page_view())
```

Reuse `_deck_layout()` and `_editor_context()` for anything that shares the
editor's shape, so the pages cannot drift apart.

## Checklist before you call it done

- Does the route call exactly one `lib/` function?
- Does the service raise `ServiceError` rather than returning an error dict?
- Is the new path reachable, and does it shadow nothing? Resolve it.
- Should it be reachable off-box? If yes, is it in a `lib/remote_access.py`
  table? If no, have you confirmed it is not?
- Which API-token scope covers it? Run `api_tester.py --self-test`: it will
  refuse an endpoint that has fallen through the scope table.
- Does anything it writes need a cache invalidated
  (`marketplace_install.invalidate_plugin_caches`) or display state reset
  (`device_registry.reset_*_display_state`)?
- Do the tests still pass?

```bash
venv/bin/python api_tester.py --self-test
venv/bin/python -m unittest tests.test_plugin_id tests.test_plugin_data_paths \
    tests.test_pdk_storage_relative_image tests.test_plugin_postinstall \
    tests.test_remote_access tests.test_paired_tokens tests.test_marketplace_redirect \
    tests.test_marketplace_root_url tests.test_plugin_cache_invalidation \
    tests.test_plugin_install_atomicity tests.test_pdk_button_face
```

`tests/` has no `__init__.py`, so discovery fails — name the modules explicitly.
