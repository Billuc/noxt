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
 * E2E: Runtime — fetch / API client / signals / island hydration
 *
 * Feature (src/runtime/*, src/core/url.ts, src/core/context.ts):
 *   - `src/runtime/fetch.ts`: `requestFrom(url, initWithBody, signal)` builds a
 *     `Request` where `url` is resolved via `new URL(url, window.location.origin)`
 *     if not absolute; `objectBody` for GET is appended as `searchParams` (arrays
 *     as repeated keys, values stringified), for non-GET as `JSON.stringify` with
 *     `Content-Type: application/json`; remaining `FetchRequestInit` fields
 *     (`headers`, `cache`, `credentials`, etc.) are forwarded. `FetchError` wraps
 *     non-ok `Response`. `useAsync(input, asyncFn)` (preact/hooks) manages
 *     `data/loading/error/refresh` with `AbortController`, `mountedRef` guards,
 *     and `useEffect` triggering `refresh` on input change. `fetchJson` calls
 *     `requestFrom` + `fetch` and throws `FetchError` if `!ok` else `response.json()`.
 *     `useFetchJson(url, options)` memoizes by `JSON.stringify([url, options])`.
 *   - `src/runtime/api.ts`: `ApiRouter<TDefs>(base)` typed client; `api(route, method, fetcher=fetch)`
 *     returns `EndpointCaller` capturing `route/method/base`, merging headers/options
 *     (warns if options.method mismatched), building `FetchRequestInit { method, objectBody: input }`,
 *     calling `requestFrom` + `fetcher` and `response.json()`. `useApi` wraps an
 *     `EndpointCaller` with `useMemo` + `useAsync`. `getApiHandlers(map, base)`
 *     converts `ApiEndpointDefinitions` to `ApiEndpoints` by extracting `endpoint.handler`
 *     and prefixing routes with `base`.
 *   - `src/runtime/signal.ts`: `sharedSignal(key, initial, options)` uses `getStore()`
 *     → `window.__NOXT_SIGNALS__` (client) or `SERVER_STORE` (server) `Map<string, Signal>`;
 *     returns existing signal if present else `preactSignal(initial)` and stores.
 *   - `src/runtime/island.ts`: `renderIsland(Component, hash, base)` queries
 *     `[data-island="hash"]`, builds `UtilsContextData` via `createClientPageFunction(base)`
 *     / `createClientAssetFunction(base)` (src/core/url.ts: `base + id` + `buildUrlWithQuery`),
 *     `devalue.parse`s `data-props`, wraps `h(Component, props)` in
 *     `UtilsContext.Provider`, and `hydrate` vs `render` based on childNodes length.
 *
 * What should be tested:
 *   - `requestFrom` GET encodes `objectBody` as searchParams (arrays repeated) and
 *     non-GET as JSON; headers/signals/cache options forwarded; relative urls use
 *     `window.location.origin`.
 *   - `FetchError` message is `Error ${status}: ${statusText}` with `.response`.
 *   - `useAsync` loading/error transitions, abort on unmount or `refresh()`, ignores
 *     `AbortError`, and `refresh()` re-invokes `asyncFn` with latest inputRef.
 *   - `fetchJson` throws on `!ok`, returns parsed JSON otherwise; `useFetchJson`
 *     memoizes correctly.
 *   - `ApiRouter` GET vs mutation body handling, base prefix, header merging, method
 *     mismatch warning, fetcher injection.
 *   - `useApi` hooks correctly delegate to `useAsync` with memoized input.
 *   - `getApiHandlers` prefixes routes with base and extracts `.handler`.
 *   - `sharedSignal` returns same instance per key, shares across islands/server vs
 *     window store, respects `SignalOptions`.
 *   - `renderIsland` hydrates or renders per element, provides `UtilsContext` with
 *     client page/asset functions, parses `devalue` props (Date etc.).
 */

