# Security: LAN, trusted callers & HTTPS

Everything about *who may reach this server* now lives in one place: **Settings → Security**.

The pane has four parts, in the order you would usually need them:

| Section | Answers |
|:---|:---|
| **Network access** | May anything off this machine connect at all? |
| **HTTPS** | Is the connection encrypted, and what certificate proves it? |
| **Trusted proxies** | Which *client addresses* get in without pairing or a key? |
| **Trusted domains** | Which *names* will PyDeck answer to in the `Host` header? |

!!! note "The LAN toggle moved"
    Allowing local-network access used to sit in **Settings → Device → Network**. It is
    now **Settings → Security → Network access**. It was never a property of a deck —
    it is a property of the server — and it belongs beside the things that decide what a
    remote caller may then do.

---

## Network access

PyDeck binds to `127.0.0.1` by default, which no other machine can reach. Turning on
**Allow LAN access** rebinds to `0.0.0.0` and shows the address a phone should use.

**PyDeck restarts itself when you save.** Sockets are bound once, at startup, so every
switch in this pane is a restart — the page follows the server to wherever it now listens.

!!! warning "This exposes the port to your whole network"
    Anything that can reach the machine can reach the port. PyDeck denies remote requests
    by default — see [Access control](../internals/security.md) — but that is not a
    substitute for a trusted network. Use it on your own LAN, not a public or guest one.

---

## HTTPS

A phone driving a deck over plain HTTP sends its pairing token and every key press in
clear text across the Wi-Fi. **Enable HTTPS** puts TLS on port **8443**.

It *adds* a socket rather than moving one. Plain HTTP stays on **8686**, so the editor
keeps working on the address you already have open while a phone moves to TLS. A second
switch, **Turn off plain HTTP**, closes 8686 and leaves only 8443.

| Setting | Listens on |
|:---|:---|
| Neither | `http://…:8686` |
| HTTPS on | `http://…:8686` **and** `https://…:8443` |
| HTTPS on, HTTP off | `https://…:8443` only |

You cannot turn off HTTP without turning on HTTPS — that would be a server with nothing
listening, and the API refuses it.

!!! tip "Do this in the right order"
    Enable HTTPS, **install the certificate on the devices that need it**, confirm they
    connect, and only then turn off plain HTTP. Doing it the other way round leaves you
    with a certificate warning and no unencrypted way back in.

### Two certificates, and why

