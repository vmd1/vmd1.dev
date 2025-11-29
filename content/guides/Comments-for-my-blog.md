---
date: '2025-10-05T17:08:53Z'
draft: false
title: 'Comments for My Blog'
tags:
- Blog
---
Blogs are great and all, but they need to have a level of interactivity, otherwise it can feel a bit dull. That’s where comments come in. And it’s become incredibly easy now, thanks to this amazing platform I found, powered by GitHub Discussions.

> Enter: Giscus - A comments system powered by GitHub Discussions  💬 💎

## Setup

Setting up Giscus is relatively simple, especially if you’re using a theme it already supports. Head [here](https://giscus.app/) to do so.

However, my blog’s theme, partially inspired by Tokyo Night, isn’t a theme that Giscus has. As a result, I had to build a stylesheet for it to use, publish it to my CDN, and set Giscus to use this. 

Here’s the stylesheet I wrote, hosted at https://cdn.848226.xyz/v1/blog/comments/tokyonight.css:

```css
/*! MIT License
 * Tokyo Night Dark Theme for Giscus
 */

main {
  /* Syntax highlighting */
  --color-prettylights-syntax-comment: #545c7e;
  --color-prettylights-syntax-constant: #7aa2f7;
  --color-prettylights-syntax-entity: #bb9af7;
  --color-prettylights-syntax-storage-modifier-import: #a9b1d6;
  --color-prettylights-syntax-entity-tag: #9ece6a;
  --color-prettylights-syntax-keyword: #f7768e;
  --color-prettylights-syntax-string: #9ece6a;
  --color-prettylights-syntax-variable: #e0af68;
  --color-prettylights-syntax-brackethighlighter-unmatched: #f7768e;
  --color-prettylights-syntax-invalid-illegal-text: #1a1b26;
  --color-prettylights-syntax-invalid-illegal-bg: #f7768e;
  --color-prettylights-syntax-carriage-return-text: #1a1b26;
  --color-prettylights-syntax-carriage-return-bg: #db4b4b;
  --color-prettylights-syntax-string-regexp: #9ece6a;
  --color-prettylights-syntax-markup-list: #e0af68;
  --color-prettylights-syntax-markup-heading: #7aa2f7;
  --color-prettylights-syntax-markup-italic: #a9b1d6;
  --color-prettylights-syntax-markup-bold: #a9b1d6;
  --color-prettylights-syntax-markup-deleted-text: #f7768e;
  --color-prettylights-syntax-markup-deleted-bg: #521f30;
  --color-prettylights-syntax-markup-inserted-text: #9ece6a;
  --color-prettylights-syntax-markup-inserted-bg: #1f2d2f;
  --color-prettylights-syntax-markup-changed-text: #e0af68;
  --color-prettylights-syntax-markup-changed-bg: #322e1f;
  --color-prettylights-syntax-markup-ignored-text: #787c99;
  --color-prettylights-syntax-markup-ignored-bg: #16161e;
  --color-prettylights-syntax-meta-diff-range: #bb9af7;
  --color-prettylights-syntax-brackethighlighter-angle: #787c99;
  --color-prettylights-syntax-sublimelinter-gutter-mark: #545c7e;
  --color-prettylights-syntax-constant-other-reference-link: #7aa2f7;

  /* Buttons */
  --color-btn-text: #a9b1d6;
  --color-btn-bg: #16161e;
  --color-btn-border: #101014;
  --color-btn-shadow: 0 0 transparent;
  --color-btn-inset-shadow: 0 0 transparent;
  --color-btn-hover-bg: #14141b;
  --color-btn-hover-border: #545c7e;
  --color-btn-active-bg: #1a1b26;
  --color-btn-active-border: #787c99;
  --color-btn-selected-bg: #16161e;
  --color-btn-primary-text: #1a1b26;
  --color-btn-primary-bg: #7aa2f7;
  --color-btn-primary-border: #101014;
  --color-btn-primary-shadow: 0 0 transparent;
  --color-btn-primary-inset-shadow: 0 0 transparent;
  --color-btn-primary-hover-bg: #89b4fa;
  --color-btn-primary-hover-border: #101014;
  --color-btn-primary-selected-bg: #7aa2f7;
  --color-btn-primary-selected-shadow: 0 0 transparent;
  --color-btn-primary-disabled-text: #545c7e;
  --color-btn-primary-disabled-bg: #16161e;
  --color-btn-primary-disabled-border: #101014;

  /* Lists / controls */
  --color-action-list-item-default-hover-bg: #16161e;
  --color-segmented-control-bg: #16161e;
  --color-segmented-control-button-bg: #1a1b26;
  --color-segmented-control-button-selected-border: #545c7e;

  /* Text */
  --color-fg-default: #a9b1d6;
  --color-fg-muted: #787c99;
  --color-fg-subtle: #545c7e;

  /* Surfaces */
  --color-canvas-default: #1a1b26;
  --color-canvas-overlay: #16161e;
  --color-canvas-inset: #101014;
  --color-canvas-subtle: #16161e;

  /* Borders */
  --color-border-default: #101014;
  --color-border-muted: #16161e;
  --color-neutral-muted: rgba(120, 124, 153, 0.4);

  /* Accents */
  --color-accent-fg: #7aa2f7;
  --color-accent-emphasis: #7aa2f7;
  --color-accent-muted: rgba(122, 162, 247, 0.4);
  --color-accent-subtle: rgba(122, 162, 247, 0.1);

  /* State colors */
  --color-success-fg: #9ece6a;
  --color-attention-fg: #e0af68;
  --color-attention-muted: rgba(224, 175, 104, 0.4);
  --color-attention-subtle: rgba(224, 175, 104, 0.15);
  --color-danger-fg: #f7768e;
  --color-danger-muted: rgba(247, 118, 142, 0.4);
  --color-danger-subtle: rgba(247, 118, 142, 0.1);

  /* Shadows */
  --color-primer-shadow-inset: 0 0 transparent;

  /*! Extensions from @primer/css/alerts/flash.scss */
  --color-social-reaction-bg-hover: #16161e;
  --color-social-reaction-bg-reacted-hover: #14141b;
}

main .pagination-loader-container {
  background-image: url("https://github.com/images/modules/pulls/progressive-disclosure-line-dark.svg");
}

main .gsc-loading-image {
  background-image: url("https://github.githubassets.com/images/mona-loading-dark.gif");
}
```

## Self-hosting

Personally, I’m not planning on self-hosting this, as my blog is running on GitHub pages deliberately, so as to not be affected by downtime from my homelab (which has been a lot recently - due to my move to traefik from Nginx Proxy Manager - more on that later), however if you wish to do so, instructions [here](https://github.com/giscus/giscus/blob/main/SELF-HOSTING.md).

## Adding Giscus to my Blog

Whichever path you took, using the cloud or the self-hosted variant, you should now have a snippet to add to your blog, that looks something like this:

```html
<script src="https://giscus.app/client.js"
        data-repo="USER/REPO"
        data-repo-id="SOMETHING"
        data-category="Comments"
        data-category-id="SOMETHING_ELSE"
        data-mapping="title"
        data-strict="1"
        data-reactions-enabled="1"
        data-emit-metadata="0"
        data-input-position="top"
        data-theme="https://cdn.848226.xyz/v1/blog/comments/tokyonight.css"
        data-lang="en"
        data-loading="lazy"
        crossorigin="anonymous"
        async>
</script>
```

I’m using the theme paperMod, and in order to add comments to paperMod, you need to create the following file `themes/PaperMod/layouts/partials/comments.html`  and populate it with:

```html
{{- /* Comments area start */ -}}
<script src="https://giscus.app/client.js"
        data-repo="USER/REPO"
        data-repo-id="SOMETHING"
        data-category="Comments"
        data-category-id="SOMETHING_ELSE"
        data-mapping="title"
        data-strict="1"
        data-reactions-enabled="1"
        data-emit-metadata="0"
        data-input-position="top"
        data-theme="https://cdn.848226.xyz/v1/blog/comments/tokyonight.css"
        data-lang="en"
        data-loading="lazy"
        crossorigin="anonymous"
        async>
</script>
{{- /* to add comments read => https://gohugo.io/content-management/comments/ */ -}}
{{- /* Comments area end */ -}}
```

Once you’ve done so, you should end up with a comments section at the bottom of your page. Feel free to try out mine below.