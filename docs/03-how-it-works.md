# How It Works

Noxt combines server-side rendering with selective client-side hydration through an "islands" architecture. This approach delivers the best of both worlds: fast initial page loads with minimal JavaScript, and interactive components that come to life when needed.

## Request Handling Flow

### Development Mode (`bun dev`)

1. **Server starts** on the configured port
2. **Incoming request** hits the server
3. **Page component** is imported dynamically based on the route
4. **Page renders** to HTML on the server using Preact
5. **Islands are identified** in the page component
6. **For each island**:
   - A unique hash is generated from the component's file path
   - A client-side script file is created in `.cache/assets/`
   - The island is rendered as a placeholder div with `data-island` and `data-props` attributes
   - A `<script type="module">` tag is added to load the island's client-side code
7. **Complete HTML response** is sent to the client
8. **Client-side**: Browser parses HTML, loads island scripts, and hydrates interactive components

### Production Build (`bun run build`)

1. **Cache and dist directories** are cleared
2. **Manifest is prepared**:
   - All pages are prerendered to HTML
   - Assets are copied/symlinked to cache
   - A manifest mapping routes to file paths is created
3. **Bun.build** bundles the application with:
   - Import map plugin for dynamic page imports
   - Target set to "bun" for server-side execution
   - Code splitting enabled
   - Minification enabled
4. **Output** is written to `dist/` directory

### Static Prerendering (`bun run prerender`)

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
1. The file path relative to `PAGES_DIR`
2. Removing the file extension
3. Special handling for `index` files (removes `/index` from the path)

## Rendering Pipeline

### Server-Side Rendering

```
src/server.ts → serverRender()
├── Takes: page component + props
├── Uses: preact-render-to-string (async)
└── Returns: Response with HTML body
```

The `serverRender` function takes a Preact component and renders it to an HTML string, which is then wrapped in a Response object with the appropriate headers.

### Island Hydration

```
src/island.ts → defineIsland(), getIslandPath()
src/server.ts → asIsland()
  ├── Generates SHA-256 hash from component path
  ├── Creates island script file (.cache/assets/{hash}.js)
  │   └── Contains: import renderComponent + island component + hydration call
  ├── Returns component that renders:
  │   ├── <div data-island="{hash}" data-props="{json}"></div>
  │   └── <script type="module" src="{path}"></script>
  └── Client-side: renderComponent() mounts Preact component into div

src/render.ts → renderComponent()
  ├── Queries DOM for elements with matching data-island hash
  ├── Parses props from data-props attribute
  └── Renders component into each matching element
```

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

### Smart Bundling

- **Server build**: Bundles with Bun.target="bun" for optimal server performance
- **Static build**: Bundles with Bun.target="browser" for client compatibility
- **Code splitting**: Enabled by default to load only what's needed
- **Minification**: Reduces bundle sizes in production

### Efficient Caching

- Prerendered pages cached in `.cache/pages/`
- Assets symlinked to `.cache/assets/` (no copying, just filesystem links)
- Build artifacts cached by Bun.build

## Comparison with Other Frameworks

| Feature | Noxt | Next.js | Astro | Remix |
|---------|------|---------|-------|-------|
| SSR | ✅ | ✅ | ✅ | ✅ |
| Islands | ✅ | ❌ | ✅ | ❌ |
| Zero Config | ✅ | ⚠️ | ✅ | ⚠️ |
| Bun Native | ✅ | ❌ | ❌ | ❌ |
| File-based Routing | ✅ | ✅ | ⚠️ | ✅ |
| Preact Support | ✅ | ❌ | ✅ | ❌ |
| Bundle Size Focus | ✅ | ⚠️ | ✅ | ⚠️ |

Noxt stands out by combining:
- Bun's native speed
- Islands architecture for minimal client JS
- Preact's small footprint
- Simple, explicit APIs

## When to Use What

| Use Case | Recommended Approach |
|----------|---------------------|
| Marketing site | Prerendering (static) |
| Blog | Prerendering (static) |
| Documentation | Prerendering (static) |
| Dashboard | SSR |
| Admin panel | SSR |
| E-commerce (product pages) | Prerendering |
| E-commerce (cart/checkout) | SSR |
| Portfolio | Prerendering |
| API endpoints | SSR |

For most projects, a **hybrid approach** works best: use prerendering for static content (marketing pages, documentation, blog posts) and SSR for dynamic content (user dashboards, authenticated pages).
