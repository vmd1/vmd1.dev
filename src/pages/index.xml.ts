import type { APIRoute } from 'astro';
import { getPostPages } from '../lib/content';
import { homeFeed } from '../lib/feeds';

export const GET: APIRoute = async () =>
  new Response(homeFeed((await getPostPages()).slice(0, 6)), {
    headers: { 'Content-Type': 'application/xml; charset=utf-8' },
  });
