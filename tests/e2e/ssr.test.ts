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
 * E2E: SSR Routes
 *
 * Feature (src/ssr/*, src/runtime/ssr.ts, src/core/context.ts):
 *   SSR routes are TypeScript/JavaScript files under `src/ssr/` discovered by
 *   `discoverSSRRoutes` (src/ssr/build.ts) via glob `** /*.{ts,js}` under `src/ssr`.
 *   Each file is dynamically imported; `getRouteName(file.relativeTo("src"))`
 *   (src/core/utils.ts) derives the route (e.g. `src/ssr/greeting.ts` →
 *   `/ssr/greeting`, `src/ssr/panel/index.ts` → `/ssr/panel`). For each
 *   `HTTP_METHODS` entry (`GET, POST, PUT, DELETE, PATCH`) the export is checked:
 *   `method in exports && exports[method] instanceof SSRRoute` then pushed as
 *   `SSRRouteEntry { method, route, input, file }` (no `output`: handlers render
 *   HTML, not JSON). `generateSSRFile` (src/ssr/build.ts) writes `.cache/ssr.ts`
 *   via `generateSSRUtilsCode` (src/ssr/code_generation.ts) which groups by file,
 *   emits `import { GET as _ssr_greeting_GET } from "/abs/path"` etc. (prefix is
 *   the route with `[\\\/-]` replaced by `_`), builds
 *   `ssrRoutesData = { "/ssr/greeting": { "GET": _ssr_greeting_GET, ... } } as const`,
 *   then `const handlers = getSSRHandlers(ssrRoutesData, base)` and
 *   `export { type SSRRoutes = InferDefinitions<...>, handlers }`.
 *   Route builders `query()` / `mutation()` (src/ssr/builder.ts, via `noxt/ssr`)
 *   provide `.input(schema).route(handler)` where `query` defaults to
 *   `s.object({})` and `mutation` to `s.literal(null)`. Query routes coerce
 *   `new URL(request.url).searchParams` via `s.create(params,
 *   searchParams(schema))` (src/core/superstruct.ts: string/number/boolean
 *   coercion, arrays as repeated keys); mutation routes read `request.text()`
 *   then `s.create(data, body(schema))` where `body` is `s.coerce` string →
 *   `devalue.parse`. Handlers receive `{ input, request, response }` with
 *   `response` pre-set to `Content-Type: application/html`, return
 *   `ComponentChildren`, and the result is serialized via `renderToHtmlString(h(()
 *   => result))`. Validation failures return 400 `Bad argument`, handler throws
 *   return 500 `Internal Server Error` (query paths `console.error`; mutation
 *   paths do not). Runtime (`noxt/runtime`, src/runtime/ssr.ts) provides the
 *   typed client: `makeSSRFn<Defs>(base)(route, method, fetcher=fetch)` returns
 *   an `EndpointCaller` that merges options via `copyFetchRequestInit` (never
 *   mutates the caller object, warns and ignores a mismatched `options.method`),
 *   sets `Accept: text/html`, builds a `Request` via `requestFrom`, throws
 *   `FetchError` if `!ok`, and returns `response.text()`. `makeSSRUrlFn(base)
 *   (route, method, input)` builds the URL without fetching via
 *   `buildUrlWithQuery` (GET input as query string, non-GET returns bare
 *   `base + route` since HTMX posts vals itself) and is server-safe (no
 *   `window`). `getSSRHandlers(map, base)` prefixes routes for `Bun.serve`.
 *   Both are wired into `UtilsContextData` (`api, ssr, page, asset, ssrUrl`,
 *   src/core/context.ts) via `from({ base, ... })` for prerendering and into
 *   `renderIsland(Component, hash, base)` (src/runtime/island.ts) for hydration,
 *   so islands can fetch fragments programmatically (`ssr(...)`) or declaratively
 *   via HTMX attributes (`ssrUrl(...)` for `hx-get`/`hx-post` + `hx-swap`).
 *
 * What should be tested:
 *   - `discoverSSRRoutes` finds files under `src/ssr` and only includes exports
 *     that are `SSRRoute` instances for known `HTTP_METHODS`; non-route exports
 *     (helpers, plain objects, plain objects under method names) are ignored;
 *     missing `src/ssr` returns [].
 *   - Route derivation via `getRouteName` correctly maps `src/ssr/greeting.ts` →
 *     `/ssr/greeting`, nested `src/ssr/v1/users/list.ts` →
 *     `/ssr/v1/users/list`, and `src/ssr/panel/index.ts` → `/ssr/panel`.
 *   - `generateSSRFile` emits `.cache/ssr.ts` with correct imports,
 *     `ssrRoutesData` const assertion, `getSSRHandlers(..., base)` call with
 *     JSON-stringified base, and exported `SSRRoutes` type.
 *   - Query routes: GET input is coerced from `request.url` searchParams;
 *     `string`/`number`/`boolean`/`array` values validate, missing/invalid params
 *     yield 400, and success returns the rendered fragment with
 *     `Content-Type: application/html`.
 *   - Mutation routes: body is read as `request.text()` then devalue-parsed via
 *     `body(schema)`; schema mismatch yields 400; handler exception yields 500.
 *   - Runtime `makeSSRFn` client: `GET` encodes `objectBody` as `?k=v`, other
 *     methods send a devalue body; `base` prefix is applied; `Accept:
 *     text/html` is sent; extra `FetchRequestInit` headers/options/signal are
 *     forwarded without mutating the caller's object; mismatched `method` in
 *     options warns and is ignored; `!ok` throws `FetchError`.
 *   - Runtime `makeSSRUrlFn`: GET returns `base + route` with encoded query and
 *     no trailing `?` on empty input; non-GET ignores input; works without
 *     `window` during prerender.
 *   - `UtilsContextData.from({ base })` and `renderIsland` expose `ssr`/`ssrUrl`
 *     prefixed with `base`; `getSSRHandlers` prefixes routes with `base` for
 *     `Bun.serve` compatibility.
 */
