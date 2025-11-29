---
date: '2025-10-05T17:08:34Z'
draft: false
title: 'Self Hosted Link-in-Bio Solution'
tags:
- Lab
- Guide
- Services
---
It’s nice to keep a link in my Instagram bio that links to some of the stuff I work on, just in case anyone wanted to take a look. Previously, I’d just include a link to my GitHub, but recently, with my new website and this blog, I’d like other things to be accessible there. In this case you’d normally use a cloud-hosted link in bio solution, of which there are many of. But what’s the fun in that? How about we self-host one instead.

> Enter: Linkstack - a highly customizable link sharing platform with an intuitive, easy to use user interface.

Linkstack is one of many self-hosted alternatives to Linktree, and I picked for it’s ease of setup and management. It’s pretty easy to get spun up, all you need is Docker and a domain you wish to use, in my case `l.example.com` .

## Self-hosting

Spinning up Linkstack is pretty simple, you just need Docker installed:

```yaml
services:
  linkstack:
    hostname: linkstack
    image: linkstackorg/linkstack:latest
    environment:
      TZ: Europe/London
      SERVER_ADMIN: serveradmin@example.com
      HTTP_SERVER_NAME: l.example.com
      HTTPS_SERVER_NAME: l.example.com
      LOG_LEVEL: info
      PHP_MEMORY_LIMIT: 256M
      UPLOAD_MAX_FILESIZE: 8M
    volumes:
      - /lcl/linkstack:/htdocs
    restart: unless-stopped
    networks:
      - proxy
    labels:
      - "traefik.enable=true"
      # HTTP Routers
      - "traefik.http.routers.l-rtr.entrypoints=websecure"
      - "traefik.http.routers.l-rtr.rule=Host(`l.example.com`)"
      - "traefik.http.routers.l-rtr.tls=true"
      - "traefik.http.routers.l-rtr.tls.certresolver=cloudflare"
      # Middlewares
      - "traefik.http.routers.l-rtr.middlewares=chain-no-auth@file"
      # HTTP Services
      - "traefik.http.routers.l-rtr.service=l-svc"
      - "traefik.http.services.l-svc.loadbalancer.server.port=80"

networks:
  proxy:
    external: true
```

Just before we spin it up, however, we need to download the latest version of linkstack from [the releases page](https://github.com/LinkStackOrg/LinkStack/releases/), and extract into `/lcl/linkstack` or wherever else your linkstack data dir is.

```bash
curl LINKSTACKURL -o linkstack.zip
unzip ./linkstack.zip -d /lcl/linkstack
```

And then… start it.

```bash
docker compose up -d
```

Once you’ve got it running, setting up Linkstack is relatively easy, you just following the steps on the UI. I set my Linkstack instance’s homepage to automatically redirect to my Linkstack page, and disabled signups so that no one else could use it.