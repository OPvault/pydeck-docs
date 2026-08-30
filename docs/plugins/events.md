# Shared platform — Press, hold, and concurrent handlers

When you finish this page you will know how PyDeck distinguishes **physical button down** from **button up**, how that reaches your **PDK** handlers, and what to keep in mind when several buttons may run at once.

!!! info "Your plugin decides what hold means"
    PyDeck forwards **press** and **release** signals from the listener into your plugin. Whether you expose a “press and hold” mode, keyboard-style key down/up, or any other behavior is **entirely up to your plugin** — you choose the manifest UI and the code paths.

---

## 1. How events reach your plugin

- **Button down** — The hardware listener reports a **press**. The core dispatches **`on_press(ctx)`**.
- **Button up** — The listener reports a **release**. The core dispatches **`on_release(ctx)`** — but only when the button's config sets **`press_mode: "hold"`**.

!!! info "A press in the web GUI is the same press"
    Pressing a button in the browser does not take a second path through your
    plugin. The request is handed to the listener that owns the deck, which runs
    it exactly as it runs a key report, in the process that holds the plugin's
    state — so `on_press` sees one call, `ctx.state` moves once, and the deck and
    the web grid show the same thing afterwards. Write `on_press` as though the
    only caller were the hardware.

!!! warning "`press_mode` is not just your own convention — the core reads it"
    A release on a button whose config does **not** say `press_mode: "hold"` is dropped
    before your plugin is reached: the dispatch returns `{"ignored": true}` and
    `on_release` is never called. So the field id has to be exactly **`press_mode`** and
    the hold value exactly **`"hold"`** — a select called `mode` with a value of
    `press_hold` will leave your `on_release` silently dead.

    This is deliberate: an ordinary tap fires one handler, not two, so a plugin that
    grows an `on_release` does not change behaviour for buttons already out there.

The **`ctx.config`** your handler reads is the plugin's stored **credentials** merged with the button's saved **UI field values**; the button config wins on key collisions. The core adds runtime keys on top of that merge for each invocation — see [Injected `ctx.config` keys](runtime.md).

---

## 2. Exposing a “press mode” in the manifest

Add a UI field so users can opt into hold-style behavior. Keep the **default** as ordinary **`press`** (tap) so existing buttons keep today’s behavior until the user changes the field.

### Example `select` field

```json
{
  "type": "select",
  "id": "press_mode",
  "label": "Press Mode",
  "default": "press",
  "options": [
    { "label": "Press", "value": "press" },
    { "label": "Press and hold", "value": "hold" }
  ]
}
```

| Manifest key | Role |
|:---|:---|
| `id` | Must be **`press_mode`** — the core reads this exact key to decide whether to deliver a release at all. |
| `default` | Use **`press`** so existing buttons behave as a single tap on the press edge only. |
| `options` | The value **`hold`** is the one the core recognises. Label it however you like; the *value* is what matters. |

Field types and editor behavior are documented in [UI field types](ui-fields.md). A PDK template can declare the same field inline in a `<settings>` block instead; either way the value lands on **`ctx.config`**.

---

## 3. Handling press and release (`shared.py` / `handler.py`)

The PDK runtime calls **`on_press(ctx)`** on physical button down and **`on_release(ctx)`** on button up when your module defines it. The same manifest **`press_mode`** value is available on **`ctx.config`**.

**Example:**

```python
def on_press(ctx):
    if ctx.config.get("press_mode", "press") != "hold":
        # Tap behavior
        ...
        return
    # Hold mode — start
    ...

def on_release(ctx):
    if ctx.config.get("press_mode", "press") != "hold":
        return
    # Hold mode — end
    ...
```

Event handler order, **`ctx.state`**, and polling are covered in [Plugin development — Runtime & examples](runtime.md).

---

## 4. Concurrent presses and async behavior

Multiple buttons (or repeated edges on different buttons) can be handled **without blocking the whole deck behind a single global lock**. That means two plugin entry points may run **close together in time** while earlier work is still finishing.

**Practical guidance:**

- Keep **press** / **release** handlers short; push slow I/O or CPU-heavy work to a thread pool or background task if your design allows it.
- If you cache clients or mutable data in **module-level** globals — plugin modules stay loaded, so module-level variables persist across presses — protect shared structures with **`threading.Lock`** (or equivalent) when more than one call can touch them at once.
- PDK **per-function state** stays isolated per function; still avoid long blocking sections if you share resources across functions.

---

## 5. Pitfalls

!!! warning "Manifest-only changes are not enough"
    If you add **`press_mode`** to the manifest but never define **`on_release`**, the button will still feel like a **tap**: the user may select “press and hold,” but your code will not run distinct **release** logic.

!!! warning "…and a handler on its own is not enough either"
    The reverse also fails silently. Define **`on_release`** without a `press_mode` field
    the user can set to `hold`, and the core drops every release before it reaches you.
    You need both halves.

---

## 6. Related reading

- [Plugin development — Runtime & examples](runtime.md) — `on_press`, `on_release`, `ctx`.
- [UI field types](ui-fields.md) — the field types the `press_mode` example uses.
- [HTTP API reference](../reference/http-api.md) — REST/WebSocket payloads around button actions.
