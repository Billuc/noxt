# Noxt Documentation

Noxt is a high-performance web framework built on [Bun](https://bun.sh) that uses [Preact](https://preactjs.com/) + [HTM](https://github.com/developit/htm) for rendering with an islands architecture. Pages are prerendered to static HTML at build time, and interactivity is achieved through selectively hydrated "islands" instead of full-page JavaScript.

## Topics

| Document | Description |
|----------|-------------|
| [Getting Started](01-getting-started.md) | Installation, project setup, creating your first page |
| [Pages & Routing](02-pages-and-routing.md) | File-based routing, Preact pages, Markdown pages, Layouts |
| [Islands](03-islands.md) | Interactive client-side components with selective hydration |
| [useFetch Hook](04-use-fetch.md) | Client-side data fetching with loading/error states |
| [Building & Deploying](05-building-and-deploying.md) | Build, preview, and deployment workflow |
| [Architecture](06-architecture.md) | Design overview, build pipeline, module responsibilities |
| [API Reference](07-api-reference.md) | Complete reference for all exported functions and types |
