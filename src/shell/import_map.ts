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
import type { NoxtConfig } from "../core/config";
import { prepareManifest } from "./manifest";

/**
 * Prepares an import map object that can be used for dynamic page imports.
 *
 * This function:
 * - Prepares the manifest by calling prepareManifest(config)
 * - Generates an object mapping route names to their corresponding HTML bundles
 * - This import map is used by the build system to create dynamic imports
 *
 * @param config - Noxt configuration object
 * @returns Promise resolving to a record mapping route names to Bun.HTMLBundle objects
 *
 * @example
 * ```ts
 * import { prepareImportMap, buildConfig } from "noxt";
 *
 * const config = buildConfig({});
 * const importMap = await prepareImportMap(config);
 * // importMap = { "/": HTMLBundle, "/about": HTMLBundle, ... }
 * ```
 */
export async function prepareImportMap(
  config: NoxtConfig,
): Promise<Record<string, Bun.HTMLBundle>> {
  const manifest = await prepareManifest(config);
  const importMap: Record<string, Bun.HTMLBundle> = {};

  for (const route in manifest) {
    const prerenderPath = manifest[route]!;
    importMap[route] = (await import(prerenderPath)).default;
  }

  return importMap;
}
