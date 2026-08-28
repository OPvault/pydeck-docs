# PyDeck server architecture

How the PyDeck server is put together, for people working on PyDeck itself
rather than on a plugin or theme. It describes the code as it exists now, in the
[`opvault/pydeck`](https://github.com/opvault/pydeck) repository.

!!! note "Who this section is for"
    Everything under **Internals** documents PyDeck's own source. If you are
    writing a plugin, [Build Plugins](../plugins/getting-started.md) is the
    section you want; if you are calling the server from a script, start at the
    [API cookbook](../reference/api-cookbook.md).

Pages in this section:

| Page | Covers |
|:---|:---|
| Architecture | This page. Process model, layering, request lifecycle, startup order. |
| [The `api/` package](api-layer.md) | The entry point, routers, error handling, templating. |
| [Route inventory](routes.md) | Every route module and every endpoint it owns. |
| [Access control](security.md) | The deny-by-default policy and every credential. |
| [`lib/` service modules](lib-services.md) | Every service module under `lib/` and its public functions. |
| [Adding endpoints](adding-endpoints.md) | How to add an endpoint, a route group, or a service. |

Two reference pages sit alongside them: the [API cookbook](../reference/api-cookbook.md),
a worked example for every endpoint, and [API tokens](../reference/api-tokens.md),
how tokens are created and scoped.

## Two processes

PyDeck runs as two kinds of process. Both import the same `lib/` package.

**The server** — `start.py`, running under uvicorn on port 8686. It serves the
web GUI, the REST API and the WebSocket stream, renders button previews for the
browser grid, and runs the background threads (hot-plug scan, display poller,
display schedule, scroll ticker, PDK animation ticker, app updater).

**The listener** — `run_streamdeck_listener.py`, one subprocess per connected
device, spawned by the server. It owns the HID handle for its device, reads key
events, dispatches presses, and renders button faces for the hardware.

They communicate over the listener's stdout line protocol. The server parses it
in `lib/listener_bridge.py` and turns each line into a WebSocket event for the
browser.

Because each process keeps its own plugin runtime state and its own poll loop, a
plugin's `on_poll` runs once per process. A `PRESS:` line from the listener is a
report, not a request: the listener already executed the press, so the server
must never dispatch it again.

## Three layers

```
start.py          Entry point. Builds the ASGI app, mounts /static,
                  calls api.install(app), and serves. Under 60 lines, no routes.

api/              The HTTP surface. Middleware, routers, request parsing,
                  page rendering. Knows about FastAPI; knows nothing about
                  how a button is stored or a deck is driven.

lib/              The domain. Devices, buttons, plugins, rendering, the
                  marketplace, background loops. Knows nothing about HTTP.
                  Shared with the listener process.
```

The dependency direction is strictly one way: `api/` imports `lib/`, never the
reverse. This is what lets the listener process import `lib/` without pulling in
FastAPI, and what lets a service function be called from a test or a future CLI
without going through a request.

The one type that crosses the boundary is `lib/errors.py:ServiceError`. A
service raises it instead of building an HTTP response; `api/api.py` registers
the handler that renders it. `ServiceError` deliberately has no FastAPI import,
so raising it does not drag the web framework into the domain layer.

## Request lifecycle

1. uvicorn hands the request to the FastAPI app built in `start.py`.
2. The admission middleware (`api/security.py:gate_middleware`) runs. It
   validates the `Host` header, resolves any API token the request carries and
   checks its scopes, decides whether a non-local caller may proceed, and binds
   the device context for the request. A rejected request is answered here and
   never reaches a route.
3. FastAPI matches the path against the routers listed in `api/api.py:ROUTERS`,
   in order, and takes the first match.
4. The route handler reads its arguments, calls one function under `lib/`, and
   returns the result.
5. If the service raised `ServiceError`, the handler registered in
   `api/api.py` renders it as `{"error": ...}` with the error's status code.
   Otherwise FastAPI serialises the return value.

Websockets skip step 2 entirely — HTTP middleware does not run for them — so
`/ws` repeats the admission check itself in `api/routes/events.py`.

## Device context

`lib/config.py` binds a device id to the execution context with
`set_current_device_id()`. Every config, profile, folder and button read
resolves through it: with a device bound, profiles come from
`~/.config/pydeck/devices/<id>/profiles/`, otherwise the global path.

The admission middleware binds it per request. The display poller binds it per
device per poll cycle. Forgetting to bind means silently reading another
device's buttons.

For a paired remote caller the device comes from the pairing token, not from the
`X-Device-Id` header or `?device=` query parameter. See [Access control](security.md).

## Startup order

`lib/bootstrap.py` owns the order, and the order matters:

1. `maybe_restart_for_update()` — apply a pending auto-update and re-exec. This
   happens before anything reads plugin code.
2. `start_services()`:
   - `icon_gallery.build_icon_cache()` — scan plugin `img/` folders once, before
     the first page can ask for them.
   - `listener_bridge.start_all_listeners()` — detect devices, spawn one
     listener per device, register saved virtual decks.
   - `listener_bridge.start_hotplug_loop()` — watch for devices appearing and
     going away.
   - `background_tasks.start_all()` — display poller, display schedule loop,
     scroll ticker, PDK animation ticker.
   - `app_updater.start_background_updater()`.
3. `serve(app)` — read the configured bind host and open the socket.

The bind host is read at this point rather than at import time because changing
it is a restart: `lib/server_network.py:set_host()` writes the new value and
re-execs the process.

Before any of this, `start.py` calls
`lib/plugin_deps.py:ensure_all_plugin_dependencies()`. If a plugin's Python
dependency was newly installed into the virtualenv, the process re-execs so the
fresh packages are importable. This runs before the FastAPI imports.

## Shared mutable state

Server state that more than one module reads lives in
`lib/device_registry.py`, not in the module that happens to use it most:

| Name | What it holds |
|:---|:---|
| `deck_infos` | device id to deck geometry, for every physical and virtual deck |
| `listener_procs` | device id to the listener `Popen` handle |
| `button_image_state` | device id to slot to runtime image override pushed by a plugin |
| `devices_lock` | reentrant lock for hot-plug writes |

Two values are rebindable scalars and are reached only through accessors:

- `profile_generation()` / `bump_profile_generation()` — a counter that moves on
  every profile or folder change, so an in-flight poll result can notice it is
  stale and discard itself instead of writing onto a button that no longer
  exists.
- `selected_device_id()` / `set_selected_device_id()` — which deck the editor is
  pointed at.

Importing a rebindable scalar by value (`from lib.device_registry import
_selected_device_id`) gives you a copy that never updates. Use the accessors.

## The event bus

`lib/server_events.py` owns the WebSocket fan-out. `emit()` is callable from any
thread — the background pollers, tickers and listener bridges all use it, and it
hops onto the server's event loop itself.

The manager records whether each socket is local or remote. Anything a remote
kiosk must not learn is sent with `local_only=True`; the pairing code is the
main example, because broadcasting it to every socket would let anyone who can
open `/ws` request a code and read it straight back.

`start.py`'s lifespan hook calls `server_events.set_event_loop()` at startup.
Before that runs, `emit()` is a no-op, which is why the PDK animation ticker
waits for `get_event_loop()` to become non-`None` before its first tick.
