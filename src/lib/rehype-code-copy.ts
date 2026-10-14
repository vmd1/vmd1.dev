/** Wraps every code block in a container with a copy button (behaviour lives in scripts/ui/code-copy.ts). */

interface HastNode {
  type: string;
  tagName?: string;
  properties?: Record<string, unknown>;
  children?: HastNode[];
}

const isCodeBlock = (node: HastNode) =>
  node.type === 'element' && node.tagName === 'pre' && node.children?.some((child) => child.tagName === 'code');

const wrap = (pre: HastNode): HastNode => ({
  type: 'element',
  tagName: 'div',
  properties: { className: ['code-copy-wrap'] },
  children: [
    pre,
    {
      type: 'element',
      tagName: 'button',
      properties: { type: 'button', className: ['code-copy-btn'], title: 'Copy code', ariaLabel: 'Copy code block' },
      children: [
        { type: 'element', tagName: 'i', properties: { className: ['ri-file-copy-line'] }, children: [] },
      ],
    },
  ],
});

function walk(node: HastNode): void {
  if (!node.children) return;
  node.children = node.children.map((child) => {
    if (isCodeBlock(child)) return wrap(child);
    walk(child);
    return child;
  });
}

export default function rehypeCodeCopy() {
  return (tree: HastNode) => walk(tree);
}
