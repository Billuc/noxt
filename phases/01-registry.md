# Phase 1: Create `src/core/registry.ts`

## Goal

Create the singleton module that holds all build-time state, with zero dependencies on other new code.

## Files

| File | Action |
|------|--------|
| `src/core/registry.ts` | **CREATE** |

## What to create

**`src/core/registry.ts`** — singleton with two pieces of state:

```typescript
import type { FunctionComponent } from "preact";

export interface IslandEntry {
  component: FunctionComponent<any>;
  hash: string;
  scriptPath: string;
  publicPath: string;
}

// Island component map — keyed by component reference
const islandComponentMap = new Map<FunctionComponent<any>, IslandEntry>();

export function setIslandMap(entries: IslandEntry[]) {
  islandComponentMap.clear();
  for (const entry of entries) {
    islandComponentMap.set(entry.component, entry);
  }
}

export function getIslandEntry<T>(
  component: FunctionComponent<T>,
): IslandEntry | undefined {
  return islandComponentMap.get(component);
}

// Asset routes — keyed by public URL path
const assetRoutes = new Map<string, string>();

export function addAssetRoute(publicPath: string, absolutePath: string) {
  assetRoutes.set(publicPath, absolutePath);
}

export function getAssetRoutes(): ReadonlyMap<string, string> {
  return assetRoutes;
}
```

## How to verify

This module has no runtime dependencies — it's just state containers. Check that:
- `bun test` still passes (no file is importing from this yet)
- `bun run src/core/registry.ts` doesn't error
