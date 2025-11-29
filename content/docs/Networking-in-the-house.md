---
date: '2025-05-24T08:00:00Z'
draft: false
title: 'Networking in the House'
tags:
- Lab
- Networking
---
Let me just start by saying that I do not need any of this, it is more-or-less just because I can, and want to.

## Internet

We have a gigabit fibre connection running into our house. I’d love to have multiple WAN for failover, but frankly, it’s not worth it, as we have high enough uptime with our current ISP alone.

## Internal network

From there, it heads into our ISP modem, then ISP router, and then straight into our main 8-port switch. This, then connects to out PoE switch, which powers our two Unifi U7 Pro access points (that’s what the Unifi Controller is for). There are also 3 cables that then come out of the 8-port switch. Two for the Raspberry Pis, and one for my laptop. This allows all the server nodes to have the fastest possible internet connection they can have. 

## WiFi

However, WiFi is used significantly more, with a much wider variety of devices, so adapting it for the house required some more though.

### Hardware

Firstly, our APs have WIFI 7 support, allowing us to reach gigabit speeds over the air from compatible devices, allowing near wired-like performance. They also have a huge capacity - which we will likely never reach, and this means it handles the ~70 ish devices on the network pretty easily.

We picked the Unifi U7 Pro for two main reasons. 

1. It has WiFi 7 support, at a fraction of the price of other offerings (see Eero, TP-Link, etc.)
2. As it is intended for small business customers, it offers a level of customisation that a lot of other offerings just can’t match

We also did trial previous TP-link mesh offerings (Deco M4 (2), Deco M5 (3)), and while they were able to do 100mbps, (or 400 with a wired backhaul), they just weren’t up to the mark.

### Networks

We have three WiFi networks, one of which is hidden. We have a main network (2.4, 5 and 6GHz); a guest network (2.4 and 5GHz) (this has all forms of inter-device communication blocked, with only access to the internet, and our DNS servers allowed and an IoT network (2.4Ghz only). This allows for segregation and for best compatibility with devices.

## DNS & DHCP

Obviously, we’ve already turned off the DNS and DHCP on the ISP-provided router, so all it does now is routing and be our gateway. 

### DNS

We have the Technitium DNS server running, on ultimate and ultimate-rpi3, providing redundancy in case one node goes down. They have a Keepalived IP address that points to the currently healthy node. This ensures that there is always a DNS server running at `192.168.1.3` . (As of now, I am still on the ISP’s default subnet, but in the future I plan to migrate to some subnet in the `10.0.0.0/8` subnet. That will be a long and interesting move, so stay tuned to see what happened)

### DHCP

We are running kea dhcp (successor to isc dhcp server) on ultimate and ultimate-rpi3, again providing redundancy in case we lose one node. We have just the dhcp4 server running, as I do not see a need for dhcp6, and its not particularly simple to setup. We use the Kea dhcp ddns server to send ddns updates to technitium for hostnames. This allows local hostnames to resolve on our network.

It’s a bit of a complicated setup, but it does offer a huge level of customization and control over the home network. I’d say it’s actually pretty useful too, not just something that I’ve done for the sake of it.