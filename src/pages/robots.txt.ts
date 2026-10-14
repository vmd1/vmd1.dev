import type { APIRoute } from 'astro';
import { noindexSections } from '../config/site';

export const GET: APIRoute = ({ site }) => {
  const body = [
    'User-agent: *',
    'Disallow: /search/?q=',
    ...noindexSections.map((section) => `Disallow: /${section}/`),
    '',
    `Sitemap: ${new URL('/sitemap.xml', site)}`,
    '',
  ].join('\n');
  return new Response(body, { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
};
