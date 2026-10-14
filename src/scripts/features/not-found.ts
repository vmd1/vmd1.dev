/** 404 page: echoes the missing path and suggests posts whose title or slug resemble it. */
import Fuse from 'fuse.js';
import { onPageLoad } from '../lifecycle';

interface SearchEntry {
  title: string;
  permalink: string;
}

onPageLoad(async () => {
  const missing = document.getElementById('missing-path');
  const box = document.getElementById('suggestions');
  const list = document.getElementById('suggestion-list');
  if (!missing || !box || !list) return;

  missing.textContent = location.pathname;

  const query = location.pathname.replace(/[/_.-]+/g, ' ').trim();
  if (!query) return;

  try {
    const response = await fetch('/index.json');
    if (!response.ok) return;
    const index = (await response.json()) as SearchEntry[];
    const hits = new Fuse(index, {
      keys: ['title', 'permalink'],
      threshold: 0.4,
      ignoreLocation: true,
    })
      .search(query)
      .slice(0, 3);
    if (!hits.length) return;

    list.replaceChildren(
      ...hits.map(({ item }) => {
        const li = document.createElement('li');
        const a = document.createElement('a');
        a.href = item.permalink;
        a.textContent = item.title;
        a.className =
          'block px-4 py-3 rounded-lg border border-zinc-800 bg-zinc-950/50 text-gray-200 hover:bg-zinc-900 hover:border-white/20 transition-colors';
        li.append(a);
        return li;
      }),
    );
    box.classList.remove('hidden');
  } catch {
    // Suggestions are a nicety; the page works without them.
  }
});
