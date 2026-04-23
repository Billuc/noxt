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

The manifest generation process:

1. Scans the `PAGES_DIR` for `.ts`, `.tsx`, `.js`, `.jsx` files
2. For each file, imports and renders the default export component
3. Generates a route name based on the file path
4. Saves the rendered HTML to `.cache/pages/`
5. Builds the manifest object mapping routes to file paths

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

| Option        | Type         | Default | Description                               |
| ------------- | ------------ | ------- | ----------------------------------------- |
| `outdir`      | `string`     | `DIST`  | Output directory for generated files      |
| `target`      | `Bun.Target` | `"bun"` | Build target for Bun.build                |
| `clearCache`  | `boolean`    | `true`  | Clear cache directory before prerendering |
| `clearDist`   | `boolean`    | `true`  | Clear dist directory before prerendering  |
| `logManifest` | `boolean`    | `true`  | Log the generated manifest                |
| `splitting`   | `boolean`    | `true`  | Enable code splitting                     |
| `minify`      | `boolean`    | `true`  | Minify output bundles                     |

## Running Prerendering

### Command Line

```bash
# Prerender with defaults
bun run prerender
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

### Preview in Development

While `bun dev` provides hot reload for development, you can also test prerendering locally:

```bash
# Prerender and serve locally
bun run prerender
bun dist/*
```

This will start a static file server on port 3000 by default.

## Prerendered Output Structure

After running `bun run prerender`, your `dist/` directory will contain:

```
dist/
├── index.html          # Prerendered home page
├── about.html          # Prerendered about page
└── assets/
    ├── abc123.js        # Island script files
    └── ...              # Copied/symlinked assets
```

Each HTML file contains:

- The fully rendered page content
- `data-island` and `data-props` attributes for islands
- `<script type="module">` tags for island hydration
- Static CSS and assets

Example output HTML:

```html
<!DOCTYPE html>
<html>
  <head>
    <title>My Page</title>
  </head>
  <body>
    <h1>Welcome</h1>
    <p>This is static content.</p>

    <!-- Island placeholder -->
    <div data-island="abc123..." data-props='{"initialCount":5}'></div>

    <!-- Island script -->
    <script type="module" src="/assets/abc123...js"></script>
  </body>
</html>
```

## Deploying Prerendered Sites

Since prerendering produces static files, you can deploy to any hosting service or CDN !

<!-- ## Incremental Prerendering

Currently, Noxt clears the cache and dist directories before each prerender. For large sites, you might want to implement incremental builds:

```ts
import { prerender } from "noxt";
import { prepareManifest } from "noxt/src/manifest";
import { CACHE_DIR } from "noxt/src/paths";

// Custom incremental prerender
async function incrementalPrerender() {
  const manifest = await prepareManifest();

  // Only rebuild changed pages
  // (You'd need to track file hashes and compare)

  await Bun.build({
    entrypoints: Object.values(manifest),
    outdir: "dist",
    target: "browser",
    splitting: true,
    minify: true,
  });
}
```

For a production incremental build system, you'd want to:

1. Track file modification times or content hashes
2. Compare with previous build manifest
3. Only rebuild pages that have changed
4. Preserve unchanged island scripts -->

## Prerendering with Data

### Static Data

For pages with static data (data that doesn't change per request), fetch the data at build time:

```tsx
// pages/blog/index.tsx
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

**Data sources for static content:**

- CMS APIs (Contentful, Sanity, Strapi)
- Local Markdown files
- JSON data files
- Database exports
- Any data that doesn't change per user

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
  const [error, setError] = useState(null);

  useEffect(() => {
    fetch(`/api/user/${userId}`)
      .then((res) => {
        if (!res.ok) throw new Error("Not found");
        return res.json();
      })
      .then((data) => {
        setUser(data);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  }, [userId]);

  if (loading) return html`<div>Loading profile...</div>`;
  if (error) return html`<div>Error: ${error}</div>`;
  if (!user) return html`<div>User not found</div>`;

  return html`<div>
    <h2>${user.name}</h2>
    <p>${user.bio}</p>
  </div>`;
}

export default defineIsland(UserProfile, import.meta.path);
```

This island will fetch user data on the client side when it hydrates. The initial HTML will show a loading state (or be empty), then populate with data once fetched.

## Handling Assets

### Static Assets

Place static assets (images, CSS, fonts, etc.) in your `ASSETS_DIR` (default: `src/assets`):

```
src/assets/
├── styles/
│   ├── main.css
│   └── theme.css
├── images/
│   ├── logo.png
│   └── hero.jpg
├── fonts/
│   └── Inter.woff2
└── favicon.ico
```

These will be automatically copied/symlinked to `.cache/assets/` during prerendering and included in the final output.

### Referencing Assets

```tsx
// In your components
import { html } from "htm/preact";

export default function Page() {
  return html`
    <head>
      <link rel="stylesheet" href="/assets/styles/main.css" />
      <link rel="icon" href="/assets/favicon.ico" />
    </head>
    <body>
      <img src="/assets/images/logo.png" alt="Logo" />
      <div style="font-family: 'Inter', sans-serif;">Content</div>
    </body>
  `;
}
```

### Asset Paths

| Original Location         | Prerendered Location       | URL in HTML            |
| ------------------------- | -------------------------- | ---------------------- |
| `src/assets/img.png`      | `dist/assets/img.png`      | `/assets/img.png`      |
| `src/assets/css/main.css` | `dist/assets/css/main.css` | `/assets/css/main.css` |

### Image Optimization

For production sites, consider optimizing images before prerendering:

```ts
import { prerender } from "noxt";
import sharp from "sharp";

async function optimizeImages() {
  // Use sharp or similar to optimize images
  // Resize, compress, convert to WebP, etc.
}

async function build() {
  await optimizeImages();
  await prerender();
}
```

## Integrating with Build Tools

### Custom Build Script

Create a custom build script that runs prerendering with additional processing:

```ts
// scripts/build.ts
import { prerender, type PrerenderOptions } from "noxt";

interface BuildConfig {
  prerenderOptions?: PrerenderOptions;
  analyticsId?: string;
}

async function build(config: BuildConfig = {}) {
  console.log("Starting static site build...");

  const manifest = await prerender({
    outdir: "dist",
    minify: true,
    ...config.prerenderOptions,
  });

  // Inject analytics if configured
  if (config.analyticsId) {
    const analyticsScript = `
      <script async src="https://www.googletagmanager.com/gtag/js?id=${config.analyticsId}"></script>
      <script>
        window.dataLayer = window.dataLayer || [];
        function gtag(){dataLayer.push(arguments);}
        gtag('js', new Date());
        gtag('config', '${config.analyticsId}');
      </script>
    `;

    // Append to all HTML files
    for (const route of Object.keys(manifest)) {
      const filePath = manifest[route];
      const html = await Bun.file(filePath).text();
      const updated = html.replace("</head>", `${analyticsScript}</head>`);
      await Bun.write(filePath, updated);
    }
  }

  console.log("✅ Prerendered", Object.keys(manifest).length, "pages");
}

build().catch(console.error);
```

Add to `package.json`:

```json
{
  "scripts": {
    "build": "bun run scripts/build.ts",
    "build:dev": "bun run scripts/build.ts --minify=false",
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
  build-and-deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Setup Bun
        uses: oven-sh/setup-bun@v2

      - name: Install dependencies
        run: bun install

      - name: Prerender
        run: bun run prerender

      - name: Deploy to GitHub Pages
        uses: peaceiris/actions-gh-pages@v3
        with:
          github_token: ${{ secrets.GITHUB_TOKEN }}
          publish_dir: ./dist
          cname: my-site.com
```

Example Vercel configuration:

```yaml
# vercel.json
{
  "version": 2,
  "builds": [{ "src": "index.ts", "use": "@vercel/bun" }],
  "outputs": [{ "from": "/dist", "to": "/" }],
}
```

## Troubleshooting

### Prerendering Fails Silently

**Check:**

- All pages have default exports
- All island components use `defineIsland()`
- `import.meta.path` is passed correctly to `defineIsland()`
- No circular dependencies between pages

**Debug:**

```bash
# Run with verbose logging
bun --log-level=debug run prerender
```

### Islands Don't Hydrate

**Check:**

- The `data-island` hash in HTML matches the script filename
- The script tag's `src` attribute is correct
- No JavaScript errors in the console
- The script file exists in `dist/assets/`

**Common causes:**

- Wrong `import.meta.path` in `defineIsland()`
- Missing default export on island component
- Props that can't be serialized to JSON
- Script file not being copied to output directory

### Assets Not Loading

**Check:**

- Files are in the `ASSETS_DIR` (default: `src/assets`)
- File permissions allow reading
- Symlinks are supported on your system (or files are copied)
- The asset path in HTML is correct

**Debug:**

```bash
# Check what's in the output directory
ls -la dist/assets/
```

### Large Bundle Sizes

**Optimizations:**

- Use code splitting (`splitting: true`)
- Enable minification (`minify: true`)
- Consider lazy-loading heavy islands
- Use smaller libraries (Preact instead of React)
- Remove unused dependencies

**Audit:**

```bash
# Check bundle sizes
du -sh dist/assets/*.js

# Or use a tool like Bundlesize
npx bundlesize dist/assets/*.js
```

### Routes Not Found

**Check:**

- Files exist in `PAGES_DIR`
- Files have valid extensions (`.ts`, `.tsx`, `.js`, `.jsx`)
- Files export a default component
- Route naming follows conventions

**Common issues:**

- File has a different extension than configured
- File is not in the correct directory
- File doesn't export a default

## Best Practices

### 1. Organize by Route

```
src/pages/
├── index.ts
├── about.ts
├── contact.ts
└── blog/
    ├── index.ts      # /blog
    ├── post.ts       # /blog/post
    └── category/
        └── index.ts  # /blog/category
```

### 2. Use Islands Sparingly

Only make components islands if they need interactivity:

```tsx
// ✅ Good: Only button is an island
<div>
  <h1>Page Title</h1>
  <p>Static content...</p>
  <LikeButton />  {/* Only this is an island */}
