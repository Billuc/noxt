# Architecture

Noxt's architecture is designed around the principle of server-side rendering with selective client-side hydration. This approach delivers fast initial page loads with minimal JavaScript, while still enabling interactive components through the islands pattern.

## Core Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        Noxt Request Flow                            │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Request → Server → Render Page → Embed Islands → Send HTML       │
│                                                    │              │
│                                          Client Hydration        │
│                                                    ▼              │
│                                         Island JS Loads & Runs    │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

The flow works as follows:

1. A browser sends a request to the server
2. Noxt's server receives the request and identifies the page component based on the URL
3. The page component is rendered to HTML on the server
4. Any island components within the page are processed and embedded as static HTML with hydration markers
5. The complete HTML response is sent to the client
6. The browser parses the HTML and displays it immediately (no white screen)
7. The browser loads the island JavaScript files in parallel
8. Each island hydrates independently, becoming interactive

## Key Components

### 1. Framework Entry Point (`index.ts`)

The main entry point exports all public APIs and includes CLI support:

```ts
// Core utilities
export { serverRender, prepareImportMap, buildConfig };

// Build utilities
export { build, prerender };
export type { BuildOptions, PrerenderOptions, NoxtConfig };

// CLI support: bun run noxt build|prerender
```

### 2. Configuration (`src/common/config.ts`)

Centralized configuration management with `NoxtConfig`:

```ts
export interface NoxtConfig {
  root: string; // Project root directory
  pagesDir: string; // Directory for page components
  islandsDir: string; // Directory for island components
  assetsDir: string; // Directory for static assets
}
```

### 3. Common Utilities (`src/common/`)

The `common` directory contains shared utilities used by both buildtime and runtime:

- **`assets.ts`** - Asset copying and symlinking utilities
- **`config.ts`** - Configuration management
- **`import_map.ts`** - Import map generation
- **`island.ts`** - Island detection and preparation
- **`manifest.ts`** - Page manifest generation

### 4. Buildtime Modules (`src/buildtime/`)

These modules are used during the build process:

- **`build.ts`** - SSR build function
- **`prerender.ts`** - Static site prerendering function

### 5. Runtime Modules (`src/runtime/`)

These modules are used during request handling:

- **`server.ts`** - Server-side rendering with `serverRender()`
- **`render.ts`** - Client-side island hydration with `renderComponent()`
- **`fetch.ts`** - Client-side fetching utilities with `useFetchHtml()` hook

## Design Principles

Noxt is built on several key design principles:

### 1. Server-First

All rendering happens on the server by default. Client-side JavaScript is opt-in through islands. This ensures the best possible performance for the initial page load.

### 2. Progressive Enhancement

Pages work without JavaScript. Islands enhance the experience by adding interactivity, but the core content is always available in the initial HTML response.

### 3. Convention over Configuration

Noxt now uses sensible defaults through `NoxtConfig`. The simplified API reduces boilerplate while remaining predictable:

- Pages go in `src/pages` (configurable via `pagesDir`)
- Islands go in `src/islands` (configurable via `islandsDir`)
- Assets go in `src/assets` (configurable via `assetsDir`)

### 4. Small Core

Noxt's core is intentionally small, relying on Preact (a 3KB React alternative) and Bun's built-in capabilities. This keeps bundle sizes minimal and performance high.

### 5. File-based Conventions

Routing and page discovery are based on the filesystem structure. This eliminates the need for complex configuration while remaining predictable and discoverable.

## How the Pieces Fit Together

```
┌─────────────────────────────────────────────────────────────────────┐
│                         Noxt System Architecture                         │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌─────────────────┐    ┌─────────────────┐    ┌──────────────────┐  │
│  │   Configuration  │    │    Page Files    │    │     Islands      │  │
│  │   buildConfig()  │    │   src/pages/*.ts │    │   src/islands/   │  │
│  │   NoxtConfig     │    │                  │    │   *.tsx, *.ts     │  │
│  └──────────┬──────┘    └──────────┬──────┘    └─────────┬────────┘  │
│             │                   │                      │              │
│             ▼                   ▼                      ▼              │
│  ┌─────────────────────────────────────────────────────────────────┐  │
│  │                    Build & Runtime Processing                     │  │
│  │  ┌──────────────┐  ┌──────────────┐  ┌─────────────────────┐  │  │
│  │  │  manifest.ts  │  │  server.ts    │  │  island.ts           │  │  │
│  │  │  (buildtime)  │  │  serverRender()│  │  prepareIslands()   │  │  │
│  │  └──────────────┘  │                 │  │  (buildtime)        │  │  │
│  │                    │  │  prerender.ts │  │                     │  │  │
│  │                    │  └──────────────┘  └─────────────────────┘  │  │
│  └─────────────────────────────────────────────────────────────────┘  │
│                                      │                                  │
│                                      ▼                                  │
│  ┌─────────────────────────────────────────────────────────────────┐  │
│  │                    Client-Side Hydration                         │  │
│  │  ┌─────────────────┐  ┌─────────────────┐                          │  │
│  │  │ renderComponent()│  │   Island JS      │                          │  │
│  │  │ from render.ts  │  │   (auto-generated)│                          │  │
│  │  └─────────────────┘  └─────────────────┘                          │  │
│  └─────────────────────────────────────────────────────────────────┘  │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

## Module Structure

```
src/
├── common/
│   ├── config.ts         # NoxtConfig type and buildConfig()
│   ├── assets.ts         # Asset copying utilities (copyAssets)
│   ├── island.ts         # Island detection and preparation (prepareIslands)
│   ├── manifest.ts        # Page manifest generation (prepareManifest)
│   └── import_map.ts      # Import map generation for builds
├── buildtime/
│   ├── build.ts          # SSR build function with import map plugin
│   └── prerender.ts      # Static prerendering with manifest preparation
└── runtime/
    ├── server.ts         # Server-side rendering (serverRender)
    ├── render.ts         # Client-side island hydration (renderComponent)
    └── fetch.ts          # Client-side HTML fetching (useFetchHtml)

index.ts                # Framework entry point with CLI support
```

Each module has a single responsibility and is designed to be independently testable and understandable.
