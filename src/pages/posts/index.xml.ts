import type { APIRoute } from 'astro';
import { getPostPages } from '../../lib/content';
import { rssFeed } from '../../lib/feeds';

export const GET: APIRoute = async () =>
  new Response(rssFeed({ title: 'All Posts', path: '/posts/', pages: await getPostPages() }), {
    headers: { 'Content-Type': 'application/xml; charset=utf-8' },
  });
