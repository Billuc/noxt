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
import { CACHE_DIR, DIST, INDEX } from "./paths";

/**
 * Options for the build function.
 */
export interface BuildOptions {
  /** Entry point file path. Defaults to INDEX. */
  entrypoints?: string[];
  /** Output directory. Defaults to DIST. */
  outdir?: string;
  /** Build target. Defaults to "bun". */
  target?: Bun.Target;
  /** Whether to clear cache before building. Defaults to true. */
  clearCache?: boolean;
  /** Whether to clear dist before building. Defaults to true. */
  clearDist?: boolean;
  /** Whether to enable code splitting. Defaults to true. */
  splitting?: boolean;
  /** Whether to minify output. Defaults to true. */
  minify?: boolean;
}

/**
 * Creates an import map plugin for Bun.build that generates
 * dynamic imports for prerendered pages from the manifest.
 */
function createImportMapPlugin() {
  const importMapPlugin: Bun.BunPlugin = {
    name: "import-map-plugin",
    setup: (build) => {
      build.onLoad({ filter: /lib[\/\\]import_map\.ts$/ }, async (args) => {
        const manifest = await prepareManifest();
        console.log("Generated manifest:", manifest);

        const imports = [];
        const mapCode = [];

        for (const route in manifest) {
          const sanitizedRouteName = route.replace(/\W/g, "_");
          imports.push(
            `import ${sanitizedRouteName} from ${JSON.stringify(manifest[route])};`,
          );
          mapCode.push(`"${route}": ${sanitizedRouteName}`);
        }

        const serverFile = `
          ${imports.join("\n")}

          export async function prepareImportMap() {
            return {${mapCode.join(",\n")}};
          }
        `;

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
 * @param options - Build configuration options
 * @returns A promise that resolves when the build is complete
 *
 * @example
 * ```ts
 * import { build } from "./src/build";
 *
 * await build();
 *
 * // With custom options
 * await build({ target: "browser", splitting: false });
 * ```
 */
export async function build(options: BuildOptions = {}): Promise<void> {
  const {
    entrypoints = [INDEX],
    outdir = DIST,
    target = "bun",
    clearCache = true,
    clearDist = true,
    splitting = true,
    minify = true,
  } = options;

  if (clearCache) {
    await rm(CACHE_DIR, { recursive: true, force: true });
  }
  if (clearDist) {
    await rm(outdir, { recursive: true, force: true });
  }

  await Bun.build({
    entrypoints,
    outdir,
    target,
    plugins: [createImportMapPlugin()],
    splitting,
    minify,
  });
}

// Run build when executed directly
if (import.meta.main) {
  await build();
}
