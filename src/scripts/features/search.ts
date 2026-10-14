/** Search results page: fuzzy-searches the build-time index at /index.json. */
import Fuse from 'fuse.js';
import { onPageLoad } from '../lifecycle';

interface SearchEntry {
  title: string;
  tags: string[];
  categories: string[];
  contents: string;
  permalink: string;
  date: string;
  summary: string;
}

const dateFormat = new Intl.DateTimeFormat('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

function message(container: HTMLElement, text: string, className = 'text-body'): void {
  const p = document.createElement('p');
  p.className = className;
  p.textContent = text;
  container.replaceChildren(p);
}

onPageLoad(async () => {
  const results = document.getElementById('search-results');
  const template = document.getElementById('search-result-template') as HTMLTemplateElement | null;
  if (!results || !template) return;

  const query = new URLSearchParams(window.location.search).get('q');
  if (!query) return message(results, 'Please enter a search term.');

  try {
    const response = await fetch(results.dataset.searchIndex ?? '/index.json');
    if (!response.ok) throw new Error('Failed to load search index');
    const index = (await response.json()) as SearchEntry[];

    const fuse = new Fuse(index, {
      keys: [
        { name: 'title', weight: 0.7 },
        { name: 'contents', weight: 0.5 },
        { name: 'tags', weight: 0.3 },
        { name: 'categories', weight: 0.3 },
      ],
      threshold: 0.3,
      ignoreLocation: true,
    });

    const hits = fuse.search(query);
    if (!hits.length) return message(results, `No results found for "${query}".`);

    results.replaceChildren(
      ...hits.map(({ item }) => {
        const node = template.content.cloneNode(true) as DocumentFragment;
        node.querySelector('a')!.href = item.permalink;
        node.querySelector('.result-title')!.textContent = item.title;
        if (item.date) node.querySelector('.result-date')!.textContent = dateFormat.format(new Date(item.date));
        node.querySelector('.result-summary')!.textContent =
          item.summary || `${item.contents.substring(0, 150)}...`;
        return node;
      }),
    );
  } catch (error) {
    console.error('Search error:', error);
    message(results, 'An error occurred while searching. Please try again later.', 'text-red-400');
  }
});
