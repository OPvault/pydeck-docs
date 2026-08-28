# Keyboard shortcuts

The PyDeck web UI has global keyboard shortcuts for the things you reach for constantly — opening settings, flipping between profiles, jumping to a settings pane. Every one of them is rebindable in **Settings → Keybinds**.

---

## Defaults

On macOS, ++ctrl++ is shown and matched as ++cmd++.

### General

| Action | Default |
|:---|:---|
| Open / close Settings | ++alt+m++ |
| Open / close Notifications | ++alt+n++ |

### Profiles

| Action | Default |
|:---|:---|
| Next profile | ++alt+down++ |
| Previous profile | ++alt+up++ |
| Switch to profile 1 … 9 | ++alt+1++ … ++alt+9++ |
| Switch to profile 10 | ++alt+0++ |

Profile shortcuts address the profile **tabs in order**, so "profile 3" is the third tab, whatever it happens to be called. A shortcut for a slot you don't have does nothing.

### Settings panes

| Action | Default |
|:---|:---|
| Settings → Marketplace | ++alt+shift+m++ |
| Settings → Appearance | ++alt+shift+a++ |
| Settings → Keybinds | ++alt+shift+k++ |

---

## Rebinding

**Settings → Keybinds** lists every action grouped as above. Each row has two buttons:

| Button | What it does |
|:---|:---|
| **Edit** (pencil) | Starts recording. Press the combination you want; it saves immediately. ++esc++ cancels. |
| **Reset** (circular arrow) | Restores that action's default. Only shown when the binding differs from the default. |

A recorded combination that is already taken is **refused**, with a note on the row naming the action that owns it. Unbind that one first. The same check applies to a reset: if the default you're restoring collides with something you have since bound elsewhere, the reset is refused rather than silently stealing the combination.

A combination needs a non-modifier key — pressing only ++ctrl++ or ++shift++ records nothing.

---

## When shortcuts don't fire

- **While you're typing.** Keydown is ignored whenever focus is in a text input, textarea, or select, so a shortcut can never eat a keystroke meant for a field.
- **In kiosk mode.** A deck opened with `?kiosk` has no editing chrome to reach, so the dispatcher stays out of the way. See [Virtual decks & phone control](virtual-decks.md#kiosk-mode).

---

## Where they're stored

Bindings live under the `keybinds` key in:

```text
~/.config/pydeck/core/config.json
```

They are **global**, not per device or per profile. Only the actions listed above are stored; anything else in that object is ignored, and any action you have not rebound falls through to its built-in default.

The REST endpoints behind the pane are `GET` / `POST /api/settings/keybinds` — see the [HTTP API reference](../reference/http-api.md#get-apisettingskeybinds).
