# Prerendering

Prerendering is Noxt's approach to generating static HTML files at build time. Unlike traditional static site generators, Noxt's prerendering is integrated with the islands architecture, allowing you to create fast, static sites with selective interactivity.

## What is Prerendering?

Prerendering is the process of:

1. **Rendering pages to HTML** on the server during build
2. **Extracting island scripts** for client-side hydration
3. **Generating static files** that can be served without a Node.js server
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

### The Prerendering Process

```
┌─────────────────────────────────────────────────────────────┐
│                    Prerendering Flow                             │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  1. CLEANUP            2. MANIFEST PREPARATION                │
│  ─────────────         ────────────────────────              │
│  - Remove .cache/      - copyAssets()                          │
│  - Remove dist/        - Scan pages directory                  │
│                         - For each page:                       │
│                           - Import page component              │
│                           - Render to HTML                     │
│                           - Generate route name                │
│                           - Save to .cache/pages/              │
│                         - Build manifest object                │
│                                                             │
│  3. BUNDLING           4. OUTPUT                               │
│  ─────────────         ──────────────                         │
│  - Bun.build() with:   - Static HTML files                     │
│    - manifest values   - Island script files                   │
│      as entrypoints    - Symlinked assets                     │
│    - target: browser    - All in dist/ directory              │
│    - splitting: true                                          │
│    - minify: true                                              │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Understanding the Manifest

The manifest is a mapping of routes to file paths:

```ts
{
  "/": "C:\\project\\.cache\\pages\\index.html",
  "/about": "C:\\project\\.cache\\pages\\about.html",
  "/blog/post": "C:\\project\\.cache\\pages\\blog\\post.html"
}
```

This manifest is used by:

- **Prerendering**: As entrypoints for Bun.build
- **Build (SSR)**: To generate import maps for dynamic page loading

## Using the Prerender Function

### Basic Usage

```ts
import { prerender } from "noxt";

// Prerender all pages with defaults
await prerender();
```

### With Custom Options

```ts
import { prerender } from "noxt";

await prerender({
  // Output to a different directory
  outdir: "public",

  // Build for Bun runtime instead of browser
  target: "bun",

  // Don't clear cache before prerendering
  clearCache: false,

  // Don't log the manifest
  logManifest: false,

  // Disable code splitting
  splitting: false,

  // Disable minification (useful for debugging)
  minify: false,
});
```

### Prerender Options

| Option        | Type                                              | Default     | Description                               |
| ------------- | ------------------------------------------------- | ----------- | ----------------------------------------- |
| `outdir`      | `string`                                          | `DIST`      | Output directory for generated files      |
| `target`      | `"bun" \| "browser" \| "node" \| "deno" \| "jsc"` | `"browser"` | Build target for Bun.build                |
| `clearCache`  | `boolean`                                         | `true`      | Clear cache directory before prerendering |
| `clearDist`   | `boolean`                                         | `true`      | Clear dist directory before prerendering  |
| `logManifest` | `boolean`                                         | `true`      | Log the generated manifest                |
| `splitting`   | `boolean`                                         | `true`      | Enable code splitting                     |
| `minify`      | `boolean`                                         | `true`      | Minify output bundles                     |

## Running Prerendering

### Command Line

```bash
# Prerender with defaults
bun run prerender

# With custom options (requires a script in package.json)
bun run prerender:static
```

### Programmatic

```ts
// In your build script
import { prerender } from "noxt";

async function buildStaticSite() {
  const manifest = await prerender({
    outdir: "public",
    minify: true,
  });

  console.log("Prerendered pages:", Object.keys(manifest));
}

buildStaticSite();
```

## Prerendered Output Structure

After running `bun run prerender`, your `dist/` directory will contain:

```
dist/
├── index.html          #Prerendered home page
├── about.html          #Prerendered about page
└── assets/
    ├── abc123.js        # Island script files
    └── ...              # Copied/symlinked assets
```

Each HTML file contains:

- The fully rendered page content
- `data-island` and `data-props` attributes for islands
- `<script type="module">` tags for island hydration
- Static CSS and assets

## Deploying Prerendered Sites

### To Any Static Host

Since prerendering produces static files, you can deploy to any hosting service:

```bash
# Build and deploy to Netlify
bun run prerender
netlify deploy --dir=dist --prod

# Deploy to Vercel
bun run prerender
vercel --prod

# Deploy to GitHub Pages
bun run prerender
gh-pages -d dist
```

### With a CDN

The static files can be served from any CDN:

- Cloudflare Pages
- AWS S3 + CloudFront
- Google Cloud Storage
- Azure Static Web Apps

## Incremental Prerendering

Currently, Noxt clears the cache and dist directories before each prerender. For large sites, you might want to implement incremental builds:

```ts
import { prerender } from "noxt";
import { prepareManifest } from "noxt/src/manifest";

