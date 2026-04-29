# How It Works

Noxt combines server-side rendering with selective client-side hydration through an "islands" architecture. This approach delivers the best of both worlds: fast initial page loads with minimal JavaScript, and interactive components that come to life when needed.

## Request Handling Flow

### Development Mode (`bun dev`)

1. **Server starts** on the configured port
2. **Islands are automatically detected** in the islands directory
3. **For each island**:
   - A unique hash is generated from the component's file path
   - A client-side script file is created automatically
   - The island is rendered as a placeholder div with `data-island` and `data-props` attributes
   - A `<script type="module">` tag is added to load the island's client-side code
4. **Pages are detected** and prerendered
5. **Server starts** using the import map generated during page prerender
6. **Incoming request** hits the server
7. **Complete HTML response** is sent to the client
8. **Client-side**: Browser parses HTML, loads island scripts, and hydrates interactive components

### Production Build (`bun run noxt build`)

1. **Cache and dist directories** are cleared
2. **Manifest is prepared**:
   - All pages are prerendered to HTML
   - Assets are copied/symlinked to cache
   - A manifest mapping routes to file paths is created
3. **Bun.build** bundles the application with:
   - Import map plugin for dynamic page imports
   - Target set to "bun" for server-side execution
   - Code splitting enabled
   - Minification enabled (configurable)
4. **Output** is written to `dist/` directory

### Static Prerendering (`bun run noxt prerender`)

1. **Cache and dist directories** are cleared
2. **Manifest is prepared** (same as build)
3. **Bun.build** bundles with:
   - All manifest entry points as entrypoints
   - Target set to "browser" for client-side execution
   - Each page becomes a static HTML file
4. **Output** is written to `dist/` directory

## File-based Routing

Noxt uses a simple file-based routing system:

```
src/pages/
├── index.ts          → /
├── about.ts          → /about
├── blog/
│   ├── index.ts      → /blog
│   └── post.ts       → /blog/post
└── api/
    └── hello.ts      → /api/hello
```

Each file must export a default component. The route is derived from:

1. The file path relative to `pagesDir` (from NoxtConfig)
2. Removing the file extension
3. Special handling for `index` files (removes `/index` from the path)

## Rendering Pipeline

### Server-Side Rendering

```
src/runtime/server.ts → serverRender()
├── Takes: page component + props
├── Uses: preact-render-to-string (async)
└── Returns: Response with HTML body
```

The `serverRender` function takes a Preact component and renders it to an HTML string, which is then wrapped in a Response object with the appropriate headers. Islands within the page are automatically processed by the build system.

### Island Processing

Island processing is automatic:

1. **Island Preparation**:
   - Scans the `islandsDir` directory for `.tsx`, `.ts`, `.jsx`, `.js` files
   - For each island file:
     - Generates a SHA-256 hash from the file path
     - Creates a prerender script in `.cache`
     - The script imports `renderComponent` from runtime and the island component
     - Returns `IslandData` object with fullPath, prerenderPath, and hash

2. **Manifest Preparation**:
   - For each page:
     - Creates an island prepare plugin that transforms island imports
     - The plugin generates loader divs with `data-island` and `data-props`
     - Adds `<script type="module">` tags pointing to the prerendered island scripts
   - Renders the page to HTML using Preact
   - Saves to `.cache`

3. **Client-side**:
   - Queries DOM for elements with matching `data-island` hash
   - Parses props from `data-props` attribute
   - Renders the Preact component into each matching element

The island hydration process ensures that:

- The initial HTML includes the fully rendered content (no loading states)
- JavaScript only loads for components that need interactivity
- Each island hydrates independently, so one slow island doesn't block others
- Props are serialized to JSON and deserialized client-side

## Performance Optimizations

### Minimal Client-Side JavaScript

- Only interactive islands are hydrated on the client
- Static content stays as plain HTML (no rehydration overhead)
- Each island bundles only its dependencies
- Islands are code-split by default

### Smart Bundling

- **Server build**: Bundles with `Bun.target="bun"` for optimal server performance
- **Static build**: Bundles with `Bun.target="browser"` for client compatibility
- **Code splitting**: Enabled by default to load only what's needed
- **Minification**: Reduces bundle sizes in production (configurable)

### Efficient Caching

- Prerendered pages cached in `.cache/pages/`
- Assets symlinked to `.cache/assets/` (no copying, just filesystem links)
- Build artifacts cached by Bun.build
- Island scripts are generated once and reused across pages

## Comparison with Other Frameworks

| Feature            | Noxt | Next.js | Astro | Remix |
| ------------------ | ---- | ------- | ----- | ----- |
| SSR                | ✅   | ✅      | ✅    | ✅    |
| Islands            | ✅   | ❌      | ✅    | ❌    |
| Zero Config        | ✅   | ⚠️      | ✅    | ⚠️    |
| Bun Native         | ✅   | ❌      | ❌    | ❌    |
| File-based Routing | ✅   | ✅      | ⚠️    | ✅    |
| Preact Support     | ✅   | ❌      | ✅    | ❌    |
| Bundle Size Focus  | ✅   | ⚠️      | ✅    | ⚠️    |

Noxt stands out by combining:

- Bun's native speed
- Islands architecture for minimal client JS
- Preact's small footprint
- **Simplified API with automatic island detection**
- **Centralized configuration with NoxtConfig**

## When to Use What

| Use Case                   | Recommended Approach  |
| -------------------------- | --------------------- |
| Marketing site             | Prerendering (static) |
| Blog                       | Prerendering (static) |
| Documentation              | Prerendering (static) |
| Dashboard                  | SSR                   |
| Admin panel                | SSR                   |
| E-commerce (product pages) | Prerendering          |
| E-commerce (cart/checkout) | SSR                   |
| Portfolio                  | Prerendering          |
| API endpoints              | SSR                   |

For most projects, a **hybrid approach** works best: use prerendering for static content (marketing pages, documentation, blog posts) and SSR for dynamic content (user dashboards, authenticated pages).
