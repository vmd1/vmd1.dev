---
date: '2025-03-17T12:01:27Z'
draft: false
title: 'Self-hosting an all-in-one chat app'
tags:
- Lab
- Guides
- Matrix
---
There are so many different chat platforms out there, all needing their own apps and account to use. Each one is just another app to install, and the list isn’t growing shorter. Apps like Beeper and Sunbird do already exist, but what’s the fun in that? So, I thought, let’s see if we can self host our own version of Beeper. Considering all of the core components are open source, it shouldn’t be too tricky. 

There are a few main components we need in order for this to work.

- A backend DB - I’m using PostgreSQL
- A homeserver - Synapse
- An authentication platform - Matrix Authentication Service
- Bridges - e.g. Mautrix-Whatsapp
- An admin panel (optional) - such as Element Admin

<aside>
💡

Postgres is incredibly optimised on my cluster, and if you’re experiencing issues with event persistence, your first step should be to check postgres performance.

</aside>

In my current setup, I am already using Traefik and Authentik, so you may need to tweak things a bit so it works with your setup.

## `compose.yml`

This compose file has become a bit of a behemoth to behold, but comments always help.

```yaml
services:
  # -------------------------
  # CORE: Synapse Homeserver
  # -------------------------
  main:
    image: matrixdotorg/synapse:latest
    container_name: synapse
    restart: unless-stopped
    healthcheck:
      test: ["CMD-SHELL", "curl -f http://localhost:8008/health || exit 1"]
      interval: 30s
      timeout: 20s      # High timeout because the Pi CPU is at 98%
      retries: 10       # Allow up to 5 minutes of "busy" time before marking down
      start_period: 3m  # Give the Pi 3 minutes to load the DB before checking
    environment:
      - SYNAPSE_SERVER_NAME=example.com
      - SYNAPSE_REPORT_STATS=no
      - PYTHONPATH=/data/py
      - LD_PRELOAD=/usr/lib/aarch64-linux-gnu/libjemalloc.so.2
    volumes:
      - /lab/cluster/home-1/matrix/synapse:/data
    networks:
      - matrix-net
      - proxy
      - postgres
      - redis
    deploy:
      resources:
        limits:
          memory: 4G
    labels:
      - traefik.enable=true
      - traefik.http.routers.synapse-main.entrypoints=websecure
      - traefik.http.routers.synapse-main.rule=Host(`matrix.example.com`) || Host(`federation.example.com`)
      - traefik.http.routers.synapse-main.tls=true
      - traefik.http.routers.synapse-main.tls.certresolver=dns-cloudflare
      - traefik.http.routers.synapse-main.middlewares=chain-synapse@file
      - traefik.http.routers.synapse-main.service=synapse-main
      - traefik.http.services.synapse-main.loadbalancer.server.port=8008

  # -------------------------
  # AUTH: Matrix Authenticaton Server
  # -------------------------
  matrix-authentication-service:
    image: ghcr.io/element-hq/matrix-authentication-service:latest
    container_name: matrix-authentication-service
    restart: unless-stopped
    volumes:
      - /lab/cluster/home-1/matrix/mas/config.yaml:/app/config.yaml
      - /lab/cluster/home-1/matrix/mas/policy.rego:/app/policy.rego
    environment:
      - MAS_CONFIG=/app/config.yaml
    networks:
      - matrix-net
      - proxy
      - postgres
    deploy:
      resources:
        limits:
          memory: 400M 
    labels:
      - autoheal=true
      - traefik.enable=true
      - traefik.http.routers.synapse-mas-rtr.entrypoints=websecure
      - traefik.http.routers.synapse-mas-rtr.priority=100
      - "traefik.http.routers.synapse-mas-rtr.rule=((Host(`matrix.example.com`) && (PathRegexp(`^/_matrix/client/.+/(login|logout|refresh)`) || PathPrefix(`/assets`) || PathPrefix (`/auth`) || PathPrefix(`/.well-known/openid-configuration`) || PathPrefix(`/.well-known/oauth-authorization-server`))))"
      - traefik.http.routers.synapse-mas-rtr.tls=true
      - traefik.http.routers.synapse-mas-rtr.tls.certresolver=dns-cloudflare
      - "traefik.http.middlewares.mas-strip.stripprefix.prefixes=/auth/"
      - traefik.http.routers.synapse-mas-rtr.middlewares=chain-synapse@file,mas-strip
      - traefik.http.routers.synapse-mas-rtr.service=synapse-mas-svc
      - traefik.http.services.synapse-mas-svc.loadbalancer.server.port=8080

  # -------------------------
  # ADINISTRATION: Element Admin
  # -------------------------
  element-admin:
    image: oci.element.io/element-admin:latest
    container_name: element-admin
    restart: unless-stopped
    environment:
      - SERVER_NAME=example.com
    networks:
      - proxy
    labels:
      - traefik.enable=true
      - traefik.http.routers.synapse-admin-rtr.entrypoints=websecure
      - "traefik.http.routers.synapse-admin-rtr.rule=Host(`admin.matrix.example.com`) || Host(`matrix-admin.example.com`)"
      - traefik.http.routers.synapse-admin-rtr.tls=true
      - traefik.http.routers.synapse-admin-rtr.tls.certresolver=dns-cloudflare
      - traefik.http.routers.synapse-admin-rtr.middlewares=chain-no-auth@file
      - traefik.http.routers.synapse-admin-rtr.service=synapse-admin-svc
      - traefik.http.services.synapse-admin-svc.loadbalancer.server.port=8080

  # -------------------------
  # BRIDGE: WhatsApp
  # -------------------------
  mautrix-whatsapp:
    image: dock.mau.dev/mautrix/whatsapp:latest
    container_name: mautrix-whatsapp
    restart: unless-stopped
    volumes:
      - /lab/cluster/home-1/matrix/bridges/whatsapp:/data
    networks:
      - matrix-net
      - postgres
      - proxy
    deploy:
      resources:
        limits:
          memory: 600M 
    labels:
      - traefik.enable=true
      - traefik.http.routers.bridge-wa.entrypoints=websecure
      - traefik.http.routers.bridge-wa.rule=Host(`bridges.example.com`) && PathPrefix(`/v1/bridges/whatsapp`)
      - traefik.http.routers.bridge-wa.tls=true
      - traefik.http.routers.bridge-wa.tls.certresolver=dns-cloudflare
      - traefik.http.middlewares.wa-strip.stripprefix.prefixes=/v1/bridges/whatsapp
      - traefik.http.routers.bridge-wa.middlewares=wa-strip,chain-synapse@file
      - traefik.http.routers.bridge-wa.service=wa-svc
      - traefik.http.services.wa-svc.loadbalancer.server.port=29318

  # -------------------------
  # BRIDGE: Instagram (Meta)
  # -------------------------
  mautrix-meta:
    image: dock.mau.dev/mautrix/meta:latest
    container_name: mautrix-meta
    restart: unless-stopped
    volumes:
      - /lab/cluster/home-1/matrix/bridges/meta:/data
    networks:
      - matrix-net
      - postgres
      - proxy
    deploy:
      resources:
        limits:
          memory: 600M 
    labels:
      - traefik.enable=true
      - traefik.http.routers.bridge-meta.entrypoints=websecure
      - traefik.http.routers.bridge-meta.rule=Host(`bridges.example.com`) && PathPrefix(`/v1/bridges/meta`)
      - traefik.http.routers.bridge-meta.tls=true
      - traefik.http.routers.bridge-meta.tls.certresolver=dns-cloudflare
      - traefik.http.middlewares.meta-strip.stripprefix.prefixes=/v1/bridges/meta
      - traefik.http.routers.bridge-meta.middlewares=meta-strip,chain-synapse@file
      - traefik.http.routers.bridge-meta.service=meta-svc
      - traefik.http.services.meta-svc.loadbalancer.server.port=29319

  # -------------------------
  # BRIDGE: Discord
  # -------------------------
  mautrix-discord:
    image: dock.mau.dev/mautrix/discord:v0.7.6
    container_name: mautrix-discord
    restart: unless-stopped
    volumes:
      - /lab/cluster/home-1/matrix/bridges/discord:/data
    networks:
      - matrix-net
      - postgres
      - proxy
    deploy:
      resources:
        limits:
          memory: 600M 
    labels:
      - traefik.enable=true
      - traefik.http.routers.bridge-discord.entrypoints=websecure
      - traefik.http.routers.bridge-discord.rule=Host(`bridges.example.com`) && PathPrefix(`/v1/bridges/discord`)
      - traefik.http.routers.bridge-discord.tls=true
      - traefik.http.routers.bridge-discord.tls.certresolver=dns-cloudflare
      - traefik.http.middlewares.discord-strip.stripprefix.prefixes=/v1/bridges/discord
      - traefik.http.routers.bridge-discord.middlewares=discord-strip,chain-synapse@file
      - traefik.http.routers.bridge-discord.service=discord-svc
      - traefik.http.services.discord-svc.loadbalancer.server.port=29334

  # -------------------------
  # BRIDGE: Google Chat
  # -------------------------
  mautrix-googlechat:
    image: dock.mau.dev/mautrix/googlechat:latest
    container_name: mautrix-googlechat
    restart: unless-stopped
    volumes:
      - /lab/cluster/home-1/matrix/bridges/googlechat:/data
    networks:
      - matrix-net
      - postgres
      - proxy
    deploy:
      resources:
        limits:
          memory: 400M
    labels:
      - traefik.enable=true
      - traefik.http.routers.bridge-gchat.entrypoints=websecure
      - traefik.http.routers.bridge-gchat.rule=Host(`bridges.example.com`) && PathPrefix(`/v1/bridges/googlechat`)
      - traefik.http.routers.bridge-gchat.tls=true
      - traefik.http.routers.bridge-gchat.tls.certresolver=dns-cloudflare
      - traefik.http.middlewares.gchat-strip.stripprefix.prefixes=/v1/bridges/googlechat
      - traefik.http.routers.bridge-gchat.middlewares=gchat-strip,chain-synapse@file
      - traefik.http.routers.bridge-gchat.service=gchat-svc
      - traefik.http.services.gchat-svc.loadbalancer.server.port=29320

  # -------------------------
  # BRIDGE: Google Messages
  # -------------------------
  mautrix-gmessages:
    image: dock.mau.dev/mautrix/gmessages:latest
    container_name: mautrix-gmessages
    restart: unless-stopped
    volumes:
      - /lab/cluster/home-1/matrix/bridges/gmessages:/data
    networks:
      - matrix-net
      - postgres
      - proxy
    deploy:
      resources:
        limits:
          memory: 400M 
    labels:
      - traefik.enable=true
      - traefik.http.routers.bridge-gmsg.entrypoints=websecure
      - traefik.http.routers.bridge-gmsg.rule=Host(`bridges.example.com`) && PathPrefix(`/v1/bridges/gmessages`)
      - traefik.http.routers.bridge-gmsg.tls=true
      - traefik.http.routers.bridge-gmsg.tls.certresolver=dns-cloudflare
      - traefik.http.middlewares.gmsg-strip.stripprefix.prefixes=/v1/bridges/gmessages
      - traefik.http.routers.bridge-gmsg.middlewares=gmsg-strip,chain-synapse@file
      - traefik.http.routers.bridge-gmsg.service=gmsg-svc
      - traefik.http.services.gmsg-svc.loadbalancer.server.port=29336

  # -------------------------
  # BRIDGE: Twitter
  # -------------------------
  mautrix-twitter:
    image: dock.mau.dev/mautrix/twitter:latest
    container_name: mautrix-twitter
    restart: unless-stopped
    volumes:
      - /lab/cluster/home-1/matrix/bridges/twitter:/data
    networks:
      - matrix-net
      - postgres
      - proxy
    deploy:
      resources:
        limits:
          memory: 400M 
    labels:
      - traefik.enable=true
      - traefik.http.routers.bridge-twit.entrypoints=websecure
      - traefik.http.routers.bridge-twit.rule=Host(`bridges.example.com`) && PathPrefix(`/v1/bridges/twitter`)
      - traefik.http.routers.bridge-twit.tls=true
      - traefik.http.routers.bridge-twit.tls.certresolver=dns-cloudflare
      - traefik.http.middlewares.twit-strip.stripprefix.prefixes=/v1/bridges/twitter
      - traefik.http.routers.bridge-twit.middlewares=twit-strip,chain-synapse@file
      - traefik.http.routers.bridge-twit.service=twit-svc
      - traefik.http.services.twit-svc.loadbalancer.server.port=29327

  # -------------------------
  # BRIDGE: LinkedIn
  # -------------------------
  mautrix-linkedin:
    image: dock.mau.dev/mautrix/linkedin:latest
    container_name: mautrix-linkedin
    restart: unless-stopped
    volumes:
      - /lab/cluster/home-1/matrix/bridges/linkedin:/data
    networks:
      - matrix-net
      - postgres
      - proxy
    deploy:
      resources:
        limits:
          memory: 400M 
    labels:
      - traefik.enable=true
      - traefik.http.routers.bridge-li.entrypoints=websecure
      - traefik.http.routers.bridge-li.rule=Host(`bridges.example.com`) && PathPrefix(`/v1/bridges/linkedin`)
      - traefik.http.routers.bridge-li.tls=true
      - traefik.http.routers.bridge-li.tls.certresolver=dns-cloudflare
      - traefik.http.middlewares.li-strip.stripprefix.prefixes=/v1/bridges/linkedin
      - traefik.http.routers.bridge-li.middlewares=li-strip,chain-synapse@file
      - traefik.http.routers.bridge-li.service=li-svc
      - traefik.http.services.li-svc.loadbalancer.server.port=29341

  draupnir:
    container_name: draupnir
    volumes:
      - /lab/cluster/home-1/matrix/draupnir:/data
    image: gnuxie/draupnir:latest
    command: bot --draupnir-config /data/config/production.yaml
    networks:
      - matrix-net
      - postgres

networks:
  matrix-net:
  proxy:
    external: true
  postgres:
    external: true
  redis:
    external: true
```

