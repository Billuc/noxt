# Pages & Routing

Noxt uses a file-based routing system. Each file in the `pages/` directory becomes a route based on its filename and location.

## Route Name Resolution

The `getRouteName()` function converts a file path (relative to `pages/`) into a URL route:

| File path | Route |
|-----------|-------|
| `index.ts` | `/` |
| `about.ts` | `/about` |
| `about.tsx` | `/about` |
| `sample.tsx` | `/sample` |
| `blog/post.md` | `/blog/post` |
| `blog/index.ts` | `/blog/` |
| `nested/page1.ts` | `/nested/page1` |

Rules:

- The file extension is stripped
- Backslashes are normalized to forward slashes
- A file named `index` becomes the directory's root route
- Any `.ts`, `.tsx`, `.js`, `.jsx`, or `.md` file in `pages/` is picked up

## Preact Pages

Page files must have a **default export** that is a Preact `FunctionComponent`. Pages use `htm` tagged templates for rendering.

`pages/index.ts`:

```ts
import { html } from "htm/preact";

export default function IndexPage() {
  return html`
    <h1>Index Page</h1>
    <a href="./about">About</a>
  `;
}
```

`pages/about.ts`:

```ts
import { html } from "htm/preact";

export default function AboutPage() {
  return html`<h1>About Page</h1>`;
}
```

## Markdown Pages

Files with a `.md` extension are also valid pages. They can include YAML frontmatter for metadata.

`pages/hello.md`:

```markdown
---
title: Hello World
layout: ./layouts/Blog.ts
---

# Hello World

This is a markdown page.
```

### Frontmatter

Frontmatter is YAML delimited by `---` at the start of the file. Parsed values are passed as props to the layout component.

### Layouts

Markdown pages can specify a layout component via the `layout` key in frontmatter:

`layouts/Blog.ts`:

```ts
import { html } from "htm/preact";
import type { ComponentChildren } from "preact";

export default function BlogLayout(
  { children, title }: { children?: ComponentChildren; title?: string },
) {
  return html`<html>
    <head><title>${title ?? "Blog"}</title></head>
    <body>
      <header>My Blog</header>
      <main>${children}</main>
    </body>
  </html>`;
}
```

If no `layout` is specified, a default layout is used that wraps content in `<html><head></head><body>{children}</body></html>`.

### How Markdown Rendering Works

1. The file is read and parsed by `parseMarkdown()`, extracting frontmatter and body content
2. The layout component is resolved from the `layout` frontmatter key
3. The markdown body is converted to HTML via `Bun.markdown.html()`
4. The layout is rendered with frontmatter values as props and a placeholder for children
5. The markdown HTML replaces the placeholder in the rendered layout

## How Prerendering Works

At build time, `prepareRoutes()` scans `pages/`, prerenders each file to HTML, and writes the output to `.cache/`. A route map is generated and written to `.cache/routes.js`.

The generated route map is a JS module that exports a mapping of route names to HTML strings. This map is then used by `Bun.serve({ routes })` to serve the prerendered content.

Unmatched routes return a 404 response automatically.
