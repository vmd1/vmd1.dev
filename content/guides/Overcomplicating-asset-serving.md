---
date: '2025-07-23T14:35:00Z'
draft: false
title: 'Overcomplicating Asset Serving'
tags:
- Services
- Infrastructure
---
All the images on my blog need a place to live, and while I could just serve it on the blog itself, some of my other projects need locations for files to live - and serving it on them natively just isn’t a viable option. Images and the like are also more heavier then text, and so it can often be beneficial to load them from a more local server. 

> Enter: A CDN

## What is a CDN?

A CDN (Content Delivery Network) is a set of servers, distributed around the globe, which work together to ensure High Performance, and High Availability. In a nutshell, it speeds up content delivery by caching website content - such as images - closer to the users that are requesting it, improving load times and the overall speed of a website.

## How…?

Self-hosting a CDN is most definitely not a viable project, as it requires many servers in data centres around the globe, running 24/7. However, there are already many CDNs out there, and so we can just piggyback off of one of these. My personal favourite method for this is to use GitHub pages. 

GitHub pages is powered by Fastly’s CDN, which has more than enough data centres around the globe to meet my very basic needs. As well as this, using GitHub allows me to maintain version history and CI through GitHub actions. 

## Let’s get started

### Create a new GitHub repository

I’ll be naming mine `cdn` , meaning it’ll be accessible [here](https://github.com/vmd1/cdn). I always tick ‘Create README.md’ so I have a starting point to work from. 

### Setup the structure

I’m using the following structure:

```
v1/
├── assets/
│   ├── css/
│   ├── fonts/
│   ├── images/
│   ├── js/
│   └── remixicons/
├── blog/media/
│   ├── favicon/
│   │   ├── favicon-16.ico
│   │   └── favicon-32.ico
│   └── posts/
│       ├── A-modular-structure-in-Home-Assistant/
│       │   └── ha-restart.png
│       ├── Controlling-my-UniFi-AP-Leds-via-Home-Assistant
│       ├── Introduction-to-the-lab
│       └── Self-hosting-the-UniFi-Controller
└── launchpad/
```

### Enable GitHub Pages

![Enable GitHub Pages.gif](https://cdn.848226.xyz/v1/blog/media/posts/Overcomplicating-asset-serving/github-pages.gif)

### OPTIONAL: Add a custom domain

Go to your DNS provider, and add a cname entry for the domain you want to use, pointing to `YOUR_USERNAME.github.io` (in my case `cdn.848226.xyz`, pointing to `vmd1.github.io`). Next up, let’s add it in the repo settings.

![Set the domain in GitHub Pages.gif](https://cdn.848226.xyz/v1/blog/media/posts/Overcomplicating-asset-serving/github-domain.gif)

And, boom, you have you’re own makeshift CDN, with files hosted in places like https://cdn.848226.xyz/v1/blog/media/favicon/favicon-32.ico, running on GitHub pages, which is powered by Fastly.

This isn’t something I’d recommend using for production or mission-critical workloads, but it sure is great for some tinkering and other stuff like that. If you want a more production-ready system - I’d recommend using Cloudflare Pages with R2 as a backend, or Netlify.