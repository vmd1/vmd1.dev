import { getCollection, type CollectionEntry } from 'astro:content';
import path from 'node:path';
import { listedSections, unlistedSections } from '../config/site';
import { firstWords, markdownToPlain, titleCase, urlize } from './text';

export interface Page {
  entry: CollectionEntry<'pages'>;
  title: string;
  section: string;
  slug: string;
  /** Root-relative URL with trailing slash, e.g. `/guides/my-post/`. */
  url: string;
  date: Date;
  tags: string[];
  authors: string[];
  plain: string;
  summary: string;
  wordCount: number;
  readingMinutes: number;
}

export const sectionTitles: Record<string, string> = {
  'white-hat': 'White Hat',
};

export const sectionTitle = (section: string) => sectionTitles[section] ?? titleCase(section);

const toPage = (entry: CollectionEntry<'pages'>): Page => {
  const filePath = entry.filePath ?? entry.id;
  const section = path.basename(path.dirname(filePath));
  const slug = urlize(path.basename(filePath, '.md'));
  const plain = markdownToPlain(entry.body ?? '');
  const wordCount = plain.split(/\s+/).filter(Boolean).length;
  return {
    entry,
    title: entry.data.title,
    section,
    slug,
    url: `/${section}/${slug}/`,
    date: entry.data.date,
    tags: entry.data.tags,
    authors: entry.data.authors ?? (entry.data.author ? [entry.data.author] : []),
    plain,
    summary: firstWords(plain, 70),
    wordCount,
    readingMinutes: Math.max(1, Math.ceil(wordCount / 212)),
  };
};

const byDateDesc = (a: Page, b: Page) => b.date.getTime() - a.date.getTime();

/** Every published page, including sections that are rendered but unlisted. */
export async function getAllPages(): Promise<Page[]> {
  const entries = await getCollection('pages', ({ data }) => !data.draft);
  return entries.map(toPage).sort(byDateDesc);
}

const isUnlisted = (page: Page) => (unlistedSections as readonly string[]).includes(page.section);

/** Pages that appear in lists, feeds, search and the sitemap. */
export async function getListedPages(): Promise<Page[]> {
  return (await getAllPages()).filter((page) => !isUnlisted(page));
}

/** Pages shown in the posts grid, archive, home timeline and main feed. */
export async function getPostPages(): Promise<Page[]> {
  const sections: readonly string[] = listedSections;
  return (await getListedPages()).filter((page) => sections.includes(page.section));
}

export async function getSections(): Promise<string[]> {
  const pages = await getAllPages();
  return [...new Set(pages.map((page) => page.section))].sort();
}

export interface Tag {
  slug: string;
  name: string;
  pages: Page[];
}

export async function getTags(): Promise<Tag[]> {
  const tags = new Map<string, Tag>();
  for (const page of await getListedPages()) {
    for (const name of page.tags) {
      const slug = urlize(name);
      const tag = tags.get(slug) ?? { slug, name, pages: [] };
      tag.pages.push(page);
      tags.set(slug, tag);
    }
  }
  return [...tags.values()].sort((a, b) => a.slug.localeCompare(b.slug));
}

export function pageAuthors(page: Page, fallback: string): string {
  return page.authors.length ? page.authors.join(', ') : fallback;
}
