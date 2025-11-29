---
date: '2025-07-27T17:00:00Z'
draft: false
title: 'PowerShell Scripting for an overly specific problem'
---
On our school laptops, for whatever reason, the applications menu from settings has been removed. As a result, you cannot uninstall any non-Microsoft store applications - it just tries to open a settings menu that we can’t access. So, I thought it would be worthwhile to build a PowerShell script to tap into the `Uninstall Information` registry keys - and get the uninstall paths from here.

It also has some other features, such as:

- Being able to modify HTTP Proxy settings
- Removing Uninstall Information Registry Entries
- View all installed applications
- View AppLocker policies
- Checking if my nextdns instance is being used
- Checking if the Senso/Smoothwall API servers are accessible

It’s a pretty specific use case, but some of the scripts features may have other uses. See it [here](https://github.com/vmd1/scripts/tree/main/clean-up).