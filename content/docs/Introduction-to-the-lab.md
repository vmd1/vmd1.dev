---
date: '2025-05-21T08:54:00Z'
draft: false
title: 'Introduction to the lab'
tags:
- Lab
- Welcome
---
## Nodes

Let’s take a look into what the ‘(home)lab’ (that’s quite a generous word) consists of…

- 1 Raspberry Pi 5
- 1 Raspberry Pi 3
- 2 Oracle cloud free-tier VMs
- My other laptop, which adds some power to the ‘cluster’ when I’m not using it

![Node List](https://cdn.848226.xyz/v1/blog/media/posts/Introduction-to-the-lab/nodes.png)

So in the grand scheme of things, it’s not that powerful. But that also adds to the challenge, as things might need some tweaking to get working. Of course, this comes with the caveat of wanting to drop-kick my laptop out of the windows when things don’t work, but it’s all part of the fun…, right?

## Orchestration

I’m currently using just plain old docker compose for container orchestration, and a few external drives for data storage, but I plan to migrate to docker swarm (or perhaps Kubernetes), with glusterfs (again) or something similar as a storage layer. 

## Networking

### On-site

The Pis and my laptop are connected via ‘Gigabit ethernet links,’ or so to speak. The Pi 3’s ethernet port is connected via Usb 2, which means it’s limited to 300 megabits/s or about 30MB/s. Frankly speaking, that’s enough for most tasks that it has to do, but it would be better if it was faster. 

### Tailscale

Tailscale (which I haven’t got to self hosting yet) is more-or-less the backbone of the lab, handling communication between servers that aren't physically together. It also allows me to use ACL rules to control remote access and use the nodes as VPN servers with Tailscale’s exit nodes. 

## Authentication

I love the idea of centralised authentication, where you have one set of logins for anything that you wish to access. Obviously, this creates a central dependency, which means that your authentication provider **must** stay up, otherwise everything else is pointless. I’m currently using LLDAP, which just happens to be deployed as a stack in the docker swarm to ensure it remains up. I’m planning on soon moving it to having multiple replicas, and using a Postgres backend for better resiliency, so stay tuned for that

## Storage

I was initially running a basic glusterfs pool, with **two nodes**, for the purpose of only storing applications specific data. As the Raspberry Pi 3 isn’t very powerful, and there’s no guarantee of my laptop being there, only critical services were set to fail over, and this was triggered very rarely anyways, as the Raspberry Pi 5’s setup proved very stable. As a result, I moved back to just storing data locally on nodes, with one way sync using rsync to the Raspberry Pi 3. My laptop would access the data over a SMB mount, which was pretty fast. There’s a total storage capacity of about ~3TB, which I am currently using as a NAS, and for Immich to store it’s photos. 

## Services

### Applications

- 2FAuth
- Authelia
- Element
- Kasm
- Home Assistant
- Homepage
- Immich
- Jellyfin
- Stalwart → not completely setup yet, so stay tuned for that too
- Synapse
- Openwebui
- Uptime Kuma
- Crafty
- ip.me
- NGINX Proxy Manager
- Speedtest

### Administration

- Beszel
- Unifi

### Services

- DNS (Technitium)
- DHCP (Kea)
- Home Assistant Matter Server + Bridge
- MQTT
- Redis
- Ring - MQTT
- WG-Easy (as a backup for tailscale)
- Tailscale

Stay tuned for anymore updates - hope to see you again,  
Vivaan