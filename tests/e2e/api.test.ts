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
 * E2E: API Routes
 *
 * Feature (src/api/*, src/runtime/api.ts):
 *   API endpoints are TypeScript/JavaScript files under `src/api/` discovered by
 *   `discoverAPIs` (src/api/build.ts) via glob `** /*.{ts,js}` under `src/api`.
 *   Each file is dynamically imported; `getRouteName(file.relativeTo("src"))`
 *   (src/core/utils.ts) derives the route (e.g. `src/api/users.ts` → `/api/users`,
 *   `src/api/index.ts` → `/`). For each `HTTP_METHODS` entry (`GET, POST, PUT,
 *   DELETE, PATCH`) the export is checked: `method in exports && exports[method]
 *   instanceof APIEndpoint` then pushed as `APIEndpointEntry { method, route, input,
 *   output, file }`. `generateAPIFile` (src/api/build.ts) writes `.cache/api.ts`
 *   via `generateApiUtilsCode` (src/api/code_generation.ts) which groups by file,
 *   emits `import { GET as _api_users_GET } from "/abs/path"` etc., builds
 *   `apiRoutesData = { "/api/users": { "GET": _api_users_GET, ... } } as const`,
 *   then `const handlers = getApiHandlers(apiRoutesData, base)` and
 *   `export { type ApiRoutes = InferDefinitions<...>, handlers }`.
 *   Endpoint builders `query()` / `mutation()` (src/api/builder.ts) provide
 *   `.input(schema).output(schema).endpoint(handler)` where `query` uses
 *   `searchParams(schema)` (src/api/superstruct.ts: `URLSearchParams` → typed
 *   object via `s.coerce`, handling string/number/boolean/arrays via `s.is`
 *   checks) for GET and `mutation` uses `body(schema)` (`s.coerce` string →
 *   `JSON.parse`) for POST/PUT/PATCH/DELETE. Handlers receive `{ input, request,
 *   response }`, return value is serialized via `toBody` (`JSON.stringify`) and
 *   wrapped in `Response`; validation failures return 400 `Bad argument`, handler
 *   throws return 500 `Internal Server Error`. Runtime `ApiRouter` and `useApi`
 *   (src/runtime/api.ts) provide the typed client: `new ApiRouter<Defs>(base).api(route, method)`
 *   returns an `EndpointCaller` that builds a `Request` via `requestFrom` + `fetch`
 *   and parses JSON, and `getApiHandlers(map, base)` prefixes routes for `Bun.serve`.
 *
 * What should be tested:
 *   - `discoverAPIs` finds files under `src/api` and only includes exports that
 *     are `APIEndpoint` instances for known `HTTP_METHODS`; non-endpoint exports
 *     are ignored; missing `src/api` logs `No api directory found !` and returns [].
 *   - Route derivation via `getRouteName` correctly maps `src/api/users.ts` → `/api/users`
 *     and nested `src/api/admin/stats.ts` → `/admin/stats`.
 *   - `generateAPIFile` emits `.cache/api.ts` with correct imports, `apiRoutesData`
 *     const assertion, `getApiHandlers(..., base)` call with JSON-stringified base,
 *     and exported `ApiRoutes` type.
 *   - Query endpoints: GET input is coerced from `request.url` searchParams;
 *     required/optional query keys, `string`/`number`/`boolean`/`array` values via
 *     `makeBaseValueSchema` + `s.create` are validated; malformed params yield 400.
 *   - Mutation endpoints: body is read as `request.text()` then `s.create(data, body(schema))`;
 *     invalid JSON or schema mismatch yields 400; handler exception yields 500.
 *   - Successful handlers return JSON body with status from `response` init and
 *     `Content-Type: application/json` via `toBody`.
 *   - Runtime `ApiRouter` client: `GET` encodes `objectBody` as `?k=v` via
 *     `requestFrom` (arrays as repeated keys), other methods send JSON body;
 *     `base` prefix is applied to `url`; extra `FetchRequestInit` headers/options
 *     are forwarded, mismatched `method` in options warns and is ignored.
 *   - `useApi(endpointCaller, input)` memoizes by JSON-stringified input/options
 *     and delegates to `useAsync`; `getApiHandlers` prefixes routes with `base`
 *     for `Bun.serve` compatibility.
 */

