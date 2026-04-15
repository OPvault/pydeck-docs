# Plugin Development — Authentication

## 1. Credentials

Plugins that interact with external APIs typically need secrets — API keys, client IDs, OAuth tokens, etc.  PyDeck stores these separately from button configuration so they can be shared across all buttons of the same plugin, edited in one place, and kept out of the buttons.json file.

### Where Credentials Are Stored

All credentials live in a single file:

```text
~/.config/pydeck/core/credentials.json
```

This file is a flat JSON object. Each top-level key is a **plugin name** (matching the folder name under **`~/.local/share/pydeck/plugin/`**), and its value is an object of key–value pairs:

```json
{
  "spotify": {
    "client_id": "abc123def456",
    "client_secret": "secret789",
    "access_token": "BQD...long_token...",
    "refresh_token": "AQB...long_token..."
  },
  "discord": {
    "client_id": "1234567890",
    "client_secret": "abcdefg"
  },
  "my_weather_plugin": {
    "api_key": "wk_live_abc123"
  }
}
```

The file is created automatically the first time a user saves credentials through the GUI. If the file doesn't exist yet, the core treats every plugin as having an empty credential set (`{}`).

> **Security note:** `credentials.json` stores secrets in plaintext on disk. It lives in the user's home directory under `.config/pydeck/`, which is not world-readable on most systems, but plugins should still encourage users to use app-specific or restricted-scope credentials where possible.

### Declaring Credentials in the Manifest

To tell PyDeck that your plugin needs credentials, add a `credentials` array to `manifest.json`. Each entry describes one input field that will appear under **Settings → Credentials** in the web UI (click the gear icon in the deck header to open Settings, then choose the **Credentials** category):

```json
{
  "name": "my_weather_plugin",
  "credentials": [
    { "id": "api_key", "label": "API Key", "type": "password" }
  ],
  "functions": { ... }
}
```

A more complex example with multiple fields:

```json
{
  "credentials": [
    { "id": "client_id",     "label": "Client ID",     "type": "text" },
    { "id": "client_secret", "label": "Client Secret", "type": "password" },
    { "id": "webhook_url",   "label": "Webhook URL",   "type": "text" }
  ]
}
```

Each entry has these fields:

| Field | Type | Description |
|:---|:---|:---|
| `id` | string | The key stored in `credentials.json` and injected into your function's `config` dict. Must be unique within the plugin. |
| `label` | string | Human-readable label shown next to the input field under **Settings → Credentials**. |
| `type` | string | `"text"` renders a normal visible input. `"password"` renders a masked input and the saved value is displayed as `••••••••` when re-opened. |