## Traefik Config

Synapse and web-based clients (like my Finny) are incredibly picky about CORS and security headers. If you don't get these right, your client will just hang on "Connecting" forever. I use a file-based provider in Traefik to keep things clean.

### `/clstr/traefik/rules/chain-synapse.yml`

```json
http:
  middlewares:
    chain-synapse:
      chain:
        middlewares:
          - synapse-cors
          - middlewares-rate-limit
          - middlewares-secure-headers
```

### `/clstr/traefik/rules/synapse-cors.yml`

```json
http:
  middlewares:
    synapse-cors:
      headers:
        accessControlAllowOriginList:
          - "*"
        accessControlAllowMethods:
          - "GET", "POST", "PUT", "DELETE", "OPTIONS"
        accessControlAllowHeaders:
          - "*"
```

## Initial configuration

My setup follows the standard monoloth setup. This is because, when running on a Pi5, the extra RAM reuiqred for each worker, outweighs the performance gains.

### `/clstr/matrix/synapse/homeserver.yaml`

```jsx
# ----------------------------------------------------------------------
# SYNAPSE CONFIGURATION FOR EXAMPLE.COM
# ----------------------------------------------------------------------

# The domain part of your user IDs (e.g. @user:example.com)
server_name: "example.com"

# The public URL where clients/servers connect (Reverse Proxy URL)
public_baseurl: "https://matrix.example.com"

# Location of the PID file
pid_file: /data/homeserver.pid

suppress_key_server_warning: true

# ----------------------------------------------------------------------
# LISTENERS
# ----------------------------------------------------------------------
listeners:
  - port: 8008
    tls: false
    type: http
    x_forwarded: true # Trusts Nginx/Traefik headers
    bind_addresses: ['::', '0.0.0.0']
    resources:
      - names: [client,openid,static,federation,media]
        compress: false
  - port: 9093
    bind_address: '0.0.0.0'
    type: http
    resources:
     - names: [replication]

# ----------------------------------------------------------------------
# DATABASE (PostgreSQL)
# ----------------------------------------------------------------------
database:
  name: psycopg2
  args:
    user: synapse
    password: "REDACTED"
    database: synapse
    host: pgbouncer
    cp_min: 2
    cp_max: 5

# ----------------------------------------------------------------------
# AUTHENTICATION & LDAP
# ----------------------------------------------------------------------

matrix_authentication_service:
  enabled: true
  endpoint: http://matrix-authentication-service:8080/
  secret: "Nbal2MLkHK2wfd3WvHnqk0d4C1OhR56X"

# Disable open registration
enable_registration: false

experimental_features:
  # Enable MSC4108 (QR code login)
  msc4108_enabled: true

# ----------------------------------------------------------------------
# LOGGING & STATS
# ----------------------------------------------------------------------
report_stats: false

# ----------------------------------------------------------------------
# SECRETS (Preserved from your generated file)
# ----------------------------------------------------------------------
registration_shared_secret: "REDACTED"
macaroon_secret_key: "REDACTED"
form_secret: "REDACTED"
signing_key_path: "/data/vmd1.dev.signing.key"

# ----------------------------------------------------------------------
# FEDERATION
# ----------------------------------------------------------------------
trusted_key_servers:
  - server_name: "matrix.org"

# ----------------------------------------------------------------------
# MEDIA
# ----------------------------------------------------------------------
media_store_path: /data/media_store
max_upload_size: 104857600 # 100MB Limit
url_preview_enabled: true
url_preview_ip_range_blacklist:
  - '127.0.0.0/8'
  - '10.0.0.0/8'
  - '172.16.0.0/12'
  - '192.168.0.0/16'
  - '100.64.0.0/10'
  - '192.0.0.0/24'
  - '169.254.0.0/16'
  - '192.88.99.0/24'
  - '198.18.0.0/15'
  - '198.51.100.0/24'
  - '203.0.113.0/24'
  - '224.0.0.0/4'
  - '::1/128'
  - 'fe80::/10'
  - 'fc00::/7'
  - '2001:db8::/32'
  - 'ff00::/8'
  - 'fec0::/10'

# ----------------------------------------------------------------------
# EMAIL
# ----------------------------------------------------------------------

email:
  # The hostname of the outgoing SMTP server
  smtp_host: "mail-eu.smtp2go.com"

  # The port. Common ports: 587 (STARTTLS), 465 (Implicit TLS), or 25 (Plain)
  smtp_port: 587

  # Username and password for the SMTP server
  smtp_user: "REDACTED"
  smtp_pass: "REDACTED"

  # TLS/SSL Settings (See explanation below)
  # Use force_tls: true for port 465. Use require_transport_security: true for port 587.
  force_tls: false
  require_transport_security: true

  # The "From" address for emails sent by Synapse
  notif_from: "Synapse <REDACTED>"

  # Enable email notifications (missed messages, mentions, etc.)
  enable_notifs: true

  # Automatically subscribe new users to email notifications
  notif_for_new_users: true

  # Custom URL for client links (e.g., in password reset emails)
  # Set this to your Element/web client URL.
  client_base_url: "https://chat.example.com"

  # (Optional) Lifetime of the validation token
  validation_token_lifetime: 1h

# ----------------------------------------------------------------------
# BRIDGES (APP SERVICES)
# ----------------------------------------------------------------------
# UNCOMMENT these lines only AFTER you have generated the registration.yaml
# for the specific bridge and copied it into the synapse data folder.
# If you leave these uncommented but the files don't exist, Synapse will crash.

app_service_config_files:
  - /data/bridge-registrations/whatsapp-registration.yaml
  - /data/bridge-registrations/discord-registration.yaml
  - /data/bridge-registrations/meta-registration.yaml
  - /data/bridge-registrations/googlechat-registration.yaml
  - /data/double-puppet/doublepuppet.yaml
  - /data/bridge-registrations/gmessages-registration.yaml
  - /data/bridge-registrations/linkedin-registration.yaml
  - /data/bridge-registrations/twitter-registration.yaml

# ----------------------------------------------------------------------
# REDIS
# ----------------------------------------------------------------------
redis:
  enabled: true
  host: redis

# ----------------------------------------------------------------------
# PERFORMANCE
# ----------------------------------------------------------------------
caches:
   global_factor: 2.0

presence:
  enabled: false
```

