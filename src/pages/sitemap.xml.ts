import type { APIRoute } from 'astro';
import { getListedPages, getTags } from '../lib/content';

export const GET: APIRoute = async ({ site }) => {
  const pages = await getListedPages();
  const tags = await getTags();
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
    ...tags.map((tag) => ({ path: `/tags/${tag.slug}/`, lastmod: tag.pages[0]?.date })),
    ...pages.map((page) => ({ path: page.url, lastmod: page.date })),
  ];

  const urls = entries
    .map(({ path, lastmod }) => {
      const lastmodTag = lastmod ? `<lastmod>${lastmod.toISOString()}</lastmod>` : '';
      return `<url><loc>${new URL(path, site).href}</loc>${lastmodTag}</url>`;
    })
    .join('');

  return new Response(
    `<?xml version="1.0" encoding="utf-8" standalone="yes"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls}</urlset>`,
    { headers: { 'Content-Type': 'application/xml; charset=utf-8' } },
  );
};
