---
date: '0001-01-01T00:00:00Z'
draft: false
title: 'Markdown Rendering Test Page'
tags:
- Testing
- Markdown
toc: true
---

This page is a full markdown rendering sandbox for validating the post view styles.

## Headings

### H3 Example

#### H4 Example

##### H5 Example

###### H6 Example

## Paragraphs and Formatting

Regular paragraph text with **bold**, *italic*, ***bold italic***, ~~strikethrough~~, and `inline code`.

A second paragraph with a [link to the homepage](/) and another [external link](https://example.com).

> This is a blockquote with emphasis and an inline `snippet`.
>
> Second line of the same quote block.

## Lists

### Unordered List

- First bullet
- Second bullet with **bold** text
- Third bullet with nested items:
  - Nested bullet A
  - Nested bullet B

### Ordered List

1. First ordered item
2. Second ordered item
3. Third ordered item with nested list:
   1. Nested ordered item one
   2. Nested ordered item two

### Task List

- [x] Finished task
- [x] Another completed task
- [ ] Pending task
- [ ] Pending task with `inline code`

## Horizontal Rule

---

## Table

| Feature | Status | Notes |
| --- | --- | --- |
| Headings | Good | All heading levels should look consistent |
| Lists | Good | Ordered, unordered, and nested |
| Checklists | Good | Includes checked and unchecked items |
| Code Blocks | Verify | Check background, spacing, and scrollbars |

## Code Blocks

```bash
#!/usr/bin/env bash
set -euo pipefail

echo "Hello from bash"
for i in 1 2 3; do
  echo "Item: $i"
done
```

```python
def fibonacci(n: int) -> list[int]:
    sequence = [0, 1]
    while len(sequence) < n:
        sequence.append(sequence[-1] + sequence[-2])
    return sequence[:n]

print(fibonacci(10))
```

```json
{
  "site": "vmd1.dev",
  "featureFlags": {
    "toc": true,
    "lineNumbers": true,
    "copyButtons": true
  }
}
```

```html
<section class="card">
  <h2>Sample HTML Block</h2>
  <p>Check monospace font rendering and syntax colors.</p>
</section>
```

## Image

![Placeholder image for layout testing](https://placehold.co/1200x500/1b1f35/e8ecff?text=Markdown+Test+Image)

## Definition-Like Paragraph

Term-like label:
A short descriptive sentence that helps verify normal paragraph spacing after colon-style labels.

## Escapes and Special Characters

Use escaped characters: \*literal asterisk\*, \_literal underscore\_, and \`literal backtick\`.

End of test document.
