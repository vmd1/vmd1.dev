import type { MarkdownHeading } from 'astro';

export interface TocNode {
  text: string;
  slug: string;
  children: TocNode[];
}

/** Nests a flat heading list (levels `min`..`max`) into a tree for the table of contents. */
export function buildToc(headings: MarkdownHeading[], min = 2, max = 3): TocNode[] {
  const roots: TocNode[] = [];
  const stack: { depth: number; node: TocNode }[] = [];

  for (const { depth, text, slug } of headings) {
    if (depth < min || depth > max) continue;
    const node: TocNode = { text, slug, children: [] };
    while (stack.length && stack.at(-1)!.depth >= depth) stack.pop();
    (stack.at(-1)?.node.children ?? roots).push(node);
    stack.push({ depth, node });
  }
  return roots;
}