You can generate the secret values by generating a config file using the Synapse docker image: 

```json
docker run -it --rm \
    --mount type=bind,src=$(pwd),dst=/data \
    -e SYNAPSE_SERVER_NAME=example.com \
    -e SYNAPSE_REPORT_STATS=yes \
    matrixdotorg/synapse:latest generate
```

## Matrix Authentication Service

MAS is the modern way to handle Matrix auth. In my cluster, MAS acts as an OIDC proxy that talks to **Authentik**. This means I have one single place to manage my users.

### `/clstr/matrix/mas/config.yaml`

You can generate the base of this with mas-cli config generate, but here is the redacted version of my production config. Make sure the matrix.secret matches the one in your `homeserver.yaml`.

```json
http:
  listeners:
  - name: web
    resources:
    - name: discovery
    - name: human
    - name: oauth
    - name: compat
    - name: graphql
    - name: assets
    - name: adminapi
    binds:
    - address: '[::]:8080'
  public_base: https://matrix.example.com/auth/

database:
  uri: postgres://synapse:REDACTED@pgbouncer/matrix_authentication_service?sslmode=disable

secrets:
  encryption: REDACTED_HEX_SECRET
  keys:
  - key: |
      -----BEGIN RSA PRIVATE KEY-----
      # Generate your own keys!
      -----END RSA PRIVATE KEY-----

matrix:
  kind: synapse
  homeserver: example.com
  secret: Nbal2MLkHK2wfd3WvHnqk0d4C1OhR56X
  endpoint: http://synapse:8008/

upstream_oauth2:
  providers:
    - id: 01HFRQFT5QFMJFGF01P7JAV2ME
      synapse_idp_id: oidc-authentik
      human_name: Authentik
      issuer: "https://authentik.example.com/application/o/synapse/"
      client_id: "REDACTED"
      client_secret: "REDACTED"
      scope: "openid profile email"
      claims_imports:
        localpart:
          action: require
          template: "{{ user.preferred_username }}"
```

