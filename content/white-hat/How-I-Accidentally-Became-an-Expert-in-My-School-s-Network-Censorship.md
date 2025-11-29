---
date: "2025-08-11T16:00:32Z"
draft: false
title: "How I Accidentally Became an Expert in My School's Network Censorship"
---
So after some totally innocent poking around at school, I found out our school was using Smoothwall to control our network activity. Now, this wasn’t that hard… especially considering that every time we tried to open something that was blocked it said ‘Smoothwall’ in big green text, but there’s a bit more to this. I wouldn’t suggest trying most of this at your school/work, as I had oversight from the IT department before I started my endeavours.

## On-site filtering appliances

I found out that all of our network traffic passed through a physical gateway before reaching the internet. This isn’t uncommon, but having no prior knowledge about how network-level filtering work meant that this was a new idea to me. This gateway, aka. a Smoothwall Guardian Device, would intercept all our traffic to the internet. 

Hold up, what about HTTPS??

Well, this explained some of the funny issues I was getting on my personal laptop when on School WiFi. Often, if I wasn’t connected to my VPN, I’d get invalid SSL warnings. The reason behind this was due to MITM SSL interceptions. 

### MITM SSL

MITM stands for man-in-the-middle, commonly associated with MITM attacks, in which the attacker intercepts all of your traffic. With the introduction of HTTPS, using SSL and TLS certificates to validate a server’s identity, this became near impossible.

The key word being ‘near’. If you have access to a user’s device, you can install a new trusted certificate authority - and this means you can use your own private key to sign certificates, and the computer will trust them blindly. This is probably best explained using an example.

Say you’re trying to access Google. (I’m aware of HSTS, which adds some additional complications, but for the sake of simplicity, we’re going to omit it.) Let’s also say your using your school device, on your school network.

A rough idea of what would happen is the following:

- You type `https://www.google.com` into your browser
- Your request gets sent to Smoothwall first, not directly to Google
- Smoothwall acts like it’s Google and responds with **its own SSL certificate**, signed by *their own* internal CA
- Because your school device has that CA installed, your browser accepts it
- Smoothwall opens the connection to Google on your behalf, gets the *real* response
- It reads it, filters it (if needed), and re-encrypts it with **its own** cert
- Finally, it passes the (possibly censored) response back to you

This explained the SSL warnings, as my personal laptop wouldn’t have the Smoothwall CA installed. As well as this, I realised that this pretty much meant the school could see every single piece of traffic passing through. Now, obviously, they aren’t going to check everything manually, but things may still get flagged and/or blocked - which makes complete sense, considering we’re on the school network.

## Off-site filtering

Here’s the thing - we’re allowed to take our school laptops home. But we still get filtered on these - huh? Well, that’s thanks to three different things at play: Smoothwall Unified Client, Smoothwall Cloud Filter, and Sophos. They are using all three in combination in an attempt to block as many prohibited websites as possible - such as games.

### Smoothwall Unified Client

What exactly this does is unknown - but I have been able to work out that the Smoothwall Cloud Filter extension depends on this application to be running in order to update it’s blocklists and provision itself. It seems to also offer functionality similar to Sophos, providing blocking at the device level, but our school has not enabled this.

### Smoothwall Cloud Filter

