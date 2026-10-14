import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';
import { SITE_URL } from './src/config/site-url.ts';
import rehypeCodeCopy from './src/lib/rehype-code-copy.ts';

export default defineConfig({
  site: SITE_URL,
  trailingSlash: 'always',
  build: { format: 'directory' },
  prefetch: { prefetchAll: true, defaultStrategy: 'hover' },
  markdown: {
    shikiConfig: { theme: 'dracula', wrap: false },
    rehypePlugins: [rehypeCodeCopy],
  },
  vite: {
    plugins: [tailwindcss()],
    // Client-only deps imported lazily by page scripts; pre-bundle so dev doesn't re-optimise mid-session.
    optimizeDeps: { include: ['fuse.js', 'marked'] },
  },
});
