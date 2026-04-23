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

### 1. Server Entry Point (`index.ts`)

The main entry point exports all public APIs that you'll use to build your application:

```ts
// Core island utilities
export { defineIsland, asIsland, serverRender, ServerComponent, prepareImportMap };

// Build utilities
export { build, prerender };
export type { BuildOptions, PrerenderOptions };
```

This file serves as the public interface of Noxt. When you import from "noxt" in your project, you're importing from this file.

### 2. Path Configuration (`src/paths.ts`)

Manages all filesystem paths used throughout the framework:

```ts
ROOT          - Project root directory
INDEX         - Main entry point (index.ts)
PAGES_DIR     - Directory containing page components
ASSETS_DIR    - Directory for static assets
CACHE_DIR     - Build cache directory (.cache)
CACHE_PAGES_DIR - Cached prerendered pages
CACHE_ASSETS_DIR - Symlinked assets
DIST          - Output directory for builds (dist)
```

The `relativeFromRoot()` function is also provided for generating relative paths.

### 3. Environment Configuration (`src/env.ts`)

Reads environment variables with sensible defaults:

```ts
PORT          - Server port (default: 2101)
PAGES_DIR     - Pages directory (default: "src/pages")
ASSETS_DIR    - Assets directory (default: "src/assets")
MODE          - Runtime mode (default: "development")
```

All configuration is done through environment variables, making it easy to customize Noxt for different environments without changing code.

## Module Structure

```
src/
├── paths.ts              # Filesystem path management
├── env.ts                # Environment variable configuration
├── island.ts             # Island definition and utilities
├── manifest.ts           # Page manifest generation
├── import_map.ts         # Import map generation for builds
├── render.ts             # Client-side rendering (hydration)
├── server.ts             # Server-side rendering and ServerComponent
├── build.ts              # SSR build function
└── prerender.ts          # Static prerendering function
```

Each module has a single responsibility and is designed to be independently testable and understandable.

## Design Principles

Noxt is built on several key design principles:

### 1. Server-First

All rendering happens on the server by default. Client-side JavaScript is opt-in through islands. This ensures the best possible performance for the initial page load.

### 2. Progressive Enhancement

Pages work without JavaScript. Islands enhance the experience by adding interactivity, but the core content is always available in the initial HTML response.

### 3. Explicit over Implicit

Noxt prefers explicit APIs over magic. You must explicitly mark components as islands with `defineIsland()` and explicitly transform them with `asIsland()`. This makes the code easier to understand and debug.

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
│  │   Configuration  │    │    Page Files    │    │      Islands     │  │
│  │   env.ts         │    │   src/pages/*.ts │    │   defineIsland() │  │
│  │   paths.ts       │    │   +components    │    │   asIsland()     │  │
│  └──────────┬──────┘    └──────────┬──────┘    └─────────┬────────┘  │
│             │                   │                      │              │
│             ▼                   ▼                      ▼              │
│  ┌─────────────────────────────────────────────────────────────────┐  │
│  │                    Server-Side Processing                        │  │
│  │  ┌──────────────┐  ┌──────────────┐  ┌─────────────────────┐  │  │
│  │  │ manifest.ts  │  │ serverRender()│  │  prepareIslandScript │  │  │
│  │  │ (prerender)  │  │  (SSR)        │  │  (hash + script)    │  │  │
│  │  └──────────────┘  └──────────────┘  └─────────────────────┘  │  │
│  └─────────────────────────────────────────────────────────────────┘  │
│                                      │                                  │
│                                      ▼                                  │
│  ┌─────────────────────────────────────────────────────────────────┐  │
│  │                    Client-Side Hydration                         │  │
│  │  ┌─────────────────┐  ┌─────────────────┐                          │  │
│  │  │ renderComponent()│  │   Island JS      │                          │  │
│  │  │ from render.ts  │  │   from build    │                          │  │
│  │  └─────────────────┘  └─────────────────┘                          │  │
│  └─────────────────────────────────────────────────────────────────┘  │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```