> For the Authentik side of things, check out the [**MAS documentation**](https://element-hq.github.io/matrix-authentication-service/setup/sso.html#authentik) to set up your OAuth provider.
> 

## Bridge Config

As you can see in the syanpse’s `app_service_config_files` key, there are various bridges which have been connected to synapse. These config files need to be generated. I’m not going to rewrite the mautrix docs, so it’s best to just follow the documentation for each bridge when it comes to setting it up.

I would just like to draw attention to the following, however, as this is crucial to ensure optimal performance of ALL bridges:

### Double-puppeting

Instead of requiring everyone to manually enable double puppeting, you can give the bridge access to enable double puppeting automatically. This makes the process much smoother for users, and removes problems like access tokens getting invalidated.

Previously there were multiple different automatic double puppeting methods, but the older methods are deprecated and were completely removed in the megabridge rewrites. Only the new appservice method is now supported.

Automatic double puppeting should work on all homeserver implementations that support appservices. However, some servers don't follow the spec, and may not work with a null `url` field.

Using appservices means it requires administrator access to the homeserver, so it can't be used if your account is on someone elses server (e.g. using self-hosted bridges from matrix.org). In such cases, manual login is the only option.

This method also makes timestamp massaging work correctly and disables ratelimiting for double puppeted messages.

1. First create a new appservice registration file. The name doesn't really matter, but `doublepuppet.yaml` is a good choice. Don't touch the bridge's main registration file, and make sure the ID and as/hs tokens are different (having multiple appservices with the same ID or as_token isn't allowed).
    
    ```yaml
    
    # The ID doesn't really matter, put whatever you want.
    id: doublepuppet
    # The URL is intentionally left empty (null), as the homeserver shouldn't
    # push events anywhere for this extra appservice. If you use a
    # non-spec-compliant server, you may need to put some fake URL here.
    url:
    # Generate random strings for these three fields. Only the as_token really
    # matters, hs_token is never used because there's no url, and the default
    # user (sender_localpart) is never used either.
    as_token: random string
    hs_token: random string
    sender_localpart: random string
    # Bridges don't like ratelimiting. This should only apply when using the
    # as_token, normal user tokens will still be ratelimited.
    rate_limited: false
    namespaces:
      users:
      # Replace your\.domain with your server name (escape dots for regex)
      - regex: '@.*:your\.domain'
        # This must be false so the appservice doesn't take over all users completely.
        exclusive: false
    ```
    
