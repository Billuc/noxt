# Getting Started

## Prerequisites

- [Bun](https://bun.sh) installed on your system

## Creating a Project

Create a new directory and initialize a Bun project:

```bash
mkdir my-app
cd my-app
bun init
```

Install Noxt and its dependencies:

```bash
bun add noxt
bun install
```

## Project Structure

A typical Noxt project looks like this:

```
my-app/
  index.ts           # Server entry point
  pages/             # Page components (one file per route)
    index.ts
    about.ts
  islands/           # Interactive island components
    counter.tsx
  package.json
  tsconfig.json
```

## The Entry Point

Create `index.ts` in your project root:

```ts
import { prepareRoutes } from "noxt" with { type: "macro" };

const routes = (await import(prepareRoutes())).default;

Bun.serve({
  port: 3000,
  routes,
});
```

- `prepareRoutes()` is a Bun macro that runs at build time
- It scans the `pages/` directory, prerenders each page to HTML, and generates a route map
- The route map is passed to `Bun.serve()` which serves the prerendered HTML

## Creating Your First Page

Create `pages/index.ts`:

```ts
import { html } from "htm/preact";

export default function Home() {
  return html`<h1>Hello, Noxt!</h1>`;
}
```

Create `pages/about.ts`:

```ts
import { html } from "htm/preact";

export default function About() {
  return html`<h1>About Us</h1><p>Welcome to my Noxt site.</p>`;
}
```

## Running the Dev Server

```bash
bun run index.ts
```

The server starts and serves prerendered HTML at each route:

- `http://localhost:3000/` — renders `pages/index.ts`
- `http://localhost:3000/about` — renders `pages/about.ts`
- Unknown routes return a 404.

## Building for Production

```bash
bun build --target=bun --outdir=dist index.ts
```

The built output goes to `dist/`. To run the production build:

```bash
cd dist && bun run index.js
```

## Cleaning Build Artifacts

```bash
rm -rf .cache dist
```
