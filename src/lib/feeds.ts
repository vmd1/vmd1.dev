import { site } from '../config/site';
import { SITE_URL } from '../config/site-url';
import { escapeHtml } from './text';
import type { Page } from './content';

const abs = (path: string) => new URL(path, SITE_URL).href;
const rfc822 = (date: Date) => date.toUTCString().replace('GMT', '+0000');

const authorEmail = `${site.author.email} (${site.author.name})`;

/** RSS feed for a section or tag; mirrors the feed layout Hugo produced. */
export function rssFeed({ title, path, pages }: { title: string; path: string; pages: Page[] }): string {
  const heading = title === site.title ? site.title : `${title} on ${site.title}`;
  const latest = pages[0]?.date;
  const items = pages
    .map(
      (page) => `
    <item>
      <title>${escapeHtml(page.title)}</title>
      <link>${abs(page.url)}</link>
      <pubDate>${rfc822(page.date)}</pubDate>
      <author>${escapeHtml(authorEmail)}</author>
      <guid>${abs(page.url)}</guid>
      <description>${escapeHtml(`<p>${escapeHtml(page.summary)}</p>`)}</description>
    </item>`,
    )
    .join('');

  return `<?xml version="1.0" encoding="utf-8" standalone="yes"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${escapeHtml(heading)}</title>
    <link>${abs(path)}</link>
    <description>Recent content ${title === site.title ? '' : `in ${escapeHtml(title)} `}on ${escapeHtml(site.title)}</description>
    <language>${site.language}</language>
    <managingEditor>${escapeHtml(authorEmail)}</managingEditor>
    <webMaster>${escapeHtml(authorEmail)}</webMaster>${latest ? `\n    <lastBuildDate>${rfc822(latest)}</lastBuildDate>` : ''}
    <atom:link href="${abs(`${path}index.xml`)}" rel="self" type="application/rss+xml" />${items}
  </channel>
</rss>
`;
}

/** The home feed: newest posts only, with the full text as description (also read by older clients). */
export function homeFeed(pages: Page[]): string {
  const items = pages
    .map(
      (page) => `
    <item>
      <title>${escapeHtml(page.title)}</title>
      <link>${abs(page.url)}</link>
      <pubDate>${rfc822(page.date)}</pubDate>
      <description>${escapeHtml(page.plain)}</description>${page.tags.map((tag) => `\n      <category>${escapeHtml(tag)}</category>`).join('')}
      <guid>${abs(page.url)}</guid>
    </item>`,
    )
    .join('');

  return `<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${escapeHtml(site.title)}</title>
    <link>${abs('/')}</link>
    <description>Recent content on ${escapeHtml(site.title)}</description>
    <language>en-us</language>${items}
  </channel>
</rss>
`;
}
