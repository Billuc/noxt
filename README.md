# Noxt

A high-performance web server built with [Bun](https://bun.com), a fast all-in-one JavaScript runtime. Noxt is designed for rapid development and production-grade performance.

## Features

- **Built on Bun v1.3.10**: Leverage the speed and efficiency of Bun's JavaScript runtime
- **Zero-config Setup**: Get started quickly with minimal configuration
- **TypeScript Support**: Full TypeScript support out of the box
- **Fast Execution**: Native performance with near-instant startup times
- **Small bundle size**: Small bundle sizes and client-side JS execution times thanks to prerendering

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
bun dev
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

Islands are interactive components that run on the client. Define them using the `defineIsland` function and hydrate them correctly using the `asIsland` function.

Here is an example of an interactive island:

```ts
import { useState } from "preact/hooks";
import { html } from "htm/preact";
import { defineIsland } from "@lib/island";

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
import Hello from "../components/Hello";

const HelloIsland = await asIsland(Hello);
```

## Configuration

Configuration is done via environment variables. Create a `.env` file in the root directory to set your environment variables:

```bash
# Example .env file
PORT=3000
MODE=development
```

Supported environment variables:

- `PORT`: The port number for the server (default: 3000)
- `MODE`: "development" or "production"
- `PAGES_DIR`: The directory in which pages are defined
- `ASSETS_DIR`: The directory in which assets are located

## Commands

- `bun install` — Install dependencies.
- `bun dev` — Start the development server with hot reload.
- `bun run build` — Bundle the project for production.
- `bun preview` — Preview the bundled project.
- `bun prerender` — Prerender a static project (no SSR or routes).

## Bundle Size

Noxt is built to minimize client-side JavaScript. By combining server-side rendering with selective, per-component hydration (interactive "islands"), Noxt avoids shipping and rehydrating a full client runtime like many SPA frameworks do. The practical benefits:

- **Much smaller client payloads:** Hydrate only what's interactive, not the whole page.
- **Faster load and render:** Less bytes over the network and less JS to parse/execute improves First Contentful Paint and Time to Interactive.
- **Lower bandwidth & CPU costs:** Smaller payloads reduce data transfer and battery/CPU use on low-end devices.

How Noxt achieves this and how to keep bundles small:

- **Islands over full-page hydration:** Use `defineIsland` and `asIsland` so only interactive parts are hydrated on the client while the rest is prerendered.
- **Prefer lightweight libraries:** Preact + HTM are intentionally small compared to heavier alternatives like React.
- **Code-split islands & dynamic imports:** Load optional features only when needed.
