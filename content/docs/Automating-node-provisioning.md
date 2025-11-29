---
date: '2025-06-08T10:00:00Z'
draft: false
title: 'Automating Node Provisioning'
tags:
- Lab
---
I’m planning to possibly add a Raspberry Pi 2 (Old, I know, but it does the job) to my lab, for providing some key network services. It will be dedicated to this, reducing the risk of another service breaking and bringing down both the lab, and the network. I thought it might be worth scripting the setup process, as it’s a pretty repetitive process.

## What does each node need?

- It must be a part of the tailnet
- It must have docker installed on it
- It must have access to the /ultmt folder, whether its via a CIFS mount, or using glusterfs-client
- It must use the LLDAP server for centralised authentication
- It must have the main 5 nodes in its hosts file, in case DNS fails
- It must have certain tools/packages installed

I want it to be very general, in the sense that I can use it for things other then just the nodes of the server, say if I want one specific computer to authenticate against my LLDAP server.

## Final Script

Here it is:

https://github.com/vmd1/node-provision/blob/main/provision.sh