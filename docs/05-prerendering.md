# Prerendering

Prerendering is Noxt's approach to generating static HTML files at build time. Unlike traditional static site generators, Noxt's prerendering is integrated with the islands architecture, allowing you to create fast, static sites with selective interactivity.

## What is Prerendering?

Prerendering is the process of:

1. **Rendering pages to HTML** on the server during build
2. **Processing island components** for client-side hydration
3. **Generating static files** that can be served without a Bun server
4. **Copying assets** to the output directory

## Prerendering vs. Server-Side Rendering

| Feature         | Prerendering           | SSR                      |
| --------------- | ---------------------- | ------------------------ |
| When it runs    | Build time             | Request time             |
| Output          | Static HTML files      | Dynamic HTML per request |
| Server required | ❌                     | ✅                       |
| Data fetching   | Static data only       | Dynamic data per request |
| Islands         | ✅ (hydrate on client) | ✅ (hydrate on client)   |
| Deployment      | Any static host        | Bun server required      |

## When to Use Prerendering

Use prerendering when:

- You have content that doesn't change frequently (blogs, docs, marketing sites)
- You want to deploy to static hosting (Netlify, Vercel, Cloudflare Pages, GitHub Pages)
- You need the fastest possible page loads
- You don't need server-side data fetching

Use SSR when:

- You need to fetch data per request
- You have user-specific content
- You need authentication/authorization
- You're building a dashboard or admin panel

## How Prerendering Works

The prerendering process uses the centralized `NoxtConfig` system:

1. **Cleanup**: Removes `.cache/` and `dist/` directories (based on config)
2. **Manifest Preparation**:
   - Copies assets
   - Prepares islands
   - Scans pages directory
   - For each page: builds with island plugin, renders to HTML, generates route name
   - Saves rendered HTML to `.cache/pages/`
3. **Bundling**: Runs Bun.build with manifest values as entrypoints, target: browser
4. **Output**: Static HTML files, island scripts, and assets in dist/ directory

## Using the Prerender Function

### Basic Usage

```ts
import { prerender, buildConfig } from "noxt";

const config = buildConfig({});
const manifest = await prerender(config);
console.log("Prerendered:", Object.keys(manifest));
```

### With Custom Options

```ts
import { prerender, buildConfig } from "noxt";

const config = buildConfig({
  root: ".",
  pagesDir: "src/pages",
  islandsDir: "src/islands",
  assetsDir: "src/assets",
  port: 2101,
});

const manifest = await prerender(config, {
  outdir: "public",
  logManifest: false,
  minify: false,
});
```

### Prerender Options

| Option        | Type      | Default  | Description                          |
| ------------- | --------- | -------- | ------------------------------------ |
| `outdir`      | `string`  | `"dist"` | Output directory for generated files |
| `logManifest` | `boolean` | `true`   | Log the generated manifest           |
| `minify`      | `boolean` | `true`   | Minify output bundles                |

## Running Prerendering

### Command Line

```bash
# Prerender with defaults
bun run noxt prerender

# Or via package.json script
bun run prerender
```

### Programmatic

```ts
import { prerender, buildConfig } from "noxt";

async function buildStaticSite() {
  const config = buildConfig({});
  const manifest = await prerender(config, {
    outdir: "public",
    minify: true,
  });

  console.log("Prerendered pages:", Object.keys(manifest));
}

buildStaticSite();
```

### Preview in Development

```bash
bun run noxt prerender
bun dist/*
```

## Prerendered Output Structure

After running `bun run noxt prerender`, your `dist/` directory will contain:

```
dist/
├── index.html          # Prerendered home page
├── about.html          # Prerendered about page
└── islands/            # Island scripts
    ├── Counter.js
    └── ...
```

Each HTML file contains:

- The fully rendered page content
- `data-island` and `data-props` attributes for islands
- `<script type="module">` tags for island hydration
- Static CSS and assets

## Deploying Prerendered Sites

Since prerendering produces static files, you can deploy to any hosting service or CDN !

## Prerendering with Data

### Static Data

