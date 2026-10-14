# vmd1.dev

Personal site and blog, built with [Astro](https://astro.build) and Tailwind CSS v4, served by the edge platform (see `edge-serve.yml`).

```bash
npm install
npm run dev      # http://localhost:4321
npm run build    # static output in dist/
npm run check    # type-check .astro and .ts files
```

## Layout

| Path | What lives there |
| :--- | :--- |
| `content/<section>/<slug>.md` | Posts. The directory is the section, the file name is the URL slug (`content/guides/My-Post.md` is `/guides/my-post/`). Frontmatter is validated in `src/content.config.ts`. Files with `draft: true` are skipped. |
| `src/config/site.ts` | Everything configurable: profile, social links, giscus, nav, which sections are listed. |
| `src/lib/` | Build-time helpers: content queries (`content.ts`), text utilities, feeds, table of contents, the code-block rehype plugin. |
| `src/pages/` | Routes, including the RSS feeds, `index.json` search index, sitemap and robots.txt. |
| `src/components/`, `src/layouts/` | UI. |
| `src/scripts/` | Browser code. `ui/` is page chrome (header, ruler, tilt, lightbox, code copy), `features/` is one module per page feature (search, scripts library, projects, home widgets); each is imported by the component or page that needs it. |
| `src/styles/global.css` | Design tokens and the few custom styles that Tailwind utilities do not cover. |
| `public/` | Files served as-is. `css/authentik.css` and `css/uptime-kuma.css` are loaded by those external services. |

## Conventions

- URLs are stable: sections, slugs, tags, `/index.xml`, per-section and per-tag feeds, `/index.json` and `/sitemap.xml` match the previous Hugo site.
- Navigation is client-side through Astro's `<ClientRouter />`. Page scripts must initialise through `onPageLoad` (`src/scripts/lifecycle.ts`), not `DOMContentLoaded`.
- Sections in `unlistedSections` (`white-hat`) render but never appear in lists, feeds, search or the sitemap.
- The canonical origin is `https://vmd1.dev`; set `SITE_URL` to build for a different host.
