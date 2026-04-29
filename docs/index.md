# Noxt Documentation

Welcome to the Noxt documentation. Noxt is a high-performance web framework built on Bun that combines server-side rendering with selective client-side hydration through an "islands" architecture.

## Getting Started

New to Noxt? Start here:

- **[Getting Started](01-getting-started.md)** - Installation, your first project, and basic concepts

## Core Concepts

Understand how Noxt works:

- **[Architecture](02-architecture.md)** - Core architecture, key components, and design principles
- **[How It Works](03-how-it-works.md)** - Request flow, rendering pipeline, and performance optimizations
- **[Islands](04-islands.md)** - The key to interactive components with minimal client-side JavaScript
- **[Prerendering](05-prerendering.md)** - Generate static HTML files at build time
- **[SSR (Server-Side Rendering)](06-ssr.md)** - Dynamic rendering for each request with request-specific data
- **[Fetching HTML](07-fetching.md)** - Client-side HTML fetching with automatic DOM insertion

## Quick Links

| Topic                                                | Description                   |
| ---------------------------------------------------- | ----------------------------- |
| [Installation](01-getting-started.md#installation)   | Set up Noxt in your project   |
| [Pages](01-getting-started.md#creating-pages)        | File-based routing            |
| [Islands](04-islands.md)                             | Create interactive components |
| [Prerendering](05-prerendering.md)                   | Static site generation        |
| [SSR](06-ssr.md)                                     | Dynamic server-side rendering |
| [Configuration](01-getting-started.md#configuration) | NoxtConfig options            |

## API Reference

### Exported Functions

```ts
import {
  // Core utilities
  serverRender,
  prepareImportMap,

  // Build utilities
  build,
  prerender,
  buildConfig,

  // Asset utilities
  getAssetPath,

  // Fetching
  useFetchHtml,
} from "noxt";

// Types
type { BuildOptions, PrerenderOptions, NoxtConfig };
type { HttpMethod, FormDataFormat, FetchError, SwapStrategy };
```

### NoxtConfig

The `NoxtConfig` interface provides centralized configuration for your Noxt application:

```ts
interface NoxtConfig {
  root: string; // Project root directory
  pagesDir: string; // Directory containing page components
  islandsDir: string; // Directory containing island components
  assetsDir: string; // Directory for static assets
}
```

Use `buildConfig()` to create a configuration with sensible defaults:

```ts
import { buildConfig, type NoxtConfig } from "noxt";

const config: NoxtConfig = buildConfig({
  root: ".",
  pagesDir: "src/pages",
  islandsDir: "src/islands",
  assetsDir: "public/assets",
});
```

### Asset Utilities

```ts
// Get the full filesystem path for an asset
function getAssetPath(assetPath: string): string;
```

The `getAssetPath()` function returns the absolute filesystem path for an asset. It takes a path relative to your `assetsDir` configuration and returns the full path, working correctly on both Unix and Windows systems.

### Build Options

The `build()` function accepts a `NoxtConfig` as its first parameter and build-specific options:

```ts
interface BuildOptions {
  entrypoints?: string[]; // Entry point files
  outdir?: string; // Output directory (default: "dist")
  minify?: boolean; // Minify output (default: true)
}

// Usage
await build(config, { minify: false });
```

### Prerender Options

The `prerender()` function also accepts a `NoxtConfig` and prerender-specific options:

```ts
interface PrerenderOptions {
  outdir?: string; // Output directory (default: "dist")
  logManifest?: boolean; // Log the generated manifest (default: true)
  minify?: boolean; // Minify output (default: true)
}

// Usage
const manifest = await prerender(config, { logManifest: false });
```

## Project Structure

```
noxt-project/
├── docs/                    # Documentation (you're here!)
│   ├── index.md             # Table of contents
│   ├── 01-getting-started.md # Installation and basic usage
│   ├── 02-architecture.md    # Core architecture and design principles
│   ├── 03-how-it-works.md   # Request flow and rendering pipeline
│   ├── 04-islands.md         # Interactive components guide
│   ├── 05-prerendering.md   # Static site generation
│   └── 06-ssr.md            # Server-side rendering
├── src/
│   ├── common/
│   │   ├── config.ts         # NoxtConfig type and buildConfig()
│   │   ├── assets.ts         # Asset copying utilities
│   │   ├── island.ts         # Island preparation
│   │   ├── manifest.ts        # Page manifest generation
│   │   └── import_map.ts      # Import map generation for builds
│   ├── buildtime/
│   │   ├── build.ts          # SSR build function
│   │   └── prerender.ts      # Static prerendering function
│   └── runtime/
│       ├── server.ts         # Server-side rendering
│       ├── render.ts         # Client-side island rendering
│       └── fetch.ts          # Fetching utilities (useFetchHtml)
├── index.ts                 # Framework entry point with CLI
├── package.json
├── tsconfig.json
└── README.md
```

## Philosophy

Noxt is designed with the following principles:

1. **Performance First** - Minimal client-side JavaScript through islands architecture
2. **Simplicity** - Explicit APIs with minimal magic
3. **Bun Native** - Leverage Bun's speed and capabilities
4. **Small Footprint** - Preact + HTM for tiny bundle sizes
5. **Flexibility** - Works as both SSR and static site generator

## Comparison

| Feature                | Noxt | Next.js | Astro | Vue/Nuxt |
| ---------------------- | ---- | ------- | ----- | -------- |
| Bun Native             | ✅   | ❌      | ❌    | ❌       |
| Islands                | ✅   | ❌      | ✅    | ❌       |
| SSR                    | ✅   | ✅      | ✅    | ✅       |
| Static Site Generation | ✅   | ✅      | ✅    | ✅       |
| File-based Routing     | ✅   | ✅      | ⚠️    | ✅       |
| Zero Config            | ✅   | ⚠️      | ✅    | ⚠️       |
| Bundle Size Focus      | ✅   | ⚠️      | ✅    | ⚠️       |

## Need Help?

- Check the [Getting Started](01-getting-started.md) guide for basic usage
- Read [Architecture](02-architecture.md) to understand the core design
- Explore [How It Works](03-how-it-works.md) for request flow details
- Learn about [Islands](04-islands.md) for interactive components
- See [Prerendering](05-prerendering.md) for static site generation
- Understand [SSR](06-ssr.md) for dynamic server-side rendering

## Contributing

Found a bug or want to add a feature?

1. Read the source code in `src/`
2. Check existing issues/PRs
3. Open a new issue or submit a PR

All source files include Apache 2.0 license headers.
