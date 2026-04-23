# Getting Started

Noxt is a high-performance web framework built on [Bun](https://bun.sh) that combines server-side rendering with selective client-side hydration through "islands" architecture. It's designed for rapid development and production-grade performance with minimal configuration.

## Prerequisites

- [Bun v1.3.10](https://bun.sh) or higher installed on your system

## Quick Start

### 1. Install Dependencies

```bash
bun install git+https://github.com/Billuc/noxt.git
```

### 2. Create Your First Page

Create a new file in the `src/pages` directory (or your configured `PAGES_DIR`):

```tsx
// src/pages/index.ts
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

Islands are interactive components that hydrate on the client side. Here's how to create one:

```tsx
// src/components/Counter.tsx
import { useState } from "preact/hooks";
import { html } from "htm/preact";
import { defineIsland } from "noxt";

function Counter() {
  const [count, setCount] = useState(0);

  return html`
    <div>
      <button onClick=${() => setCount(count - 1)}>-</button>
      <span>${count}</span>
      <button onClick=${() => setCount(count + 1)}>+</button>
    </div>
  `;
}

export default defineIsland(Counter, import.meta.path);
```

### 4. Use the Island in a Page

```tsx
// src/pages/index.ts
import { html } from "htm/preact";
import { asIsland } from "noxt";
import Counter from "../components/Counter";

export default async function HomePage() {
  const InteractiveCounter = await asIsland(Counter);

  return html`
    <div>
      <h1>Welcome to Noxt!</h1>
      <p>This is server-rendered content.</p>
      <${InteractiveCounter} initialCount="{5}" />
    </div>
  `;
}
```

### 5. Start the Development Server

```bash
bun dev
```

Your application will be available at `http://localhost:2101` (or the port specified in your environment).

## Project Structure

```
noxt-project/
├── src/
│   ├── pages/           # Page components (routes)
│   │   └── index.ts     # Home page (/)
│   ├── components/      # Reusable components
│   │   └── Counter.tsx  # Example island component
│   └── assets/          # Static assets (optional)
├── index.ts             # Framework entry point (auto-imported)
├── package.json
└── tsconfig.json
```

## Configuration

Noxt uses environment variables for configuration. Create a `.env` file in your project root:

```bash
# Server configuration
PORT=2101
MODE=development

# Directory configuration
PAGES_DIR=src/pages
ASSETS_DIR=src/assets
```

### Environment Variables

| Variable     | Default       | Description                              |
| ------------ | ------------- | ---------------------------------------- |
| `PORT`       | `2101`        | Port number for the server               |
| `MODE`       | `development` | Run mode (`development` or `production`) |
| `PAGES_DIR`  | `src/pages`   | Directory containing page components     |
| `ASSETS_DIR` | `src/assets`  | Directory for static assets              |

## Available Scripts

| Script              | Description                                |
| ------------------- | ------------------------------------------ |
| `bun install`       | Install project dependencies               |
| `bun dev`           | Start development server with hot reload   |
| `bun run build`     | Build for production (SSR bundle)          |
| `bun run prerender` | Prerender a static site (no SSR or routes) |

## Bundle Size

Noxt is built to minimize client-side JavaScript. By combining server-side rendering with selective, per-component hydration (interactive "islands"), Noxt avoids shipping and rehydrating a full client runtime like many SPA frameworks do. The practical benefits:

- **Much smaller client payloads:** Hydrate only what's interactive, not the whole page.
- **Faster load and render:** Less bytes over the network and less JS to parse/execute improves First Contentful Paint and Time to Interactive.
- **Lower bandwidth & CPU costs:** Smaller payloads reduce data transfer and battery/CPU use on low-end devices.

How Noxt achieves this and how to keep bundles small:

- **Islands over full-page hydration:** Use `defineIsland` and `asIsland` so only interactive parts are hydrated on the client while the rest is prerendered.
- **Prefer lightweight libraries:** Preact + HTM are intentionally small compared to heavier alternatives like React.
- **Code-split islands & dynamic imports:** Load optional features only when needed.

## Next Steps

- [Learn about Noxt's Architecture](02-architecture.md) - Core design principles
- [Understand How It Works](03-how-it-works.md) - Request flow and rendering pipeline
- [Explore Islands](04-islands.md) - Interactive components with client-side hydration
- [Discover Prerendering](05-prerendering.md) - Static site generation
- [Dive into SSR](06-ssr.md) - Dynamic server-side rendering
