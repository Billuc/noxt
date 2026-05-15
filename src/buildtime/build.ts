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
import { prepareManifest } from "../shell/manifest";
import { generateImportMapCode } from "../core/code_generator";
import { rm } from "node:fs/promises";
import type { NoxtConfig } from "../core/config";
import path from "node:path";

/**
 * Options for the build function.
 */
export interface BuildOptions {
  /** Entry point file path. Defaults to index.ts in the root directory. */
  entrypoints?: string[];
  /** Output directory. Defaults to "dist". */
  outdir?: string;
  /** Whether to minify output. Defaults to true. */
  minify?: boolean;
}

/**
 * Creates an import map plugin for Bun.build that generates
 * dynamic imports for prerendered pages from the manifest.
 *
 * This plugin intercepts imports of import_map.ts and generates
 * code that exports a prepareImportMap() function which returns
 * a mapping of route names to their HTML bundles.
 *
 * @param config - Noxt configuration object
 * @returns A Bun.BunPlugin that generates the import map
 */
function createImportMapPlugin(config: NoxtConfig) {
  const importMapPlugin: Bun.BunPlugin = {
    name: "import-map-plugin",
    setup: (build) => {
      build.onLoad({ filter: /import_map\.ts$/ }, async (args) => {
        const manifest = await prepareManifest(config);
        console.log("Generated manifest:", manifest);

        const serverFile = generateImportMapCode(manifest);

        return {
          contents: serverFile,
          loader: "js",
        };
      });
    },
  };
  return importMapPlugin;
}

/**
 * Builds the project for server-side rendering with Bun.
 *
 * This function prepares the manifest, cleans the cache and dist directories,
 * and runs Bun.build with an import map plugin that generates dynamic imports
 * for all prerendered pages.
 *
 * @param noxtConfig - Noxt configuration object
 * @param buildOptions - Build configuration options
 * @returns A promise that resolves when the build is complete
 *
 * @example
 * ```ts
 * import { build, buildConfig } from "noxt";
 *
 * const config = buildConfig({});
 * await build(config);
 *
 * // With custom options
 * await build(config, { minify: false });
 * ```
 */
export async function build(
  noxtConfig: NoxtConfig,
  buildOptions: BuildOptions = {},
): Promise<void> {
  const { entrypoints, outdir, minify = true } = buildOptions;

  const cacheDir = path.resolve(noxtConfig.root, ".cache");
  const distDir = path.resolve(noxtConfig.root, outdir ?? "dist");
  const index = path.resolve(noxtConfig.root, "index.ts");

  await rm(cacheDir, { recursive: true, force: true });
  await rm(distDir, { recursive: true, force: true });

  await Bun.build({
    entrypoints: entrypoints ?? [index],
    outdir,
    target: "bun",
    plugins: [createImportMapPlugin(noxtConfig)],
    splitting: true,
    minify,
  });
}
