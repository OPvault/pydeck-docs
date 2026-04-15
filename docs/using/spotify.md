# Setting up the Spotify Plugin

Control Spotify playback — play/pause, skip, volume, shuffle, repeat, and album art — from your deck buttons.

---

## How it works

The Spotify plugin uses the [Spotify Web API](https://developer.spotify.com/documentation/web-api) with the OAuth2 Authorization Code flow. After you authorise once, PyDeck stores a refresh token and silently renews the access token in the background — you should never need to re-authorise.

Buttons can display live album art, the current track name, artist, and a countdown timer that ticks every second without extra API calls.

---

## Prerequisites

- A Spotify account (free or premium — playback control requires **Spotify Premium**)
- PyDeck running (default port `8686`)
- Spotify open on at least one device for the active-device controls to work

---

## Step 1 — Create a Spotify app

1. Go to the [Spotify Developer Dashboard](https://developer.spotify.com/dashboard)
2. Click **Create app**
3. Fill in:
   - **App name** — anything you like, e.g. `PyDeck`
   - **App description** — optional
   - **Redirect URI** — PyDeck uses `http://127.0.0.1:<port>/oauth/<plugin_id>/callback`, where **`<plugin_id>`** is the plugin’s install directory name (same id PyDeck uses in the API and in `credentials.json`). Add the URI that matches **your** install:
     ```text
     http://127.0.0.1:8686/oauth/no.pydeck.spotify/callback
     ```
     - **Spotify (legacy) plugin**:
       ```text
       http://127.0.0.1:8686/oauth/spotify/callback
       ```
     If you are unsure, open **Settings → Credentials → Spotify**, click **Authorize**, and check the `redirect_uri` query parameter on the Spotify login URL — it must match one of the redirect URIs you registered **exactly** (including host and port).
   - **Which API/SDKs are you planning to use?** — tick **Web API**
4. Accept the terms and click **Save**

> **Important:** Use `127.0.0.1`, not `localhost`. Spotify performs exact-string
> matching on the redirect URI — `localhost` and `127.0.0.1` are treated as
> different values even though they resolve to the same address.

---

## Step 2 — Copy your credentials

1. Open your new app in the Dashboard
2. Click **Settings**
3. Copy the **Client ID**
4. Click **View client secret** and copy the **Client Secret**

Keep the Client Secret private.

---

## Step 3 — Enter credentials in PyDeck

1. Open PyDeck in your browser (`http://127.0.0.1:8686`)
2. Click the **Settings** icon in the deck header
3. Navigate to **Credentials → Spotify**
4. Paste your **Client ID** and **Client Secret**
5. Click **Save**

---

## Step 4 — Authorize

1. Still in **Settings → Credentials → Spotify**, click **Authorize**
2. Your browser opens Spotify's login/consent page
3. Log in and click **Agree** to grant the requested permissions
4. The browser redirects back to PyDeck automatically
5. You will see **"Spotify connected! You can close this tab."**

PyDeck saves the tokens to `~/.config/pydeck/core/credentials.json`. The access token is refreshed automatically every hour.

---

## Step 5 — Add buttons to your deck

Drag any Spotify action onto a button slot:

| Action | What it does |
|---|---|
| **Play / Pause** | Toggle playback; shows album art on the button |
| **Next Track** | Skip to the next track |
| **Previous Track** | Go back to the previous track |
| **Volume Up / Down** | Increase or decrease volume by a configurable step (default 10 %) |
| **Set Volume** | Jump to a fixed volume level (0–100 %) |
| **Toggle Shuffle** | Turn shuffle on or off |
| **Cycle Repeat** | Cycle through off → playlist → track repeat |

### Album art & track info

On the **Play / Pause** button you can enable:

- **Display mode** — show song name, artist, or both as a scrolling label
- **Show time left** — overlay a `−m:ss` countdown that ticks every second

---

## Troubleshooting

| Error | Cause | Fix |
|---|---|---|
| `redirect_uri: Not matching configuration` | Redirect URI in Spotify Dashboard doesn't match | Register `http://127.0.0.1:8686/oauth/no.pydeck.spotify/callback`, or `http://127.0.0.1:8686/oauth/spotify/callback` for the **Spotify (legacy) plugin**. Use `127.0.0.1`, not `localhost` |
| `Not authorized — press the Spotify Authorize button first` | No token saved | Complete Step 4 (Authorize) |
| `HTTP 403` / playback controls do nothing | Free Spotify account | Playback control requires **Spotify Premium** |
| `HTTP 404` / no active device | Spotify is not open on any device | Open Spotify on a phone, desktop, or web player |
| Album art not updating | Spotify's API poll cycle | Art refreshes within ~3 s of a track change |

---

## Required Spotify scopes

PyDeck requests these scopes automatically during the Authorize step:

| Scope | Purpose |
|---|---|
| `user-read-playback-state` | Read current track, shuffle/repeat state, volume |
| `user-modify-playback-state` | Play, pause, skip, set volume, shuffle, repeat |
| `user-read-currently-playing` | Read the currently playing track |
