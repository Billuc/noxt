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
import type { NoxtConfig } from "./config";
import * as path from "node:path";

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
 * Prepares a single island component by generating its client-side hydration script.
 *
 * @param config - Noxt configuration object
 * @param islandPath - Relative path of the island component from the islands directory
 * @returns Promise resolving to IslandData object with fullPath, prerenderPath, and hash
 */
async function prepareIslandScript(
  config: NoxtConfig,
  islandPath: string,
): Promise<IslandData> {
  console.log(`Prerendering island [${islandPath}]`);
  const islandsDir = path.resolve(config.root, config.islandsDir);
  const cacheIslandsDir = path.resolve(
    config.root,
    ".cache",
    config.islandsDir,
  );

  const filePath = path.resolve(islandsDir, islandPath);
  const prerenderPath = path.resolve(cacheIslandsDir, islandPath);
  const renderScriptPath = path.join(__dirname, "..", "runtime", "render.ts");

  const hash = new Bun.CryptoHasher("sha256")
    .update(filePath)
    .digest("base64url");

  const script = `
    import { renderComponent } from ${JSON.stringify(renderScriptPath)};
    import Island from ${JSON.stringify(filePath)};
    renderComponent(Island, ${JSON.stringify(hash)}); 
  `;

  await Bun.write(prerenderPath, script);
  return {
    fullPath: filePath,
    prerenderPath,
    hash,
  };
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
  const islandsDir = path.resolve(config.root, config.islandsDir);

  const islandsScripts: Record<string, IslandData> = {};
  const glob = new Bun.Glob("**/*.{tsx,ts,jsx,js}");

  for await (const file of glob.scan(islandsDir)) {
    const prerenderResult = await prepareIslandScript(config, file);
    if (!prerenderResult) continue;

    islandsScripts[prerenderResult.fullPath] = prerenderResult;
  }

  return islandsScripts;
}
