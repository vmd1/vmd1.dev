import type { APIRoute, GetStaticPaths } from 'astro';
import { getTags, type Tag } from '../../../lib/content';
import { rssFeed } from '../../../lib/feeds';

export const getStaticPaths = (async () =>
  (await getTags()).map((tag) => ({ params: { tag: tag.slug }, props: { tag } }))) satisfies GetStaticPaths;

export const GET: APIRoute = ({ props }) => {
  const { tag } = props as { tag: Tag };
  return new Response(rssFeed({ title: tag.name, path: `/tags/${tag.slug}/`, pages: tag.pages }), {
    headers: { 'Content-Type': 'application/xml; charset=utf-8' },
  });
};
