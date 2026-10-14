import type { APIRoute } from 'astro';
import { noindexSections } from '../config/site';
import { getListedPages, getTags } from '../lib/content';

const blocked: readonly string[] = noindexSections;

/** A date is only worth advertising if it is a real publication date. */
const isRealDate = (date?: Date): date is Date => !!date && date.getUTCFullYear() > 1990;

export const GET: APIRoute = async ({ site }) => {
  // Pages that robots.txt disallows (testing, white-hat) do not belong in the sitemap.
  const pages = (await getListedPages()).filter((page) => !blocked.includes(page.section));
  const tags = (await getTags()).map((tag) => ({ ...tag, pages: tag.pages.filter((page) => !blocked.includes(page.section)) }));
  const sections = [...new Set(pages.map((page) => page.section))].sort();

  const entries: { path: string; lastmod?: Date }[] = [
    { path: '/', lastmod: pages[0]?.date },
    { path: '/posts/' },
    { path: '/archive/' },
    { path: '/projects/' },
    { path: '/scripts/' },
    { path: '/tags/' },
    ...sections.map((section) => ({
      path: `/${section}/`,
      lastmod: pages.find((page) => page.section === section)?.date,
    })),
    ...tags
      .filter((tag) => tag.pages.length > 0)
      .map((tag) => ({ path: `/tags/${tag.slug}/`, lastmod: tag.pages[0].date })),
    ...pages.map((page) => ({ path: page.url, lastmod: page.date })),
  ];

  const urls = entries
    .map(({ path, lastmod }) => {
      const loc = `    <loc>${new URL(path, site).href}</loc>`;
      const modified = isRealDate(lastmod) ? `\n    <lastmod>${lastmod.toISOString()}</lastmod>` : '';
      return `  <url>\n${loc}${modified}\n  </url>`;
    })
    .join('\n');

  return new Response(
    `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`,
    { headers: { 'Content-Type': 'application/xml; charset=utf-8' } },
  );
};
