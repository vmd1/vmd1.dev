---
date: '2025-07-23T14:30:00Z'
draft: false
title: 'Some Notes on the UniFi APs'
tags:
- Lab
- Networking
---
I recently learnt that you can control the UniFi APs LEDs via SSH, which allows you to script their control. This means that I can change what colour they are using, and schedule them to turn on and off automatically - see [here](https://init0.848226.xyz/guides/controlling-my-unifi-ap-leds-via-home-assistant/) for that. However, I though it might be worth making a small post regarding exactly what I found.

> DISCLAIMER: Proceed at your own risk. These have been tested on a U7 Pro, and are unlikely to have any catastrophic problems on other APs, but be careful regardless.

You’ll need SSH setup to do any of this first, so lets do that first.

## SSH Setup

As we aren’t scripting anything, we can use password authentication. In order to set this up, follow the below steps:

**Navigate to ‘UniFi Devices’**

![image.png](https://cdn.848226.xyz/v1/blog/media/posts/Controlling-my-UniFi-AP-Leds-via-Home-Assistant/unifi-devices.png)

**Click ‘Device Updates and Settings’ in the top left corner**

![image.png](https://cdn.848226.xyz/v1/blog/media/posts/Controlling-my-UniFi-AP-Leds-via-Home-Assistant/unifi-settings.png)

**This will open a menu. Scroll to the bottom to find the SSH section:**

![image.png](https://cdn.848226.xyz/v1/blog/media/posts/Controlling-my-UniFi-AP-Leds-via-Home-Assistant/ssh-settings.png)

Set the username and password to something of your choice.

Now we’ll connect to the APs.

## SSHing to the APs

Use the command - `ssh YOUR_USERNAME@AP_IP` - to connect:

```
 15:24:07  vivaan@Vivaans-PC  ~ ➜  ssh YOUR_USERNAME@AP_IP
The authenticity of host 'AP_IP (AP_IP)' can't be established.
RSA key fingerprint is SHA256:#############################.
This key is not known by any other names.
Are you sure you want to continue connecting (yes/no/[fingerprint])? yes
Warning: Permanently added 'AP_IP' (RSA) to the list of known hosts.

********************************* NOTICE **********************************
* By logging in to, accessing, or using any Ubiquiti product, you are     *
* signifying that you have read our Terms of Service (ToS) and End User   *
* License Agreement (EULA), understand their terms, and agree to be       *
* fully bound to them. The use of SSH (Secure Shell) can potentially      *
* harm Ubiquiti devices and result in lost access to them and their data. *
* By proceeding, you acknowledge that the use of SSH to modify device(s)  *
* outside of their normal operational scope, or in any manner             *
* inconsistent with the ToS or EULA, will permanently and irrevocably     *
* void any applicable warranty.                                           *
***************************************************************************

  ___ ___      .__________.__
 |   |   |____ |__\_  ____/__|   PRODUCT: U7-Pro
 |   |   /    \|  ||  __) |  |   MAC:     ##:##:##:##:##:##
 |   |  |   |  \  ||  \   |  |   VERSION: 8.0.49+16814.250620.0939
 |______|___|  /__||__/   |__|
            |_/

Ubiquiti Inc. (c) 2010-2025      https://www.ui.com

USERNAME@AP_NAME:~#
```

## Changing stuff up

```bash
echo 0 > /proc/gpio/led_pattern # turns off the LED
echo 1 > /proc/gpio/led_pattern # sets it to the default blue
echo 2 > /proc/gpio/led_pattern # sets it to the dull white
```

## Final thoughts

Hopefully you were able to control the colour of the LED ring on your AP, or turn it off if you wanted to. I found this quite useful as it meant I had more control over the APs, and was able to schedule them to turn on and off using Home Assistant.