# No-Magic Experiment: Move Prerendering from Macro to `build.ts`

## Goal

Remove the "magic" of `prepareRoutes` by splitting the implicit macro-based build into an explicit two-step workflow. The new `buildRoutes` is a regular async function (no macro) with zero configuration. The `loadRoutes` macro is as simple as possible: no arguments, returns a hardcoded path string.

## Problem

Currently `prepareRoutes` is a Bun macro (`import ... with { type: "macro" }`) that does heavy filesystem work at compile time: scanning `pages/`, importing each page component, rendering to HTML, generating route maps. This imposes Bun macro limitations (no dynamic `import()` in macros, restricted context, harder debugging, opaque failure modes).

## Solution

Split into two explicit steps:

1. **`build.ts`** — user creates this, calls `buildRoutes()` (regular function, not a macro). All filesystem/prerendering work happens here.
2. **`index.ts`** — uses a thin `loadRoutes()` macro that simply returns the path to the pre-generated manifest.

## User-Facing API

### `build.ts` (user creates)

```typescript
import { buildRoutes } from "noxt";

await buildRoutes();
```

- Always scans `./pages/` (hardcoded)
- Always writes to `./.cache/` (hardcoded)
- Throws on any failure (missing default export, rendering errors, etc.)
- Returns `RouteData[]` for callers that need it (e.g. `staticPrerender`)

### `index.ts` (user creates)

```typescript
import { loadRoutes } from "noxt" with { type: "macro" };

const routes = (await import(loadRoutes())).default;

Bun.serve({
  port: 3000,
  routes,
});
```

- `loadRoutes()` — zero arguments, returns `"./.cache/routes.js"`
- The entire macro is one line

## Workflows

### Development

```bash
bun run build.ts          # Scans pages/, prerenders → .cache/
bun run index.ts          # Starts server serving from .cache/routes.js
```

### Production

```bash
bun run build.ts                                          # Prerender pages
bun build --target=bun --outdir=dist index.ts             # Bundle server
cd dist && bun run index.js                               # Run production build
```

## Files to Change

| File | Action | Details |
|------|--------|---------|
| `src/shell/build.ts` | **NEW** | `buildRoutes()` — same logic as current `prepareRoutes()`. No config. Scans `./pages`. Writes to `./.cache`. Throws on failure. |
| `src/shell/routes.ts` | **DELETE** | Logic moved to `build.ts`. Entire file removed. |
| `index.macro.ts` | **REWRITE** | Export only `loadRoutes(): string` — one-liner returning `"./.cache/routes.js"` |
| `index.ts` | **MODIFY** | Export `buildRoutes` from `./src/shell/build`. Remove `prepareRoutes`. Keep `prepareIsland`, `defineIsland`, `staticPrerender`. |
| `src/shell/static.ts` | **MODIFY** | Change `import { prepareRoutes }` → `import { buildRoutes }` |
| `tests/fixtures/build.ts` | **NEW** | Imports `buildRoutes` from noxt and calls it |
| `tests/fixtures/index.ts` | **MODIFY** | Use `loadRoutes` macro instead of `prepareRoutes` |
| `tests/e2e/fixtures.test.ts` | **MODIFY** | Restructure for two-step workflow |
| `docs/*.md` | **UPDATE** | Reflect `buildRoutes`, `loadRoutes`, two-step workflow |

## Implementation Details

### `src/shell/build.ts` (new, ~50 lines)

```typescript
export interface RouteData {
  routeName: string;
  filePath: string;
}

/** Scans ./pages, prerenders each page to .cache/, generates routes.js + manifest.json. Throws on failure. */
export async function buildRoutes(): Promise<RouteData[]>
```

Same logic as current `prepareRoutes()`:
- `getFilesMatchingGlob("**/*.{tsx,ts,jsx,js,md}", path.resolve("pages"))`
- `prerenderPage()` for each file (markdown vs Preact, `preparePreact`/`prepareMarkdown`)
- `generateRouteMapCode(manifest)` to build routes.js
- Writes `routes.js` and `manifest.json` to `./.cache/`
- Returns `RouteData[]`

### `index.macro.ts` (rewrite, ~8 lines)

```typescript
/** Returns the path to the pre-generated routes manifest. Runs at compile time (macro). */
export function loadRoutes(): string {
  return "./.cache/routes.js";
}
```

### `index.ts` (modify)

```typescript
import { buildRoutes } from "./src/shell/build";
import { loadRoutes } from "./index.macro";
import { prepareIsland } from "./src/shell/island";
import { defineIsland } from "./src/core/island";
import { staticPrerender } from "./src/shell/static";

export { buildRoutes, loadRoutes, prepareIsland, defineIsland, staticPrerender };
```

### `src/shell/static.ts` (modify)

Change:
```typescript
import { prepareRoutes, type RouteData } from "./routes";
```
To:
```typescript
import { buildRoutes, type RouteData } from "./build";
```

Change `await prepareRoutes()` to `await buildRoutes()`.

### `tests/fixtures/build.ts` (new)

```typescript
import { buildRoutes } from "noxt";

await buildRoutes();
```

### `tests/fixtures/index.ts` (modify)

Change:
```typescript
import { prepareRoutes } from "noxt" with { type: "macro" };
const routes = (await import(prepareRoutes())).default;
```
To:
```typescript
import { loadRoutes } from "noxt" with { type: "macro" };
const routes = (await import(loadRoutes())).default;
```

## What Doesn't Change

| Feature | Status |
|---------|--------|
| `prepareIsland` | No change — already not a macro, imported normally in page files |
| `defineIsland` | No change |
| `staticPrerender` | No API change — internally uses `buildRoutes()` instead of `prepareRoutes()` |
| `generateRouteMapCode` | No change — still called by `buildRoutes()` |
| `preparePreact` / `prepareMarkdown` | No change — still called by `buildRoutes()` |
| Package.json exports | No change — `macro` condition still points to `index.macro.ts` |

## What the Macro Does Now vs Before

| Aspect | Before (`prepareRoutes` macro) | After (`loadRoutes` macro) |
|--------|-------------------------------|----------------------------|
| Filesystem scan (Bun.Glob) | Yes | No |
| Dynamic import of page components | Yes | No |
| HTML prerendering (renderToStringAsync) | Yes | No |
| Code generation (generateRouteMapCode) | Yes | No |
| File writing (Bun.write) | Yes | No |
| Return value path | Generated at runtime | Hardcoded `"./.cache/routes.js"` |
| Lines of code | ~65 | 3 |

## Revised Test Structure

### "generate command" (`bun run build.ts`)

- Should exit successfully
- Should generate `.cache` directory with HTML files
- Should generate `routes.js` with all routes
- Should generate `manifest.json`
- Should generate unique hashes

### "bundle command" (`bun build --target=bun --outdir=dist index.ts`)

[beforeEach: `bun run build.ts`]
- Should bundle successfully
- Should generate `index.js` in `dist` directory
- Should include `.cache` in `dist` output
- Should contain `Bun.serve` in output

### "server" (`bun run index.ts`)

[beforeEach: `bun run build.ts`]
[afterEach: kill server]
- Should respond to `/` with index page
- Should respond to `/sample`
- Should respond to `/sample2`
- Should respond to `/markdown`
- Should respond to `/page_with_island`
- Should return 404 for unknown paths

### "build and run integration"

- `build.ts` → `bun build` → `bun run`: full workflow
- Should generate consistent output across rebuilds
