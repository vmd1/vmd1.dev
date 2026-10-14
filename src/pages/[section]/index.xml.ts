import type { APIRoute, GetStaticPaths } from 'astro';
import { getAllPages, getListedPages, sectionTitle } from '../../lib/content';
import { rssFeed } from '../../lib/feeds';

export const getStaticPaths = (async () => {
  const sections = [...new Set((await getAllPages()).map((page) => page.section))];
  return sections.map((section) => ({ params: { section } }));
}) satisfies GetStaticPaths;

export const GET: APIRoute = async ({ params }) => {
  const section = params.section!;
  const pages = (await getListedPages()).filter((page) => page.section === section);
  return new Response(rssFeed({ title: sectionTitle(section), path: `/${section}/`, pages }), {
    headers: { 'Content-Type': 'application/xml; charset=utf-8' },
  });
};