For pages with static data (data that doesn't change per request), fetch the data at build time:

```tsx
// src/pages/blog/index.tsx
import { html } from "htm/preact";

// Fetch data at build time (static)
async function getPosts() {
  // This runs at build time for prerendering
  // Could fetch from a CMS API, local files, etc.
  const response = await fetch("https://cms.example.com/api/posts");
  return response.json();
}

export default async function BlogIndex() {
  const posts = await getPosts();

  return html`
    <div>
      <h1>Blog</h1>
      ${posts.map(
        (post) => html`
          <article>
            <h2>${post.title}</h2>
            <p>${post.excerpt}</p>
          </article>
        `,
      )}
    </div>
  `;
}
```

### Client-Side Data Fetching

If you need data that changes after page load, fetch it in an island component or use SSR instead:

```tsx
// src/islands/UserProfile.tsx
import { useState, useEffect } from "preact/hooks";
import { html } from "htm/preact";

export default function UserProfile({ userId }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/user/${userId}`)
      .then((res) => res.json())
      .then(setUser)
      .finally(() => setLoading(false));
  }, [userId]);

  if (loading) return html`<div>Loading profile...</div>`;
  if (!user) return html`<div>User not found</div>`;

  return html`
    <div>
      <h2>${user.name}</h2>
      <p>${user.bio}</p>
    </div>
  `;
}
```

## Markdown Pages

Noxt automatically prerenders Markdown files (`.md`) placed in your pages directory.

- Content is converted to HTML using Bun's built-in markdown parser
- YAML frontmatter (between `---` delimiters) is parsed and passed to the layout component
- A default HTML layout is used, or you can specify a custom layout via the `layout` frontmatter field.

The `layout` property is a path from the configured root. Without a custom layout, a default HTML wrapper is used to render the page.

### Example

```markdown
---
title: About Us
layout: src/layouts/PageLayout.ts
---

# About

This is **markdown** that gets prerendered to static HTML.
```

## Integrating with Build Tools

### Custom Build Script

```ts
// scripts/build.ts
import { prerender, buildConfig, type PrerenderOptions } from "noxt";

interface BuildConfig {
  outdir?: string;
  analyticsId?: string;
}

async function build(config: BuildConfig = {}) {
  console.log("Starting static site build...");

  const noxtConfig = buildConfig({});
  const manifest = await prerender(noxtConfig, {
    outdir: config.outdir || "dist",
    minify: true,
  });

  console.log("✅ Prerendered", Object.keys(manifest).length, "pages");
}

build().catch(console.error);
```

### CI/CD Pipeline

Example GitHub Actions workflow:

```yaml
name: Deploy

on:
  push:
    branches: [main]

jobs:
  build-and-deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Setup Bun
        uses: oven-sh/setup-bun@v2

      - name: Install dependencies
        run: bun install

      - name: Prerender
        run: bun run noxt prerender

      - name: Deploy to GitHub Pages
        uses: peaceiris/actions-gh-pages@v3
        with:
          github_token: ${{ secrets.GITHUB_TOKEN }}
          publish_dir: ./dist
```

## Troubleshooting

### Prerendering Fails Silently

**Check:**

- All pages have default exports
- All pages have an extension in `.js`, `.ts`, `.jsx`, `.tsx`

**Debug:**

```bash
# Run with verbose logging
bun --log-level=debug run prerender
```

### Assets Not Loading

**Check:**

- Files are in the `assetsDir` directory
- Files have valid extensions

### Large Bundle Sizes

**Optimizations:**

- Enable minification (enabled by default)
- Reduce the size of islands
- Use smaller libraries

## Best Practices

### 1. Organize by Route

```
src/pages/
├── index.tsx
├── about.tsx
└── blog/
    ├── index.tsx
    └── post.tsx
```

### 2. Use Islands Sparingly

Only make components islands if they need interactivity.

### 3. Test Prerendered Output

Always check your prerendered HTML:

```bash
bun run noxt prerender
cat dist/index.html
```

### 4. Set Proper Cache Headers

Configure your static host to set long cache times for:

- Island script files (`Cache-Control: immutable, max-age=31536000`)
- Theme CSS (`Cache-Control: max-age=86400`)
- Images and fonts (`Cache-Control: immutable, max-age=31536000`)
