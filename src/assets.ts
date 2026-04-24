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
import { ASSETS_DIR } from "./paths";

/**
 * Returns the full filesystem path for an asset.
 *
 * Takes a path relative to ASSETS_DIR and returns the absolute filesystem path.
 * Works correctly on both Unix and Windows systems.
 *
 * @param assetPath - Path to the asset relative to ASSETS_DIR (e.g., "images/logo.png")
 * @returns The absolute filesystem path (e.g., "/path/to/project/src/assets/images/logo.png" or "C:\\path\\to\\project\\src\\assets\\images\\logo.png")
 *
 * @example
 * ```ts
 * import { getAssetPath } from "noxt";
 *
 * // In a page or component
 * const logoPath = getAssetPath("images/logo.png");
 * // or
 * html`<img src=${getAssetPath("images/logo.png")} />`
 * // Returns: /path/to/project/src/assets/images/logo.png (or Windows equivalent)
 *
 * // Use with Bun.file()
 * const file = await Bun.file(getAssetPath("data/config.json")).json();
 * ```
 */
export function getAssetPath(assetPath: string): string {
  // Normalize the path to remove leading slashes
  const normalizedPath = assetPath.replace(/^[\\/]+/, "");
  return path.join(ASSETS_DIR, normalizedPath);
}
