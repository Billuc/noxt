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
import { assetsDir, cacheAssetsDir } from "../core/paths";
import { linkDir } from "./fs";

/**
 * Copies assets from the assets directory to the cache directory.
 * Creates symlinks for each asset file to avoid duplicating files on disk.
 *
 * @param config - Noxt configuration object containing the assetsDir path
 * @returns A promise that resolves when all assets have been copied
 *
 * @example
 * ```ts
 * import { copyAssets, buildConfig } from "noxt";
 *
 * const config = buildConfig({});
 * await copyAssets(config);
 * // Assets from src/assets are now available in .cache/src/assets
 * ```
 */
export async function copyAssets(config: NoxtConfig) {
  const cacheDir = cacheAssetsDir(config);
  const srcDir = assetsDir(config);
  try {
    await linkDir(srcDir, cacheDir);
  } catch (e: any) {
    // Ignore EEXIST errors (symlink already exists)
    if (e.code !== "EEXIST") {
      throw e;
    }
  }
}