</div>

// ❌ Bad: Entire section is an island
<InteractiveSection>  {/* This will hydrate everything */}
  <h1>Page Title</h1>
  <p>Static content...</p>
  <LikeButton />
</InteractiveSection>
```

### 3. Preload Important Islands

Add `<link rel="modulepreload">` for critical islands:

```tsx
import { html } from "htm/preact";

export default function Page() {
  return html`
    <head>
      <link rel="modulepreload" href="/assets/main-island.js" />
      <link rel="modulepreload" href="/assets/critical-component.js" />
    </head>
    <body>
      <!-- page content -->
    </body>
  `;
}
```

### 4. Test Prerendered Output

Always check your prerendered HTML:

```bash
# Build and inspect
bun run prerender

# Check a specific page
cat dist/index.html

# Validate HTML
npx html-validate dist/**/*.html
```

### 5. Use Absolute URLs for Assets

Always use absolute paths (`/assets/...`) rather than relative paths (`../assets/...`):

```tsx
// ✅ Good: Absolute path
html`<img src="/assets/logo.png" />`;

// ❌ Bad: Relative path
html`<img src="../assets/logo.png" />`;
```

### 6. Set Proper Cache Headers

For optimal performance, configure your static host to set long cache times for:

- Island script files (`Cache-Control: immutable, max-age=31536000`)
- Theme CSS (`Cache-Control: max-age=86400`)
- Images and fonts (`Cache-Control: immutable, max-age=31536000`)
