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
 * E2E: Assets
 *
 * Feature (src/assets/*, src/core/build.ts):
 *   Assets are static files under `src/assets/`. `discoverAssets` (src/assets/build.ts)
 *   globs `** /*` under `src/assets` and maps each file to `{ url, file }` where
 *   `url` is `toPublicPath(file.relativeTo("src"))` (e.g. `src/assets/logo.png`
 *   → `/assets/logo.png`). `generateAssetUtils` (src/assets/build.ts) writes
 *   `.cache/assets.ts` via `generateAssetUtilsCode` (src/assets/code_generation.ts)
 *   which exports only a type `AssetId = "/assets/logo.png" | ...` (or `never` if
 *   empty) — it does NOT emit runtime helpers. The runtime `AssetFunction`
 *   (`src/assets/types.ts`) is returned by `prepareAssetFunction(assetIds, base)`:
 *   it validates the id against discovered urls, throws `Unknown asset with ID`
 *   if absent, and returns `(base ?? "") + id`. `generateRouteMap`
 *   (src/core/build.ts) then adds each asset as `toPublicPath(asset.url, base)`
 *   → `asset.file.relativeToCwd()` in `.cache/routes.json`. `generateStaticPages`
 *   (src/static/build.ts) copies each asset to `dist/assets/...` preserving the
 *   relative path under `src/assets` and adds `toPublicPath(distPath, base)` to
 *   the manifest.
 *
 * What should be tested:
 *   - Discovering assets from `src/assets/` includes nested files and yields
 *     urls with leading `/assets/` via `toPublicPath`.
 *   - `generateAssetUtils` writes `.cache/assets.ts` containing `export type AssetId`
 *     with the exact union of discovered urls; empty assets yields `never`.
 *   - The returned `asset(id)` validates ids, throws on unknown ids, and
 *     correctly prefixes `base` when provided (e.g. `base="/base" + "/assets/x"`).
 *   - `.cache/routes.json` contains an entry for each asset where the key is
 *     `toPublicPath(url, base)` and the value points to the source file.
 *   - `generateStaticPages` copies assets to `dist/assets/...` preserving
 *     subdirectories and the manifest maps `toPublicPath(url, base)` → output path.
 *   - Serving: `GET /assets/<file>` via the `routes.json` + `Bun.file()` table
 *     returns 200 with correct bytes; unknown asset ids are 404 (route absent).
 *   - Client-side `createClientAssetFunction(base)` (src/core/url.ts) produces
 *     the same `base + id` behaviour as the build-time `prepareAssetFunction`.
 */

