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
import * as path from "node:path";
import { cacheIslandsDir, getIslandFilePath, islandsDir } from "../core/paths";
import { generateScriptForIsland } from "../core/island";
import { getFilesMatchingGlob } from "./fs";

/**
 * Data structure containing information about a prepared island component.
 */
export interface IslandData {
  /** Full filesystem path to the original island component file. */
  fullPath: string;
  /** Path where the client-side hydration script will be saved. */
  prerenderPath: string;
  /** Unique hash generated from the file path for identifying the island. */
  hash: string;
}

/**
 * Scans the islands directory and prepares all island components for client-side hydration.
 *
 * This function:
 * - Scans the configured islandsDir for .tsx, .ts, .jsx, .js files
 * - For each file, generates a unique hash and creates a hydration script
 * - Returns a map of island file paths to their IslandData
 *
 * @param config - Noxt configuration object
 * @returns Promise resolving to a record mapping island file paths to their IslandData
 *
 * @example
 * ```ts
 * import { prepareIslands, buildConfig } from "noxt";
 *
 * const config = buildConfig({});
 * const islands = await prepareIslands(config);
 * // islands = { "/path/to/Counter.tsx": { fullPath: "...", prerenderPath: "...", hash: "abc123" }, ... }
 * ```
 */
export async function prepareIslands(
  config: NoxtConfig,
): Promise<Record<string, IslandData>> {
  const islandsFiles = await getFilesMatchingGlob(
    "**/*.{tsx,ts,jsx,js}",
    islandsDir(config),
  );
  const islandsScripts: Record<string, IslandData> = {};

  for (const islandPath of islandsFiles) {
    const file = islandPath.fromRoot;
    console.log(`Prerendering island [${file}]`);
    const filePath = getIslandFilePath(config, file);
    const prerenderPath = path.resolve(cacheIslandsDir(config), file);
    const { hash, script } = generateScriptForIsland(config, file);

    await Bun.write(prerenderPath, script);

    islandsScripts[filePath] = {
      fullPath: filePath,
      hash,
      prerenderPath,
    };
  }

  return islandsScripts;
}
