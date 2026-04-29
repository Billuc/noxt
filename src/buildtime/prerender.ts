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
import path from "node:path";
import type { NoxtConfig } from "../common/config";
import { prepareManifest } from "../common/manifest";
import { rm } from "node:fs/promises";

/**
 * Options for the prerender function.
 */
export interface PrerenderOptions {
  /** Output directory. Defaults to "dist". */
  outdir?: string;
  /** Whether to log the generated manifest. Defaults to true. */
  logManifest?: boolean;
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
 * @param noxtConfig - Noxt configuration object
 * @param prerenderOptions - Prerender configuration options
 * @returns A promise that resolves to the generated manifest mapping routes to file paths
 *
 * @example
 * ```ts
 * import { prerender, buildConfig } from "noxt";
 *
 * const config = buildConfig({});
 * const manifest = await prerender(config);
 *
 * // With custom options
 * const manifest = await prerender(config, {
 *   outdir: "public",
 *   logManifest: false,
 *   minify: false
 * });
 * ```
 */
export async function prerender(
  noxtConfig: NoxtConfig,
  prerenderOptions: PrerenderOptions = {},
): Promise<Record<string, string>> {
  const { outdir, logManifest = true, minify = true } = prerenderOptions;

  const cacheDir = path.resolve(noxtConfig.root, ".cache");
  const distDir = path.resolve(noxtConfig.root, outdir ?? "dist");
  const index = path.resolve(noxtConfig.root, "index.ts");

  await rm(cacheDir, { recursive: true, force: true });
  await rm(distDir, { recursive: true, force: true });

  const manifest = await prepareManifest(noxtConfig);

  if (logManifest) {
    console.log("Generated manifest:", manifest);
  }

  await Bun.build({
    entrypoints: Object.values(manifest),
    outdir,
    target: "browser",
    splitting: true,
    minify,
  });

  return manifest;
}
