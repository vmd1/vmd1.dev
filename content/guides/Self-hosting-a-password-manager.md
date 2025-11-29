---
date: '2025-06-26T16:15:24Z'
draft: false
title: 'Self-hosting a Password Manager'
tags:
- Lab
- Services
- Guide
---
Passwords are one of the most important aspects of our digital lives nowadays, making the password manager of your choice one of the most important tools you use. I was using Bitwarden, until I decided that I’m gonna take a little risk and self-host my password manager.

> Enter: Vaultwarden - an unofficial rewrite of the Bitwarden server. 

## Brief Introductions

For the uninitiated, Bitwarden is an incredibly powerful password manager, with many feature, and a pretty intuitive UI. However, a few of it’s major painpoints revolved around a few of it’s features being locked behind a paywall. It’s not that I needed those features, they were just a nice to have - take organisations for an example. I like to follow a similar idea to Zero-Trust Architectures, in which all devices only are able to access the resources they need. One way I could achieve this with Bitwarden is having all my Personal devices use one account, and all my School devices use another.

## Let’s get started

Similar to most self-hosted services, Vaultwarden has a docker container that just needs to be spun up to start working with it. This was my compose file:

```yaml
name: vaultwarden
services:
  server:
    container_name: vaultwarden
    environment:
      - DOMAIN=https://vault.example.com
      - ADMIN_TOKEN=SomeRandomLongStringOfCharacters
    volumes:
      - /clstr/vw-data/:/data/
    restart: unless-stopped
    image: vaultwarden/server:latest
    networks:
      - proxy

networks:
  proxy:
    external: true
```

And all I had to do was add an entry in Nginx Proxy Manager - and done.

## Setup

Setup was pretty simple, just create an account at the DOMAIN you set it up at, and boom, its ready. I’d suggest diving into the admin panel at https://vault.example.com/admin and turning off signups, as well as setting up SMTP for emails.

## Final Thoughts

Overall, Vaultwarden is a pretty solid alternative to Bitwarden if you’re into self-hosting. As well as providing control over all my data, it allows me to use some paid features while maintaining a near identical experience.