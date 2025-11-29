---
date: '2025-07-19T18:00:00Z'
draft: false
title: 'Un(Installing) Docker'
Labs:
- Lab
- Guide
---
**Docker** is one the most critical parts of my homelab, allowing services to run in their own containers, with access to the files and resources that they only need. As well as this, it also means that if one service goes down (as long as nothing else depends on it) it doesn't bring down everything with it.

## Installing Docker

Installing docker is pretty simple - they even provide a script to do so:

```bash
 $ curl -fsSL https://get.docker.com -o get-docker.sh
 $ sudo sh get-docker.sh
```

As with all scripts from the internet, you should always read it to ensure you aren’t about to execute a script that will install something unwanted on your device.

## Uninstalling Docker

In the event that your Docker install breaks - which can happen for a variety of reasons - you may need to reinstall docker. In order to do so, first uninstall docker.

This varies from OS to OS, but here are the steps for Ubuntu:

### Uninstall the Docker Engine, CLI, containerd, and Docker Compose packages:

```bash
sudo apt-get purge docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin docker-ce-rootless-extras
```

Images, containers, volumes, or custom configuration files on your host aren't automatically removed. 

### To delete all images, containers, and volumes:

```bash
sudo rm -rf /var/lib/docker
sudo rm -rf /var/lib/containerd
```

### Remove source list and keyrings

```bash
sudo rm /etc/apt/sources.list.d/docker.list
sudo rm /etc/apt/keyrings/docker.asc
```

You have to delete any edited configuration files manually.

You can find steps specific to your OS at: https://docs.docker.com/engine/install/