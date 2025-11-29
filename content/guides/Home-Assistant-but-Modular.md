---
date: '2025-07-21T15:00:00Z'
draft: false
title: 'Home Assistant... But Modular'
tags:
- Lab
- Guide
- Services
---
Modularity always helps when it comes to the maintenance of complex systems, and so it should help when it comes to managing Home Assistant. A while back, I stumbled across Frenck’s GitHub profile, where he was showcasing his Home Assistant config - https://github.com/frenck/home-assistant-config. I found the idea of splitting each entry into it’s own dedicated file, rather then having one huge config file, much more intuitive and easier to manage.

## Setup

### **Navigate to your data folder**

```bash
03:43:35 vivaan@ultimate ~ → cd /clstr/homeassistant/data
```

### **Create a new `integrations` folder**

This will be where all the entries for Home Assistant’s config will be stored.

```bash
03:55:50 vivaan@ultimate data → mkdir integrations
03:56:53 vivaan@ultimate data → ls integrations/
03:57:02 vivaan@ultimate data →
```

### **Configure `configuration.yaml` to look in the `integrations` folder**

Add the following to the bottom of your configuration file:

```yaml
homeassistant:
  packages: !include_dir_named integrations
```

### **Restart Home Assistant**

![image.png](https://cdn.848226.xyz/v1/blog/media/posts/A-modular-structure-in-Home-Assistant/ha-restart.png)

## Examples

Say if you want to move your `default_config` section to this new modular structure:

- First, create a file named `default_config.yaml`
- Add the following
    
    ```yaml
    default_config:
    ```
    
- and remove that line from `configuration.yaml`

## Notes

- Make sure you don’t have any duplicate keys in your `configuration.yaml` file - i.e. you should only have **one** `homeassistant:`
- Home Assistant should validate the configuration before restarting, so as long as it pass that check you should be good to go

## Final Thoughts

Overall, the introduction of a modular structure should make it easier to maintain and change things, as it’ll be pretty simple to work out the location of where something is. As well as this, it should mean that your `configuration.yaml` file remains pretty small and readable.