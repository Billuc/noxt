# Phase 3: Wire Up Public API and Remove Old Files

## Goal

Wire the new functions into the package's public API, remove the macro export, and delete the old modules that are now replaced.

## Files

| File | Action |
|------|--------|
| `index.ts` | **MODIFY** |
| `index.macro.ts` | **DELETE** |
| `package.json` | **MODIFY** |
| `src/shell/routes.ts` | **DELETE** |
| `src/shell/island.ts` | **DELETE** |

## What to change

### `index.ts`

Replace current exports with the new API:

```typescript
import { build } from "./src/shell/build";
import {
  prereenderIslands,
  prereenderPages,
  generateRouteMap,
  generateRouteMapFromCache,
  useIsland,
  importAsset,
} from "./src/shell/build";
import { defineIsland } from "./src/core/island"; // no longer needed — remove
import { staticPrerender } from "./src/shell/static";

export {
  build,
  prereenderIslands,
  prereenderPages,
  generateRouteMap,
  generateRouteMapFromCache,
  useIsland,
  importAsset,
  staticPrerender,
};
```

Note: function names in the plan use `prerender` (not `prereender`). The plan uses `prerenderIslands` and `prerenderPages`. Update the imports accordingly:

```typescript
import { build } from "./src/shell/build";
import {
  prerenderIslands,
  prerenderPages,
  generateRouteMap,
  generateRouteMapFromCache,
  useIsland,
  importAsset,
} from "./src/shell/build";
import { staticPrerender } from "./src/shell/static";

export {
  build,
  prerenderIslands,
  prerenderPages,
  generateRouteMap,
  generateRouteMapFromCache,
  useIsland,
  importAsset,
  staticPrerender,
};
```

### `index.macro.ts`

Delete this file entirely — no more macros.

### `package.json`

Remove the `"macro"` export condition:

```json
"exports": {
  ".": {
    "import": "./index.ts",
    "require": "./index.ts",
    "default": "./index.ts"
  },
  "./runtime": "./src/runtime/index.ts"
}
```

If `"macro": "./index.macro.ts"` exists under the `"."` key, remove it.

### `src/shell/routes.ts`

Delete entirely — its logic is now in `src/shell/build.ts`.

### `src/shell/island.ts`

Delete entirely — `prepareIsland` is replaced by `prerenderIslands` + `useIsland`.

## How to verify

- `bun test` may show import errors now since the old files are gone and consumers haven't been updated yet
- Run `bun run src/shell/build.ts` to confirm it starts without import errors
- `tsc --noEmit` or `bun check` to check type errors (expect some from consumers not yet updated)