2. Install the new registration file the usual way (see [Registering appservices](https://docs.mau.fi/bridges/general/registering-appservices.html)).
3. Finally set `as_token:$TOKEN` as the secret in `double_puppet` -> `secrets` (e.g. if you have `as_token: meow` in the registration, set `as_token:meow` in the bridge config).
    
    ```yaml
    
    double_puppet:
      ...
      secrets:
        your.domain: "as_token:meow"
      ...
    ```
    
    **N.B.** For old bridges, the map is `bridge` -> `login_shared_secret_map`.
    

If you set up double puppeting for multiple bridges, you can safely reuse the same registration by just setting the same token in the config of each bridge (i.e. no need to create a new double puppeting registration for each bridge).

This method works for other homeservers too, you just have to create a new registration file for each server, add the token to `secrets`, and also add the server address to the `servers` map (for the bridge server, adding to the server map is not necessary as it defaults to using the one configured in `homeserver` -> `address`).

## Bridge Setup

Follow the steps [here](https://docs.mau.fi/bridges/general/docker-setup.html) to do so. All bridges are run in docker, for convenience and security.

### Setup Summary

**Generate config**

```json
docker run -it --rm \
    -v $(pwd):/data:z \
    dock.mau.dev/mautrix/whatsapp:latest
```

*Edit the default config file to add your database, synapse and bridge config.*

**Generate Registration file**

```json
docker run -it --rm -v $(pwd):/data:z dock.mau.dev/mautrix/whatsapp:latest -g
```

*Add to synapse in the* `app_service_config_files` key

## Prepping the database

On the assumption that you are using a PostgreSQL DB, you need to configure a user, and database for each and every one of the bridges and synapse itself. Synapse requires the Database to be in the ‘C’ locale, so see below how to do:

```bash
createuser --pwprompt synapse
createdb --encoding=UTF8 --locale=C --template=template0 --owner=synapse synapse
```

Repeat for each bridge, to create users, and their corresponding databases. 

## .well-known delegation

To setup federation, you need to setup .well-known delegation. To do this, serve a json file at `DOMAIN/.well-known/matrix/server`

This should be in the following format:

```json
{
  "m.server": "federation.example.com:443"
}
```

Another useful one to configure is the client delegation, which allows clients to automatically discover your matrix server. 

Serve a file at `DOMAIN/.well-known/matrix/client` , with the following format:

```json
{
  "m.homeserver": {
    "base_url": "https://matrix.example.com"
  }
}
```

## Start-up

Now, start your Synapse instance with everything configured, and boom, you have a functioning Synapse instance.

## The client

To match Beeper’s aesthetic, and UI-driven bridge management, I use my own custom client called Finny, a fork of Cinny. The desktop app is a WIP, but the [web app is deployed on my infrastructure](https://finny.vmd1.dev/).

## Final Thoughts

<aside>
💡

Since MAS is linked to Authentik, you simply need to create your user in Authentik first, then log in via Finny

</aside>

Overall, this is a pretty cool system, allowing you to see all your chats in one place, and have your own matrix server, ensuring your privacy and control of your own data.