# Getting Started

Noxt is a high-performance web framework built on [Bun](https://bun.sh) that combines server-side rendering with selective client-side hydration through "islands" architecture. It's designed for rapid development and production-grade performance with minimal configuration.

## Prerequisites

- [Bun v1.3.10](https://bun.sh) or higher installed on your system

## Quick Start

### 1. Install Dependencies

You can create a Noxt project using the template at this URL [https://github.com/Billuc/noxt-template](https://github.com/Billuc/noxt-template)

If you have an existing project, you can add noxt as a dependency using this command:

```bash
bun install git+https://github.com/Billuc/noxt.git
```

Then, you can add scripts to your `package.json` to run the dev server, build, and preview your project:

```json
{
  ...
  "scripts": {
    "dev": "bun run --hot ./index.ts",
    "build": "bun run noxt build",
    "preview": "cd dist && bun run ./index.js",
    "prerender": "bun run noxt prerender"
  }
  ...
}
```

### 2. Create Your First Page

Create a new file in the `src/pages` directory (or your configured `pagesDir`):

```tsx
// src/pages/index.tsx
import { html } from "htm/preact";

export default function HomePage() {
  return html`<h1>Welcome to Noxt!</h1>`;
}
```

Each file in the pages directory automatically becomes a route based on its path:

- `src/pages/index.ts` → `/`
- `src/pages/about.ts` → `/about`
- `src/pages/blog/post.ts` → `/blog/post`

### 3. Create an Island Component

Islands are interactive components that hydrate on the client side. To create an island, create a new Preact file in the `src/islands` directory (or your configured `islandsDir`):

```ts
// src/islands/Counter.tsx
import { useState } from "preact/hooks";
import { html } from "htm/preact";

export default function Counter({
  initialCount = 0,
}: {
  initialCount?: number;
}) {
  const [count, setCount] = useState(initialCount);

  return html`
    <div>
      <button onClick=${() => setCount(count - 1)}>-</button>
      <span>${count}</span>
      <button onClick=${() => setCount(count + 1)}>+</button>
    </div>
  `;
}
```

### 4. Use the Island in a Page

Simply import and use the island component directly in your page:

```tsx
// src/pages/index.tsx
import { html } from "htm/preact";
import Counter from "../islands/Counter";

export default function HomePage() {
  return html`
    <div>
      <h1>Welcome to Noxt!</h1>
      <p>This is server-rendered content.</p>
      <!-- The island will automatically be processed for client-side hydration -->
      <${Counter} initialCount=${5} />
    </div>
  `;
}
```

**That's it!** The build system automatically detects and processes island components.

### 5. Start the Development Server

```bash
bun dev
```

Your application will be available at `http://localhost:2101` (or the port specified in your configuration).

## Project Structure

```
noxt-project/
├── src/
│   ├── pages/           # Page components (routes)
│   │   └── index.tsx     # Home page (/)
│   ├── islands/         # Island components (automatically detected)
│   │   └── Counter.tsx  # Example interactive island
│   └── assets/          # Static assets (optional)
├── index.ts             # Framework entry point (auto-imported)
├── package.json
└── tsconfig.json
```

## Configuration

Noxt now uses a centralized `NoxtConfig` type for configuration. You can pass configuration options when calling `prepareImportMap()`, `build()` or `prerender()`:

```ts
import { buildConfig, type NoxtConfig, build, prerender } from "noxt";

const config: NoxtConfig = buildConfig({
  root: process.cwd(),
  pagesDir: "src/pages",
  islandsDir: "src/islands",
  assetsDir: "src/assets",
});

// Use with build
await build(config, { minify: false });

// Use with prerender
const manifest = await prerender(config, { logManifest: true });
```

### Configuration Options

| Option       | Default         | Description                            |
| ------------ | --------------- | -------------------------------------- |
| `root`       | `process.cwd()` | Project root directory                 |
| `pagesDir`   | `"src/pages"`   | Directory containing page components   |
| `islandsDir` | `"src/islands"` | Directory containing island components |
| `assetsDir`  | `"src/assets"`  | Directory for static assets            |

### Using Configuration in Scripts

Update your `package.json` scripts to use the new CLI:

```json
{
  "scripts": {
    "dev": "bun run --hot ./index.ts",
    "build": "bun run noxt build",
    "prerender": "bun run noxt prerender",
    "preview": "cd dist && bun run ./index.js"
  }
}
```

Or create a custom build script:

```ts
// scripts/build.ts
import { buildConfig, build, prerender } from "noxt";

const config = buildConfig({
  // Custom configuration
  assetsDir: "src/public",
});

// Build for SSR
console.log("Building for SSR...");
await build(config);
console.log("SSR build complete!");

// Or prerender static site
console.log("Prerendering static site...");
const manifest = await prerender(config);
console.log("Prerendered pages:", Object.keys(manifest));
```

## Using Assets

Place your static assets (images, CSS, fonts, config files, etc.) in your configured `assetsDir` (default: `src/assets`). Use the `getAssetPath()` function to get the full filesystem path for an asset:

```tsx
// src/pages/index.ts
import { html } from "htm/preact";
import { getAssetPath } from "noxt";

// Get the full path to an asset
export default async function HomePage() {
  // Read an asset using Bun.file()
  const configPath = getAssetPath("data/config.json");
  const config = await Bun.file(configPath).json();

  // Or for serving assets
  return html`
    <div>
      <img src=${getAssetPath("images/logo.png")} />
      <h1>Welcome to Noxt!</h1>
      <p>Config loaded: ${config.version}</p>
    </div>
  `;
}
```

The `getAssetPath()` function returns the absolute filesystem path, working correctly on both Unix and Windows systems.

## Available Scripts

| Script                   | Description                                |
| ------------------------ | ------------------------------------------ |
| `bun install`            | Install project dependencies               |
| `bun dev`                | Start development server with hot reload   |
| `bun run noxt build`     | Build for production (SSR bundle)          |
| `bun run noxt prerender` | Prerender a static site (no SSR or routes) |
| `bun run preview`        | Preview the production build locally       |

## Bundle Size

Noxt is built to minimize client-side JavaScript. By combining server-side rendering with selective, per-component hydration (interactive "islands"), Noxt avoids shipping and rehydrating a full client runtime like many SPA frameworks do. The practical benefits:

- **Much smaller client payloads:** Hydrate only what's interactive, not the whole page.
- **Faster load and render:** Less bytes over the network and less JS to parse/execute improves First Contentful Paint and Time to Interactive.
- **Lower bandwidth & CPU costs:** Smaller payloads reduce data transfer and battery/CPU use on low-end devices.

How Noxt achieves this:

- **Automatic island detection:** Components in `src/islands` are automatically processed for client-side hydration
- **Prefer lightweight libraries:** Preact + HTM are intentionally small compared to heavier alternatives like React
- **Code-split islands:** Each island is bundled separately and only loaded when needed

## Next Steps

- [Learn about Noxt's Architecture](02-architecture.md) - Core design principles
- [Understand How It Works](03-how-it-works.md) - Request flow and rendering pipeline
- [Explore Islands](04-islands.md) - Interactive components with client-side hydration
- [Discover Prerendering](05-prerendering.md) - Static site generation
- [Dive into SSR](06-ssr.md) - Dynamic server-side rendering
