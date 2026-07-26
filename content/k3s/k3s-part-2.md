---
date: 2026-07-14T00:00:00Z
draft: true
title: 2. Optimising routing to cluster services
tags:
---
Now that I had a basic cluster, it was time to improve external access. Right now, I just had static A records pointing to a couple nodes. However, this had absolutely no redundancy, as it was up to the client which node to use. As well as this, internal service routing was just being handled by Traefik's Round Robin routing, meaning it was being sent to a random server, which could be in a different continent, drastically increasing response time!

To solve this, I will be using two mechanisms:
- GeoDNS
- Zone-based routing in kubernetes