This ‘extension’ is the cornerstone of all of my schools blocking effects, being forcefully installed onto all pre-installed browsers. However, this comes with the obvious flaw that someone could just install another browser… They eventually caught onto this, and I’ll explain what happened [here](#applocker). It also seems to have this weird bug, where on some devices, it would only provision if running on the default profile in Chrome. 

The extension also has this weird feature labelled ‘secret knock’. The idea behind this being it sends your device’s Smoothwall serial number to the gateway to request a blocking exemption (why??), and the gateway just stops blocking you, instead depending on the Cloud Filter to do it instead. But this is incredibly easy to exploit if you know what you’re doing.

### Sophos

In my opinion, the most capable of all three. Having device-wide blocking, and working regardless of what browser is in use. The only flaws being this weird bug where a website will load freely the first time, then block it afterwards? As well as this, it can be bypassed using a VPN, however this is an issue with any form of device-wide blocking. 

## Monitoring

### Keystrokes

On our school devices, we were always told that everything we type was being monitored. It didn’t take us too long to realise that Smoothwall was responsible for this - through an application named ‘Smoothwall Safeguarding Client’. This would send every single one of our keystrokes to their monitoring server, bar anything typed in password fields. Here’s some other info I found.

1. Firstly, the devices maintain a HTTPS Keep-alive connection with the Smoothwall API Server, and transmit everything you type.
2. Each transmission is triggered by either a mouse click, or enter.
3. When the devices are offline, they attempt to transmit once, then try again once internet access is restored. However, if the DNS name fails to resolve, they immediately try once more before failing, and not trying again.
4. It sends a bunch of other information to the API server too, along with the keystrokes, such as the device’s internal IP address.
5. It authenticates itself with keys stored in log files that we can view, in a Debug Logs folder stored in `ProgramData`.
6. It respects HTTP Proxy settings, and certificates in the User Certificate store

### Screens

Similar to keystrokes, we were also always told that teachers could always view our screens. Again, it didn’t take us too long to identify that this was a piece of software named ‘Senso’. Senso is a tool for teachers to view your screens and manage your device, and is a whole lot smarter then Smoothwall’s Safeguarding Client in the way it does things. For example, it will not respect HTTP Proxy settings set by the user, preventing me from being able to run MITM attacks. Not only this, but it also will not respect certificates in the devices User Certificate stores, again preventing MITM attacks. However, it still contains the same fatal flaw as Smoothwall and Sophos - blocking the API endpoints over DNS prevents the applications from updating their policies and/or functioning.

## Prevention

Now obviously, even if they aren’t actively monitoring us, they don’t want us bypassing the Cloud Filter using another browser, so they began using Sophos and AppLocker to block the browsers, as well as using Senso to find new browsers being used, and sanction those using them. An obvious solution I found to this (apart from just not breaking the rules) would be to theoretically build your own browser. I’m not going to go to deep into this, but you would be able to change the name, and app signature very easily, making it virtually impossible to block. If you was also to spin up a VPN off-site, you would be able to tunnel all of my ‘browser’s traffic to home, effectively bypassing the on-site gateway. Not that I’ve tried this, and nor would I suggest it, but theoretically it should be just as good as another browser with something like ProtonVPN.

### AppLocker

Our school had multiple evolutions of their AppLocker policies. Each one had their flaws and benefits

1. This one just downright blocked everything not in ProgramFiles, as well as having explicit block rules for applications in our user folders (but why? - AppLocker, if enabled, already blocks everything by default)
2. Then, it blocked all known alternate browsers by publisher, but allowed any other apps
3. Finally, they blocked ALL apps, excluding those in %WINDIR%, and manually excluded those that they wanted to run in Program Files. I’m not entirely sure why they did this, but I had previously suggested the most effective way to control applications would be to block all user-installed apps, apart from a specific list they allowed, such as zoom. Needless to say, this one didn’t last for too long.

AppLocker is not particularly easy to bypass, but it can be trick to maintain, which explain why our school moved over to Sophos.

### Sophos

This is what they seem to have moved towards using more recently. They seem to be using preprepared blocklists which just, well, block every browser I can think off. This is a pretty solid method, as unless a student happens to be tech-savvy enough to build their own browser, they are unable to access the internet unrestricted. 

## BitLocker

Like any smart organisation, our school had BitLocker encryption enabled on the drives. This mean that if you were even able to get access to the drives, you would be prevented from doing anything using them. However, for a brief period before we found and reported this to IT, the keys were visible in our account portal. This could, theoretically, allow someone to use an AccessibilityEscalation exploit. These are supposed to be patched by now, but at the time, on some devices, the AV used to take a few seconds to turn on - thus leaving the device vulnerable for ~2 seconds after start-up. However, this has been patched by now.

## Final Thoughts

I wouldn’t suggest trialling any of this, this is just for education purposes only. Most of these experiments were either conducted on my own device, or with the permission of the IT department. I already attempted to report the Secret Knock and DNS vulnerabilities to Smoothwall (Senso pretty much expects the device to be pre-hardened against being able to modify network settings), but they didn’t respond. I’m not going to publish the exact methods for exploiting either of these, but they are pretty niche.