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
 * E2E: Static Generation
 *
 * Feature (src/static/*):
 *   `generateStaticPages({ pages, islands, assets, base })` (src/static/build.ts)
 *   copies build artifacts to `dist/` and builds a `manifest: Record<publicPath, filePath>`.
 *   For each `RouteData { url, file: Path }` in `pages` it computes `outputPath =
 *   DIST_DIR + (url === "/" ? "" : url) + "/index.html"` with `/` → `path.sep`,
 *   `copyFile(file.absolute, outputPath)`, and `manifest[toPublicPath(url, base)] = outputPath`.
 *   For each `IslandEntry` it iterates `entry.files`, computes `islandRelPath =
 *   file.relativeTo(ISLANDS_CACHE_DIR)` (`.cache/_islands`), `outputPath =
 *   distPath("_islands", islandRelPath)`, copies, and `manifest[toPublicPath(outputPath, base)] = outputPath`.
 *   For each `AssetEntry` it computes `assetRelPath = file.relativeTo(ASSETS_DIR)` (`src/assets`),
 *   `outputPath = distPath("assets", assetRelPath)`, copies, and
 *   `manifest[toPublicPath(asset.url, base)] = outputPath`. Returns `{ manifest }`.
 *
 * What should be tested:
 *   - Pages are emitted as `dist/index.html` for `/` and `dist/<route>/index.html`
 *     for others, with `toPublicPath` respecting `base`.
 *   - Island files from `.cache/_islands` are copied to `dist/_islands` preserving
 *     names and manifest keys are `toPublicPath(distPath, base)`.
 *   - Assets from `src/assets` are copied to `dist/assets` preserving subdirectories
 *     and manifest keys are `toPublicPath(asset.url, base)`.
 *   - Manifest values are file paths on disk (`dist/...`) and keys are public URLs
 *     with leading `/` and optional base prefix.
 *   - `copyFile` creates parent directories; existing `dist` content is not corrupted
 *     on re-run; manifest contains exactly the union of pages/islands/assets.
 */

