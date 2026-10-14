import type { APIRoute } from 'astro';
import { getListedPages } from '../../lib/content';
import { rssFeed } from '../../lib/feeds';

export const GET: APIRoute = async () =>
  new Response(rssFeed({ title: 'Tags', path: '/tags/', pages: await getListedPages() }), {
    headers: { 'Content-Type': 'application/xml; charset=utf-8' },
  });
