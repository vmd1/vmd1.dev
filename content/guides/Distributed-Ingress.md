---
date: '2025-03-17T12:00:32Z'
draft: false
title: 'Distributed Ingress'
tags:
- Lab
- Networking
- Guides
---
A homelab is great and all, until something takes out your internet, or power, or anything else that it depends on. As well as this, there’s quite high latency when trying to access it from another country - as the data has to travel all the way home, but in this case it’ll join Oracle’s much faster backbone.

> To solve this, I’m going to be using distributed architecture, with Traefik and Tailscale at it’s core
> 

In order to do this, you’re gonna first need to have Traefik and Tailscale setup. For Traefik I would suggest [this guide.](https://www.simplehomelab.com/udms-18-traefik-docker-compose-guide/) 

Once you’ve done so, you’re gonna need some ingress nodes. I chose to use the E2.1 Micro VMs on Oracle Cloud’s Free Tier, as they are free and quite generous.

## Routing the `proxy` network into the tailnet

Run the following script, changing the IP range to ensure it does not conflict with any other subnets or networks on other hosts in the tailnet.

```bash
#!/bin/bash

# --- Configuration ---
# Set your desired subnet here
PROXY_SUBNET="10.20.0.0/16" # TODO
NETWORK_NAME="proxy"

# --- 1. Enable IP Forwarding ---
# This is a requirement for Tailscale subnet routing to work.
echo "Enabling IP forwarding..."
echo 'net.ipv4.ip_forward = 1' | sudo tee -a /etc/sysctl.d/99-tailscale.conf
echo 'net.ipv6.conf.all.forwarding = 1' | sudo tee -a /etc/sysctl.d/99-tailscale.conf
sudo sysctl -p /etc/sysctl.d/99-tailscale.conf

# --- 2. Create Docker Network ---
# Check if the network already exists to avoid errors
if [ "$(docker network ls | grep -w $NETWORK_NAME)" ]; then
    echo "Docker network '$NETWORK_NAME' already exists. Skipping creation."
else
    echo "Creating Docker network '$NETWORK_NAME' with subnet $PROXY_SUBNET..."
    sudo docker network create \
      --driver bridge \
      --subnet "$PROXY_SUBNET" \
      "$NETWORK_NAME"
fi

# --- 3. Advertise Route via Tailscale ---
echo "Advertising $PROXY_SUBNET via Tailscale..."
# Note: This command replaces currently advertised routes. 
# If you have existing routes, append them here (e.g., --advertise-routes=10.0.0.0/24,$PROXY_SUBNET)
sudo tailscale set --advertise-routes="$PROXY_SUBNET"
sudo tailscale up

echo "--------------------------------------------------------"
echo "Done!"
echo "1. Verify the network: docker network inspect $NETWORK_NAME"
echo "2. IMPORTANT: You must manually approve this route in the"
echo "   Tailscale Admin Console (Machines -> [This Machine] -> Edit Route Settings)"
echo "   unless you have auto-approvers enabled."
echo "--------------------------------------------------------"
```

After this, there will now be a network `proxy`, accessible via your tailnet, and other nodes on it. I would suggest tagging your servers and using ACLs to ensure only authorized nodes can directly access the container.

**Note:** In some cases, Docker may not know how to route the traffic back to the node which requested it, so the following script needs to be run on the same node:

```bash
sudo iptables -t raw -I PREROUTING -i tailscale0 -j ACCEPT
sudo iptables -I DOCKER-USER -i tailscale0 -j ACCEPT
sudo iptables -I DOCKER-USER -o tailscale0 -j ACCEPT
sudo iptables -t nat -I POSTROUTING -s 100.64.0.0/10 -j MASQUERADE
sudo netfilter-persistent save
```

## Setting up Traefik-Kop

This assumes you already have Redis setup in the architecture you wish - ideally a Redis sentinel or other alternative. You need one instance of traefik-kop on all nodes running services. The docker socket has been exposed to the container, in RO mode, to prevent malicious use. You can also use a docker socket proxy if you want.

```bash
services:
  traefik-kop:
    image: ghcr.io/jittering/traefik-kop:latest
    container_name: traefik-kop
    restart: unless-stopped
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock:ro
    environment:
      REDIS_ADDR: "redis:6379" # TODO
      TRAEFIK_REDIS_ROOT_KEY: traefik
      SKIP_REPLACE: 1
      KOP_HOSTNAME: "node-1"
      DOCKER_CONFIG: |
        ---
          docker:
            network: proxy
            exposedByDefault: false

```

You need to change the `REDIS_ADDR` env variable to your Redis instance.

## Configuring Traefik

You must use a DNS-01 challenge, not a HTTP challenge provider, as  the HTTP challenge will not work in this situation.

### ForwardAuth

If you have any ForwardAuth entries, or anything similar, docker’s native DNS resolution will not function. This means you need to set a static IP for that container and specify the specific IP for that.

For example,

```yaml
http:
  middlewares:
  # https://github.com/goauthentik/authentik/issues/2366
    middlewares-authentik:
      forwardAuth:
        address: "http://10.20.12.1:9000/outpost.goauthentik.io/auth/traefik" # Static IP used
        trustForwardHeader: true
        authResponseHeaders:
          - X-authentik-username
          - X-authentik-groups
          - X-authentik-email
          - X-authentik-name
          - X-authentik-uid
          - X-authentik-jwt
          - X-authentik-meta-jwks
          - X-authentik-meta-outpost
          - X-authentik-meta-provider
          - X-authentik-meta-app
          - X-authentik-meta-version
```

And, how to set it in Docker Compose…

```yaml
    networks:
      proxy:
        ipv4_address: 10.20.12.1
```

### Synchronising Config

I chose to use SyncThing to synchronise my config files across all nodes. This had all the benefits of replication, while removing the overhead and low latency required for synchronous replication.

**`compose.yaml`** 

```yaml
services:
  syncthing:
    image: lscr.io/linuxserver/syncthing:latest
    container_name: syncthing
    hostname: node-1 # The name that will appear in the Syncthing UI
    environment:
      - PUID=0 # Run 'id -u' on your host to get this
      - PGID=0 # Run 'id -g' on your host to get this
      - TZ=Etc/UTC
    volumes:
      - /lab/nodes/ultimate/syncthing:/config
      - /lab:/lab
    ports:
      - 8384:8384     # Web GUI
      - 22000:22000/tcp # File transfer (TCP)
      - 22000:22000/udp # File transfer (QUIC)
      - 21027:21027/udp # Local discovery
    restart: unless-stopped
```

Head to the WebUI at `https://SERVER_IP:8384`  and configure syncthing to synchronise the neccessary folders between all nodes.

### Redis Provider

You now need to configure Traefik to use the Redis provider, outlined in the Traefik docs [here](https://doc.traefik.io/traefik/reference/install-configuration/providers/kv/redis/).

## Traefik Start-up

You should now be able to start up Traefik, on all ingress nodes, with the Redis provider configured. 

## DNS Configuration

For now, I’m using Round-Robin DNS, by just specifying multiple A records with the IP of each VPS. However, in the future, I plan to move towards using Geo-Based DNS and automatic failover of unhealthy nodes. 

## Final Thoughts

Overall, this works quite well, but stay tuned to see how to self-host nameservers with PowerDNS for Geo Scaling and Redundancy.