# Phase 2: Create `src/shell/build.ts` + Update `src/core/island.ts`

## Goal

Create the new build functions module containing all the logic moved from `routes.ts`, `island.ts`, and `prepare.ts` (orchestration only). Update `island.ts` to simplify the script generator.

## Files

| File | Action |
|------|--------|
| `src/shell/build.ts` | **CREATE** |
| `src/core/island.ts` | **MODIFY** |

## What to create

**`src/shell/build.ts`** — contains all these exported functions:

### `prerenderIslands()`

- Scan `./islands/` with `getFilesMatchingGlob("*.{tsx,ts,jsx,js}", path.resolve("islands"))`
- For each file: dynamically import, use `mod.default` as the component
- Compute `hash = new Bun.CryptoHasher("sha256").update(fileAbsolutePath).digest("base64url")`
- Call `generateScriptForIsland(hash, fileAbsolutePath)` to generate hydration script
- Write script to `./.cache/<hash>.js`
- Build `IslandEntry[]` with component ref, hash, scriptPath, publicPath
- Return `IslandEntry[]`

### `prerenderPages(islands: IslandEntry[])`

- Call `setIslandMap(islands)` on the registry to populate the lookup map
- Scan `./pages/` with `getFilesMatchingGlob("**/*.{tsx,ts,jsx,js,md}", path.resolve("pages"))`
- For each file: determine `.md` vs Preact, dynamically import, call `preparePreact`/`prepareMarkdown`
- During dynamic imports, page files call `useIsland(component)` which reads from the registry
- Write prerendered HTML to `./.cache/<ComponentName>.<hash>.html`
- Write `./.cache/manifest.json`
- Return `RouteData[]`

### `useIsland(component)`

```typescript
import { getIslandEntry } from "../core/registry";

export function useIsland<T>(component: FunctionComponent<T>): FunctionalComponent<T> {
  const entry = getIslandEntry(component);
  if (!entry) throw new Error("Island not prerendered...");
  return (props: T) => html`
    <div data-island=${entry.hash} data-props=${devalue.stringify(props)}>
      <${component} ...${props} />
    </div>
    <script src=${entry.publicPath}></script>
  `;
}
```

### `generateRouteMap(routes, islands)`

```typescript
export async function generateRouteMap(routes: RouteData[], islandEntries: IslandEntry[]): Promise<void> {
  const manifest: Record<string, string> = {};
  for (const r of routes) manifest[r.routeName] = `./${path.relative(process.cwd(), r.filePath)}`;
  for (const [url, absPath] of getAssetRoutes()) manifest[url] = `./${path.relative(process.cwd(), absPath)}`;
  for (const entry of islandEntries) manifest[entry.publicPath] = `./${path.relative(process.cwd(), entry.scriptPath)}`;
  const code = generateRouteMapCode(manifest);
  await writeFile("./routes.js", code);
}
```

### `generateRouteMapFromCache()`

- Read `./.cache/manifest.json` → `RouteData[]` for page routes
- Glob `./.cache/*.js` for island scripts → `/.cache/<filename>`
- Glob `./.cache/assets/**` for assets → `/.cache/assets/<path>`
- Call `generateRouteMapCode(manifest)` and write to `./routes.js`
- Does NOT use the registry — discovers everything from filesystem

### `importAsset(sourcePath)`

- Resolve `sourcePath` relative to the calling file
- Copy to `./.cache/assets/<filename>` preserving original name
- Call `addAssetRoute(publicPath, absolutePath)` in registry
- Return `/.cache/assets/<filename>`

### `build()`

```typescript
export async function build(): Promise<void> {
  const islands = await prerenderIslands();
  const routes = await prerenderPages(islands);
  await generateRouteMap(routes, islands);
}
```

### Types to define in `build.ts`

```typescript
export interface RouteData {
  routeName: string;
  filePath: string;
}
```

`IslandEntry` is now in `src/core/registry.ts` — import it from there.

## What to modify

**`src/core/island.ts`** — simplify to just the script generator:

```typescript
export function generateScriptForIsland(hash: string, importPath: string): string {
  const renderScriptPath = path.join(__dirname, "..", "runtime", "render.ts");
  return `
    import { renderComponent } from ${JSON.stringify(renderScriptPath)};
    import Island from ${JSON.stringify(importPath)};
    renderComponent(Island, ${JSON.stringify(hash)});
  `;
}
```

Remove `defineIsland`, `getImportPath`, `getHash`, `IslandComponent`.

## How to verify

- `bun test` still passes (nothing imports from `build.ts` yet, and existing tests still use old paths)
- Run `bun run src/shell/build.ts` to check for syntax errors
