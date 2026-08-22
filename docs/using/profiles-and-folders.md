# Profiles & folders

Two different ways to get more buttons than your deck has keys:

- A **profile** is a complete alternative layout for the deck — a separate set of buttons you switch between from the web UI or a button.
- A **folder** is a page *inside* a profile, entered by pressing a button and left by pressing a return key.

Both are stored per device, so a profile named `Streaming` on your XL is unrelated to one with the same name on a Mini.

---

## Profiles

Profile tabs sit above the deck grid.

| Action | How |
|:---|:---|
| **Switch** | Click the tab. The deck redraws immediately. |
| **Create** | Tab menu → **New Profile**, then type a name. |
| **Rename** | Double-click the tab and type. |
| **Delete** | Tab menu → delete mode, then click the tab to remove. |

The default profile is called **`main`**.

!!! note "Creating a profile means switching to it"
    There is no separate create step — PyDeck switches to the name you typed, and the
    profile directory is written the first time the layout is saved. A profile you
    switch away from without adding buttons may not persist.

### Where a profile lives

```text
~/.config/pydeck/devices/<device-id>/profiles/<profile>/
├── buttons.json      # the root page's buttons
└── folders.json      # every folder in this profile
```

Deleting a profile deletes that directory and everything in it, including its folders. There is no undo — copy the directory first if you might want it back.

### Switching profiles from the deck

The **Folders** plugin ships a `switch_profile` function. Put it on a button, set **Profile name**, and pressing that key switches profiles without touching the browser — useful for a "work / gaming" toggle you can reach while a game is fullscreen.

---

## Folders

A folder swaps the deck's buttons for a different page and stays there until you return. Folders can be nested: entering a folder from inside a folder pushes onto a stack, and returning pops it.

### Creating one

Folders come from the **Folders** plugin, not from a menu:

1. Drag **Enter Folder** onto a button.
2. Set **Folder ID** — any short id, e.g. `gaming`. The folder is created the first time the button is pressed.
3. Press the button. The deck switches to the (nearly empty) folder page.
4. Fill in the buttons as usual — the editor now edits the folder's page.

Every new folder is created with a **Return Folder** button already on its last key, so you can always get back out.

### Returning

The **Return Folder** function has a **Return Mode**:

| Mode | Behaviour |
|:---|:---|
| `parent` (default) | Pop one level — back to whatever folder you came from. |
| `root` | Jump straight back to the profile's root page, however deep you are. |

### Auto-return

Set on the **Enter Folder** button, not the return button:

| Field | Meaning |
|:---|:---|
| **Enable Auto-Return** | Leave the folder on its own after a period of no presses. |
| **Auto-Return Delay (seconds)** | How long to wait. Default `5`. |
| **Show Countdown On Return Button** | Draw the remaining seconds on the return key while the timer runs. |

The timer resets on every press inside the folder, and it obeys the return button's **Return Mode** — so a folder can auto-pop one level or auto-jump to root.

Switching profiles cancels any pending auto-return.

---

## Which one should I use?

| Want | Use |
|:---|:---|
| A different layout for a different activity | **Profile** |
| A group of related keys that would not fit | **Folder** |
| To swap layouts from the deck itself | **Folders** plugin → `switch_profile` |
| A temporary page that closes itself | **Folder** with auto-return |

---

## Under the hood

`folders.json` holds every folder in the profile as a map of folder id → `{name, buttons[]}`. A folder's buttons use the same schema as the profile's root `buttons.json` — see [Web UI & Assets](../plugin-development/platform/web-ui-and-assets.md) for the button object, and the [HTTP API reference](../plugin-development/platform/http-api-reference.md) for the profile and folder endpoints.
