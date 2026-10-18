# Action Builder

An **action** is a named sequence of steps that runs from a single key press: call a plugin function, wait, call another, change the button's own face. It is how you get a "start streaming" key that mutes Discord, switches profile, and turns on a light — without writing a plugin.

Actions are shared across the whole install and identified by **name**: one action can sit on several buttons, on several devices, in several profiles. Editing it changes all of them.

---

## Building one

1. In the sidebar, open the **Actions** category and drag **New Action** onto an empty key.
2. The window switches into builder mode: the sidebar becomes a palette of things to add, the middle shows the action's button defaults and its step list.
3. Give the action a **Name** at the top — this is what identifies it everywhere else.
4. Drag functions from the palette into the step list, or into a Switch's slots or a Group. Any step can be dragged again later — within the list, into a Switch or Group, or back out.
5. Every step, however deeply nested, is edited in the right-hand panel: click it to select it. A step you have just added is selected for you. Plugin functions show the same property form the button editor shows.
6. **Save Action**.

The palette lists only plugin functions that are useful as a step — the ones whose manifest marks them `actionable`. Functions that only display something, like a clock or the weather, are not offered.

To edit it later, **click the action's key on the deck** — an action button opens the builder instead of firing, so clicking it in the web UI is safe.

To put the same action on a second key, drag it from the sidebar's **Actions** category onto that key.

### Button defaults

The top of the builder sets how every key running the action looks: up to three **title** lines, a **background** color and an **icon**. They show as soon as the action is on a key — no press needed — and a key that sets its own title, color or icon in the button editor keeps those instead. Changing a default later reaches every key that has not set its own.

### Renaming

Change the **Name** and save: the action is renamed everywhere it is used — every key on every deck and profile, every other action that runs it, and every key it is mapped to. Renaming to a name another action already has is refused.

### Triggers: run it from another button

An action can also run when an ordinary plugin key is pressed — a Spotify play/pause key that dims the lights too, say. The **Triggers** card under the button defaults lists what runs it:

- **Every button of a function** — every key running that plugin function, on any deck and profile, now or added later.
- **One button** — a single key, picked by deck, profile, page and key number.

Each trigger has **Keep the button's own function**. On, the key does its usual job first and the action runs after it, in the background — the key's face updates (and animates) straight away, without waiting for the action's delays. Off, the action runs *instead* — the key's own function is skipped.

A single key can also be mapped from the button editor: **Run an action on press**, with the same checkbox. It is the same setting as a "one button" trigger, so it shows in both places; a key carries one such mapping, and mapping it to another action replaces it. Under the field, the editor also names any action that runs for every key of that function.

The action's steps act on the pressed key — a **Set color** colors it, a **Switch** keeps its place per key. Plugin steps get only their own settings, not the key's. If a mapped action fails, the key's own function still counts, and the failure is written to the PyDeck log. A trigger fires on **press** only, never on release.

---

## Step types

| Step | JSON key | What it does |
|:---|:---|:---|
| **Plugin call** | `plugin` | Runs one plugin function with a saved set of property values. |
| **Delay** | `delay` | Waits a whole number of milliseconds before the next step. |
| **Action** | `action` | Runs another named action — actions compose. |
| **Set image** | `set_image` | Changes the button's image. |
| **Set text** | `set_text` | Changes the button's text, up to three lines. |
| **Set color** | `set_color` | Changes the button's background color. |
| **Group** | `grouped_actions` | Bundles several steps so they can be nested inside a switch or reordered together. |
| **Switch** | `switch` | Runs a *different* option each press, cycling through them. |

Every step is **exactly one** of these — a step object carrying, say, both a `delay` and a `plugin` is rejected when saved.

### Switch steps

A switch is what makes a toggle key. Give it two options — "turn light on" and "turn light off" — and the first press runs the first, the second press runs the second, then it wraps around.

The position is remembered **per button**, in that button's config, so the same action on two different keys tracks its own place in the cycle. Switch options may themselves be groups, so one press can fire several calls.

A switch needs **at least two configured options** before it will save.

!!! note "Delays can't go inside a switch or a group"
    Nested steps allow plugin calls, actions, set-image/text/color, groups, and further
    switches — but not `delay`. Put the wait in the top-level sequence instead.

---

## Where actions are stored

In the `actions` and `action_steps` tables of `~/.local/share/pydeck/pydeck.db` — one set for the whole install, not per device or per profile. Function triggers are kept on the action; a one-button trigger is kept on that button as its `mapping`. A button that runs one is stored as `"type": "action"` with the action's name; rename an action from the builder (or `POST /api/actions/<name>/rename`), which updates those buttons too.

An action's steps, as the API returns them:

```json
{
  "name": "Start Streaming",
  "steps": [
    { "plugin": "no.pydeck.discord", "function": "toggle_mute" },
    { "delay": 250 },
    { "action": "Lights Dim" },
    { "set_color": { "color": "#a882ff" } }
  ],
  "display": { "color": "#a882ff", "text_labels": { "top": "Live" } },
  "triggers": [
    { "plugin": "no.pydeck.spotify", "function": "play_pause", "run_original": true },
    { "button": { "device_id": "BL06K1B02897", "profile": "default", "folder": null, "slot": 3 },
      "run_original": false }
  ]
}
```

Deleting an action from the manager does not clear buttons that run it — those keys report that the action no longer exists when pressed. Keys *mapped* to it are unmapped, and go back to doing only their own job.

---

## Actions vs. plugins

| Want | Use |
|:---|:---|
| Several existing functions, one key | **Action** |
| A wait between two calls | **Action** with a delay step |
| A key that alternates between two behaviors | **Action** with a switch step |
| New behavior nothing implements yet | Write a plugin — see [Plugin development — Getting started](../plugins/getting-started.md) |

Anything a plugin exposes as a function can be a step, so the two compose: build the capability as a plugin function, then sequence it in the builder.

The REST endpoints behind the builder (`GET`/`POST`/`PUT`/`DELETE /api/actions`, `POST /api/actions/<name>/rename`) and the full step schema are in the [HTTP API reference](../reference/http-api.md).
