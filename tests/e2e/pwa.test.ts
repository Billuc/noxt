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
 * E2E: PWA — Service Worker
 *
 * Feature (src/pwa/*):
 *   `generateServiceWorker({ manifest })` (src/pwa/build.ts) calls
 *   `generateServiceWorkerCode(manifest)` (src/pwa/code_generation.ts) and writes
 *   `dist/sw.js` via `writeFile(distPath("sw.js"))`. The code filters
 *   `Object.keys(manifest).filter(url => !/\/sw\.js$/.test(url))` into `PRECACHE_URLS`,
 *   emits `CACHE_NAME = "noxt-v1"` and `PRECACHE_URLS = JSON.stringify(urls)`, plus
 *   `install` (caches.open → cache.addAll(PRECACHE_URLS) + skipWaiting), `activate`
 *   (delete old caches + clients.claim), and `fetch` (only GET, ignores sw.js,
 *   cache-first with network fallback and cache.put). The `manifest` is the
 *   `Record<string, string>` produced by `generateStaticPages` (src/static/build.ts)
 *   mapping `toPublicPath(url, base)` → output file path.
 *
 * What should be tested:
 *   - `generateServiceWorker` writes `dist/sw.js` and returns `serviceWorkerFile: Path`.
 *   - `generateServiceWorkerCode` excludes `sw.js` (via `/sw\.js$/` regex) from precache list,
 *     stringifies remaining public urls, and emits install/activate/fetch handlers
 *     with correct cache name and `skipWaiting`/`clients.claim`.
 *   - Manifest keys with `base` prefix (via `toPublicPath`) are preserved in `PRECACHE_URLS`.
 *   - Serving `GET /sw.js` returns JS content type and matches `dist/sw.js` bytes;
 *     pages remain servable without registering the worker.
 *   - Rebuilding with changed manifest changes `dist/sw.js` content.
 */

