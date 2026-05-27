# Noxt

A high-performance web framework built with [Bun](https://bun.sh), a fast all-in-one JavaScript runtime. Noxt combines prerendering with an islands architecture for minimal client-side JavaScript.

## Features

- **Built on Bun**: Leverage the speed and efficiency of Bun's JavaScript runtime
- **Zero-config Setup**: Get started quickly with minimal configuration
- **TypeScript Support**: Full TypeScript support out of the box
- **Fast Execution**: Native performance with near-instant startup times
- **Small bundle size**: Small bundle sizes and client-side JS execution times thanks to prerendering

## Documentation

Full documentation is available in the [docs/](docs/) directory:

- [Index](docs/index.md) - Table of contents
- [Getting Started](docs/01-getting-started.md) - Installation and basic usage
- [Pages & Routing](docs/02-pages-and-routing.md) - File-based routing and page creation
- [Islands](docs/03-islands.md) - Interactive components with client-side hydration
- [useFetch Hook](docs/04-use-fetch.md) - Client-side data fetching
- [Building & Deploying](docs/05-building-and-deploying.md) - Build and deployment guide
- [Architecture](docs/06-architecture.md) - Architecture and rendering pipeline
- [API Reference](docs/07-api-reference.md) - Complete API documentation

## Getting Started

### Prerequisites

- [Bun](https://bun.sh) installed on your system

### Installation

To install dependencies:

```bash
bun install
```

### Running Noxt

To start the dev server:

```bash
bun run index.ts
```

The server will start and be ready to handle requests.

### Creating Pages

Create new page files in the `pages` directory with `.ts` or `.tsx` extensions. Each file automatically becomes a route based on its filename.

```bash
pages/
  index.ts        # Route: /
  about.ts        # Route: /about
  api/hello.ts    # Route: /api/hello
```

### Creating Islands

Islands are interactive components that run on the client. Define them using the `defineIsland` function and hydrate them correctly using the `prepareIsland` function.

Here is an example of an interactive island:

```ts
import { useState } from "preact/hooks";
import { html } from "htm/preact";
import { defineIsland } from "noxt";

function Hello() {
  const [name, setName] = useState("World");

  return html`
    <div class="hello-demo">
      <span>This is an interactive island !</span>
      <h2>Hello, ${name}!</h2>
      <input
        type="text"
        value=${name}
        onInput=${(e: Event) => setName((e.target as HTMLInputElement).value)}
      />
    </div>
  `;
}

export default defineIsland(Hello, import.meta.path);
```

It is imported in a page like so:

```ts
import Hello from "../islands/Hello";
import { prepareIsland } from "noxt";

const HelloIsland = await prepareIsland(Hello);
```

## Commands

- `bun install` — Install dependencies.
- `bun run index.ts` — Start the development server.
- `bun build --target=bun --outdir=dist index.ts` — Bundle the project for production.
- `cd dist && bun run index.js` — Preview the bundled project.
- `bun test` — Run tests.
- `rm -rf .cache dist` — Clean build artifacts.

## Bundle Size

Noxt is built to minimize client-side JavaScript. By combining server-side rendering with selective, per-component hydration (interactive "islands"), Noxt avoids shipping and rehydrating a full client runtime like many SPA frameworks do. The practical benefits:

- **Much smaller client payloads:** Hydrate only what's interactive, not the whole page.
- **Faster load and render:** Less bytes over the network and less JS to parse/execute improves First Contentful Paint and Time to Interactive.
- **Lower bandwidth & CPU costs:** Smaller payloads reduce data transfer and battery/CPU use on low-end devices.

How Noxt achieves this and how to keep bundles small:

- **Islands over full-page hydration:** Use `defineIsland` and `prepareIsland` so only interactive parts are hydrated on the client while the rest is prerendered.
- **Prefer lightweight libraries:** Preact + HTM are intentionally small compared to heavier alternatives like React.
- **Code-split islands & dynamic imports:** Load optional features only when needed.