// Custom prerender with caching
async function incrementalPrerender() {
  const manifest = await prepareManifest();

  // Only rebuild changed pages
  // (You'd need to track file hashes)

  await Bun.build({
    entrypoints: Object.values(manifest),
    outdir: "dist",
    target: "browser",
    splitting: true,
    minify: true,
  });
}
```

## Prerendering with Data

### Static Data

For pages with static data (data that doesn't change per request), fetch the data at build time:

```tsx
// pages/blog/index.tsx
import { html } from "htm/preact";

// Fetch data at build time (static)
async function getPosts() {
  // This runs at build time for prerendering
  const response = await fetch("https://api.example.com/posts");
  return response.json();
}

export default async function BlogIndex() {
  const posts = await getPosts();

  return html`
    <div>
      <h1>Blog</h1>
      ${posts.map((post) => html`<article>${post.title}</article>`)}
    </div>
  `;
}
```

### Server-Side Data

If you need per-request data, use SSR instead of prerendering, or fetch data client-side in an island:

```tsx
// components/UserProfile.tsx
import { useState, useEffect } from "preact/hooks";
import { html } from "htm/preact";
import { defineIsland } from "noxt";

function UserProfile({ userId }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/user/${userId}`)
      .then((res) => res.json())
      .then((data) => {
        setUser(data);
        setLoading(false);
      });
  }, [userId]);

  if (loading) return html`<div>Loading...</div>`;
  if (!user) return html`<div>User not found</div>`;

  return html`<div>${user.name}</div>`;
}

export default defineIsland(UserProfile, import.meta.path);
```

## Handling Assets

### Static Assets

Place static assets (images, CSS, etc.) in your `ASSETS_DIR` (default: `src/assets`):

```
src/assets/
├── styles.css
├── logo.png
└── images/
    └── hero.jpg
```

These will be automatically copied/symlinked to `.cache/assets/` during prerendering and included in the final output.

### Referencing Assets

```tsx
// In your components
import { html } from "htm/preact";

export default function Page() {
  return html`
    <div>
      <img src="/assets/logo.png" alt="Logo" />
      <link rel="stylesheet" href="/assets/styles.css" />
    </div>
  `;
}
```

## Integrating with Build Tools

### Custom Build Script

Create a custom build script that runs prerendering:

```ts
// scripts/build.ts
import { prerender } from "noxt";

async function build() {
  console.log("Starting prerender...");

  const manifest = await prerender({
    outdir: "dist",
    minify: true,
  });

  console.log("✅ Prerendered", Object.keys(manifest).length, "pages");
}

build().catch(console.error);
```

Add to `package.json`:

```json
{
  "scripts": {
    "build": "bun run scripts/build.ts",
    "prerender": "bun run scripts/build.ts"
  }
}
```

### CI/CD Pipeline

Example GitHub Actions workflow:

```yaml
name: Deploy

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Setup Bun
        uses: oven-sh/setup-bun@v2

      - name: Install dependencies
        run: bun install

      - name: Prerender
        run: bun run prerender

      - name: Deploy
        uses: peaceiris/actions-gh-pages@v3
        with:
          github_token: ${{ secrets.GITHUB_TOKEN }}
          publish_dir: ./dist
```

## Troubleshooting

### Prerendering Fails Silently

- Check that your pages have default exports
- Verify all island components use `defineIsland()`
- Ensure `import.meta.path` is passed correctly

### Islands Don't Hydrate

- Check the `data-island` hash matches the script file
- Verify the script tag's `src` attribute is correct
- Look for JavaScript errors in the console

### Assets Not Loading

- Ensure files are in the `ASSETS_DIR`
- Check file permissions
- Verify symlinks are supported on your system

### Large Bundle Sizes

- Use code splitting (`splitting: true`)
- Enable minification (`minify: true`)
- Consider lazy-loading heavy islands
- Use smaller libraries (Preact instead of React)

## Best Practices

### 1. Organize by Route

```
src/pages/
├── index.ts
├── about.ts
└── blog/
    ├── index.ts      # /blog
    └── [slug].ts     # /blog/any-post-name
```

### 2. Use Islands Sparingly

Only make components islands if they need interactivity:

```tsx
// ✅ Good: Only button is an island
<StaticContent>
  <InteractiveButton />
</StaticContent>

// ❌ Bad: Entire section is an island
<InteractiveSection>...</InteractiveSection>
```

### 3. Preload Important Islands

Add `<link rel="modulepreload">` for critical islands:

```tsx
html`
  <head>
    <link rel="modulepreload" href="/assets/main-island.js" />
  </head>
`;
```

### 4. Test Prerendered Output

Always check your prerendered HTML:

```bash
# Build and check
bun run prerender
cat dist/index.html
```