If a plugin has **no** `credentials` array (or it's empty), the plugin simply won't appear in the Credentials list — no section, no fields.

### The Credentials UI

On **Settings → Credentials**, the UI calls `GET /api/credentials`, which scans every discovered plugin's manifest for `credentials` declarations. For each plugin that declares credentials:

1. A **section** is shown with the plugin name as a header
2. **Input fields** are rendered for each credential definition
3. Existing values are pre-filled (password fields show `••••••••` instead of the real value)
4. A **Save** button persists the values
5. If the plugin also has an `oauth` config, an **Authorize** button and status badge are shown

### Plugin settings panel

Plugins can add a **custom HTML panel** in **Settings** (gear icon in the deck header; opens `/settings`) and group multiple plugins under one sidebar category.

1. Add a `settings` object to `manifest.json`:

```json
"settings": {
  "category": "Integrations",
  "category_id": "integrations",
  "order": 10
}
```

| Field | Required | Description |
|:---|:---|:---|
| `category` | Yes | Human-readable sidebar label. Plugins with the same resolved `category_id` share one category. |
| `category_id` | No | Stable id (`a-z`, `0-9`, `-`). If omitted, it is derived from `category` (lowercase, non-alphanumeric → `-`). |
| `order` | No | Sort order for your plugin within that category (integer; lower first). |

2. Optionally add **`~/.local/share/pydeck/plugin/<your_plugin>/settings.html`**. Static HTML only; no server-side templating.

3. The settings page calls `GET /api/settings/categories` to build the sidebar (built-in categories — **Marketplace**, **Device**, **Appearance**, **Credentials**, **Updates**, and **Licenses** — are always listed first). For each plugin in a category, the UI loads:

```text
GET /api/plugins/<plugin_name>/settings/panel
```

If `settings.html` is missing, the category still appears when `settings` is declared, and the user sees a short note for that plugin’s panel.

With Settings open, **Escape** closes the settings view and returns to the deck (navigates back to `/`).

When the user clicks Save:
- The GUI sends `POST /api/credentials/<plugin_name>` with the field values
- The backend **merges** the new values into the existing entry — it never wipes the whole entry
- Values that are still `••••••••` (the mask) are **skipped**, so re-saving the form without editing a password field won't destroy the stored secret
- Any extra keys already in `credentials.json` (like `access_token` from OAuth) are preserved

### How Credentials Reach Your Function

When a button is pressed, the core performs a two-step merge before calling your function:

```text
Step 1: Load credentials.json → read the object under your plugin's name
Step 2: Merge with button config → credentials first, then button config on top
```

In code (from `lib/button.py`):

```python
merged = {**credentials_from_file, **per_button_config}
fn(merged)
```

This means:
- **Credentials are the base layer** — every function call automatically gets `client_id`, `api_key`, `access_token`, etc. without the user configuring each button individually.
- **Per-button config overrides credentials** — if a user sets `api_key` in a button's form fields, that value takes precedence over the one in `credentials.json`. This allows advanced users to use different keys per button.

Your function receives the merged result as a single `config` dict:

```python
def get_weather(config: Dict[str, Any]) -> Dict[str, Any]:
    api_key = config.get("api_key", "")
    city = config.get("city", "London")

    # api_key comes from credentials.json automatically
    # city comes from the button's per-button UI config
    ...
```

### Credential Lifecycle Example

Here's the full lifecycle of how a credential value flows through the system, using a weather plugin as an example:

**1. Plugin declares the credential:**

```json
{
  "name": "weather",
  "credentials": [
    { "id": "api_key", "label": "OpenWeather API Key", "type": "password" }
  ],
  "functions": {
    "current": {
      "label": "Current Weather",
      "ui": [
        { "type": "input", "id": "city", "label": "City", "default": "London" }
      ]
    }
  }
}
```

**2. User enters the key under Settings → Credentials:**

The GUI shows a password input labeled "OpenWeather API Key". The user pastes their key and clicks Save.

**3. The key is persisted to disk:**

```json
// ~/.config/pydeck/core/credentials.json
{
  "weather": {
    "api_key": "wk_live_abc123def456"
  }
}
```

**4. User assigns the function to a button:**

They drag "weather / current" onto button slot 0 and set the city to "Berlin".

**5. The button config is saved (no credential data here):**

```json
// In the active profile's buttons.json
{
  "id": 0,
  "type": "plugin",
  "plugin": "weather",
  "function": "current",
  "config": { "city": "Berlin" },
  "display": { "text": "Weather", "color": "#4a90d9" }
}
```

**6. User presses the button — core merges and calls the function:**

```python
# What the core does internally:
credentials = {"api_key": "wk_live_abc123def456"}  # from credentials.json
button_config = {"city": "Berlin"}                   # from buttons.json
merged = {**credentials, **button_config}
# merged = {"api_key": "wk_live_abc123def456", "city": "Berlin"}

result = weather_plugin.current(merged)
```

**7. Your function receives the merged config:**

```python
def current(config):
    api_key = config["api_key"]   # "wk_live_abc123def456"
    city = config["city"]         # "Berlin"
    # Make API call...
```

### OAuth Tokens in Credentials

When a plugin uses [OAuth](#9-oauth-integration), the token exchange automatically writes `access_token` and `refresh_token` into the same `credentials.json` entry alongside the `client_id` and `client_secret`:

```json
{
  "spotify": {
    "client_id": "abc123",
    "client_secret": "secret456",
    "access_token": "BQD...",
    "refresh_token": "AQB..."
  }
}
```

These tokens are then merged into `config` on every button press, so your plugin function can use `config["access_token"]` directly. When your plugin refreshes an expired token, it should write the new token back to `credentials.json` so it persists across restarts. See the Spotify plugin's `_save_tokens()` method for an example.

### Multiple Buttons, One Credential Set

A key design principle: credentials are per-plugin, not per-button. If you have five Spotify buttons (play, pause, next, previous, volume), they all share the same `client_id`, `client_secret`, `access_token`, and `refresh_token` from a single entry in `credentials.json`. The user only has to configure credentials once.

### Credential Validation in Your Function

Always check that required credentials are present before using them. If a credential is missing, return a clear error message pointing the user to **Settings → Credentials**:

```python
def my_function(config):
    api_key = str(config.get("api_key") or "").strip()
    if not api_key:
        return {
            "success": False,
            "error": "API key not configured — add it under Settings → Credentials",
        }
    # Safe to proceed...
```

This is important because:
- A fresh install won't have any credentials yet
- The user might have forgotten to save credentials before testing
- OAuth tokens can expire or be revoked

---

## 2. OAuth Integration

Plugins that need OAuth2 Authorization Code flow can declare their OAuth config in the manifest. The core handles the entire browser-based flow generically.

### Declaring OAuth in the Manifest

Replace a simple `"oauth": true` with an object:

```json
{
  "oauth": {
    "authorize_url": "https://accounts.spotify.com/authorize",
    "token_url": "https://accounts.spotify.com/api/token",
    "scopes": "user-read-playback-state user-modify-playback-state",
    "auth_method": "basic"
  }
}
```

| Field | Type | Required | Description |
|:---|:---|:---|:---|
| `authorize_url` | string | Yes | The provider's authorization endpoint URL. |
| `token_url` | string | Yes | The provider's token exchange endpoint URL. |
| `scopes` | string | No | Space-separated OAuth scopes to request. |
| `auth_method` | string | No | How client credentials are sent to the token endpoint. `"basic"` (default) sends Base64-encoded `client_id:client_secret` in the Authorization header. `"post"` sends them as form body fields. |
| `user_agent` | string | No | `User-Agent` header sent to the token endpoint. Defaults to `PyDeck/1.0`. Set this when the provider requires a specific format — for example, Discord's API requires the `DiscordBot` prefix. |

> **`user_agent` example — Discord:**  
> Discord's API rejects token requests whose `User-Agent` does not start with `DiscordBot`.  
> Declare it in the manifest so `lib/oauth.py` never needs provider-specific strings:
>
> ```json
> "oauth": {
>   "authorize_url": "https://discord.com/api/oauth2/authorize",
>   "token_url":     "https://discord.com/api/oauth2/token",
>   "scopes":        "rpc rpc.voice.read rpc.voice.write",
>   "auth_method":   "post",
>   "user_agent":    "DiscordBot (pydeck, 1.0)"
> }
> ```
>
> Any plugin that does **not** set `user_agent` automatically sends `PyDeck/1.0`.

### How the OAuth Flow Works

1. User saves `client_id` and `client_secret` under **Settings → Credentials**
2. User clicks **Authorize** in the same place
3. The GUI calls `GET /api/<plugin_name>/authorize`
4. The core reads the manifest's `oauth` config and builds the authorization URL
5. The browser opens the provider's auth page
6. After the user approves, the provider redirects to `http://127.0.0.1:8686/oauth/<plugin_name>/callback`
7. The core exchanges the authorization code for tokens
8. `access_token` and `refresh_token` are saved to `credentials.json` under the plugin's key
9. Tokens are automatically included in `config` on every button press

### Setting Up the Provider

When creating your app on the OAuth provider's dashboard, set the redirect URI to:

```text
http://127.0.0.1:8686/oauth/<your_plugin_name>/callback
```

For example, a Spotify plugin would use:

```text
http://127.0.0.1:8686/oauth/spotify/callback
```

### Token Refresh

The core handles the initial token exchange and storage. Your plugin is responsible for refreshing expired tokens using the `refresh_token` from `config`. See the Spotify plugin's `SpotifyClient._req()` method for an example that auto-refreshes on 401 responses.

---
