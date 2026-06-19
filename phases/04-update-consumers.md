# Phase 4: Update Consumers

## Goal

Update all modules that consume the old API to use the new functions. This includes `static.ts`, fixture files, and example files.

## Files

| File | Action |
|------|--------|
| `src/shell/static.ts` | **MODIFY** |
| `tests/fixtures/build.ts` | **CREATE** |
| `tests/fixtures/index.ts` | **MODIFY** |
| `tests/fixtures/islands/counter.tsx` | **MODIFY** |
| `tests/fixtures/pages/page_with_island.ts` | **MODIFY** |
| `tests/fixtures/layout/LayoutWithIsland.ts` | **MODIFY** |

## What to change

### `src/shell/static.ts`

Currently imports `prepareRoutes` from `./routes`. Change to:

```typescript
import { build, type RouteData } from "./build";
// ... remove import { prepareRoutes, type RouteData } from "./routes";

export async function staticPrerender(): Promise<RouteData[]> {
  console.log("Exporting static site...");
  await build();
  // ... rest unchanged
}
```

### `tests/fixtures/build.ts` (CREATE)

```typescript
import { build } from "noxt";
await build();
```

### `tests/fixtures/index.ts`

Replace macro-based entry with a plain static import:

```typescript
import routes from "./routes.js";

Bun.serve({
  port: 2101,
  routes,
});
```

### `tests/fixtures/islands/counter.tsx`

Remove `defineIsland` wrapper. The file should just export a plain Preact component:

```typescript
import { useState } from "preact/hooks";
import { html } from "htm/preact";

function Counter() {
  const [count, setCount] = useState(0);
  return html`<button onClick=${() => setCount((c) => c + 1)}>${count}</button>`;
}

export default Counter;
```

### `tests/fixtures/pages/page_with_island.ts`

Replace `prepareIsland` with `useIsland`:

```typescript
import { html } from "htm/preact";
import Counter from "../islands/counter";
import { useIsland } from "noxt";

const CounterIsland = useIsland(Counter);

export default function IslandPage() {
  return html`
    <${CounterIsland} initialValue=${4} date=${new Date()} />
  `;
}
```

### `tests/fixtures/layout/LayoutWithIsland.ts`

Same change — replace `prepareIsland` with `useIsland`:

```typescript
import { html } from "htm/preact";
import Counter from "../islands/counter";
import { useIsland } from "noxt";

const CounterIsland = useIsland(Counter);

export default function LayoutWithIsland({ children }: { children?: any }) {
  return html`
    <html>
      <head></head>
      <body>
        <${CounterIsland} initialValue=${0} />
        ${children}
      </body>
    </html>
  `;
}
```

## How to verify

- `bun test` should no longer have import errors
- Run `bun run tests/fixtures/build.ts` from the project root to test the new build pipeline
  - Should create `.cache/` with HTML files, JS files, manifest.json
  - Should create `routes.js` at project root
- Run `bun run tests/fixtures/index.ts` to start the server
  - Visit `http://localhost:2101/` to verify pages render
  - Check that island scripts are served as routes
- Clean up: delete `routes.js` and `.cache/` after verification
