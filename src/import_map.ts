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

/**
 * Prepares an import map of prerendered pages from the manifest.
 *
 * Loads the manifest file, iterates through all routes, dynamically imports
 * the prerendered page component for each route, and returns a map with
 * route names as keys and their corresponding prerendered components as values.
 *
 * @returns A promise resolving to a record mapping route names to their prerendered HTML bundles
 */
export async function prepareImportMap(): Promise<
  Record<string, Bun.HTMLBundle>
> {
  const manifest = await prepareManifest();
  const importMap: Record<string, Bun.HTMLBundle> = {};

  for (const route in manifest) {
    const prerenderPath = manifest[route]!;
    importMap[route] = (await import(prerenderPath)).default;
  }

  return importMap;
}
