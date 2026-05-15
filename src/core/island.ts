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
import { getIslandFilePath } from "./paths";

/**
 * Data structure containing information about a prepared island component.
 */
export interface IslandScript {
  /** Unique hash generated from the file path for identifying the island. */
  hash: string;
  script: string;
}

export function generateScriptForIsland(
  config: NoxtConfig,
  islandPath: string,
): IslandScript {
  const filePath = getIslandFilePath(config, islandPath);
  const renderScriptPath = path.join(__dirname, "..", "runtime", "render.ts");

  const hash = new Bun.CryptoHasher("sha256")
    .update(filePath)
    .digest("base64url");

  const script = `
    import { renderComponent } from ${JSON.stringify(renderScriptPath)};
    import Island from ${JSON.stringify(filePath)};
    renderComponent(Island, ${JSON.stringify(hash)}); 
  `;

  return { hash, script };
}
