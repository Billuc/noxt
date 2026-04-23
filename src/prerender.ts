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
import { prepareManifest } from "./manifest";
import { rm } from "node:fs/promises";
import { CACHE_DIR, DIST } from "./paths";

/**
 * Options for the prerender function.
 */
export interface PrerenderOptions {
  /** Output directory. Defaults to DIST. */
  outdir?: string;
  /** Build target. Defaults to "browser". */
  target?: Bun.Target;
  /** Whether to clear cache before prerendering. Defaults to true. */
  clearCache?: boolean;
  /** Whether to clear dist before prerendering. Defaults to true. */
  clearDist?: boolean;
  /** Whether to log the generated manifest. Defaults to true. */
  logManifest?: boolean;
  /** Whether to enable code splitting. Defaults to true. */
  splitting?: boolean;
  /** Whether to minify output. Defaults to true. */
  minify?: boolean;
}

/**
 * Prerenders all pages for client-side static site generation.
 *
 * This function prepares the manifest (which prerenders pages and copies assets),
 * cleans the cache and dist directories, and runs Bun.build to bundle all
 * prerendered pages into static files for browser consumption.
 *
 * @param options - Prerender configuration options
 * @returns A promise that resolves to the generated manifest
 *
 * @example
 * ```ts
 * import { prerender } from "./src/prerender";
 *
 * const manifest = await prerender();
 *
 * // With custom options
 * const manifest = await prerender({ target: "bun", minify: false });
 * ```
 */
export async function prerender(
  options: PrerenderOptions = {},
): Promise<Record<string, string>> {
  const {
    outdir = DIST,
    target = "browser",
    clearCache = true,
    clearDist = true,
    logManifest = true,
    splitting = true,
    minify = true,
  } = options;

  if (clearCache) {
    await rm(CACHE_DIR, { recursive: true, force: true });
  }
  if (clearDist) {
    await rm(outdir, { recursive: true, force: true });
  }

  const manifest = await prepareManifest();

  if (logManifest) {
    console.log("Generated manifest:", manifest);
  }

  await Bun.build({
    entrypoints: Object.values(manifest),
    outdir,
    target,
    splitting,
    minify,
  });

  return manifest;
}

// Run prerender when executed directly
if (import.meta.main) {
  await prerender();
}
