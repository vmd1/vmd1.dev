import type { APIRoute } from 'astro';
import { getListedPages } from '../lib/content';

/** Search index consumed by the search page (scripts/features/search.ts). */
export const GET: APIRoute = async () => {
  const index = (await getListedPages()).map((page) => ({
    title: page.title,
    tags: page.tags,
    categories: [],
    contents: page.plain,
    permalink: page.url,
    date: page.date.toISOString(),
    summary: page.summary,
  }));
  return Response.json(index);
};
