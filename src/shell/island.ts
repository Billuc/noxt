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
import {
  generateScriptForIsland,
  getHash,
  type IslandComponent,
} from "../core/island";
import { writeFile } from "./fs";
import type { FunctionalComponent } from "preact";
import { html } from "htm/preact";

export async function prepareIsland<T>(
  island: IslandComponent<T>,
): Promise<FunctionalComponent<T>> {
  console.log(`Prerendering island [${island.displayName ?? island.name}]`);

  const hash = getHash(island);
  const script = generateScriptForIsland(island);
  const prerenderPath = path.resolve(".cache", hash + ".js");
  await writeFile(prerenderPath, script);

  return (props: T) =>
    html`<div data-island=${hash} data-props=${JSON.stringify(props)}>
        <${island} ...${props} />
      </div>
      <script src=${prerenderPath}></script>`;
}
