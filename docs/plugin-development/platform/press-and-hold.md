# Shared platform — Press, hold, and concurrent handlers

When you finish this page you will know how PyDeck distinguishes **physical button down** from **button up**, how that appears in **classic** `plugin.py` calls and **PDK** handlers, and what to keep in mind when several buttons may run at once.

!!! info "Applies to PDK and classic plugins"
    PyDeck forwards **press** and **release** signals from the listener into your plugin. Whether you expose a “press and hold” mode, keyboard-style key down/up, or any other behavior is **entirely up to your plugin** — you choose the manifest UI and the code paths.

---

## 1. How events reach your plugin

- **Button down** — The hardware listener reports a **press**. The core invokes your logic with the current event type available to read in config (classic) or by dispatching **`on_press`** (PDK).
- **Button up** — The listener reports a **release**. The core invokes your logic again with **`_button_event`** set to `release` (classic), or calls **`on_release`** (PDK) when defined.

The merged **`config`** dict for classic functions is built as described in [Classic — Core, “Config dict contents”](../classic/core.md#config-dict-contents) (`credentials` merged with per-button UI values). Runtime keys such as **`_button_event`** are supplied by the core on top of that merge for each invocation.

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
| `id` | Becomes `config["press_mode"]` (classic) or `ctx.config["press_mode"]` (PDK). |
| `default` | Use **`press`** so legacy buttons behave as a single tap on the press edge only. |
| `options` | `hold` (or any label you choose) means your code should treat **press** and **release** differently when that value is selected. |

Field types and editor behavior are documented in [Classic — Core, UI field types](../classic/core.md#2-ui-field-types). PDK plugins use the same manifest `ui` entries; values are exposed on **`ctx.config`**.

---

## 3. Classic plugins (`plugin.py`)

Read **`press_mode`** from the user’s button config and **`_button_event`** for the current edge. Default **`_button_event`** to **`press`** if absent so older cores or code paths still behave sensibly.

**Example — keyboard-style key down / key up in hold mode:**

```python
def press_key(config):
    mode = config.get("press_mode", "press")
    event = config.get("_button_event", "press")

    if mode == "hold":
        if event == "press":
            # Key down
            ...
        elif event == "release":
            # Key up
            ...
        return {"success": True}
    # Normal tap: single invocation semantics (e.g. one-shot action)
    ...
    return {"success": True}
```

For a **tap**, you might only care about the press edge. For **hold**, pair **press** (start) with **release** (stop) so hardware and software state stay aligned.

---

## 4. PDK plugins (`shared.py` / `handler.py`)

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

Event handler order, **`ctx.state`**, and polling are covered in [PDK — Runtime & examples](../pdk/runtime-examples.md).

---

## 5. Concurrent presses and async behavior

Multiple buttons (or repeated edges on different buttons) can be handled **without blocking the whole deck behind a single global lock**. That means two plugin entry points may run **close together in time** while earlier work is still finishing.

**Practical guidance:**

- Keep **press** / **release** handlers short; push slow I/O or CPU-heavy work to a thread pool or background task if your design allows it.
- If you cache clients or mutable data in **module-level** globals (see [module-level caching](../classic/core.md#module-level-caching)), protect shared structures with **`threading.Lock`** (or equivalent) when more than one call can touch them at once.
- PDK **per-function state** stays isolated per function; still avoid long blocking sections if you share resources across functions.

---

## 6. Pitfalls

!!! warning "Manifest-only changes are not enough"
    If you add **`press_mode`** to the manifest but never branch on **`_button_event`** (classic) or **`on_release`** (PDK), the button will still feel like a **tap**: the user may select “press and hold,” but your code will not run distinct **release** logic.

---

## 7. Related reading

- [Classic — Core](../classic/core.md) — `config` merge, UI fields, return dicts.
- [PDK — Runtime & examples](../pdk/runtime-examples.md) — `on_press`, `on_release`, `ctx`.
- [HTTP API reference](http-api-reference.md) — REST/WebSocket payloads around button actions (shared schema with classic display fields).
