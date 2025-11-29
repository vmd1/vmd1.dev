---
date: '2025-10-08T12:09:13Z'
draft: false
title: 'Notifications, Notifications… and More Notifications'
tags:
- Lab
- Guide
- Services
---
Staying updated when it comes to any part of your life is always crucial, but even more so when it comes to your homelab. That’s why I decided to try and find a more lightweight and faster solution, then my current clunky SMTP setup, which tended to end up with me getting huge volumes of email every time something went down. 

> Enter [ntfy.sh](http://ntfy.sh) - a simple notification system powered by HTTP Requests and topics
> 

## Hosting

Ntfy has a cloud-hosted option, hosted at [ntfy.sh](http://ntfy.sh), however there’s no fun in that, so let’s get into how to self-host it, using Docker.

```yaml
services:
  ntfy:
    image: binwiederhier/ntfy
    container_name: ntfy
    command:
      - serve
    environment:
      - TZ=UTC    # optional: set desired timezone
    volumes:
      - /srv/ntfy/cache:/var/cache/ntfy
      - /srv/ntfy/lib:/var/lib/ntfy
      - /srv/ntfy/config:/etc/ntfy
    networks:
        - proxy
    restart: unless-stopped
    
networks:
    proxy:
        external: true
```

Here’s an example config file at `/srv/ntfy/config/server.yml`  - see the docs [here](https://docs.ntfy.sh/config/):

```yaml
base-url: "https://ntfy.example.com"
listen-http: ":2586"
cache-file: "/var/cache/ntfy/cache.db"
behind-proxy: true
attachment-cache-dir: "/var/cache/ntfy/attachments"
smtp-sender-addr: "mail.example.com:587"
smtp-sender-user: "smtp-user"
smtp-sender-pass: "smtp-pass"
smtp-sender-from: "ntfy@noreply.example.com"
keepalive-interval: "45s"
auth-file: "/var/lib/ntfy/user.db"
auth-default-access: "deny-all"
auth-users:
  - "USERNAME:PASSWORD_HASH:ROLE"
auth-access:
  - "USERNAME:CHANNEL:PERM"
web-push-public-key: WEB_PUSH_PUB_KEY
web-push-private-key: WEB_PUSH_PRIV_KEY
web-push-file: /var/cache/ntfy/webpush.db # or similar
web-push-email-address: WEB_PUSH_MAIL
```

Let’s break this down.

### Config

1. **Server Basics**

```yaml
base-url: "https://ntfy.example.com"
listen-http: ":2586"
```

- **base-url** → The URL your server will be accessible at (must match DNS + TLS config if using HTTPS).
- **listen-http** → The port ntfy listens on. Default is `:80` but here it’s explicitly set to `2586`.

2. **Caching & Attachments**

```yaml
cache-file: "/var/cache/ntfy/cache.db"
attachment-cache-dir: "/var/cache/ntfy/attachments"
```

- **cache-file** → SQLite DB file used to persist subscriptions, message cache, etc.
- **attachment-cache-dir** → Directory where uploaded files are temporarily stored (if you allow attachments).

3. **Reverse Proxy / Load Balancer**

```yaml
behind-proxy: true
```

- Set this to `true` if you’re running behind Nginx, Caddy, or Traefik.
- Ensures client IPs and headers are handled correctly.

4. **SMTP for Email Notifications**

```yaml
smtp-sender-addr: "mail.example.com:587"
smtp-sender-user: "smtp-user"
smtp-sender-pass: "smtp-pass"
smtp-sender-from: "ntfy@noreply.example.com"
```

- Lets ntfy send email notifications (for example, when a push arrives and the user requested an email).
- Replace with your SMTP server details.

5. **Keepalive**

```yaml
keepalive-interval: "45s"
```

- Interval between server pings to keep client connections alive.
- Default is usually fine, but you can tweak depending on load balancer timeouts.

6. **Authentication**

```yaml
auth-file: "/var/lib/ntfy/user.db"
auth-default-access: "deny-all"
auth-users:
  - "USERNAME:PASSWORD_HASH:ROLE"
auth-access:
  - "USERNAME:CHANNEL:PERM"
```

- **auth-file** → Path to the SQLite DB file for authentication.
- **auth-default-access** → Default permission for unauthenticated users. `deny-all` means they must log in.
- **auth-users** → Add users with a bcrypt-hashed password (You can create a password hash [here](https://bcrypt-generator.com/)) and role (`user` or `admin`).
- **auth-access** → Fine-grained access control. Example:
    
    ```yaml
    auth-access:
      - "alice:alerts:rw"
      - "bob:alart:ro"
    ```
    
    This means `alice` can fully use the `alerts` topic, while `bob` can only subscribe (read).
    

7. **Web Push**

```yaml
web-push-public-key: WEB_PUSH_PUB_KEY
web-push-private-key: WEB_PUSH_PRIV_KEY
web-push-file: /var/cache/ntfy/webpush.db
web-push-email-address: WEB_PUSH_MAIL

```

- Enables **browser push notifications** using the Web Push protocol.
- You’ll need to generate VAPID keys
    - Open a shell in the container: `docker exec -ti ntfy bash`
    - Run the following command to generate a config: `ntfy webpush keys`
- **web-push-file** stores the subscription database.
- **web-push-email-address** → Contact email for push service.

### Start the container

```bash
docker compose up -d
```

And, you’re up and running.

## Integrations

### SSH Login

When a login occurs to your server over SSH, a script can be used to send a notification to ntfy, allowing you to know that this happened. This is relatively simple - all you need to do is add a few lines to your PAM config, and create a script.

Here’s an example script (which we’ll assume is at `/scripts/ntfy-ssh.sh`):

```bash
#!/bin/bash
machine_name=$(uname -n)

if [ "${PAM_TYPE}" = "open_session" ]; then
  curl \
    -H "X-Tags: warning,ssh" \
    -d "[${machine_name}] SSH login: ${PAM_USER} from ${PAM_RHOST}" \
    https://ntfy.example.com/ssh-logins
fi
```

And then, edit and append the following to your PAM SSH config:

```bash
sudo nano /etc/pam.d/sshd
```

```bash
session optional pam_exec.so /scripts/ntfy-ssh.sh
```

### Home Assistant

Connecting ntfy to HA is pretty easy as well, all you need to do is add the integration. Once you do so, you can call the service `notify.notify` with ntfy notification entity as the `entity_id` , as well as any title/message.

### Uptime Kuma Alerts

Similar to HA, Uptime Kuma has built in support for ntfy.sh, you just have to go to setting > notifications, and add a provider powered by ntfy.sh. Enter your server URL and any other relevant info, and you should now be able to add it to monitors.

Ntfy really is quite a nifty little tool, helping keep you updated about things going on, yet remaining pretty lightweight.