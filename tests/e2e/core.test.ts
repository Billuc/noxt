/**
 * Copyright 2026 Luc BILLAUD
 *
 *  Licensed under the Apache License, Version 2.0 (the "License");
 *  you may not use this file except in compliance with the License.
 *  You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 *  Unless required by applicable law or agreed to in writing, software
 *  distributed under the License is distributed on an "AS IS" BASIS,
 *  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *  See the License for the specific language governing permissions and
 *  limitations under the License.
 **/

/**
 * E2E: Core — BuildPipeline, routing, context, and file utilities
 *
 * Feature (src/core/*):
 *   - `BuildPipeline` (src/core/types.ts) is a generic async context builder:
 *     `newPipeline() → with(fn: ctx=>Additional) → do(fn: ctx=>void) → build()`
 *     chaining `with` merges returned objects, `do` runs side-effects without
 *     merging, `build()` executes the accumulated function.
 *   - `generateRouteMap({ pages, islands, assets, base })` (src/core/build.ts)
 *     builds `manifest: Record<string,string>` where keys are `toPublicPath(url, base)`
 *     for pages (`route.url` via `getRouteName`) → `file.relativeToCwd()`, assets
 *     (`asset.url` via `toPublicPath(file.relativeTo("src"))`) → `relativeToCwd()`,
 *     and islands (`file.relativeTo(CACHE_DIR)`) → `relativeToCwd()`, then
 *     `writeFile(ROUTES_CACHE_FILE, JSON.stringify(manifest))` (`.cache/routes.json`).
 *   - `generateRouteUtils({ pageFiles, base })` (src/core/build.ts) maps
 *     `pageFiles` → `routeNames = getRouteName(file.relativeTo(PAGES_DIR))`,
 *     generates `generateLinkUtilsCode(routeNames)` (src/core/code_generation.ts:
 *     `export type RouteId = "a" | "b" | never`) → `.cache/utils.ts`, and returns
 *     `page: PageFunction` via `preparePageFunction` which validates `pageNames.includes(pageId)`
 *     else throws `Unknown page with URL` and returns `buildUrlWithQuery(base+pageId, query)`.
 *   - `Path` (src/core/fs.ts) wraps absolute paths with `relativeToCwd()`,
 *     `relativeTo(base)`, `resolve`/`create`; constants `CACHE_DIR=.cache`,
 *     `ISLANDS_CACHE_DIR=.cache/_islands`, `ROUTES_CACHE_FILE=.cache/routes.json`,
 *     `UTILS_CACHE_FILE=.cache/utils.ts`, `API_CACHE_FILE=.cache/api.ts`,
 *     `ASSETS_CACHE_FILE=.cache/assets.ts`, `PAGES_DIR=src/pages`, etc.;
 *     `getFilesMatchingGlob(pattern, root)` uses `fs.glob` with `cwd: root`.
 *   - `getRouteName` / `toPublicPath` / `routeToHtmlPath` / `sanitizePrerendered`
 *     (src/core/utils.ts): `getRouteName` strips extension, handles `index` →
 *     `/`, `toPublicPath` trims slashes and prefixes `base`, `sanitizePrerendered`
 *     prepends `<!DOCTYPE html>` if starts with `<html>` else unescapes entities.
 *   - `buildUrlWithQuery` / `createClientPageFunction` / `createClientAssetFunction`
 *     (src/core/url.ts): appends `URLSearchParams` from `QueryParams`.
 *   - `PageContext` / `UtilsContext` (src/core/context.ts): `PageContextData`
 *     holds `base` + `islandMap` from `IslandEntry[]`, `UtilsContextData` holds
 *     `page`/`asset` functions with default throws `No ... function has been provided`,
 *     `providePageContext(data, child)` nests both providers.
 *   - `renderToHtmlString` (src/core/render.ts) enables `options.errorBoundaries`
 *     and calls `renderToStringAsync`.
 *   - `isDev()` (src/core/env.ts) checks `process.env.NOXT_MODE === "dev"`.
 *
 * What should be tested:
 *   - `BuildPipeline` chaining `with` merges contexts and `do` does not, `build()`
 *     executes lazily and supports async steps.
 *   - `getRouteName` correctly maps `index.ts`→`/`, `about.tsx`→`/about`,
 *     `blog/post.md`→`/blog/post`, handling Windows separators.
 *   - `toPublicPath` normalizes leading slash and base prefix; `buildUrlWithQuery`
 *     appends query correctly; `sanitizePrerendered` adds doctype or unescapes.
 *   - `Path` `relativeToCwd` / `relativeTo` produce correct relative strings;
 *     `getFilesMatchingGlob` respects pattern and skips directories.
 *   - `generateRouteUtils` writes `.cache/utils.ts` with `RouteId` union and returns
 *     a validating `page()` that throws on unknown ids and respects `base`.
 *   - `generateRouteMap` writes `.cache/routes.json` with keys via `toPublicPath`
 *     and values via `relativeToCwd`, covering pages/assets/islands and base.
 *   - `PageContext`/`UtilsContext` default functions throw actionable errors;
 *     `providePageContext` supplies `base`/`islandMap`/`page`/`asset` to descendants.
 *   - `renderToHtmlString` renders with `errorBoundaries` enabled and restores previous.
 */