There is no public hostname to get a real certificate for, so PyDeck issues its own —
**two** of them, the way [mkcert](https://github.com/FiloSottile/mkcert) does:

| Certificate | Lives | Purpose |
|:---|:---|:---|
| **Certificate authority** (`PyDeck Local CA`) | 10 years, or longer if it must outlive what it signs | The **only** file you ever install on a phone or laptop |
| **Server certificate** | Your chosen validity (default 1 year) | What the server actually presents, signed by the CA above |

The split is the point. Android's certificate installer refuses a plain server
certificate outright — it will only import something marked as a CA — and every other
platform makes trusting a lone self-signed certificate more awkward than trusting an
authority. More usefully, the server certificate is reissued automatically whenever

- the machine's LAN address changes,
- a trusted domain is added or removed,
- it comes within 30 days of expiring,

…and **none of that disturbs the CA already installed on your devices**. They keep
working without you touching them again.

The server certificate lists every name and address this machine answers to: `localhost`,
the machine's own hostname, `127.0.0.1`, `::1`, the current LAN address, and every trusted
domain from the list further down.

Files live in `~/.local/share/pydeck/tls/` (`ca-cert.pem`, `ca-key.pem`, `server-cert.pem`,
`server-key.pem`). The two private keys are written `0600` and **never leave the machine** —
the only thing PyDeck will hand out is `ca-cert.pem`.

### Installing the certificate

Click **Download** on the certificate card to get `pydeck-ca.crt`, then install it on each
device that should trust PyDeck. Check the SHA-256 fingerprint shown on the card matches
what the device shows you before you confirm.

=== "iOS / iPadOS"

    1. Get the file onto the phone — AirDrop, or open
       `http://<pydeck-ip>:8686/api/tls/ca.crt` in Safari (this URL needs no credentials).
    2. **Settings → General → VPN & Device Management** → install the downloaded profile.
    3. **Settings → General → About → Certificate Trust Settings** → switch on full trust
       for **PyDeck Local CA**.

    Step 3 is not optional. Without it the profile is installed but the certificate is
    still not trusted, and Safari will keep warning.

=== "Android"

    1. Download the file on the device.
    2. **Settings → Security → More security settings → Encryption & credentials →
       Install a certificate → CA certificate**, then confirm the warning.

    Wording varies by vendor; search settings for "certificate". Note that apps do not
    trust user-installed CAs by default — the browser does, which is what a kiosk needs.

=== "Windows"

    ```powershell
    Import-Certificate -FilePath pydeck-ca.crt `
      -CertStoreLocation Cert:\CurrentUser\Root
    ```

    Or double-click the file → **Install Certificate** → **Current User** → place it in
    **Trusted Root Certification Authorities**.

=== "macOS"

    ```bash
    sudo security add-trusted-cert -d -r trustRoot \
      -k /Library/Keychains/System.keychain pydeck-ca.crt
    ```

    Or open it in Keychain Access, then set **Trust → When using this certificate** to
    **Always Trust**.

=== "Linux"

    ```bash
    sudo cp pydeck-ca.crt /usr/local/share/ca-certificates/pydeck.crt
    sudo update-ca-certificates          # Debian / Ubuntu
    ```

    ```bash
    sudo cp pydeck-ca.crt /etc/pki/ca-trust/source/anchors/
    sudo update-ca-trust                 # Fedora / RHEL
    ```

    Firefox keeps its own store: **Settings → Privacy & Security → Certificates → View
    Certificates → Authorities → Import**.

### How long it stays valid

A local CA is not a public one — nothing revokes it and nothing depends on it rotating —
so the choice is yours:

| Option | Good for |
|:---|:---|
| **47 days** | Short enough that a broken renewal is noticed quickly |
| **6 months** | |
| **1 year** *(default)* | Under Apple's limit, so it works everywhere |
| **100 years** | Install once and never think about it again |

Changing it reissues the server certificate immediately.

!!! warning "100 years also reissues the authority"
    A server certificate cannot outlive the CA that signed it — the chain stops verifying
    the day the CA expires, which would make "100 years" quietly mean ten. So PyDeck keeps
    the CA longer-lived than whatever it signs, and picking **100 years** is the one option
    that forces a **new CA**. The pane tells you when that happens: every device that
    already trusts PyDeck must install the new file.

    The other three options never touch the CA.

!!! note "Apple devices and long certificates"
    Apple refuses a server certificate valid for more than **398 days** — but that rule
    applies to certificates chaining to a *system* root, not to one you installed by hand.
    A 6-month, 1-year or 100-year PyDeck certificate works on an iPhone or a Mac **once the
    authority above is installed**. The pane flags the choice rather than blocking it.

### Reissuing

**Reissue** on the certificate card throws away both certificates and starts over with a
brand-new authority. Use it if you think a key has been exposed. Every device that trusted
the old CA must install the new one before it will connect again, so it asks first.

---

## Trusted proxies

If you run a reverse proxy in front of PyDeck — nginx, Caddy, Traefik — it arrives as an
ordinary off-box client. The peer on the socket is the *proxy*, not the browser behind it,
so the usual rules apply to it and the editor it serves is held at the pairing keypad.

Adding the proxy's address here says: **treat this address as though it were this machine**.
It gets everything localhost gets, with no pairing and no API key.

!!! danger "This is a deliberate hole"
    Whatever can reach PyDeck from that address can do everything the editor can — read
    plugin credentials in clear text, install plugins, press any key. List addresses you
    control, and nothing else.

Entries are **single addresses only**. A range would be a whole subnet's worth of full
access, and a typo in one is invisible. IPv4 and IPv6 both work, and a v4 client arriving
on a dual-stack socket as `::ffff:192.168.1.10` matches a stored `192.168.1.10`.

---

## Trusted domains

PyDeck answers only to IP literals and `localhost` in the `Host` header. Anything else is
rejected with **421 Invalid host**.

That is not fussiness. A DNS-rebinding page resolves its own name to `127.0.0.1`, so its
requests reach the server *from loopback* and pass every client-address check — but the
browser still sends the attacker's name in `Host` and treats the reply as same-origin.
Refusing unknown names is what stops it.

So a proxy that forwards its own hostname needs that name listed here. Two ways in, and
they are one set:

| Source | Set by | Editable in the pane |
|:---|:---|:---|
| **Trusted domains** list | You, in Settings → Security | Yes |
| `PYDECK_ALLOWED_HOSTS` | Whoever starts PyDeck (comma-separated) | No — shown, greyed, for reference |

Names are stored lowercase with any port and trailing dot removed. URLs, wildcards
(`*.home.arpa`), IP literals and `localhost` are refused — the first two because they are
not hostnames, the last two because they are already accepted.

!!! tip "A proxy usually needs an entry in *both* lists"
    The two lists answer different questions and neither implies the other:

    - the **trusted domain** gets the request past the `Host` check,
    - the **trusted proxy** gets its client past the deny-by-default policy.

    Add the domain and get 403; add the proxy and get 421. Add both and it works.

    Add the domain to the trusted list *before* enabling HTTPS, so the name lands in the
    certificate — otherwise the browser will complain the certificate does not cover it.

---

## Using it from the API

All of it is reachable with an [API token](../reference/api-tokens.md) carrying the
**`security`** scope — that is the point of the scope: a monitoring host should be able to
watch the certificate, reissue it before it lapses, and collect the new authority, without
being handed the rest of the API.

| Scope | Reaches |
|:---|:---|
| `security:read` | `GET /api/tls`, `GET /api/tls/ca.crt`, `GET /api/trusted-proxies`, `GET /api/trusted-domains` |
| `security:write` | `POST /api/tls`, `POST /api/tls/validity`, `POST /api/tls/regenerate`, and `POST`/`DELETE` on both trusted lists |

There is no hierarchy: `security:write` does **not** imply `security:read`. A token is
checked *before* the locality test, so a script holding one works from another machine —
it needs neither pairing nor an entry in the trusted lists.

### Endpoints

| Method & path | Body | Returns |
|:---|:---|:---|
| `GET /api/tls` | — | State, ports, validity, and the certificate |
| `POST /api/tls` | `{"enabled": true, "disable_http": false}` | New state, plus `restarting` |
| `POST /api/tls/validity` | `{"days": 365}` | New state, plus `ca_changed` |
| `POST /api/tls/regenerate` | `{}` | New state, `ca_changed` always true |
| `GET /api/tls/ca.crt` | — | The CA as `application/x-x509-ca-cert` |
| `GET /api/trusted-proxies` | — | `{"proxies": ["192.168.1.10"]}` |
| `POST /api/trusted-proxies` | `{"address": "192.168.1.10"}` | The new list |
| `DELETE /api/trusted-proxies/{address}` | — | The new list |
| `GET /api/trusted-domains` | — | `{"domains": [...], "from_env": [...]}` |
| `POST /api/trusted-domains` | `{"domain": "deck.home.arpa"}` | The new list |
| `DELETE /api/trusted-domains/{name}` | — | The new list |

`GET /api/tls` answers:

```json
{
  "https_enabled": true,
  "http_disabled": false,
  "http_port": 8686,
  "https_port": 8443,
  "validity_days": 365,
  "validity_options": [
    { "days": 47, "label": "47 days" },
    { "days": 183, "label": "6 months" },
    { "days": 365, "label": "1 year" },
    { "days": 36500, "label": "100 years" }
  ],
  "validity_exceeds_apple_limit": false,
  "certificate": {
    "exists": true,
    "authority": "PyDeck Local CA",
    "fingerprint": "BB:F1:56:D2:3F:59:00:A4:…",
    "expires": "2027-09-01T16:12:07+00:00",
    "ca_expires": "2036-08-29T16:12:07+00:00",
    "names": ["localhost", "deck.home.arpa"],
    "ips": ["127.0.0.1", "::1", "192.168.1.20"]
  }
}
```

Writes that rebind a socket or replace the certificate answer with
`"restarting": true` when the server is serving HTTPS and is about to re-exec.

### Errors

| Status | When |
|:---|:---|
| `400` | Not an address / not a hostname / a validity period that is not offered / turning off HTTP with HTTPS off |
| `404` | Removing something that is not on the list, or downloading before anything is issued |
| `409` | Adding an entry that is already there |

### Worked example: renew before it lapses

```bash
#!/usr/bin/env bash
# Reissue the PyDeck certificate when it has under 14 days left.
set -euo pipefail

HOST="https://deck.home.arpa:8443"
AUTH="X-API-Key: pdk_..."          # security:read + security:write

expires=$(curl -fsS -H "$AUTH" "$HOST/api/tls" | jq -r .certificate.expires)
left=$(( ( $(date -d "$expires" +%s) - $(date +%s) ) / 86400 ))
echo "certificate expires in $left day(s)"

if (( left < 14 )); then
  # Nudging the validity reissues the server certificate and leaves the
  # authority alone, so devices that already trust PyDeck stay working.
  curl -fsS -H "$AUTH" -H 'Content-Type: application/json' \
       -d '{"days": 365}' "$HOST/api/tls/validity" | jq '{ca_changed, restarting}'

  # A reissue restarts the server when HTTPS is being served.
  until curl -fsS -o /dev/null -H "$AUTH" "$HOST/api/tls"; do sleep 2; done

  curl -fsS -H "$AUTH" -o pydeck-ca.crt "$HOST/api/tls/ca.crt"
  echo "fetched $(openssl x509 -in pydeck-ca.crt -noout -fingerprint -sha256)"
fi
```

Read `ca_changed` from the response. When it is `false` — which is every case except
choosing 100 years or calling `/api/tls/regenerate` — the authority is unchanged and your
devices need nothing. When it is `true`, distribute the file you just downloaded.

!!! warning "A token narrows `ca.crt`, it does not widen it"
    `GET /api/tls/ca.crt` needs no credentials — that is how a phone fetches it. But a
    request that *carries* a token is judged on that token, so a script sending
    `X-API-Key` needs `security:read` or it gets `403`. Adding an auth header to a request
    that was working can therefore break it. Send the token, and grant the scope.

---

## Troubleshooting

| Symptom | Cause |
|:---|:---|
| `421 Invalid host` | The name in `Host` is not a trusted domain. Add it, or use the IP address. |
| `403 Remote access denied` | An off-box caller with no pairing token, no API token, and no trusted-proxy entry. |
| `403 ... "missing_scope": "security:write"` | The token is valid but lacks the scope. |
| `403 ... "endpoint_not_scopable"` | You sent a token to an endpoint no token may reach — `/api/tokens/*` or `/api/pair/*`. |
| `NET::ERR_CERT_AUTHORITY_INVALID` | The CA is not installed on *this* device, or (iOS) installed but not switched on under Certificate Trust Settings. |
| Certificate warning naming the wrong host | You are reaching PyDeck by a name the certificate does not list. Add it as a trusted domain — the certificate is reissued to cover it. |
| Nothing answers on 8443 | The firewall. `sudo firewall-cmd --add-port=8443/tcp --permanent && sudo firewall-cmd --reload`, or the equivalent. |
| An OAuth plugin stops completing its login | With plain HTTP off, the callback moves to `https://127.0.0.1:8443/oauth/…`. Re-register that redirect URI with the provider. |
| The browser will not open the page after turning HTTP off | You are still on `http://…:8686`. Go to `https://…:8443`. |

---

## Pages not yet updated for this

These predate the Security pane and still describe the old arrangement:

| Page | Stale in what way |
|:---|:---|
| [Devices](devices.md) | Documents the LAN toggle under Settings → Device |
| [Virtual decks & phone control](virtual-decks.md) | Sends you to Settings → Device → Network; kiosk URLs can be `https` now |
| [Access control](../internals/security.md) | Says loopback is the only client trusted without a credential |
| [Route inventory](../internals/routes.md) | Missing the `/api/tls` and `/api/trusted-*` routes |
| [HTTP & WebSocket API](../reference/http-api.md) | Same, and has no `security` scope |
| [API tokens](../reference/api-tokens.md) | Scope table has no `security` row |
| [Config & file paths](../reference/paths.md) | No `~/.local/share/pydeck/tls/` |

This page is the current description where they disagree.
