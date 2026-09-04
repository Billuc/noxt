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
 * E2E: Preact Pages
 *
 * Feature (src/preact/*, src/core/*):
 *   Preact pages are `.tsx|ts|jsx|js` files under `src/pages/` discovered by
 *   `discoverPreactPages` (src/preact/build.ts) via glob `** /*.{tsx,ts,jsx,js}`
 *   under `src/pages`; missing directory logs `No pages directory found !` and
 *   returns []. `prerenderPreactPages({ preactFiles, base, islands, asset, page })`
 *   iterates files, derives `url = getRouteName(file.relativeTo(PAGES_DIR))`
 *   (src/core/utils.ts), logs `Prerendering page [url]`, and calls `prerenderPreact`.
 *   That function imports `mod.default` as `FunctionComponent`, throws
 *   `File ${pagePath} has no default export !` if absent, hashes `pagePath` via
 *   `crypto.hash("sha256", pagePath, "base64url")`, writes `.cache/<ComponentName>.<hash>.html`
 *   (using `displayName ?? name`), and calls `renderPreactToHtml(Component, base, islands, asset, page)`
 *   (src/preact/render.ts) which does `providePageContext({ base, islands, asset, page }, h(Component, {}))`
 *   → `renderToHtmlString` (src/core/render.ts with errorBoundaries) → `sanitizePrerendered`.
 *   Per-file errors are caught, logged + `Skipping` and do not abort the batch.
 *
 * What should be tested:
 *   - Discovering preact pages finds `*.tsx|ts|jsx|js` under `src/pages` and derives
 *     urls via `getRouteName` (e.g. `index.tsx`→`/`, `blog/post.tsx`→`/blog/post`);
 *     missing directory returns [].
 *   - Prerendering writes one hashed HTML per file to `.cache/` with name
 *     `<ComponentName>.<sha256 base64url>.html`; hash is of absolute path, not content.
 *   - Default export validation: missing default export throws and file is skipped.
 *   - Render provides `base`/`islands`/`asset`/`page` via `PageContext`/`UtilsContext`
 *     so pages can call `page("/other")` / `asset("/assets/x")` and render islands
 *     via `<Island>`; islands must have been prerendered beforehand.
 *   - Output HTML is sanitized (doctype if `<html>` or unescaped) and contains
 *     the component's rendered markup plus island placeholders/scripts where used.
 *   - Errors in one page do not prevent other pages from prerendering; console
 *     logs include `Prerendering page [url]`.
 *   - `generateRouteUtils` + `generateRouteMap` integrate preact pages into
 *     `.cache/utils.ts` (`RouteId`) and `.cache/routes.json` for serving.
 */

