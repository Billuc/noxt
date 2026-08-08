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
import * as path from "node:path";

/** Generates a JS import script that hydrates the given island at runtime. */
export function generateScriptForIsland(
  hash: string,
  importPath: string,
): string {
  const renderScriptPath = path.join(__dirname, "..", "runtime", "island.ts");

  return `
    import { renderIsland } from ${JSON.stringify(renderScriptPath)};
    import Island from ${JSON.stringify(importPath)};
    renderIsland(Island, ${JSON.stringify(hash)});
  `;
}
