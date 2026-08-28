# Action Builder

An **action** is a named sequence of steps that runs from a single key press: call a plugin function, wait, call another, change the button's own face. It is how you get a "start streaming" key that mutes Discord, switches profile, and turns on a light — without writing a plugin.

Actions are shared across the whole install and identified by **name**: one action can sit on several buttons, on several devices, in several profiles. Editing it changes all of them.

---

## Building one

1. In the sidebar, open the **Actions** category and drag **New Action** onto an empty key.
2. The window switches into builder mode: the sidebar becomes a plugin browser, the middle becomes the step list.
3. Give the action a **Name** at the top — this is what identifies it everywhere else.
4. Drag plugin functions from the sidebar into the step list. Drag steps within the list to reorder.
5. Click a step to configure it in the right-hand panel — the same property form the button editor shows for that function.
6. **Save Action**.

To edit it later, **click the action's key on the deck** — an action button opens the builder instead of firing, so clicking it in the web UI is safe.

To put the same action on a second key, drag **New Action** onto that key and save it under the **same name**. Saving over an existing name replaces that action everywhere rather than creating a copy.

---

## Step types

| Step | JSON key | What it does |
|:---|:---|:---|
| **Plugin call** | `plugin` | Runs one plugin function with a saved set of property values. |
| **Delay** | `delay` | Waits a whole number of milliseconds before the next step. |
| **Action** | `action` | Runs another named action — actions compose. |
| **Set image** | `set_image` | Changes the button's image. |
| **Set text** | `set_text` | Changes the button's text, up to three lines. |
| **Set color** | `set_color` | Changes the button's background colour. |
| **Group** | `grouped_actions` | Bundles several steps so they can be nested inside a switch or reordered together. |
| **Switch** | `switch` | Runs a *different* option each press, cycling through them. |

Every step is **exactly one** of these — a step object carrying, say, both a `delay` and a `plugin` is rejected when saved.

### Switch steps

A switch is what makes a toggle key. Give it two options — "turn light on" and "turn light off" — and the first press runs the first, the second press runs the second, then it wraps around.

The position is remembered **per button**, in that button's config, so the same action on two different keys tracks its own place in the cycle. Switch options may themselves be groups, so one press can fire several calls.

A switch needs **at least two configured options** before it will save.

!!! note "Delays can't go inside a switch or a group"
    Nested steps allow plugin calls, actions, set-image/text/colour, groups, and further
    switches — but not `delay`. Put the wait in the top-level sequence instead.

---

## Where actions are stored

```text
~/.config/pydeck/core/actions.json
```

One file for the whole install — not per device or per profile. A button that runs one is stored as `"type": "action"` with the action's name, so renaming an action in the file without updating the buttons will break them.

```json
{
  "actions": {
    "Start Streaming": [
      { "plugin": "no.pydeck.discord", "function": "toggle_mute" },
      { "delay": 250 },
      { "action": "Lights Dim" },
      { "set_color": { "color": "#a882ff" } }
    ]
  }
}
```

Deleting an action from the manager does not clear buttons that reference it — those keys report that the action no longer exists when pressed.

---

## Actions vs. plugins

| Want | Use |
|:---|:---|
| Several existing functions, one key | **Action** |
| A wait between two calls | **Action** with a delay step |
| A key that alternates between two behaviours | **Action** with a switch step |
| New behaviour nothing implements yet | Write a plugin — see [Plugin development — Getting started](../plugins/getting-started.md) |

Anything a plugin exposes as a function can be a step, so the two compose: build the capability as a plugin function, then sequence it in the builder.

The REST endpoints behind the builder (`GET`/`POST`/`PUT`/`DELETE /api/actions`) and the full step schema are in the [HTTP API reference](../reference/http-api.md).
