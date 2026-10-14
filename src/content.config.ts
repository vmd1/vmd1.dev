import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

/**
 * Every markdown file one directory below `content/` is a page: the directory is
 * its section and the file name is its URL slug. Hugo-era `_index.md` files and
 * the root-level helper pages (search, archive, ...) are now plain Astro routes.
 */
const pages = defineCollection({
  loader: glob({ base: './content', pattern: ['*/*.md', '!**/_index.md'] }),
  schema: z.object({
    title: z.string(),
    date: z.coerce.date(),
    draft: z.boolean().default(false),
    tags: z.array(z.string()).nullish().transform((tags) => tags ?? []),
    toc: z.boolean().default(true),
    author: z.string().optional(),
    authors: z.array(z.string()).optional(),
  }),
});

export const collections = { pages };
