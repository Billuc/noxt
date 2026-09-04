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
 * E2E: Islands (partial hydration)
 *
 * Feature (src/islands/*, src/runtime/island.ts, src/core/context.ts):
 *   Islands are interactive Preact components under `src/islands/` discovered by
 *   `discoverIslands` (src/islands/build.ts) via glob `** /*.{tsx,ts,jsx,js}` under
 *   `src/islands`; missing directory logs `No islands directory found !` and returns [].
 *   `prerenderIslands({ islandFiles, base })` imports each file's `default` export as
 *   `FunctionComponent`; if missing, warns `has no default export, skipping` and
 *   continues. For each island it computes `hash = crypto.hash("sha256", file.absolute,
 *   "base64url")`, fileName `(<displayName|name>.<hash>.js)`, script path `.cache/<name>.<hash>.js`,
 *   content via `generateScriptForIsland(hash, importPath, base)` (src/islands/code_generation.ts)
 *   which emits `import { renderIsland } from "<runtime/island.ts>"; import Island from "<abs>";
 *   renderIsland(Island, hash, base);`. It then bundles all entry scripts with esbuild
 *   (`outdir: .cache/_islands`, `minify: !isDev()`, `sourcemap: isDev()`,
 *   `bundle: true, format: "esm", jsxImportSource: "preact"`). The metafile is used to map
 *   each output to its island entry (`files: Path[]` in `IslandEntry`).
 *   The `<Island>` component (src/islands/Island.tsx) reads `PageContext` (`base`,
 *   `islandMap: Map<Component, IslandEntry>`), throws if component not prerendered,
 *   emits `<div data-island={hash} data-props={devalue.stringify(props)}>` with
 *   server-rendered children wrapped in `IslandErrorBoundary` (skipped if `client:only`),
 *   plus `<script type="module" src={toPublicPath(pathFromCache, base)}>` for each js file
 *   and `<link rel="stylesheet">` for css. Runtime `renderIsland` (src/runtime/island.ts)
 *   queries `[data-island="hash"]`, creates `UtilsContextData` via
 *   `createClientPageFunction(base)` / `createClientAssetFunction(base)` (src/core/url.ts),
 *   `devalue.parse`-s `data-props`, wraps component in `UtilsContext.Provider`, and
 *   `hydrate`s if element has children else `render`s.
 *
 * What should be tested:
 *   - Discovering islands finds `*.tsx|ts|jsx|js` and ignores other extensions;
 *     missing directory returns empty array without throwing.
 *   - Files without default export are warned and produce no output; valid islands
 *     produce a hash derived from `file.absolute` (deterministic for same path) and
 *     a temporary `.cache/*.js` that is bundled to `.cache/_islands/`.
 *   - Esbuild output respects `NOXT_MODE=dev` (sourcemap + no minify) vs production;
 *     each `IslandEntry.files` list is populated from metafile inputs.
 *   - `<Island>` server HTML contains `data-island` hash, `data-props` serialized via
 *     `devalue` (Date, etc. preserved), and module script(s) with `toPublicPath` + base;
 *     `client:only` omits SSR children but still emits script.
 *   - Throwing if component not in `islandMap` with message `has not been prerendered`.
 *   - Client `renderIsland` hydrates or renders correctly, provides `UtilsContext`
 *     so islands can call `page()`/`asset()` client-side, and handles multiple
 *     elements with same hash.
 */

